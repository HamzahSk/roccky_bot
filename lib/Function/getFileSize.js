
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
   if (bytes < 1024) return bytes + ' B'
   if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB'
   if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(1) + ' MB'
   if (bytes < 1024 ** 4) return (bytes / 1024 ** 3).toFixed(1) + ' GB'
   return (bytes / 1024 ** 4).toFixed(1) + ' TB'
}