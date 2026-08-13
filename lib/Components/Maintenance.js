import { readdir, stat, unlink } from 'fs/promises'
import { join } from 'path'

import { INACTIVE_THRESHOLD, TEMP_THRESHOLD } from '../Constants.js'
import { Func } from '#func'

/**
 * Maintenance tasks berjalan di background (dipanggil dari socket.js):
 *  - Tugas harian: bersihkan user/grup tidak aktif, reset limit & energi
 *  - Autosave database + guard memori (kirim sinyal 'reset' via IPC)
 *  - Pembersih berkala folder temp
 *  - Garbage collector manual (jika runtime mengekspos global.gc)
 */
export const startMaintenance = ({ db, store, temporaryFolderPath }) => {
   const scheduleDailyTasks = () => {
      const resetTimeout = Func.getNextMidnight()
      setTimeout(() => {
         const timestampMs = Date.now()
         const threshold = timestampMs - INACTIVE_THRESHOLD
         const setting = db?.getSetting()
         if (setting) {
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
            // Pangkas store sekaligus; perubahan ditandai dirty lalu di-flush coalesced
            store.prune?.()
            db.requestWrite?.()
         }
         scheduleDailyTasks()
      }, resetTimeout)
      console.log('🔃 Tugas harian dijadwalkan dalam', ':', Func.toTime(resetTimeout))
   }
   scheduleDailyTasks()

   if (global.gc) {
      setInterval(() => {
         global.gc()
         console.log('🧹 Garbage collector dipanggil, memori dibersihkan')
      }, global.gcInterval || 60000)
   }

   // INTERVAL AUTOSAVE DATABASE (Sangat Penting)
   const dataInterval = global.dataInterval || 30000
   const rssLimit = global.rssLimit || 1024 * 1024 * 500
   const check = setInterval(async () => {
      if (db && store) {
         // Hanya tulis bila ada perubahan nyata (guarded flush)
         await db.flush()
         await store.flush()
      }
      if (process.memoryUsage().rss >= rssLimit) {
         clearInterval(check)
         // Paksa simpan data pending SEBELUM restart agar tidak hilang
         await Promise.all([db?.flushNow?.(), store?.flushNow?.()]).catch(() => {})
         process.send('reset')
      }
   }, dataInterval)

   // INTERVAL PEMBERSIH FOLDER TEMP
   const temporaryFileInterval = global.temporaryFileInterval || 3600000
   setInterval(async () => {
      try {
         const timestampMs = Date.now()
         const temporaryFiles = await readdir(temporaryFolderPath)
         let removedFiles = 0
         for (const fileName of temporaryFiles) {
            const filePath = join(temporaryFolderPath, fileName)
            const fileStatistic = await stat(filePath)
            if (timestampMs - fileStatistic.mtimeMs > TEMP_THRESHOLD) {
               await unlink(filePath)
               removedFiles++
            }
         }
         if (removedFiles > 0) console.log('🗑️ Membersihkan folder temp:', removedFiles, 'file dihapus')
      }
      catch (error) {
         console.error('❌ Gagal membersihkan folder temp:', error.message)
      }
   }, temporaryFileInterval)
}
