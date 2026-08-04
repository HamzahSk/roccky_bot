/**
 * Cloud database connection (MongoDB / PostgreSQL) as a reusable factory.
 *
 * Each connection owns a pool/instance and is able to:
 *  - connect lazily,
 *  - self-heal through an automatic reconnect loop,
 *  - expose low-level read/write helpers for blob & session stores.
 */
import { MongoClient } from 'mongodb'
import pg from 'pg'

export const CLOUD_TYPES = Object.freeze({
   MONGO: 'mongodb',
   POSTGRES: 'postgres'
})

const DEFAULT_RECONNECT_DELAY_MS = 10_000
const DEFAULT_HEALTH_INTERVAL_MS = 30_000

const detectType = (url = '') => {
   if (url.startsWith('mongodb') || url.startsWith('mongodb+srv')) return CLOUD_TYPES.MONGO
   return CLOUD_TYPES.POSTGRES
}

export const createCloudConnection = ({ name = 'cloud' } = {}) => {
   let client = null
   let database = null
   let connectionType = null
   let connectionConfig = null
   let isConnected = false
   let healthTimer = null
   let reconnectPromise = null

   const log = (message) => console.log(`🗄️  [${name}] ${message}`)
   const logError = (message) => console.error(`❌ [${name}] ${message}`)

   const createMongoClient = async (url, databaseName) => {
      const mongoClient = new MongoClient(url, {
         serverSelectionTimeoutMS: 10_000,
         connectTimeoutMS: 10_000,
         maxPoolSize: 20
      })

      await mongoClient.connect()
      const mongoDb = mongoClient.db(databaseName)
      await mongoDb.command({ ping: 1 })

      return { client: mongoClient, database: mongoDb }
   }

   const createPgPool = async (url) => {
      const baseConfig = {
         connectionString: url,
         max: 20,
         idleTimeoutMillis: 30_000,
         connectionTimeoutMillis: 10_000
      }

      // Respect an explicit sslmode in the URL when present.
      const sslMode = (url.match(/(?:[?&])sslmode=([^&]+)/) || [])[1]

      const buildPool = (ssl) => new pg.Pool({ ...baseConfig, ...(ssl === null ? {} : { ssl }) })

      const probe = async (pool) => {
         await pool.query('SELECT 1')
         return pool
      }

      // Strategy: try SSL first (required by most cloud providers), then fall back
      // to plain connections (local/dev servers).
      if (sslMode === 'disable' || sslMode === 'allow' || sslMode === 'prefer') {
         return { client: await probe(buildPool(null)), database: null }
      }

      try {
         return { client: await probe(buildPool({ rejectUnauthorized: false })), database: null }
      }
      catch (error) {
         try {
            return { client: await probe(buildPool(null)), database: null }
         }
         catch {
            throw error
         }
      }
   }

   const ensureTable = async (table) => {
      if (connectionType !== CLOUD_TYPES.POSTGRES) return
      await client.query(
         `CREATE TABLE IF NOT EXISTS ${table} (file_key TEXT PRIMARY KEY, json_data TEXT)`
      )
   }

   const connect = async (url, { databaseName = 'roccky', tables = ['roccky_data'] } = {}) => {
      if (!url) return false
      if (isConnected && connectionType) return true

      connectionConfig = { url, databaseName, type: detectType(url) }
      log(`Menyambungkan ke ${connectionConfig.type === CLOUD_TYPES.MONGO ? 'MongoDB' : 'PostgreSQL'}...`)

      try {
         const created =
            connectionConfig.type === CLOUD_TYPES.MONGO
               ? await createMongoClient(url, databaseName)
               : await createPgPool(url)

         client = created.client
         database = created.database
         connectionType = connectionConfig.type
         isConnected = true

         // Surface idle-client errors without crashing the process.
         if (connectionType === CLOUD_TYPES.POSTGRES) {
            client.on('error', (error) => {
               logError(`PostgreSQL pool error: ${error.message}`)
               if (['57P01', '08006', '57P02'].includes(error.code)) isConnected = false
            })
         }

         for (const table of new Set(tables))
            await ensureTable(table)

         log(`Terhubung ke ${connectionType === CLOUD_TYPES.MONGO ? 'MongoDB' : 'PostgreSQL'}!`)
         return true
      }
      catch (error) {
         logError(`Gagal terhubung: ${error.message}`)
         isConnected = false
         client = null
         database = null
         return false
      }
   }

   const ping = async () => {
      if (!client) return false

      try {
         if (connectionType === CLOUD_TYPES.MONGO) await database.command({ ping: 1 })
         else await client.query('SELECT 1')

         if (!isConnected) {
            isConnected = true
            log('Koneksi database pulih.')
         }
         return true
      }
      catch (error) {
         if (isConnected) logError(`Koneksi database terputus: ${error.message}`)
         isConnected = false
         return false
      }
   }

   const startReconnectLoop = async ({
      intervalMs = DEFAULT_HEALTH_INTERVAL_MS,
      maxReconnectAttempts = Infinity
   } = {}) => {
      if (healthTimer) return healthTimer
      if (!connectionConfig) return null

      let attempt = 0

      healthTimer = setInterval(async () => {
         if (await ping()) {
            attempt = 0
            return
         }

         attempt++
         if (attempt > maxReconnectAttempts) return
         if (reconnectPromise) return

         const delayMs = Math.min(DEFAULT_RECONNECT_DELAY_MS * attempt, 60_000)
         log(`Mencoba reconnect (${attempt}) dalam ${Math.round(delayMs / 1000)}s...`)

         reconnectPromise = new Promise((resolve) => {
            setTimeout(async () => {
               const success = await connect(connectionConfig.url, {
                  databaseName: connectionConfig.databaseName
               })
               reconnectPromise = null
               resolve(success)
            }, delayMs)
         })

         await reconnectPromise.catch(() => {})
      }, intervalMs)

      if (healthTimer.unref) healthTimer.unref()
      return healthTimer
   }

   const stopReconnectLoop = () => {
      if (healthTimer) {
         clearInterval(healthTimer)
         healthTimer = null
      }
   }

   const close = async () => {
      stopReconnectLoop()
      try {
         if (client) {
            if (connectionType === CLOUD_TYPES.MONGO) await client.close()
            else await client.end()
         }
      }
      catch (error) {
         logError(`Gagal menutup koneksi: ${error.message}`)
      }
      finally {
         client = null
         database = null
         isConnected = false
      }
   }

   const ensureReady = () => {
      if (!isConnected || !client) throw new Error(`${name} database tidak terhubung`)
   }

   const readData = async (table, key) => {
      ensureReady()

      if (connectionType === CLOUD_TYPES.MONGO) {
         const doc = await database.collection(table).findOne({ _id: key })
         return doc ? doc.json_data : null
      }

      const result = await client.query(
         `SELECT json_data FROM ${table} WHERE file_key = $1`,
         [key]
      )
      return result.rows.length ? result.rows[0].json_data : null
   }

   const writeData = async (table, key, jsonString) => {
      ensureReady()

      if (connectionType === CLOUD_TYPES.MONGO) {
         await database.collection(table).updateOne(
            { _id: key },
            { $set: { json_data: jsonString } },
            { upsert: true }
         )
         return
      }

      await client.query(
         `INSERT INTO ${table} (file_key, json_data) VALUES ($1, $2)
          ON CONFLICT (file_key) DO UPDATE SET json_data = EXCLUDED.json_data`,
         [key, jsonString]
      )
   }

   const deleteData = async (table, key) => {
      ensureReady()

      if (connectionType === CLOUD_TYPES.MONGO) {
         await database.collection(table).deleteOne({ _id: key })
         return
      }

      await client.query(`DELETE FROM ${table} WHERE file_key = $1`, [key])
   }

   const clearTable = async (table) => {
      ensureReady()

      if (connectionType === CLOUD_TYPES.MONGO) {
         await database.collection(table).deleteMany({})
         return
      }

      await client.query(`DELETE FROM ${table}`)
   }

   return {
      get connected() { return isConnected },
      get type() { return connectionType },
      connect,
      ping,
      startReconnectLoop,
      stopReconnectLoop,
      close,
      readData,
      writeData,
      deleteData,
      clearTable
   }
}

// Convenient pre-built instances used by the rest of the application.
export const dataConnection = createCloudConnection({ name: 'DataDB' })
export const sessionConnection = createCloudConnection({ name: 'SessionDB' })
