/**
 * Centralized error-handling helpers.
 */

/**
 * Resolve a promise into a [result, error] tuple (never throws).
 */
export const safeAwait = async (promise) => {
   try {
      return [await promise, null]
   }
   catch (error) {
      return [null, error]
   }
}

/**
 * Wrap an async function so unexpected errors are logged and swallowed instead
 * of crashing the process.
 */
export const withErrorHandling = (fn, { context = 'handler', onError } = {}) =>
   async (...args) => {
      try {
         return await fn(...args)
      }
      catch (error) {
         logError(error, context)
         if (typeof onError === 'function') onError(error, ...args)
         return undefined
      }
   }

/**
 * Print a structured error to the console (supports Error objects & strings).
 */
export const logError = (error, context = '') => {
   const message = error?.stack || error?.message || String(error)
   const prefix = context ? `❌ [${context}]` : '❌'
   console.error(`${prefix} ${message}`)
}

/**
 * Safe wrapper around a non-async function.
 */
export const tryCatch = (fn, fallback = undefined) => {
   try {
      return fn()
   }
   catch (error) {
      logError(error)
      return fallback
   }
}

export default {
   safeAwait,
   withErrorHandling,
   logError,
   tryCatch
}
