/**
 * Online WhatsApp session / auth-state adapter.
 *
 * Drop-in replacement for Baileys `useMultiFileAuthState` that persists the
 * session (creds + signal keys) to an online database, so the bot keeps its
 * session across restarts without re-scanning the QR code.
 *
 * Usage:
 *   const { state, saveCreds } = await useDatabaseAuthState(sessionStore)
 *   makeWASocket({ auth: { creds: state.creds, keys: state.keys } })
 *   sock.ev.on('creds.update', saveCreds)
 */
import { randomBytes } from 'crypto'
import * as baileys from 'baileys'
import { LRUCache } from 'lru-cache'

const initAuthCreds = baileys.initAuthCreds || createFallbackCreds

// Minimal fallback used only if the Baileys fork does not export initAuthCreds.
function createFallbackCreds() {
   return {
      caseId: null,
      registered: false,
      deviceId: randomBytes(4).toString('base64url'),
      keys: {},
      signedPreKey: {},
      advSecretKey: randomBytes(32).toString('base64'),
      nextPreKeyId: 1,
      firstUnuploadedPreKeyId: 1,
      accountSyncCounter: 0,
      accountSettings: { unarchiveChats: false },
      me: {}
   }
}

export const useDatabaseAuthState = async (sessionStore, { cacheSize = 1000 } = {}) => {
   const keyCache = new LRUCache({
      max: cacheSize,
      ttl: 5 * 60 * 1000,
      updateAgeOnGet: false,
      updateAgeOnHas: false
   })

   const getKey = async (keyId) => {
      const cached = keyCache.get(keyId)
      if (cached !== undefined) return cached

      const data = await sessionStore.read(keyId)
      if (data) keyCache.set(keyId, data)
      return data || null
   }

   const setKey = async (keyIds, data) => {
      for (const keyId of keyIds) {
         const value = data[keyId]
         if (!value) continue
         keyCache.set(keyId, value)
         await sessionStore.write(keyId, value)
      }
   }

   const creds = (await sessionStore.read('creds')) || initAuthCreds()

   return {
      state: {
         creds,
         keys: {
            get: getKey,
            set: setKey
         }
      },
      saveCreds: async () => {
         await sessionStore.write('creds', creds)
      },
      clear: async () => {
         keyCache.clear()
         await sessionStore.clear()
      }
   }
}

export default useDatabaseAuthState
