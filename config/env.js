import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'

const isBun = typeof Bun !== 'undefined'

const parseLine = (line) => {
   const trimmed = line.trim()
   if (!trimmed || trimmed.startsWith('#')) return null

   const separatorIndex = trimmed.indexOf('=')
   if (separatorIndex === -1) return null

   const rawKey = trimmed.slice(0, separatorIndex).trim()
   let value = trimmed.slice(separatorIndex + 1).trim()

   if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
   )
      value = value.slice(1, -1)
   else {
      const commentIndex = value.indexOf(' #')
      if (commentIndex !== -1) value = value.slice(0, commentIndex).trim()
   }

   if (!rawKey) return null

   return [rawKey, value]
}

/**
 * Load `.env` file into `process.env` (without overwriting existing values).
 * Works on Node.js, Bun and Termux. Dependency-free.
 */
export const loadEnv = (path = resolve(process.cwd(), '.env')) => {
   if (!existsSync(path)) return false

   try {
      const content = readFileSync(path, 'utf-8')

      for (const rawLine of content.split('\n')) {
         const parsed = parseLine(rawLine)
         if (!parsed) continue

         const [key, value] = parsed
         if (key in process.env) continue
         process.env[key] = value
      }

      console.log(`🌱 Loaded environment from ${join(process.cwd(), '.env')}`)
      return true
   }
   catch (error) {
      console.warn(`⚠️ Failed to load .env file: ${error.message}`)
      return false
   }
}

// Load .env once at import time so all globals below can read it.
if (!isBun) loadEnv()
else {
   try {
      loadEnv()
   } catch { }
}
