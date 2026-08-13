Role: Senior WhatsApp Bot Developer & Protocol Specialist (Baileys)

Tugas Utama:
Lakukan investigasi, perbaikan bug, dan refactoring pada sistem pengiriman pesan AI agar bot tidak lagi mengalami *crash* akibat salah format pesan (*Invalid media type*). Fokus pada poin-poin berikut:

1. ANALISIS & FIX "INVALID MEDIA TYPE" ERROR:
   - Identifikasi penyebab error `Unhandled Rejection : Error: Invalid media type` pada `prepareWMessageMedia` (Baileys `messages.js:70:15`).
   - Pastikan *payload* yang dikirim dari fungsi AI (yang mengandung teks Markdown) dikonstruksi dengan benar. Jika pesan hanya berupa teks Markdown, pastikan objek yang diteruskan ke `sock.sendMessage` murni `{ text: aiResponseString }` tanpa ada *key* media (seperti `image`, `document`, atau `header`) yang bernilai *null* atau *undefined*.

2. REVIEW BAILEYS GITHUB ISSUES:
   - Lakukan riset pada repositori https://github.com/whiskeysockets/Baileys/issues `whiskeysockets/Baileys/issues` mengenai cara yang valid dan terbaru untuk merender teks *Markdown* tebal/miring/list panjang dari AI.
   - Jika menggunakan fitur *Interactive Message* atau *Native Flow* untuk membungkus pesan AI, pastikan *header* teks atau media dikonfigurasi sesuai standar Baileys terbaru untuk mencegah penolakan dari *server* WhatsApp (HTTP 400 Bad Request).

3. IMPLEMENTASI GLOBAL ERROR HANDLING (ANTI-CRASH):
   - Bot tidak boleh *shutdown* hanya karena gagal mengirim satu pesan.
   - Tangkap error pada *promise* `sendMessage` di *wrapper* atau helper (`SocketClient.js`).
   - Implementasikan block `try-catch` yang kokoh di dalam fungsi pengiriman pesan AI.
   - Tambahkan *listener* `process.on('unhandledRejection', ...)` pada titik masuk aplikasi (entry point) untuk mencatat (log) error tanpa mematikan (*exit*) *process* Node.js.

4. SAFE FALLBACK MECHANISM:
   - Jika metode pengiriman pesan *Markdown* (terutama jika dibungkus dalam *cards* atau format interaktif) gagal dan melempar *exception*, buat fungsi *fallback* otomatis.
   - *Fallback* ini harus mengirimkan ulang balasan AI menggunakan pesan teks biasa/standar (`{ text: ... }`) tanpa embel-embel UI tambahan, agar *user* tetap menerima jawaban dari AI.
