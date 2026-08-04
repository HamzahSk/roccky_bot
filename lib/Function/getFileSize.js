
import { Func } from '#func'
import axios from 'axios'

Func.getFileSize = async (url) => {
   try {
      const res = await axios.head(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      const bytes = parseInt(res.headers['content-length'] || 0)
      return {
         bytes: bytes,
         size: Func.formatSize(bytes) // Asumsi kamu punya fungsi formatSize, jika tidak pakai kode di bawah
      }
   } catch {
      try {
         const res = await axios.get(url, { responseType: 'stream', headers: { 'User-Agent': 'Mozilla/5.0' } })
         const bytes = parseInt(res.headers['content-length'] || 0)
         res.data.destroy()
         return {
            bytes: bytes,
            size: Func.formatSize(bytes)
         }
      } catch {
         return { bytes: 0, size: 'Unknown' }
      }
   }
}

Func.formatSize = (bytes) => {
   if (bytes === 0) return '0 B'
   const k = 1024
   const sizes = ['B', 'KB', 'MB', 'GB']
   const i = Math.floor(Math.log(bytes) / Math.log(k))
   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}