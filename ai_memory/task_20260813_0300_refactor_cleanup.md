# Task Log: Refactor Cleanup

- **Status:** Selesai
- **Tanggal:** 2026-08-13

## Ringkasan Perubahan
- **`lib/Utilities.js`** → dijadikan *shim* tipis (49 re-export) di atas namespace `Func` (`#func`). Menghapus ±700 baris duplikasi fungsi (frame, toTime, createSticker, ffmpeg, isMime*, dll) dan kode mati `ExtendSocket`. Semua import plugin lama (`import ... from '../../lib/Utilities.js'`) tetap berfungsi.
- **`lib/Function/getFileSize.js`** → unifikasi `formatSize` (kini mendukung TB, konsisten dengan versi lama Utilities).
- **`lib/Function/toBanner.js`** → perbaiki import inkonsisten (`./index.js` → `#func`).
- **`lib/Components/Maintenance.js`** → baru: cron harian (reset limit/energi, hapus user/grup idle), autosave + guard RSS (IPC `process.send('reset')`), pembersih folder temp, GC manual.
- **`socket.js`** → blok maintenance step 7 diekstrak ke `Maintenance.js`. **Auth/Baileys core (useMultiFileAuthState, makeWASocket, creds.update, connection.update, pairing/QR/reconnect) TIDAK diubah.**
- **`lib/SocketClient.js`** → DRY `sendMedia` (helper `resolveMediaSource`), hapus import mati (mime-types, spawn, fileTypeStream), hapus komentar duplikat. Perilaku identik.
- **`lib/Serialize.js`** → ekstrak helper `cleanMessageType` (hapus duplikasi download/downloadQuoted).

## Verifikasi
- `node --check` pada 175 file JS: lulus.
- Boot smoke test (`node --expose-gc socket.js`): config, loadFunc, loadScrap, DB, scanDirectory (135 plugin), socket & alur pairing berjalan tanpa error.

## Tugas Selanjutnya (Next Steps)
- Uji end-to-end di lingkungan WhatsApp sesungguhnya (kirim perintah plugin yang memakai `sock.sendMedia` / `createSticker` / `frame`).
- Pertimbangkan meng-onboard plugin yang masih memakai named-import Utilities agar memakai `Func` langsung (opsional).
