/**
 * Periodic cache & temporary-file cleanup.
 *
 * - Removes stale files from the `temp/` folder.
 * - Runs the V8 garbage collector (when exposed).
 * - Enforces the RSS memory limit.
 */
import { readdir, stat, unlink } from 'fs/promises'
import { join } from 'path'

import { TEMP_THRESHOLD } from '../lib/Constants.js'
import { runGarbageCollection } from '../utils/memory.js'

const cleanTemporaryFiles = async (folderPath) => {
   let removedCount = 0

   try {
      const temporaryFiles = await readdir(folderPath)

      for (const fileName of temporaryFiles) {
         const filePath = join(folderPath, fileName)
         const fileStatistic = await stat(filePath)

         if (Date.now() - fileStatistic.mtimeMs > TEMP_THRESHOLD) {
            await unlink(filePath)
            removedCount++
         }
      }

      if (removedCount > 0)
         console.log(`🗑️ Membersihkan folder temp: ${removedCount} file dihapus`)
   }
   catch (error) {
      console.error('❌ Gagal membersihkan folder temp:', error.message)
   }

   return removedCount
}

const createInterval = (fn, intervalMs, { unref = true } = {}) => {
   const interval = setInterval(fn, intervalMs)
   if (unref && interval.unref) interval.unref()
   return interval
}

/**
 * Start all periodic cleanup jobs.
 * Returns an array of intervals so the caller can clear them on shutdown.
 */
export const startCacheCleaner = ({
   temporaryFolderPath = join(process.cwd(), global.temporaryFolder || 'temp'),
   temporaryFileInterval = global.temporaryFileInterval || 3_600_000,
   gcInterval = global.gcInterval || 3_600_000
} = {}) => {
   const intervals = []

   // 1. Temporary file cleanup
   intervals.push(
      createInterval(() => cleanTemporaryFiles(temporaryFolderPath), temporaryFileInterval)
   )

   // 2. Garbage collector (only when --expose-gc is enabled)
   if (typeof global.gc === 'function') {
      intervals.push(
         createInterval(() => {
            runGarbageCollection()
            console.log('🧹 Garbage collector dipanggil, memori dibersihkan')
         }, gcInterval)
      )
   }

   return intervals
}

export const stopIntervals = (intervals = []) => {
   for (const interval of intervals) clearInterval(interval)
}

export default startCacheCleaner
