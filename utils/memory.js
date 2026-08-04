/**
 * Memory & garbage collection helpers.
 */
import { formatSize } from '../lib/Utilities.js'

/**
 * Get a snapshot of the current process memory usage.
 */
export const getMemoryUsage = () => process.memoryUsage()

/**
 * Human readable summary of current RSS / heap usage.
 */
export const getMemorySummary = () => {
   const memory = process.memoryUsage()
   return {
      rss: formatSize(memory.rss),
      heapTotal: formatSize(memory.heapTotal),
      heapUsed: formatSize(memory.heapUsed),
      external: formatSize(memory.external),
      rssBytes: memory.rss
   }
}

/**
 * Run the V8 garbage collector if it is exposed (--expose-gc).
 */
export const runGarbageCollection = () => {
   if (typeof global.gc === 'function') {
      global.gc()
      return true
   }
   return false
}

/**
 * Periodically run the garbage collector if it is exposed.
 * Returns the interval so callers can clear it.
 */
export const startGarbageCollector = (intervalMs = global.gcInterval || 3_600_000) => {
   if (typeof global.gc !== 'function') {
      console.log('🧹 GC tidak diekspos (jalankan dengan --expose-gc untuk aktif)')
      return null
   }

   const interval = setInterval(() => {
      runGarbageCollection()
      console.log('🧹 Garbage collector dipanggil, memori dibersihkan')
   }, intervalMs)

   if (interval.unref) interval.unref()
   return interval
}

/**
 * Check whether the process RSS has crossed the configured limit.
 */
export const isMemoryOverLimit = (limitBytes = global.rssLimit || 768 * 1024 * 1024) =>
   process.memoryUsage().rss >= limitBytes

/**
 * Best-effort size estimate of an object using JSON.stringify.
 * Returns 0 when the object is not serializable.
 */
export const estimateObjectSize = (value) => {
   try {
      return Buffer.byteLength(JSON.stringify(value))
   }
   catch {
      return 0
   }
}

/**
 * Safely clear a LRU / Map cache if it exposes a .clear() method.
 */
export const clearCache = (cache) => {
   try {
      if (cache && typeof cache.clear === 'function') {
         cache.clear()
         return true
      }
   }
   catch { }
   return false
}

export default {
   getMemoryUsage,
   getMemorySummary,
   runGarbageCollection,
   startGarbageCollector,
   isMemoryOverLimit,
   estimateObjectSize,
   clearCache
}
