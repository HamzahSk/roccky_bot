import { delay, isJidGroup, S_WHATSAPP_NET, WA_DEFAULT_EPHEMERAL } from 'baileys'
import { fileTypeFromBuffer, fileTypeFromFile, fileTypeStream } from 'file-type'
import { LRUCache } from 'lru-cache'
import { once } from 'events'
import { spawn } from 'child_process'
import { createWriteStream } from 'fs'
import { access, unlink, readdir, readFile, rm, stat, writeFile } from 'fs/promises'
import { join, resolve } from 'path'
import { PassThrough, Readable } from 'stream'
import { pipeline } from 'stream/promises'

import { SECOND, MINUTE, HOUR, DAY, MENTION_REGEX, URL_REGEX, WEBP_EXIF_HEADER, WHATSAPP_URL_REGEX, FONT_MAPS } from '../Constants.js'
import { request } from '../Request.js'
import { CommandIndex } from '../Watcher.js'

// Objek Func sebagai namespace
import { Func } from '#func'

// ========== KONSTANTA ==========
Func.ProfilePictureCache = new LRUCache({
   max: 512,
   ttl: MINUTE * 10,
   updateAgeOnGet: false,
   updateAgeOnHas: false,
   ttlAutopurge: true
})

let napiImage

// ========== FUNGSI UTILITY ==========
Func.isEmptyObject = (object) => {
   for (const _ in object) return false
   return true
}

Func.createFileName = () =>
   `${process.pid}_${performance.now().toString().replace('.', '')}`

Func.randomHex = () =>
   `#${((Math.random() * 0xFFFFFF) | 0).toString(16).padStart(6, '0').toUpperCase()}`

Func.toTitleCase = (str = 'hello') =>
   String(str).replace(/\b\w/g, c => c.toUpperCase())

Func.parseMentions = (text) => {
   const result = []

   if (typeof text !== 'string') return result

   if (!text.includes('@')) return result

   let match

   MENTION_REGEX.lastIndex = 0
   while ((match = MENTION_REGEX.exec(text)) !== null)
      result.push(match[1] + S_WHATSAPP_NET)

   return result
}

Func.cleanUpFolder = async (path) => {
   try {
      const statistic = await stat(path)
      if (statistic.isFile()) {
         await unlink(path)
         return
      }

      const entries = await readdir(path)
      await Promise.all(
         entries.map(name =>
            rm(join(path, name), { recursive: true, force: true })
         )
      )
   }
   catch (error) {
      console.error('❌ ', error.message)
   }
}

Func.isFileExists = async (path) => {
   try {
      await access(path)
      return true
   }
   catch (error) {
      if (error.code === 'ENOENT') return false
      throw error
   }
}

/**
 * Memeriksa apakah string adalah URL yang valid.
 * Dibuat lebih fleksibel untuk menangani link CDN/Downloader yang kompleks.
 */
Func.isURL = (url) => {
   if (!url || typeof url !== 'string') return false

   try {
      if (typeof URL.canParse === 'function' && URL.canParse(url)) return true

      const URL_REGEX = /^(https?:\/\/)[^\s]+$/i
      if (URL_REGEX.test(url)) return true

      if (url.startsWith('http://') || url.startsWith('https://')) {
         if (url.includes('googlevideo.com') || url.includes('.vercel.app')) return true
      }

      new URL(url)
      return true
   } catch {
      return false
   }
}

Func.isWhatsAppURL = (string) => {
   if (typeof string !== 'string') return false

   return string.includes('whatsapp.com') || WHATSAPP_URL_REGEX.test(string)
}

Func.fetchAsBuffer = (url) => {
   if (url instanceof Buffer) return url

   if (typeof url !== 'string') return null

   if (Func.isURL(url))
      return request(url)

   return readFile(url)
}

Func.getDiskStats = async () => {
   const df = spawn('df', ['-k'])

   let output = ''
   df.stdout.on('data', chunk => {
      output += chunk
   })

   await once(df, 'close')

   const lines = output.trim().split('\n').slice(1)
   let primaryDisk = null

   for (const line of lines) {
      const parts = line.split(/\s+/)
      const [fs, size, used, avail, , mount] = parts

      if (
         fs.includes('tmpfs') ||
         fs.includes('devtmpfs') ||
         fs.includes('overlay') ||
         mount.startsWith('/dev') ||
         mount.startsWith('/proc')
      )
         continue

      const totalBytes = parseInt(size) * 1024

      if (!primaryDisk || totalBytes > primaryDisk.total)
         primaryDisk = {
            total: totalBytes,
            used: parseInt(used) * 1024,
            free: parseInt(avail) * 1024,
            mount
         }
   }

   return primaryDisk
}

Func.persistToFile = async (source) => {
   const isSourceURL = Func.isURL(source)

   if (typeof source === 'string' && !isSourceURL)
      return source

   if (source instanceof ArrayBuffer)
      source = Buffer.from(source)

   let readable, check

   if (source instanceof Buffer) {
      readable = Readable.from(source)
      check = await fileTypeFromBuffer(source)
   }
   else if (typeof source === 'string' && isSourceURL) {
      const response = await fetch(source, {
         headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
         }
      })

      if (!response.ok) {
         await response.body?.cancel()
         throw new Error(`Gagal fetch URL: ${response.status} ${response.statusText}`)
      }

      readable = await fileTypeStream(
         Readable.fromWeb(response.body)
      )
      check = readable.fileType
   }
   else
      throw new Error('Invalid source type')

   const extension = check?.ext || 'txt'
   const fileName = resolve(process.cwd(), temporaryFolder, Func.createFileName())
   const filePath = fileName + '.' + extension

   try {
      await pipeline(
         readable,
         createWriteStream(filePath)
      )
   } catch (err) {
      console.error('Error saat menulis file:', err)
      throw new Error('Gagal menyimpan media ke penyimpanan lokal')
   }

   return filePath
}

Func.createExif = (json) => {
   const jsonBuffer = Buffer.from(JSON.stringify(json))
   const exif = Buffer.concat([WEBP_EXIF_HEADER, jsonBuffer])

   exif.writeUIntLE(jsonBuffer.length, 14, 4)

   return exif
}

/* ********** EXPERIMENTAL FUNCTIONS ********** */
Func.ensureVP8X = (webpBuffer) => {
   const firstChunk = webpBuffer.toString('ascii', 12, 16)

   if (firstChunk === 'VP8X') return webpBuffer

   if (firstChunk !== 'VP8 ' && firstChunk !== 'VP8L')
      throw new Error('Unsupported WebP format')

   const width = 512 - 1
   const height = 512 - 1

   const vp8xChunk = Buffer.alloc(18)
   vp8xChunk.write('VP8X', 0)
   vp8xChunk.writeUInt32LE(10, 4)

   vp8xChunk[8] = 0

   vp8xChunk.fill(0, 9, 12)

   vp8xChunk.writeUIntLE(width, 12, 3)
   vp8xChunk.writeUIntLE(height, 15, 3)

   const before = webpBuffer.slice(0, 12)
   const after = webpBuffer.slice(12)

   const newBuffer = Buffer.concat([before, vp8xChunk, after])
   newBuffer.writeUInt32LE(newBuffer.length - 8, 4)

   return newBuffer
}

Func.writeExif = (webpBuffer, metadataJson) => {
   webpBuffer = Func.ensureVP8X(webpBuffer)

   const exifData = Func.createExif(metadataJson)

   let offset = 12
   let vp8xOffset = -1

   while (offset < webpBuffer.length) {
      const type = webpBuffer.toString('ascii', offset, offset + 4)
      const size = webpBuffer.readUInt32LE(offset + 4)

      if (type === 'VP8X') {
         vp8xOffset = offset
         break
      }

      offset += 8 + size + (size % 2)
   }

   webpBuffer[vp8xOffset + 8] |= 0b00001000

   const exifChunkHeader = Buffer.alloc(8)
   exifChunkHeader.write('EXIF', 0)
   exifChunkHeader.writeUInt32LE(exifData.length, 4)

   const exifChunk = Buffer.concat([
      exifChunkHeader,
      exifData,
      exifData.length % 2 ? Buffer.from([0x00]) : Buffer.alloc(0)
   ])

   const newBuffer = Buffer.concat([webpBuffer, exifChunk])
   newBuffer.writeUInt32LE(newBuffer.length - 8, 4)

   return newBuffer
}
/* ********** ********** ********** ********** */

Func.levenshtein = (value, other, maxDistance = Infinity) => {
   if (value === other) return 0

   let length = value.length
   let lengthOther = other.length

   if (length > lengthOther) {
      [value, other] = [other, value]
      ;[length, lengthOther] = [lengthOther, length]
   }

   if (lengthOther - length > maxDistance) return maxDistance + 1

   const row = new Uint8Array(length + 1)

   for (let i = 0; i <= length; i++)
      row[i] = i

   for (let i = 1; i <= lengthOther; i++) {
      let previous = i
      let minRow = previous
      const otherChar = other.charCodeAt(i - 1)

      for (let j = 1; j <= length; j++) {
         const cost = value.charCodeAt(j - 1) === otherChar ? 0 : 1

         const deleteCost = row[j] + 1
         const insertCost = previous + 1
         const subtituteCost = row[j - 1] + cost

         let result = deleteCost
         if (insertCost < result) result = insertCost
         if (subtituteCost < result) result = subtituteCost

         row[j - 1] = previous
         previous = result

         if (result < minRow) minRow = result
      }

      row[length] = previous

      if (minRow > maxDistance)
         return maxDistance + 1
   }

   return row[length]
}

Func.resizeImage = async (media, width = 540, height = null, quality = 70, format = 'jpeg') => {
   if (!(media instanceof Buffer))
      media = await Func.fetchAsBuffer(media)

   const lib = napiImage ??= await import('@napi-rs/image')

   const transformer = new lib.Transformer(media)

   transformer.resize(width, height > 0 ? height : null, 0)

   return transformer[format](quality)
}

Func.createSticker = async (media, options = {}) => {
   if (!media)
      throw new Error('No media provided')

   media = await Func.persistToFile(media)

   let mimetype = options.mimetype
   if (!mimetype) {
      const check = await fileTypeFromFile(media)
      mimetype = check?.mime
   }

   if (Func.isMimeWebP(mimetype))
      media = media
   else if (Func.isMimeVideo(mimetype) || Func.isMimeGif(mimetype))
      media = await Func.videoToWebP(media)
   else if (Func.isMimeImage(mimetype))
      media = await Func.imageToWebP(media)
   else
      throw new Error('Invalid media input')

   media = await Func.fetchAsBuffer(media)

   return Func.writeExif(media, {
      'sticker-pack-id': 'rocky',
      'sticker-pack-name': options.stickerPackName ?? stickerPackName,
      'sticker-pack-publisher': options.stickerPackPublisher,
      'android-app-store-link': 'https://github.com/itsliaaa',
      'ios-app-store-link': 'https://github.com/itsliaaa',
      emojis: ['✨'],
      'accessibility-text': botName
   })
}

Func.bratSticker = async (text = 'Hi') =>
   Func.persistToFile(`https://aqul-brat.hf.space/?text=${encodeURIComponent(text)}`)

Func.medal = (index) => {
   if (index === 0) return '🥇'
   if (index === 1) return '🥈'
   if (index === 2) return '🥉'
   return index + 1 + '.'
}

Func.toTime = (ms) => {
   const sign = ms < 0 ? '-' : ''
   ms = Math.abs(ms)

   const d = (ms / DAY) | 0
   const h = (ms / HOUR) % 24 | 0
   const m = (ms / MINUTE) % 60 | 0
   const s = (ms / SECOND) % 60 | 0

   return (
      sign +
      (d ? `${d}d ` : '') +
      `${String(h).padStart(2, '0')}h ` +
      `${String(m).padStart(2, '0')}m ` +
      `${String(s).padStart(2, '0')}s`
   )
}

Func.findTopSuggestions = (input) => {
   const inputLength = input.length
   const maxDistance = Math.max(2, inputLength >> 1)

   let c1 = '',
      s1 = 0
   let c2 = '',
      s2 = 0
   let c3 = '',
      s3 = 0

   for (const command of CommandIndex.keys()) {
      const lenDiff = command.length - inputLength
      if (lenDiff > maxDistance || lenDiff < -maxDistance) continue

      if (command[0] !== input[0]) continue

      const distance = Func.levenshtein(input, command, maxDistance)
      if (distance > maxDistance) continue

      const similarity = (1 - distance / inputLength) * 100

      if (similarity > s1) {
         c3 = c2
         s3 = s2
         c2 = c1
         s2 = s1
         c1 = command
         s1 = similarity
      }
      else if (similarity > s2) {
         c3 = c2
         s3 = s2
         c2 = command
         s2 = similarity
      }
      else if (similarity > s3) {
         c3 = command
         s3 = similarity
      }
   }

   const out = []
   if (c1)
      out.push({
         command: c1,
         similarity: s1
      })
   if (c2)
      out.push({
         command: c2,
         similarity: s2
      })
   if (c3)
      out.push({
         command: c3,
         similarity: s3
      })

   return out
}

Func.formatNumber = (number) =>
   number.toLocaleString('en-US')

Func.style = (text, style = 0) => {
   const map = FONT_MAPS[Number(style)] || FONT_MAPS[0]

   let result = ''
   for (const char of text)
      result += map[char] || char

   return result
}

Func.frame = (title, lines = [], icon = '✦') => {
   const top =
      '╭' +
      '─'.repeat(1) +
      `✦ ${icon} *${Func.style(title)}*`

   const content = lines.map(l => `│ ${l}`)

   const bottom =
      '╰' +
      '─'.repeat(5) +
      '✦'

   return [
      top,
      ...content,
      bottom
   ]
      .join('\n')
}

Func.messageLogger = (message) =>
   console.log(
      '\n' +
      `🔔 Received ${message.type} from ${message.sender?.split('@')[0] || '-'} (${message.pushName || message.verifiedBizName}) in ${message.chat}` +
      '\n' +
      message.body
   )

Func.applySchema = (target, schema) => {
   for (const key in schema)
      if (!(key in target))
         target[key] = schema[key]
}

Func.toArray = (value) =>
   typeof value === 'string'
      ? [value]
      : Array.isArray(value)
         ? value
         : []

Func.shuffleArray = (array) => {
   if (!Array.isArray(array)) return [array]

   for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
   }

   return array
}

Func.randomInteger = (min, max) =>
   Math.floor(
      Math.pow(Math.random(), 2) * (max - min + 1)
   ) + min

Func.randomValue = (array) =>
   array[Math.floor(Math.random() * array.length)]

Func.fetchThumbnail = () =>
   Func.fetchAsBuffer(botThumbnail)
