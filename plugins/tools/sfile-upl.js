

export default {
   command: 'sfileupl',
   category: 'tools',
   async run (m, {
      sock,
      command,
      text,
      Scrap,
      Utils
   }) {
      try {
         const q = m.quoted?.url ? m.quoted : m
         const mimetype = (q.msg || q).mimetype
         if (!mimetype)
            return m.reply('💭 Reply media to upload.')
         
         m.react('🕒')
         
         const buffer = await q.download()
         const desc = text || "ROCCKYREC"
         
         // Generate nama file dari timestamp dan mimetype
         const ext = mimetype.split('/')[1] || 'bin'
         const filename = q.fileName || `upload_${Date.now()}.${ext}`
         
         // Upload ke SfileMobi
         const result = await Scrap.SfileMobi.upload(filename, buffer, desc)
         
         if (result.status === 'success') {
            m.react('✅')
            const urls = [result.share_url]
            const print = Func.frame('TO URL (Sfile.co)', urls, '💾')
            m.reply(print)
         } else if (result.chunk_received) {
            m.react('✅')
            m.reply('✅ Upload successful (chunk received)\n⚠️ Please wait for processing...')
         } else {
            m.react('❌')
            let errorMsg = result.message || 'Upload failed'
            if (result.reason === 'duplicate_hash') {
               errorMsg = 'File already exists on your account'
            } else if (result.reason === 'daily_limit_reached') {
               errorMsg = 'Daily upload limit reached'
            }
            m.reply('❌ ' + errorMsg)
         }
      }
      catch (error) {
         console.error(error)
         m.react('❌')
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}