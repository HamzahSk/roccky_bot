import './lib/Components/ErrorHandler.js'
import './lib/Components/Dispatcher.js'
import './config/index.js'

import loadFunc, { Func } from '#func'
import loadScrap from '#scrap'
await loadFunc()
await loadScrap()

import { delay, makeWASocket } from 'baileys'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import pino from 'pino'
import NodeCache from 'node-cache'

import {
   Database,
   Store,
   connectDatabase,
   connectSessionDatabase,
   createSessionStore,
   isSessionStoredOnline
} from './database/index.js'
import { useDatabaseAuthState } from './database/auth-session.js'

import { BOT, INACTIVE_THRESHOLD } from './lib/Constants.js'
import { scanDirectory } from './lib/Watcher.js'
import Listener from './lib/Listener.js'
import SholatReminder from './lib/Components/SholatReminder.js'

import createWatchdog from './services/watchdog.js'
import startCacheCleaner from './services/cache-cleaner.js'
import { isMemoryOverLimit } from './utils/memory.js'

import createConnectionHandler from './handlers/connection.js'
import createMessagesHandler from './handlers/messages.js'
import createCallHandler from './handlers/call.js'
import createPresenceHandler from './handlers/presence.js'
import {
   createGroupParticipantsHandler,
   createGroupsUpdateHandler
} from './handlers/group.js'

// ================================
//  PATHS & SHARED STATE
// ================================
const DATABASE_PATH = join(process.cwd(), global.databaseFilename || 'database.json')
const STORE_PATH = join(process.cwd(), global.storeFilename || 'store.json')
const TEMPORARY_FOLDER_PATH = join(process.cwd(), global.temporaryFolder || 'temp')

let db, store, listener, sholatReminder
let connectionHandler, messagesHandler, callHandler, presenceHandler
let groupsUpdateHandler, groupParticipantsHandler

// Mutable socket reference shared across reconnects.
const state = { sock: null }

// ================================
//  CACHES
// ================================
const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false })
const processedMessages = new NodeCache({ stdTTL: 30, useClones: false })
const msgRetryCounterCache = new NodeCache({ stdTTL: 60, useClones: false })

// ================================
//  SOCKET UTAMA (KONEKSI WA)
// ================================
const Socket = async () => {
   try {
      // Bersihkan socket lama saat reconnect agar tidak ada event listener menumpuk.
      if (state.sock) {
         try { listener.unbind() } catch { }
         state.sock = null
      }

      // Auth state tersimpan di database online (bertahan saat restart).
      const sessionStore = createSessionStore()
      const { state: authState, saveCreds } = await useDatabaseAuthState(sessionStore)

      state.creds = authState.creds

      const sock = listener.bind(
         makeWASocket({
            version: [2, 3000, 1040411687],
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !global.pairingCode,
            shouldIgnoreJid: (jid) => typeof jid === 'string' && jid.endsWith(BOT),
            syncFullHistory: false,
            generateHighQualityLinkPreview: false,
            cachedGroupMetadata: async (jid) => {
               const cached = groupCache.get(jid)
               if (cached) return cached
               try {
                  const metadata = await sock.groupMetadata(jid)
                  groupCache.set(jid, metadata)
                  return metadata
               }
               catch {
                  return undefined
               }
            },
            getMessage: (key) => store.getMessage({ chat: key.remoteJid, id: key.id }),
            auth: { creds: authState.creds, keys: authState.keys },
            msgRetryCounterCache
         })
      )

      state.sock = sock

      sock.ev.on('creds.update', saveCreds)

      sock.ev.on('connection.update', connectionHandler)
      sock.ev.on('messages.upsert', messagesHandler)
      sock.ev.on('groups.update', groupsUpdateHandler)
      sock.ev.on('group-participants.update', groupParticipantsHandler)

      if (global.antiCall) sock.ev.on('call', callHandler)
      sock.ev.on('presence.update', presenceHandler)
   }
   catch (error) {
      console.error('❌ Gagal membuat socket WhatsApp:', error.message)
   }
}

// ================================
//  SETUP & MAINTENANCE (TITIK AWAL)
// ================================
const Setup = async () => {
   console.log('🔄 Memulai bot...')

   // 1. HUBUNGKAN KE DATABASE ONLINE (dengan auto-reconnect)
   if (global.databaseUrl)
      await connectDatabase(global.databaseUrl, { databaseName: global.databaseName })

   if (global.sessionDatabaseUrl)
      await connectSessionDatabase(global.sessionDatabaseUrl, {
         databaseName: global.sessionDatabaseName
      })

   if (isSessionStoredOnline())
      console.log('🗄️  Sesi WhatsApp disimpan di database online.')
   else
      console.log('🗄️  Sesi WhatsApp disimpan di folder lokal (set SESSION_DATABASE_URL untuk online).')

   // 2. INISIALISASI DATABASE & STORE (cloud / lokal)
   db = Database(DATABASE_PATH)
   global.db = db
   store = Store(STORE_PATH)

   // 3. MUAT DATA SEBELUM SOCKET MENYALA
   console.log('📦 Memuat data pengguna & grup...')
   await db.readFromFile()
   await store.readFromFile()
   console.log(`✅ Data berhasil dimuat: ${db.users?.size || 0} User, ${db.groups?.size || 0} Grup.`)

   // 4. INSTANCE LISTENER & REMINDER (Butuh DB yang sudah terisi)
   listener = Listener(db, store)
   sholatReminder = SholatReminder(db)

   // 5. SIAPKAN FOLDER & PLUGINS
   await scanDirectory(global.pluginsFolder || './plugins')
   await mkdir(TEMPORARY_FOLDER_PATH, { recursive: true })
   global._connectedAt = Date.now()

   // 6. LAYANAN BERSAMA (watchdog + handlers reusable)
   const watchdog = createWatchdog(Socket)

   const onOpen = async () => {
      await delay(3000)
      await sholatReminder.start(state.sock)
      console.log('🟢 Bot siap digunakan')
   }

   connectionHandler = createConnectionHandler({
      state,
      db,
      store,
      watchdog,
      bootstrap: Socket,
      authFolder: global.authFolder || 'session',
      clearSession: async () => (await createSessionStore()).clear(),
      onOpen
   })

   messagesHandler = createMessagesHandler({
      state,
      db,
      store,
      listener,
      watchdog,
      processedMessages
   })

   groupsUpdateHandler = createGroupsUpdateHandler({ store, groupCache })
   groupParticipantsHandler = createGroupParticipantsHandler({ state, db, store, listener })
   callHandler = createCallHandler({ state })
   presenceHandler = createPresenceHandler({ state, listener })

   // 7. TUGAS HARIAN (Reset limit, hapus user/grup tidak aktif)
   scheduleDailyTasks()

   // 8. PEMBERSIH BERKALA (temp files + garbage collector)
   startCacheCleaner({ temporaryFolderPath: TEMPORARY_FOLDER_PATH })

   // 9. AUTOSAVE DATABASE + PENGAWAS MEMORI
   startAutosave()

   // 10. JALANKAN SOCKET KONEKSI WA
   Socket()
}

const scheduleDailyTasks = () => {
   const resetTimeout = Func.getNextMidnight()

   setTimeout(() => {
      try {
         const timestampMs = Date.now()
         const threshold = timestampMs - INACTIVE_THRESHOLD
         const setting = db?.getSetting()
         if (!setting) return

         for (const [id, user] of db.users) {
            const isProtected = user.banned || user.premiumExpiry > 0 || user.limit >= 200
            if (!isProtected && user.lastSeen < threshold) db.deleteUser(id)
         }

         for (const [id, group] of db.groups)
            if (group.lastActivity < threshold) {
               store.deleteGroup(id)
               db.deleteGroup(id)
            }

         for (const user of db.users.values()) {
            if (user.limit < (global.defaultLimit || 50)) user.limit = global.defaultLimit || 50
            user.energy = 100
         }

         setting.lastReset = timestampMs
         db.writeToFile()
      }
      catch (error) {
         console.error('❌ Gagal menjalankan tugas harian:', error.message)
      }
      finally {
         scheduleDailyTasks()
      }
   }, resetTimeout)

   console.log('🔃 Tugas harian dijadwalkan dalam:', Func.toTime(resetTimeout))
}

const startAutosave = () => {
   const dataInterval = global.dataInterval || 30_000

   const check = setInterval(async () => {
      try {
         if (db && store) {
            await db.writeToFile()
            await store.writeToFile()
         }

         if (isMemoryOverLimit()) {
            console.error('⚠️ RAM limit reached, restarting...')
            clearInterval(check)
            process.send?.('reset')
         }
      }
      catch (error) {
         console.error('❌ Gagal autosave database:', error.message)
      }
   }, dataInterval)

   return check
}

// JALANKAN SETUP
Setup()
