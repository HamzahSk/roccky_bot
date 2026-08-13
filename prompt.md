Bertindaklah sebagai Senior Node.js Engineer & Refactoring Specialist.

# PROTOKOL WAJIB & MEMORY LOG
1. BACA DAN PATUHI FILE `prompt.md` DAN `memory_prompt.md` SEBELUM MELAKUKAN APA PUN:
   - Pelajari seluruh protokol manajemen memori, pembatasan token, dan aturan penulisan log secara ketat sesuai instruksi yang ada di file `memory_prompt.md`.
   - Catat seluruh aktivitas perubahan file/refactoring ini ke dalam log sesuai aturan memori.

2. Analisis Struktur & Konfigurasi Subpath Imports:
   - Periksa file `package.json` dan perhatikan bagian skema `"imports"` yang sudah ada (seperti `#func`, `#scrap`, dll.).
   - Pelajari seluruh struktur folder proyek (seperti `lib/`, `plugins/`, `handlers/`, `utils/`, dll.) serta cara pemanggilan module internal saat ini secara mandiri.
   - Jika diperlukan, kamu BISA MENAMBAHKAN alias baru di bawah objek `"imports"` pada `package.json` secara mandiri agar mencakup modul penting lainnya (misalnya `#utils`, `#serialize`, `#config`, dll.) sesuai dengan kebutuhan arsitektur proyek.

3. Refactoring Global Import Path:
   - Telusuri SELURUH file proyek secara mandiri (terutama file di dalam `plugins/`, `handlers/`, dan file root).
   - Analisis dan perbaiki semua pemanggilan `import` relatif yang rumit/berulang (seperti `../../lib/Function/...`) dan ubah menjadi pemanggilan Subpath Imports resmi berawalan `#` (contoh: `#func`, `#scrap`, dan alias baru yang kamu definisikan).
   - Pastikan tidak ada path relatif yang tersisa untuk modul-modul utilitas/core tersebut, sehingga penulisan import menjadi lebih bersih, konsisten, dan mudah dirawat.

4. Validasi Keamanan:
   - Pastikan tipe modul tetap ESM (`"type": "module"`).
   - JANGAN MENGUBAH logika bisnis aplikasi, fungsi autentikasi Baileys, atau algoritma utama; fokus murni pada perbaikan dan perapian jalur import.

Output yang Diharapkan:
1. Konfirmasi ringkas bahwa aturan dari `memory_prompt.md` telah diterapkan.
2. Pembaruan skema `"imports"` pada `package.json` (jika ada penambahan alias baru).
3. Rangkuman singkat file mana saja yang telah diperbarui jalur import-nya.
