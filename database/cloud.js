/**
 * Cloud-backed stores that share a single connection instance from connection.js.
 */
import { dataConnection } from './connection.js'

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

export const serializeWithBuffers = (value) => {
   const seen = new WeakSet()
   return JSON.stringify(value, bufferReplacer(seen))
}

export const deserializeWithBuffers = (jsonString) =>
   JSON.parse(jsonString, bufferReviver)

/**
 * Serialize write requests so overlapping writes are coalesced into a single
 * trailing write (prevents a write storm to the DB / disk).
 */
export const createDebouncedWriter = (writeFn) => {
   let isWriting = false
   let isPending = false

   const write = async (data) => {
      if (isWriting) {
         isPending = true
         return
      }

      isWriting = true
      try {
         await writeFn(data)
      }
      finally {
         isWriting = false
         if (isPending) {
            isPending = false
            await write(data)
         }
      }
   }

   return write
}

/**
 * Full-blob store: one JSON document per logical file (database.json, store.json).
 */
export const createCloudBlobStore = ({ connection = dataConnection, table, key }) => {
   const read = async () => {
      const jsonString = await connection.readData(table, key)
      if (!jsonString) return null
      return deserializeWithBuffers(jsonString)
   }

   const write = createDebouncedWriter(async (data) => {
      await connection.writeData(table, key, serializeWithBuffers(data))
   })

   const remove = () => connection.deleteData(table, key)
   const clear = remove

   return { read, write, remove, clear }
}

/**
 * Sectioned blob store: splits a logical file into independent indexed rows
 * (one per section), so each read/write touches a small document instead of the
 * entire database. Unchanged sections are skipped entirely (dirty tracking).
 *
 * Automatically migrates data from the legacy single-document layout.
 */
export const createCloudSectionedBlobStore = ({
   connection = dataConnection,
   table,
   key,
   sections = ['users', 'groups', 'settings']
}) => {
   const sectionKeys = Object.fromEntries(
      sections.map((name) => [name, `${key}:${name}`])
   )

   let lastWritten = {}

   const resetDirtyState = () => { lastWritten = {} }

   const read = async () => {
      const results = await Promise.all(
         sections.map((name) => connection.readData(table, sectionKeys[name]))
      )

      const parsed = {}
      let hasAnySection = false
      for (let i = 0; i < sections.length; i++) {
         const jsonString = results[i]
         if (jsonString) {
            parsed[sections[i]] = deserializeWithBuffers(jsonString)
            hasAnySection = true
         }
         else {
            parsed[sections[i]] = null
         }
      }

      // Migration: legacy single-document blob stored under the plain key.
      // Persist the split rows once, then remove the old blob (retried next boot).
      if (!hasAnySection) {
         const legacy = await connection.readData(table, key)
         if (legacy) {
            const migrated = deserializeWithBuffers(legacy)
            const out = { users: {}, groups: {}, settings: {} }
            for (const name of sections) out[name] = migrated[name] ?? {}

            const persistMigration = async () => {
               try {
                  for (const name of sections) {
                     const jsonString = serializeWithBuffers(out[name])
                     await connection.writeData(table, sectionKeys[name], jsonString)
                     lastWritten[name] = jsonString
                  }
                  await connection.deleteData(table, key)
               }
               catch { /* next read retries the migration */ }
            }
            persistMigration()

            resetDirtyState()
            return out
         }
      }

      const out = {}
      for (const name of sections) out[name] = parsed[name] ?? {}
      resetDirtyState()
      return out
   }

   const writeSection = createDebouncedWriter(async ({ name, jsonString }) => {
      if (lastWritten[name] === jsonString) return
      lastWritten[name] = jsonString
      await connection.writeData(table, sectionKeys[name], jsonString)
   })

   const write = async (data) => {
      for (const name of sections) {
         if (data[name] === undefined) continue
         await writeSection({ name, jsonString: serializeWithBuffers(data[name]) })
      }
   }

   const remove = async () => {
      for (const name of sections) {
         try { await connection.deleteData(table, sectionKeys[name]) } catch { }
      }
      try { await connection.deleteData(table, key) } catch { }
   }

   const clear = remove

   return { read, write, remove, clear }
}

/**
 * Key-value store used by the WhatsApp session (creds + signal keys).
 */
export const createCloudSessionStore = ({ connection = dataConnection, table }) => {
   const read = async (key) => {
      const jsonString = await connection.readData(table, key)
      if (!jsonString) return null
      return JSON.parse(jsonString)
   }

   const write = createDebouncedWriter(async ({ key, value }) => {
      await connection.writeData(table, key, JSON.stringify(value))
   })

   const writeKey = (key, value) => write({ key, value })

   const remove = (key) => connection.deleteData(table, key)

   const clear = () => connection.clearTable(table)

   return { read, write: writeKey, remove, clear }
}

export const cloudAvailable = (connection = dataConnection) => connection.connected
