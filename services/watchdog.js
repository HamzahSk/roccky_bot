/**
 * Connection watchdog.
 *
 * Monitors incoming message traffic and forces a reconnect when the connection
 * goes silent for too long (WhatsApp sockets can hang without erroring).
 */

const WATCHDOG_TIMEOUT = 30 * 60 * 1000
const WATCHDOG_CHECK_INTERVAL = 60 * 1000

export const createWatchdog = (reconnectFn, { timeout = WATCHDOG_TIMEOUT, checkInterval = WATCHDOG_CHECK_INTERVAL } = {}) => {
   let timer = null
   let lastMessageReceived = Date.now()

   const start = () => {
      stop()
      lastMessageReceived = Date.now()

      timer = setInterval(async () => {
         const silentMs = Date.now() - lastMessageReceived
         if (silentMs > timeout) {
            console.error(`❌ Watchdog: Tidak ada pesan dalam ${Math.round(timeout / 60000)} menit, restart koneksi...`)
            try {
               await reconnectFn()
            }
            catch (error) {
               console.error('❌ Watchdog reconnect gagal:', error.message)
            }
         }
      }, checkInterval)

      if (timer.unref) timer.unref()
      console.log(`🐕 Watchdog aktif (batas ${Math.round(timeout / 60000)} menit tanpa pesan)`)
      return timer
   }

   const stop = () => {
      if (timer) {
         clearInterval(timer)
         timer = null
      }
   }

   const ping = () => {
      lastMessageReceived = Date.now()
   }

   return { start, stop, ping }
}

export default createWatchdog
