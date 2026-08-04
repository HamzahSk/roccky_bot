/**
 * Local JSON-file store.
 *
 * Stores an arbitrary value as a single JSON blob file. Atomic writes are
 * performed via a temp file + rename to avoid corruption on crash.
 */
import { mkdir, readFile, rename, unlink, writeFile } from 'fs/promises'
import { basename, dirname, join, resolve } from 'path'

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

export const createLocalFileStore = (filePath, { key = basename(filePath, '.json') } = {}) => {
   const resolvedPath = resolve(process.cwd(), filePath)
   const dirPath = dirname(resolvedPath)

   const read = async () => {
      try {
         const content = await readFile(resolvedPath, 'utf-8')
         return JSON.parse(content, bufferReviver)
      }
      catch (error) {
         if (error.code === 'ENOENT') {
            await mkdir(dirPath, { recursive: true })
            await writeFile(resolvedPath, '{}', 'utf-8')
            return {}
         }
         console.error(`❌ Problem membaca ${key}: ${error.message}`)
         return {}
      }
   }

   const write = async (data) => {
      const seen = new WeakSet()
      const jsonString = JSON.stringify(data, bufferReplacer(seen))

      await mkdir(dirPath, { recursive: true })
      const tempPath = resolvedPath + '.temp'
      await writeFile(tempPath, jsonString, 'utf-8')
      await rename(tempPath, resolvedPath)
   }

   const remove = async () => {
      try {
         await unlink(resolvedPath)
      }
      catch { }
   }

   const clear = remove

   return { key, read, write, remove, clear }
}

export default createLocalFileStore
