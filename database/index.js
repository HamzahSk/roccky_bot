/**
 * Database facade.
 *
 * Exposes:
 *  - `Database(path)` / `Store(path)` data stores (users, groups, messages) that
 *    transparently persist to an online database when one is configured, otherwise
 *    to local JSON files.
 *  - `connectDatabase` / `connectSessionDatabase` connection bootstrap with
 *    automatic reconnect.
 *  - `createSessionStore` used by the WhatsApp auth-state adapter.
 */
import { join, resolve } from 'path'
import { existsSync } from 'fs'
import { readFile, writeFile, mkdir } from 'fs/promises'

import { dataConnection, sessionConnection } from './connection.js'
import { createCloudSectionedBlobStore, createCloudSessionStore } from './cloud.js'
import { createLocalFileStore } from './local.js'

import { MAX_MESSAGES, SCHEMA } from '../lib/Constants.js'
import { Func } from '#func'

const DEFAULT_CLOUD_TABLE = 'roccky_data'

// Backward-compatible alias for the old `connectCloudDB` export.
export const connectCloudDB = async (url, options = {}) =>
   connectDatabase(url, options)

/**
 * Connect the main data database (users/groups/settings).
 */
export const connectDatabase = async (url, { databaseName = global.databaseName || 'roccky' } = {}) => {
   if (!url) return false

   const sessionTable = global.sessionTable || 'wa_sessions'
   const connected = await dataConnection.connect(url, { databaseName, tables: [DEFAULT_CLOUD_TABLE, sessionTable] })

   if (connected)
      await dataConnection.startReconnectLoop()

   return connected
}

/**
 * Connect the dedicated session database (used to persist the WhatsApp session).
 * When no separate URL is given, sessions share the main data connection.
 */
export const connectSessionDatabase = async (url, { databaseName = global.sessionDatabaseName || 'roccky' } = {}) => {
   if (!url) return false

   const sessionTable = global.sessionTable || 'wa_sessions'
   const connected = await sessionConnection.connect(url, { databaseName, tables: [DEFAULT_CLOUD_TABLE, sessionTable] })

   if (connected)
      await sessionConnection.startReconnectLoop()

   return connected
}

/**
 * Resolve a full-blob store (database.json / store.json) against cloud or local.
 * When connected to the cloud, data is stored in small indexed rows (sectioned)
 * instead of one giant document, keeping read/write light.
 */
const createBlobStore = ({ filePath, key, connection, sections }) => {
   if (connection.connected)
      return createCloudSectionedBlobStore({
         connection,
         table: DEFAULT_CLOUD_TABLE,
         key,
         sections
      })

   return createLocalFileStore(filePath, { key })
}

/**
 * Local folder-based session store (fallback when no online DB is available).
 * Reads legacy `creds.json` files so existing `session/` folders still work.
 */
export const createLocalSessionStore = (folder) => {   const folderPath = resolve(process.cwd(), folder)
   const fixFileName = (key) => String(key).replace(/\//g, '_')

   const filePathFor = (key) => join(folderPath, fixFileName(key))

   const read = async (key) => {
      try {
         return JSON.parse(await readFile(filePathFor(key), 'utf-8'))
      }
      catch (error) {
         if (error.code !== 'ENOENT') return null

         // Legacy compatibility with useMultiFileAuthState format (creds.json).
         if (key === 'creds') {
            const legacyPath = join(folderPath, 'creds.json')
            if (existsSync(legacyPath)) {
               try {
                  return JSON.parse(await readFile(legacyPath, 'utf-8'))
               }
               catch { }
            }
         }
         return null
      }
   }

   const write = async (key, value) => {
      await mkdir(folderPath, { recursive: true })
      await writeFile(filePathFor(key), JSON.stringify(value))
   }

   const remove = async (key) => {
      try {
         const { unlink } = await import('fs/promises')
         await unlink(filePathFor(key))
      }
      catch { }
   }

   const clear = async () => {
      const { readdir, rm } = await import('fs/promises')
      try {
         const entries = await readdir(folderPath)
         await Promise.all(
            entries.map((name) => rm(join(folderPath, name), { recursive: true, force: true }))
         )
      }
      catch { }
   }

   return { read, write, remove, clear }
}

/**
 * Build the WhatsApp session store:
 *  - dedicated session DB (when configured),
 *  - otherwise the main data DB (when connected),
 *  - otherwise the local `session/` folder.
 */
export const createSessionStore = () => {
   const sessionTable = global.sessionTable || 'wa_sessions'

   if (sessionConnection.connected)
      return createCloudSessionStore({
         connection: sessionConnection,
         table: sessionTable
      })

   if (dataConnection.connected)
      return createCloudSessionStore({
         connection: dataConnection,
         table: sessionTable
      })

   return createLocalSessionStore(global.authFolder || 'session')
}

export const isSessionStoredOnline = () =>
   sessionConnection.connected || dataConnection.connected

// ============================================================
//  DATABASE & STORE (users / groups / messages / settings)
// ============================================================

export const Database = (databasePath = global.databaseFilename) => {
   const key = databasePath.replace(/\.json$/, '').split(/[\\/]/).pop() || 'database'
   const blobStore = createBlobStore({
      filePath: databasePath,
      key,
      connection: dataConnection,
      sections: ['users', 'groups', 'settings']
   })

   let users = new Map(),
      groups = new Map(),
      settings = {}

   return {
      users, groups, settings,
      updateUser(id, value) { users.set(id, { ...users.get(id) || {}, ...value }) },
      getUser(id) { return users.get(id) },
      hasUser(id) { return users.has(id) },
      deleteUser(id) { users.delete(id) },
      updateGroup(id, value) { groups.set(id, { ...groups.get(id) || {}, ...value }) },
      getGroup(id) { return groups.get(id) },
      hasGroup(id) { return groups.has(id) },
      deleteGroup(id) { groups.delete(id) },
      getSetting() { return settings },
      async readFromFile(file) {
         const source = file ? createLocalFileStore(file) : blobStore
         const raw = await source.read()
         users.clear()
         for (const [id, data] of Object.entries(raw.users || {})) {
            Func.applySchema(data, SCHEMA.User)
            users.set(id, data)
         }
         groups.clear()
         for (const [id, data] of Object.entries(raw.groups || {})) {
            Func.applySchema(data, SCHEMA.Group)
            groups.set(id, data)
         }
         const setting = Object.assign({}, raw.settings || {})
         Func.applySchema(setting, SCHEMA.Setting)
         Object.assign(settings, setting)
      },
      async writeToFile() {
         const out = { users: {}, groups: {}, settings: {} }
         for (const [id, data] of users) out.users[id] = data
         for (const [id, data] of groups) out.groups[id] = data
         out.settings = settings
         await blobStore.write(out)
      }
   }
}

export const Store = (storePath = global.storeFilename) => {
   const key = storePath.replace(/\.json$/, '').split(/[\\/]/).pop() || 'store'
   const blobStore = createBlobStore({
      filePath: storePath,
      key,
      connection: dataConnection,
      sections: ['messages', 'contacts', 'groupMetadata']
   })

   let messages = {},
      contacts = new Map(),
      groupMetadata = new Map()

   return {
      messages, contacts, groupMetadata,
      setMessage(message) {
         let chat = messages[message.chat]
         if (!chat) chat = messages[message.chat] = new Map()
         if (chat.has(message.id)) chat.delete(message.id)
         chat.set(message.id, message)
         if (chat.size > MAX_MESSAGES) {
            const oldestKey = chat.keys().next().value
            chat.delete(oldestKey)
         }
      },
      getMessage(message) { return messages[message.chat]?.get(message.id) },
      hasMessage(message) { return messages[message.chat]?.has(message.id) },
      deleteMessage(message) { messages[message.chat]?.delete(message.id) },
      setGroup(id, metadata) { groupMetadata.set(id, metadata) },
      getGroup(id) { return groupMetadata.get(id) },
      hasGroup(id) { return groupMetadata.has(id) },
      deleteGroup(id) { groupMetadata.delete(id) },
      async readFromFile(file) {
         const source = file ? createLocalFileStore(file) : blobStore
         const raw = await source.read()
         messages = {}
         for (const [chatId, chatMessages] of Object.entries(raw.messages || {}))
            messages[chatId] = new Map(Object.entries(chatMessages))
         contacts.clear()
         for (const [id, data] of Object.entries(raw.contacts || {}))
            contacts.set(id, data)
         groupMetadata.clear()
         for (const [id, metadata] of Object.entries(raw.groupMetadata || {}))
            groupMetadata.set(id, metadata)
      },
      async writeToFile() {
         const out = { messages: {}, contacts: {}, groupMetadata: {} }
         for (const [chatId, map] of Object.entries(messages)) {
            if (map.size > 0) out.messages[chatId] = Object.fromEntries(map)
         }
         for (const [id, data] of contacts) out.contacts[id] = data
         for (const [id, data] of groupMetadata) out.groupMetadata[id] = data
         await blobStore.write(out)
      }
   }
}

export default {
   connectDatabase,
   connectSessionDatabase,
   connectCloudDB,
   createSessionStore,
   createLocalSessionStore,
   isSessionStoredOnline,
   Database,
   Store,
   dataConnection,
   sessionConnection
}
