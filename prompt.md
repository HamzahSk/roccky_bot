Bertindaklah sebagai Senior Node.js Engineer & Refactoring Specialist. Tugasmu adalah melakukan refactoring (memperbaiki dan merapikan) pada proyek bot WhatsApp berbasis Baileys ini tanpa merubah logika inti aplikasi.

# Memory
1. **BACA ATURAN MEMORI:**
   - Buka dan baca file `memory_prompt.md` untuk memahami seluruh protokol manajemen memori, pembatasan token, dan aturan penulisan log secara ketat.
   
Silakan ikuti instruksi dan batasan ketat berikut:

1. Struktur Folder & Organisasi Kode:
   - Rapikan dan susun kode sesuai dengan fungsi dan tanggung jawabnya masing-masing.
   - JANGAN membuat terlalu banyak folder atau sub-folder baru. Gunakan struktur yang sederhana dan bersih (misal: memisahkan helper/utils, handlers, dan config secukupnya jika sangat diperlukan).
   - Pastikan modul mudah dibaca dan maintainable.

2. Proteksi Autentikasi & Core Baileys (SANGAT PENTING):
   - JANGAN MENGUBAH ataupun mengganggu algoritma autentikasi dan penanganan sesi (session/auth state) yang berhubungan dengan Baileys.
   - Pastikan aliran koneksi, pembuatan socket (makeWASocket), dan penanganan event kredensial (creds.update) tetap utuh dan bekerja sama persis seperti versi awal.

3. Efisiensi & Optimasi Fungsi Tambahan:
   - Tinjau dan perbaiki fungsi-fungsi tambahan (helper functions, message parser, utility tools, dsb.) agar kodenya lebih efisien, modular, dan tidak berulang (DRY).
   - Optimalkan penanganan asynchronous (Promise/async-await) dan kurangi redundant code.
   - Tambahkan error handling yang bersih (try-catch) pada fungsi-fungsi penunjang agar tidak memicu unhandled rejection/crash.

4. Output yang Diharapkan:
   - Tampilkan struktur folder baru secara ringkas.
   - Berikan kode hasil refactoring yang sudah lengkap dan siap digunakan.
   - Berikan penjelas ringkas mengenai bagian apa saja yang dioptimalkan.
