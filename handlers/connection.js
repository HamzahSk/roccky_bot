/**
 * WhatsApp `connection.update` event handler.
 *
 * Handles:
 *  - pairing-code & QR registration,
 *  - session-conflict detection (running in two places),
 *  - automatic reconnect with attempt limits,
 *  - session cleanup & exit on logout.
 */
import { Boom } from '@hapi/boom'
import { delay, DisconnectReason, jidNormalizedUser } from 'baileys'
import readline from 'readline'

const MAX_RECONNECT_ATTEMPTS = 5
const MAX_CONFLICT_ATTEMPTS = 3
const RECONNECT_DELAY_MS = 15_000
const CONFLICT_DELAY_MS = 10_000

const cleanExit = async ({ authFolder, clearSession, message }) => {
   console.error(message)

   try {
      if (typeof clearSession === 'function') await clearSession()
   }
   catch (error) {
      console.error('❌ Gagal membersihkan sesi online:', error.message)
   }

   try {
      const { Func } = await import('#func')
      await Func.cleanUpFolder(authFolder)
   }
   catch { }
   process.exit(1)
}

const requestPairingCode = async (sock) => {
   let phoneNumber = String(global.botNumber || '').replace(/\D/g, '')

   if (!phoneNumber) {
      console.log('\n⚠️  Nomor pairing belum diatur di config.js')
      phoneNumber = await askPhoneNumber()
   }

   const { default: PhoneNumber } = await import('awesome-phonenumber')
   if (!PhoneNumber('+' + phoneNumber).isValid()) {
      console.error('❌ Nomor tidak valid, proses pairing dibatalkan.')
      process.exit(0)
   }

   console.log(`🔑 Meminta kode pairing untuk ${phoneNumber}...`)
   await delay(3000)

   try {
      const code = await sock.requestPairingCode(phoneNumber, 'STARSEED')
      if (!code) throw new Error('Pairing code kosong')
      const prettyCode = code.length >= 8 ? code.match(/.{1,4}/g)?.join('-') : code
      console.log('\n' + '='.repeat(35))
      console.log(`🔗 PAIRING CODE : ${prettyCode}`)
      console.log('='.repeat(35) + '\n')
   }
   catch (error) {
      console.error('❌ Gagal mendapatkan pairing code:', error.message)
   }
}

const askPhoneNumber = () =>
   new Promise((resolve) => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
      rl.question('📱 Masukkan nomor WhatsApp (contoh: 6281234567890): ', (answer) => {
         rl.close()
         resolve(answer.trim().replace(/\D/g, ''))
      })
   })

const printQRCode = async (qr) => {
   const { default: QRCode } = await import('qrcode')
   QRCode.toString(qr, { type: 'terminal', small: true }, (error, string) => {
      if (!error && string) {
         console.log(string)
         console.log('📱 Scan QR code di WhatsApp > Perangkat Tertaut')
      }
   })
}

export const createConnectionHandler = ({
   state,
   db,
   store,
   watchdog,
   bootstrap,
   authFolder,
   clearSession,
   onOpen
}) => {
   let reconnectAttempts = 0
   let conflictAttempts = 0
   let isRestarting = false

   return async (update) => {
      const { connection, lastDisconnect, qr, receivedPendingNotifications } = update
      const sock = state.sock

      if (connection === 'connecting' && global.pairingCode) {
         const isRegistered = state.creds?.registered || sock?.authState?.creds?.registered
         if (!isRegistered) await requestPairingCode(sock)
      }

      if (qr && !global.pairingCode) {
         await printQRCode(qr)
      }

      if (connection === 'close') {
         const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
         const reason = lastDisconnect?.error?.message || 'Unknown reason'

         watchdog.stop()
         if (isRestarting) return
         isRestarting = true

         // Logged out / unauthorized → wipe session and stop.
         if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
            await cleanExit({ authFolder, clearSession, message: `🔐 Sesi Logout (${statusCode}): ${reason}. Menghapus data sesi...` })
            return
         }

         // Session conflict (bot running elsewhere).
         if (statusCode === DisconnectReason.connectionReplaced || statusCode === 440) {
            console.warn('⚠️ Konflik Sesi: Terdeteksi dijalankan di tempat lain.')

            if (conflictAttempts < MAX_CONFLICT_ATTEMPTS) {
               conflictAttempts++
               console.log(`🔄 Mencoba menyambung kembali (${conflictAttempts}/${MAX_CONFLICT_ATTEMPTS}) dalam ${Math.round(CONFLICT_DELAY_MS / 1000)} detik...`)
               setTimeout(() => {
                  isRestarting = false
                  bootstrap()
               }, CONFLICT_DELAY_MS)
            }
            else {
               await cleanExit({ authFolder, clearSession, message: '❌ Konflik terus-menerus. Mematikan bot untuk keamanan.' })
            }
            return
         }

         // Generic disconnect → reconnect with backoff & attempt cap.
         if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++
            console.log(`🔄 Terputus (${statusCode}): ${reason}. Reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} dalam ${Math.round(RECONNECT_DELAY_MS / 1000)}s...`)
            setTimeout(() => {
               isRestarting = false
               bootstrap()
            }, RECONNECT_DELAY_MS)
         }
         else {
            console.error('❌ Gagal menyambung ulang setelah batas percobaan maksimal.')
            process.exit(1)
         }
      }

      if (connection === 'open') {
         reconnectAttempts = 0
         conflictAttempts = 0
         isRestarting = false

         const userJid = jidNormalizedUser(sock?.user?.id)
         console.log(`✅ Terhubung sebagai: ${sock?.user?.name || global.botName} (${userJid})`)

         watchdog.start()

         await runAutoActions(sock)
         if (typeof onOpen === 'function') await onOpen(sock)
      }

      if (receivedPendingNotifications) {
         console.log('🕒 Sinkronisasi pesan lama, harap tunggu...')
         sock?.ev?.flush()
      }
   }
}

/**
 * Auto-join configured newsletters/groups (runs once).
 */
const runAutoActions = async (sock) => {
   const { existsSync, mkdirSync, writeFileSync } = await import('fs')
   const { join } = await import('path')

   const autoActionFlag = join(process.cwd(), 'storage', '.auto_action_done')
   if (existsSync(autoActionFlag)) return

   setTimeout(async () => {
      try {
         for (const newsletter of global.autoNewsletters || [])
            await sock.newsletterFollow(newsletter + '@newsletter').catch(() => {})
         for (const group of global.autoGroups || [])
            await sock.groupAcceptInvite(group).catch(() => {})

         const storageDir = join(process.cwd(), 'storage')
         if (!existsSync(storageDir)) mkdirSync(storageDir, { recursive: true })
         writeFileSync(autoActionFlag, Date.now().toString())
         console.log('✅ Auto-join selesai')
      }
      catch (error) {
         console.error('Auto-join error:', error)
      }
   }, 8000)
}

export default createConnectionHandler
