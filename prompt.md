Bertindaklah sebagai Senior WhatsApp Bot Developer & Protocol Specialist.

# PROTOKOL WAJIB & MEMORY LOG
1. BACA DAN PATUHI FILE `prompt.md` DAN `memory_prompt.md` SEBELUM MELAKUKAN APA PUN:
   - Pelajari seluruh protokol manajemen memori, pembatasan token, dan aturan penulisan log secara ketat sesuai instruksi yang ada di file `memory_prompt.md`.
   - Catat seluruh perbaikan button dan sistem format Markdown ini ke dalam log sesuai aturan memori.

2. Migrasi Seluruh Button Lama ke Helper Baru:
   - Telusuri SELURUH file di folder `plugins/` dan helper internal yang masih menggunakan struktur button legacy (seperti `buttonsMessage`, `templateMessage`, atau objek button manual lama).
   - Ubah dan perbarui semua pemanggilan button tersebut agar menggunakan helper `sock.sendButton`, `sock.sendInteractiveMessage`, atau `sock.sendList` yang baru.
   - Pastikan metode pemanggilannya konsisten pada instance `sock` atau via parameter handler (contoh: `await sock.sendButton(m.chat, text, buttons, m)`).

3. Handling Format Markdown Khusus Code Block & Tabel (AI / ChatBot Response):
   - Telusuri issue/diskusi GitHub Baileys terkait penanganan karakter Markdown kompleks yang sering dihasilkan oleh model AI (seperti ChatGPT/Gemini).
   - Buat/perbarui helper pemproses teks (misalnya `formatMarkdown` atau `parseAIMessage`) untuk merapikan respons teks AI sebelum dikirim via `sock.sendMessage`:
     a. **Code Blocks (JS, Python, HTML, dll.):**
        - WhatsApp tidak mendukung *syntax highlighting* bahasa (seperti ```javascript atau ```python). 
        - Buat parser yang mengonversi header kode menjadi penanda monospace yang bersih tanpa merusak pembuka/penutup triple backtick (```) bawaan WhatsApp.
     b. **Tabel Markdown:**
        - WhatsApp tidak mendukung pengolahan tabel Markdown murni (`| Header | Header |`).
        - Buat fungsi otomatis untuk mengonversi tabel Markdown dari AI menjadi format list monospace/box-drawing yang rapi agar tetap terbaca jelas di tampilan HP.
     c. **Pembersihan Escape Sequence:**
        - Pastikan simbol-simbol khusus Markdown (seperti `*`, `_`, `~`, ```) dari output AI tidak bentrok/ter-escape secara salah yang membuat teks menjadi terpotong atau mentah (*raw string*).

4. Testing & Safe Fallback:
   - Pastikan setiap pengiriman pesan button baru maupun teks berformat Markdown AI dibungkus dengan `try-catch`.
   - Jika device penerima gagal merender pesan interaktif Native Flow, fallback otomatis harus berjalan untuk mengirim pesan berbasis teks biasa secara rapi.

Output yang Diharapkan:
1. Konfirmasi penerapan aturan dari `memory_prompt.md`.
2. Ringkasan file plugin yang button-nya telah dimigrasikan ke helper `sock` baru.
3. Kode helper parser Markdown & pengkonversi tabel/code-block beserta contoh penerapannya pada pengiriman pesan AI.
