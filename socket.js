import './lib/Components/ErrorHandler.js';
import './lib/Components/Dispatcher.js';
import './config.js';

import loadFunc, { Func } from '#func';
import loadScrap, { Scrap } from '#scrap';
await loadFunc();
await loadScrap();


import { Database, Store, connectCloudDB } from './lib/Database.js';
import { Boom } from '@hapi/boom';
import { delay, DisconnectReason, jidNormalizedUser, makeWASocket, useMultiFileAuthState } from 'baileys';
import { mkdir } from 'fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import pino from 'pino';
import readline from 'readline';
import NodeCache from 'node-cache';

import { BOT } from './lib/Constants.js';
import { scanDirectory } from './lib/Watcher.js';
import Listener from './lib/Listener.js';
import SholatReminder from './lib/Components/SholatReminder.js';
import { startMaintenance } from './lib/Components/Maintenance.js';

// ================================
//  KONFIGURASI & PATH
// ================================
const DATABASE_PATH = join(process.cwd(), global.databaseFilename || 'database.json');
const STORE_PATH = join(process.cwd(), global.storeFilename || 'store.json');
const TEMPORARY_FOLDER_PATH = join(process.cwd(), global.temporaryFolder || 'temp');
const authFolder = global.authFolder || 'auth';

// Variabel Global File
let db, store, listener, sholatReminder;
let isRestarting = false;

// ================================
//  CACHE & WATCHDOG
// ================================
const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });
const processedMessages = new NodeCache({ stdTTL: 30, useClones: false });
const msgRetryCounterCache = new NodeCache({ stdTTL: 60, useClones: false });

let lastMessageReceived = Date.now();
let watchdogTimer = null;
const WATCHDOG_TIMEOUT = 30 * 60 * 1000;
const WATCHDOG_CHECK_INTERVAL = 60 * 1000;

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const MAX_CONFLICT_ATTEMPTS = 3;

function startWatchdog(reconnectFn) {
  if (watchdogTimer) clearInterval(watchdogTimer);
  lastMessageReceived = Date.now();
  watchdogTimer = setInterval(() => {
    const silentMs = Date.now() - lastMessageReceived;
    if (silentMs > WATCHDOG_TIMEOUT) {
      console.error('❌ Watchdog: Tidak ada pesan dalam 30 menit, restart koneksi...');
      reconnectFn().catch(console.error);
    }
  }, WATCHDOG_CHECK_INTERVAL);
  if (watchdogTimer.unref) watchdogTimer.unref();
  console.log('🐕 Watchdog aktif (batas 30 menit tanpa pesan)');
}

function stopWatchdog() {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
}

let rl = null;
function createReadlineInterface() {
  if (rl) rl.close();
  rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return rl;
}

function askQuestion(question) {
  return new Promise((resolve) => {
    const rlIntf = createReadlineInterface();
    rlIntf.question(question, (answer) => {
      rlIntf.close();
      resolve(answer.trim());
    });
  });
}

// ================================
//  FUNGSI SOCKET UTAMA (KONEKSI WA)
// ================================
const Socket = async () => {
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  const sock = listener.bind(
    makeWASocket({
      version: [2, 3000, 1040411687],
      logger: pino({ level: 'silent' }),
      printQRInTerminal: !global.pairingCode,
      shouldIgnoreJid: (jid) => typeof jid === 'string' && jid.endsWith(BOT),
      syncFullHistory: false,
      // markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      cachedGroupMetadata: async (jid) => {
        const cached = groupCache.get(jid);
        if (cached) return cached;
        try {
          const metadata = await sock.groupMetadata(jid);
          groupCache.set(jid, metadata);
          return metadata;
        } catch {
          return undefined;
        }
      },
      getMessage: (key) => store.getMessage({ chat: key.remoteJid, id: key.id }),
      auth: { creds: state.creds, keys: state.keys },
      msgRetryCounterCache,
    })
  );

  sock.ev.on('creds.update', saveCreds);

  const usePairingCode = global.pairingCode === true;
  const pairingNumber = global.botNumber?.toString() || '';

  // ---- EVENT CONNECTION.UPDATE ----
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr, receivedPendingNotifications } = update;

    if (connection === 'connecting' && usePairingCode && !sock.authState.creds.registered) {
      let phoneNumber = pairingNumber.replace(/\D/g, '');
      if (!phoneNumber) {
        console.log('\n⚠️  Nomor pairing belum diatur di config.js');
        phoneNumber = await askQuestion('📱 Masukkan nomor WhatsApp (contoh: 6281234567890): ');
        phoneNumber = phoneNumber.replace(/\D/g, '');
      }

      const { default: PhoneNumber } = await import('awesome-phonenumber');
      if (!PhoneNumber('+' + phoneNumber).isValid()) {
        console.error('❌ Nomor tidak valid, proses pairing dibatalkan.');
        process.exit(0);
      }

      console.log(`🔑 Meminta kode pairing untuk ${phoneNumber}...`);
      await delay(3000);
      try {
        const code = await sock.requestPairingCode(phoneNumber, 'STARSEED');
        if (!code) throw new Error('Pairing code kosong');
        const prettyCode = code.length >= 8 ? code.match(/.{1,4}/g)?.join('-') : code;
        console.log('\n' + '='.repeat(35));
        console.log(`🔗 PAIRING CODE : ${prettyCode}`);
        console.log('='.repeat(35) + '\n');
      } catch (err) {
        console.error('❌ Gagal mendapatkan pairing code:', err.message);
      }
    }

    if (qr && !usePairingCode) {
      const { default: QRCode } = await import('qrcode');
      QRCode.toString(qr, { type: 'terminal', small: true }, (err, string) => {
        if (!err && string) {
          console.log(string);
          console.log('📱 Scan QR code di WhatsApp > Perangkat Tertaut');
        }
      });
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reason = lastDisconnect?.error?.message || 'Unknown reason';
      stopWatchdog();
      if (isRestarting) return;
      isRestarting = true;

      const cleanupAndExit = async (msg) => {
        console.error(msg);
        try { await Func.cleanUpFolder(authFolder); } catch {}
        process.exit(1);
      };

      if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
        await cleanupAndExit(`🔐 Sesi Logout (${statusCode}): ${reason}. Menghapus data sesi...`);
        return;
      }
      if (statusCode === DisconnectReason.connectionReplaced || statusCode === 440) {
        console.warn(`⚠️ Konflik Sesi: Terdeteksi dijalankan di tempat lain.`);
        if (reconnectAttempts < MAX_CONFLICT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`🔄 Mencoba menyambung kembali (${reconnectAttempts}/${MAX_CONFLICT_ATTEMPTS}) dalam 10 detik...`);
          setTimeout(() => { isRestarting = false; Socket(); }, 10000);
        } else {
          await cleanupAndExit('❌ Konflik terus-menerus. Mematikan bot untuk keamanan.');
        }
        return;
      }
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delayMs = 15000;
        console.log(`🔄 Terputus (${statusCode}): ${reason}. Reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} dalam ${delayMs / 1000}s...`);
        setTimeout(() => { isRestarting = false; Socket(); }, delayMs);
      } else {
        console.error('❌ Gagal menyambung ulang setelah batas percobaan maksimal.');
        process.exit(1);
      }
    }

    if (connection === 'open') {
      reconnectAttempts = 0;
      isRestarting = false;
      const userJid = jidNormalizedUser(sock.user.id);
      console.log(`✅ Terhubung sebagai: ${sock.user?.name || global.botName} (${userJid})`);
      startWatchdog(Socket);

      const autoActionFlag = join(process.cwd(), 'storage', '.auto_action_done');
      if (!existsSync(autoActionFlag)) {
        setTimeout(async () => {
          try {
            for (const nl of (global.autoNewsletters || [])) await sock.newsletterFollow(nl + '@newsletter').catch(() => {});
            for (const g of (global.autoGroups || [])) await sock.groupAcceptInvite(g).catch(() => {});
            const storageDir = join(process.cwd(), 'storage');
            if (!existsSync(storageDir)) mkdirSync(storageDir, { recursive: true });
            writeFileSync(autoActionFlag, Date.now().toString());
            console.log('✅ Auto-join selesai');
          } catch (e) { console.error('Auto-join error:', e); }
        }, 8000);
      }

      await delay(3000);
      await sholatReminder.start(sock);
      console.log('🟢 Bot siap digunakan');
    }

    if (receivedPendingNotifications) {
      console.log(`🕒 Sinkronisasi pesan lama, harap tunggu...`);
      sock.ev.flush();
    }
  });

  // ---- EVENT GRUP & PESAN ----
  sock.ev.on('groups.update', async (groups) => {
    for (const group of groups) {
      if (group.id) groupCache.set(group.id, { ...groupCache.get(group.id), ...group });
      if (store.hasGroup(group.id))
        store.setGroup(group.id, Object.assign(store.getGroup(group.id) || {}, group));
      else
        store.setGroup(group.id, group);
    }
  });

  sock.ev.on('group-participants.update', async ({ id, author, participants, action }) => {
    if (Date.now() - (global._connectedAt || 0) < 15000) return;
    const botNumber = sock.user.id.split(':')[0] || sock.user.id.split('@')[0];
    const isBotAdded = action === 'add' && participants.some(p => p.includes(botNumber));
    if (isBotAdded) {
      const sewaEnabled = db.getSetting()?.sewa?.enabled || false;
      if (sewaEnabled) {
        const groupSewa = db.getGroup(id)?.sewa;
        const isWhitelisted = groupSewa && (groupSewa.isLifetime || groupSewa.expiredAt > Date.now());
        if (!isWhitelisted) {
          await sock.sendMessage(id, { text: '⛔ Grup tidak terdaftar dalam sistem sewa, bot akan keluar.' });
          await delay(2000);
          await sock.groupLeave(id);
          console.log(`🚪 Auto-left non-sewa group: ${id}`);
          return;
        }
      }
      const inviter = author || '';
      const inviterMention = inviter ? `@${inviter.split('@')[0]}` : 'seseorang';
      let groupName = 'grup ini';
      try {
        const meta = await sock.groupMetadata(id);
        groupName = meta.subject;
      } catch {}
      const prefix = global.commandPrefix || '.';
      const welcomeText = `👋 *Halo!* Terima kasih sudah mengundangku ke *${groupName}*.\nDiundang oleh ${inviterMention}.\n\nKetik \`${prefix}menu\` untuk melihat fitur.`;
      await sock.sendMessage(id, {
        text: welcomeText,
        contextInfo: { mentionedJid: inviter ? [inviter] : [] }
      });
      console.log(`🎉 Bot bergabung ke grup: ${groupName}`);
    }
    for (const participant of participants)
      listener.participant({ id, author, participant, action });
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    lastMessageReceived = Date.now();
    if (type !== 'notify' && type !== 'append') return;
    for (const msg of messages) {
      if (processedMessages.has(msg.key.id)) continue;
      processedMessages.set(msg.key.id, true);
      let msgTimestamp = 0;
      if (msg.messageTimestamp) {
        msgTimestamp = (typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp : msg.messageTimestamp.toNumber?.()) * 1000;
        if (Date.now() - msgTimestamp > 5 * 60 * 1000) continue;
      }
      if (msg.key.remoteJid === 'status@broadcast') {
        const autoReadSW = db.getSetting()?.autoReadSW || {};
        const autoReactSW = db.getSetting()?.autoReactSW || {};
        if (autoReadSW.enabled) await sock.readMessages([msg.key]).catch(() => {});
        if (autoReactSW.enabled && msg.key.participant) {
          await sock.sendMessage('status@broadcast', { react: { text: autoReactSW.emoji || '🔥', key: msg.key } }, { statusJidList: [msg.key.participant] }).catch(() => {});
        }
        continue;
      }
      if (global.antiCall && msg.message?.call) {
        await sock.rejectCall(msg.key.id, msg.key.remoteJid);
        if (global.blockIfCall) await sock.updateBlockStatus(msg.key.remoteJid, 'block');
        continue;
      }
      const senderJid = msg.key.participant || msg.key.remoteJid;
      const isOwner = global.owners?.includes(senderJid.split('@')[0]) || false;
      const messageBody = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      
      if (isOwner) {
        if (messageBody.startsWith('=>')) {
          const code = messageBody.slice(2).trim();
          if (code) {
            try {
              const result = await eval(`(async () => { ${code} })()`);
              await sock.sendMessage(msg.key.remoteJid, { text: `✅ Hasil: ${require('util').inspect(result, { depth: 2 })}` }, { quoted: msg });
            } catch (err) {
              await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${err.message}` }, { quoted: msg });
            }
          }
          continue;
        }
        if (messageBody.startsWith('$')) {
          const cmd = messageBody.slice(1).trim();
          if (cmd) {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            try {
              const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 });
              await sock.sendMessage(msg.key.remoteJid, { text: `\`\`\`${(stdout || stderr).slice(0, 3500)}\`\`\`` }, { quoted: msg });
            } catch (err) {
              await sock.sendMessage(msg.key.remoteJid, { text: `❌ ${err.message}` }, { quoted: msg });
            }
          }
          continue;
        }
      }
      listener.message(msg);
    }
  });

  if (global.antiCall) {
    sock.ev.on('call', async (calls) => {
      for (const call of calls) {
        if (call.status === 'offer') {
          await sock.rejectCall(call.id, call.from);
          if (global.blockIfCall) await sock.updateBlockStatus(call.from, 'block');
          console.log(`📞 Tolak panggilan dari ${call.from}`);
        }
      }
    });
  }

  sock.ev.on('presence.update', async ({ id, presences }) => {
    for (const presence in presences)
      listener.presence({ id, presence, presences });
  });

  return sock;
};

// ================================
//  SETUP & MAINTENANCE (TITIK AWAL)
// ================================
const Setup = async () => {
  console.log('🔄 Memulai bot Starseed...');

  // 1. KONEKSIKAN KE CLOUD DATABASE JIKA ADA DI CONFIG
  if (global.databaseUrl) {
    await connectCloudDB(global.databaseUrl);
  }

  // 2. INISIALISASI DATABASE & STORE LOKAL/CLOUD
  db = Database(DATABASE_PATH);
  global.db = db;
  store = Store(STORE_PATH);

  // 3. MUAT DATA SEBELUM SOCKET MENYALA
  console.log('📦 Memuat data pengguna & grup...');
  await db.readFromFile();
  await store.readFromFile();
  console.log(`✅ Data berhasil dimuat: ${db.users?.size || 0} User, ${db.groups?.size || 0} Grup.`);

  // 4. INSTANCE LISTENER (Butuh DB yang sudah terisi)
  listener = Listener(db, store);
  sholatReminder = SholatReminder(db);

  // 5. SIAPKAN FOLDER & PLUGINS
  await scanDirectory(global.pluginsFolder || './plugins');
  await mkdir(TEMPORARY_FOLDER_PATH, { recursive: true });
  global._connectedAt = Date.now();

  // 6. JALANKAN SOCKET KONEKSI WA
  Socket();

   // 7. MAINTENANCE BACKGROUND (Daily Tasks, Autosave, Temp Clean, GC)
  startMaintenance({
    db,
    store,
    temporaryFolderPath: TEMPORARY_FOLDER_PATH
  });
};

// JALANKAN SETUP
Setup();
