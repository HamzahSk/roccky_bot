Role: Senior WhatsApp Bot Developer & Protocol Specialist

Tugas Utama:
Lakukan refactoring dan perbaikan bug pada codebase WhatsApp Bot dengan fokus pada poin-poin berikut:

1. FIX CATEGORY FILTER BUG:
   - Perbaiki logika filtering kategori di `plugins/menu.js` agar seluruh tag/kategori (ai, download, explore, group, maker, tools, owner, partner, admin tools, user info, dll.) terdeteksi dan tampil penuh secara dinamis, bukan ter-filter hanya ke kategori `game`.

2. FIX PPT/DOCUMENT MEDIA HEADER:
   - Pada opsi menu yang menggunakan header dokumen/PPT (seperti `menuStyle 6` atau `8`), perbaiki pengiriman media buffer/URL dokumen.
   - Konfigurasikan `mimetype` (`application/vnd.ms-powerpoint` atau `application/vnd.openxmlformats-officedocument.presentationml.presentation`), `fileName`, dan `jpegThumbnail` dengan benar tanpa null pointer atau error pembatalan media attachment.

3. BOT STATUS HEADER:
   - Tampilkan ringkasan status bot secara singkat di header/caption menu utama yang mencakup:
     • Jumlah User (`Object.keys(db.users || {}).length`)
     • Jumlah Command (Total command dari plugin terdaftar)
     • Uptime Bot (`Func.toTime(process.uptime() * 1000)`)
     • RAM Usage (`Func.formatSize(process.memoryUsage().rss)`)
     • Mode / Status Koneksi (Public / Self)

4. BUTTON HELPER MIGRATION:
   - Telusuri file di folder `plugins/` dan helper internal yang masih menggunakan button legacy (seperti `buttonsMessage`, `templateMessage`, atau objek manual).
   - Migrasikan seluruhnya ke helper tersentralisasi baru pada instance `sock` (`sock.sendButton`, `sock.sendInteractiveMessage`, `sock.sendSections`, `sock.sendList`).

5. SAFE FALLBACK & ERROR HANDLING:
   - Bungkus setiap pengiriman pesan interaktif / button dengan block `try-catch`.
   - Sediakan mekanisme fallback otomatis ke pesan teks biasa yang rapi jika device penerima gagal merender pesan interaktif Native Flow.
