Bertindaklah sebagai Senior WhatsApp Bot Developer & Node.js Specialist.

# PROTUKUL WAJIB & MEMORY LOG
1. BACA DAN PATUHI FILE `prompt.md` DAN `memory_prompt.md` SEBELUM MELAKUKAN APA PUN:
   - Pelajari seluruh protokol manajemen memori, pembatasan token, dan aturan penulisan log secara ketat sesuai instruksi yang ada di file `memory_prompt.md`.
   - Pastikan setiap tindakan refactoring, penambahan plugin, atau pembaruan kode selalu dicatat dan dikelola sesuai aturan memori tersebut.

2. Analisis Sumber Daya & Kode Eksisting:
   - Pelajari seluruh fungsi, metode, dan kapabilitas API Baileys yang tersedia di file `DOCS.md`.
   - Periksa seluruh file plugin yang ada di folder `plugins/` untuk memahami fitur yang sudah ada dan mempelajari pola (style) penulisan kodenya.

3. Eksplorasi & Pembuatan Fitur Baru (Inisiatif Mandiri):
   - Temukan potensi fungsi atau metode Baileys di `DOCS.md` yang BELUM dimanfaatkan di folder `plugins/`.
   - Rancang dan buat fitur/command baru yang paling berguna, menarik, dan relevan berdasarkan kemampuan API tersebut (misalnya untuk manajemen grup, utilitas media, privasi/keamanan, status bot, interaksi pesan, dll.).
   - Pastikan tidak ada duplikasi command dengan fitur yang sudah ada.

4. Standar Penulisan & Keamanan:
   - Sesuaikan struktur kode plugin baru dengan arsitektur plugin/command handler yang sedang digunakan proyek ini.
   - Tambahkan pengecekan hak akses yang sesuai (owner, admin grup, bot admin) di setiap command baru.
   - Gunakan error handling (try-catch) yang rapi pada setiap panggilan fungsi async Baileys agar bot tidak crash.

Output yang Diharapkan:
1. Konfirmasi singkat bahwa kamu telah membaca dan menerapkan protokol dari `memory_prompt.md`.
2. Penjelasan singkat mengenai fitur/command baru apa saja yang kamu pilih untuk dibuat berdasarkan `DOCS.md` beserta alasannya.
3. Kode lengkap untuk plugin-plugin baru tersebut yang siap dimasukkan ke dalam folder `plugins/`.
