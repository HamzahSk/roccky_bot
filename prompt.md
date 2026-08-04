# Task: Refactor, Optimize RAM Database, and Implement Online Session Store for WhatsApp Bot

Kamu adalah Senior Node.js Developer yang berpengalaman dalam membangun WhatsApp Bot yang stabil, efisien, dan memiliki skalabilitas tinggi.

Tolong analisis seluruh basis kode proyek ini dan lakukan refactoring serta perbaikan berdasarkan instruksi berikut:

---

### 1. Perapihan Kode & Refactoring (Clean Code & Readability)
* **Modul & Struktur:** Rapikan dan pisahkan kode monolithic menjadi modul-modul yang rapi (misal: pisahkan folder `handlers/`, `services/`, `database/`, `utils/`, dan `config/`).
* **Keterbacaan:** Gunakan penamaan variabel dan fungsi yang jelas, konsisten, serta deskriptif. Hapus kode yang tidak terpakai (*dead code*) dan log *debugging* yang berlebihan.
* **Error Handling:** Tambahkan *try-catch* dan *error handler* terpusat agar bot tidak crash saat terjadi error tidak terduga.

---

### 2. Penambahan Fungsi Modular
* Buat beberapa fungsi helper modular yang sering digunakan, antara lain:
  * Helper untuk pemformatan teks/pesan balasan.
  * Helper pembersihan memori (*garbage collector/cache cleaner* berkala).
  * Helper validasi input/perintah dari pengguna WhatsApp.

---

### 3. Optimasi Database & Penggunaan RAM
* **Cegah Boros RAM:** * Perbaiki penanganan query database agar tidak memuat seluruh data (*fetch all*) sekaligus ke RAM. Gunakan pagination, stream, atau indexing yang tepat.
  * Pastikan tidak ada *memory leak* (seperti *event listener* yang menumpuk, interval/timeout yang tidak dibersihkan, atau penampungan data di variabel global yang terlalu besar).
* **Efisiensi Database:** Optimalkan skema/query database agar proses *read/write* lebih ringan dan hemat sumber daya server.

---

### 4. Penyimpanan Session WhatsApp ke Database Online
* Ubah sistem penyimpanan *session* WhatsApp (yang sebelumnya disimpan di *local file system/folder*) agar disimpan ke **Database Online** (seperti MongoDB / PostgreSQL / Redis / Supabase).
* **Implementasi:**
  * Sesuaikan dengan library WhatsApp yang digunakan (misalnya Baileys, whatsapp-web.js, dll).
  * Implementasikan *Auth State Adapter* khusus untuk database online agar saat bot me-restart, session tetap bertahan dan tidak perlu scan QR ulang.
  * Pastikan koneksi database online memiliki mekanisme *reconnect* otomatis jika terjadi masalah jaringan.

---

### Output Requirements:
1. Terapkan langsung semua perubahan pada kode proyek.
2. Pastikan file konfigurasi (seperti `.env.example, config.js`) diperbarui jika ada variabel lingkungan baru yang dibutuhkan (misal: `DATABASE_URL` atau URI koneksi online session).
3. Buat ringkasan perubahan secara rinci pada log terminal di akhir proses.
