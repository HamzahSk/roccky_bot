Bertindaklah sebagai Senior Node.js Engineer & Refactoring Specialist.

# PROTOKOL WAJIB & MEMORY LOG
1. BACA DAN PATUHI FILE `prompt.md` DAN `memory_prompt.md` SEBELUM MELAKUKAN APA PUN:
   - Pelajari seluruh protokol manajemen memori, pembatasan token, dan aturan penulisan log secara ketat sesuai instruksi yang ada di file `memory_prompt.md`.
   - Catat seluruh aktivitas perubahan/refactoring ini ke dalam log sesuai aturan memori.

2. Konfigurasi Subpath Imports (`package.json`):
   - Pastikan konfigurasi `"imports"` pada `package.json` memiliki entri terorganisir berikut:
     ```json
     "imports": {
        "#func": "./lib/function/index.js",
        "#scrap": "./lib/scraper/index.js",
        "#utils": "./lib/utils/index.js"
     }
     ```
   - Sesuaikan path huruf kapital/kecil dengan folder fisiknya secara akurat.

3. Pengelompokan & Pengoraginisasian Modul Internal:
   - Analisis secara mandiri seluruh fungsi/helper/utilitas yang ada di dalam proyek.
   - Kategori & pindahkan fungsi ke folder yang paling sesuai:
     * Jika berupa scraper/fetcher data eksternal -> masukkan ke `./lib/scraper/` (dieksport via `#scrap`).
     * Jika berupa logika fungsi/helper utama -> masukkan ke `./lib/function/` (dieksport via `#func`).
     * Jika berupa utility tambahan/tools bantu umum -> masukkan ke `./lib/utils/` (dieksport via `#utils`).
   - Pastikan setiap file `index.js` di dalam masing-masing folder tersebut me-re-export semua fungsi pendukungnya dengan rapi.

4. Standar Pemanggilan di Plugins:
   - JANGAN mengubah semua import global menjadi alias `#` secara acak.
   - Di dalam file-file plugin (`plugins/`), gunakan cara pemanggilan yang rapi:
     * Untuk fungsi helper/utility yang dibutuhkan saat command berjalan, lewati dan sediakan via parameter `async run({ sock, m, args, func, scrap, utils, ... })` atau destructuring kontekstual di dalam handler plugin.
     * Jika ada fungsi/modul yang WAJIB di-import di luar handler (top-level scope), barulah gunakan `import ... from '#func'`, `import ... from '#scrap'`, atau `import ... from '#utils'`.

5. Batasan Keamanan:
   - JANGAN merusak atau mengubah logika inti autentikasi Baileys.
   - Pastikan tidak ada fungsi yang hilang saat dipindahkan antar-folder/kategori.

Output yang Diharapkan:
1. Konfirmasi penerapan aturan memori.
2. Struktur ekspor ringkas dari `#func`, `#scrap`, dan `#utils`.
3. Contoh penerapannya pada salah satu file plugin (baik di top-level import maupun di parameter handler `async run`).
