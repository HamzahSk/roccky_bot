Bertindaklah sebagai Senior WhatsApp Bot & Protocol Specialist (Baileys Expert).

# PROTOKOL WAJIB & MEMORY LOG
1. BACA DAN PATUHI FILE `prompt.md` DAN `memory_prompt.md` SEBELUM MELAKUKAN APA PUN:
   - Pelajari seluruh protokol manajemen memori, pembatasan token, dan aturan penulisan log secara ketat sesuai instruksi yang ada di file `memory_prompt.md`.
   - Catat seluruh rencana dan aktivitas perbaikan logika pengiriman pesan ke dalam log sesuai aturan memori.

2. Analisis Isu & Perubahan Protokol WhatsApp/Baileys:
   - Seperti yang tertera pada issue-issue GitHub WhiskeySockets/Baileys (misal #1173, #2471, #2626), metode legacy `buttonsMessage` / `templateMessage` lama sudah di-patch/deprecated oleh WhatsApp dan menyebabkan error 405 atau pesan tidak muncul di WhatsApp resmi.
   - WhatsApp versi terbaru menggunakan struktur **Interactive Native Flow Messages** (`interactiveMessage` dengan `nativeFlowMessage`) beserta pembungkus Binary Node (`biz`, `interactive`, `native_flow`, dan node `bot` dengan `biz_bot: '1'` untuk obrolan pribadi/1:1 chat).

3. Perbaikan & Pembuatan Helper Pengiriman Pesan (Template Baru):
   - Di dalam folder `#func` / `#utils` (contoh: `./lib/function/` atau `./lib/utils/`), buat/perbarui helper wrapper khusus untuk pengiriman pesan interaktif yang mendukung WhatsApp resmi maupun WA MD:
     a. `sendButton` / `sendInteractiveMessage`:
        - Mendukung tombol Quick Reply (`quick_reply`), Link CTA (`cta_url`), Telepon CTA (`cta_call`), serta Single Select / Section List.
        - Secara otomatis mengonversi format button biasa ke struktur `interactiveMessage` + `nativeFlowMessage` dengan `buttonParamsJson` yang di-stringify.
        - Memiliki fallback otomatis ke pesan teks biasa berformat list/nomor jika klien penerima tidak mendukung tombol interaktif.
     b. `sendList` / `sendSections`:
        - Menggunakan format Native Flow `single_select` agar daftar opsi (section & rows) tampil dengan stabil tanpa error.
     c. `sendCard` / `sendCarousel` (opsional jika relevan):
        - Format kartu berantai menggunakan `interactiveMessage`.

4. Penanganan Binary Nodes & Protocol Compatibility:
   - Saat mengirim pesan interaktif via `sock.relayMessage`, pastikan konstruksi `additionalNodes` menangani perbedaan chat:
     * Untuk **Private Chat (1:1)**: Sertakan node `biz` dan node `bot` (`attrs: { biz_bot: '1' }`).
     * Untuk **Group Chat**: Sertakan node `biz` tanpa merusak format grup.
   - Gunakan pembungkusan `try-catch` dengan fallback halus (contoh: jika pengiriman interactive gagal/terjadi error API, sistem secara otomatis mengirimkan versi teks alternatif).

5. Integrasi ke Sistem Plugin/Helper:
   - Ekspor helper pengiriman pesan ini melalui `#func` atau `#utils` sehingga dapat diakses dengan mudah pada parameter `async run({ sock, m, sendButton, sendList, ... })` atau di dalam helper fungsi utama.

Output yang Diharapkan:
1. Konfirmasi penerapan aturan memori.
2. Penjelasan singkat mengenai pendekatan Native Flow & Binary Node yang diterapkan untuk mengatasi isu deprecation button pada Baileys.
3. Kode helper pengiriman pesan interaktif lengkap (beserta contoh cara penggunaan di plugin).
