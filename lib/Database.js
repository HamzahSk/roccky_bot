import { mkdir, readFile, rename, writeFile } from 'fs/promises'
import { basename, dirname, resolve } from 'path'
import { MongoClient } from 'mongodb'
import pg from 'pg'

import { MAX_MESSAGES, SCHEMA } from './Constants.js'
import { Func } from '#func'
// ==========================================
// MESIN CLOUD DATABASE (POSTGRES & MONGO)
// ==========================================
export let isCloudConnected = false;
let cloudDbClient = null;
let cloudDbType = null;
let mongoDbInstance = null;

export const connectCloudDB = async (url) => {
   if (!url) return false;
   console.log('🔄 Menyambungkan ke Cloud Database...');
   try {
      if (url.startsWith('mongodb')) {
         cloudDbType = 'mongodb';
         cloudDbClient = new MongoClient(url);
         await cloudDbClient.connect();
         mongoDbInstance = cloudDbClient.db(global.databaseName || 'roccky');
         console.log('✅ Terhubung ke MongoDB!');
      } else {
         cloudDbType = 'postgres';
         cloudDbClient = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
         // OPTIMISASI: Mengubah tipe data kolom dari JSONB ke TEXT agar tidak membebani CPU server/cloud untuk auto-parsing JSON
         await cloudDbClient.query(`CREATE TABLE IF NOT EXISTS roccky_data (file_key TEXT PRIMARY KEY, json_data TEXT);`);
         console.log('✅ Terhubung ke PostgreSQL!');
      }
      isCloudConnected = true;
      return true;
   } catch (error) {
      console.error('❌ Gagal terhubung ke Cloud Database:', error.message);
      console.log('⚠️ Menggunakan penyimpanan File Lokal.');
      return false;
   }
}

// ==========================================
// UPGRADE LOCAL DATABASE (Bisa Cloud / Lokal)
// ==========================================
export const LocalDatabase = (fileName = global.databaseFilename) => {
   const filePath = resolve(process.cwd(), fileName)
   const dbKey = basename(fileName, '.json')

   let isWriting = false,
      isPending = false

   const bufferReviver = (key, value) => {
      if (!value?.data || !value.__type) return value

      const buffer = Buffer.from(value.data, 'base64')
      if (value.__type === 'Buffer') return buffer
      if (value.__type === 'ArrayBuffer') return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

      const TypedArray = globalThis[value.__type]
      return TypedArray ? new TypedArray(buffer.buffer, buffer.byteOffset, buffer.byteLength / TypedArray.BYTES_PER_ELEMENT) : value
   }

   const bufferReplacer = (seen) => (key, value) => {
      if (typeof value === 'function') return

      if (value?.type === 'Buffer' && Array.isArray(value?.data))
         return { __type: 'Buffer', data: Buffer.from(value.data).toString('base64') }
      if (Buffer.isBuffer(value))
         return { __type: 'Buffer', data: value.toString('base64') }
      if (value instanceof ArrayBuffer)
         return { __type: 'ArrayBuffer', data: Buffer.from(value).toString('base64') }
      if (ArrayBuffer.isView(value))
         return { __type: value.constructor.name, data: Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('base64') }

      if (value && typeof value === 'object') {
         if (seen.has(value)) return
         seen.add(value)
      }
      return value
   }

   const read = async (file = filePath) => {
      try {
         let contentString = '{}'

         if (isCloudConnected) {
            console.log(`📥 Membaca ${dbKey} dari Cloud...`)
            if (cloudDbType === 'mongodb') {
               const doc = await mongoDbInstance.collection('roccky_data').findOne({ _id: dbKey })
               if (doc && doc.json_data) {
                  // OPTIMISASI: Jika tipe data di cloud sudah string, langsung pakai (Bypass JSON.stringify)
                  contentString = typeof doc.json_data === 'string' ? doc.json_data : JSON.stringify(doc.json_data)
               }
            } else {
               const res = await cloudDbClient.query(`SELECT json_data FROM roccky_data WHERE file_key = $1`, [dbKey])
               if (res.rows.length > 0) {
                  contentString = typeof res.rows[0].json_data === 'string' ? res.rows[0].json_data : JSON.stringify(res.rows[0].json_data)
               }
            }
         } 
         else {
            try {
               contentString = await readFile(file, 'utf-8')
            } catch {
               await mkdir(dirname(file), { recursive: true })
               await writeFile(file, '{}', 'utf-8')
            }
         }

         return JSON.parse(contentString, bufferReviver)
      }
      catch (error) {
         console.error(`❌ Problem membaca ${dbKey} :`, error.message)
         return {}
      }
   }

   const write = async (data = {}) => {
      if (isWriting) {
         isPending = true
         return
      }
      isWriting = true
      try {
         const seen = new WeakSet()
         const jsonString = JSON.stringify(data, bufferReplacer(seen))
         
         // DIAGNOSTIK: Menampilkan ukuran data asli di konsol agar terpantau jika ukuran membengkak
         console.log(`💾 [Database] Menulis ${dbKey} | Ukuran: ${(jsonString.length / 1024 / 1024).toFixed(2)} MB`);

         if (isCloudConnected) {
            if (cloudDbType === 'mongodb') {
               // OPTIMISASI: Simpan langsung sebagai raw string di Mongo, jangan di-parse balik jadi object BSON
               await mongoDbInstance.collection('roccky_data').updateOne(
                  { _id: dbKey }, { $set: { json_data: jsonString } }, { upsert: true }
               )
            } else {
               // OPTIMISASI: Simpan sebagai TEXT biasa di Postgres (Menghapus casting ::jsonb yang lambat)
               await cloudDbClient.query(
                  `INSERT INTO roccky_data (file_key, json_data) VALUES ($1, $2) ON CONFLICT (file_key) DO UPDATE SET json_data = EXCLUDED.json_data`,
                  [dbKey, jsonString]
               )
            }
         } 
         else {
            await mkdir(dirname(filePath), { recursive: true })
            const temp = filePath + '.temp'
            await writeFile(temp, jsonString, 'utf-8')
            await rename(temp, filePath)
         }
      }
      catch (error) {
         console.error(`❌ Problem menulis ${dbKey} :`, error.message)
      }
      finally {
         isWriting = false
         if (isPending) {
            isPending = false
            await write(data)
         }
      }
   }

   return { read, write }
}

// ==========================================
// DATABASE & STORE
// ==========================================
export const Database = (databasePath = global.databaseFilename) => {
   const db = LocalDatabase(databasePath)
   let users = new Map(), groups = new Map(), settings = {}

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
         const raw = await db.read(file)
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
         let setting = Object.assign({}, raw.settings || {})
         Func.applySchema(setting, SCHEMA.Setting)
         Object.assign(settings, setting)
      },
      async writeToFile() {
         const out = { users: {}, groups: {}, settings: {} }
         for (const [id, data] of users) out.users[id] = data
         for (const [id, data] of groups) out.groups[id] = data
         out.settings = settings
         await db.write(out)
      }
   }
}

export const Store = (storePath = global.storeFilename) => {
   const db = LocalDatabase(storePath)
   let messages = {}, contacts = new Map(), groupMetadata = new Map()

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
         const raw = await db.read(file)
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
            // OPTIMISASI: Hanya simpan chat yang memang memiliki histori pesan (menghindari chat kosong menumpuk)
            if (map.size > 0) out.messages[chatId] = Object.fromEntries(map)
         }
         for (const [id, data] of contacts) out.contacts[id] = data
         for (const [id, metadata] of groupMetadata) out.groupMetadata[id] = metadata
         await db.write(out)
      }
   }
}
