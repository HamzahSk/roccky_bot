# Task Log: Native Flow Interactive Messages (Deprecation Fix)

- **Status:** Selesai
- **Tanggal:** 2026-08-13

## Ringkasan Perubahan
Menambahkan helper pengiriman pesan interaktif **Native Flow** sebagai pengganti `buttonsMessage`/`templateMessage` yang sudah deprecated (error 405 / tidak tampil di WA resmi).

- **`lib/Function/message.js` (baru)** → `Func.sendInteractiveMessage`, `sendButton`, `sendList`, `sendSections`, `sendCard`, `sendCarousel`. Semua membangun `interactiveMessage` + `nativeFlowMessage` (button `{name, buttonParamsJson}` stringified), dikirim via `sock.relayMessage` + `additionalNodes`:
  - Private (1:1) → node `biz` (engangement + interactive/native_flow) **dan** node `bot` (`biz_bot:'1'`).
  - Group → hanya node `biz`.
  - `try-catch` fallback otomatis ke teks berformat list/nomor jika relay gagal; `fallback:false` untuk melempar error.
  - Dukungan tombol: quick_reply, cta_url, cta_call, single_select (sections/rows), dan raw button.
- **`lib/SocketClient.js`** → bind `sock.sendButton/sendList/sendSections/sendCard/sendCarousel/sendInteractiveMessage`.
- **`lib/Listener.js`** → context plugin kini menyediakan `sendButton`, `sendList`, `sendSections`, `sendCard`, `sendCarousel`, `sendInteractiveMessage` (di blok plugin & event).
- **`plugins/tools/interactive-demo.js` (baru)** → contoh plugin `.button`/`.list`/`.sections`/`.card`/`.carousel`/`.raw`.

## Verifikasi
- `node --check` 4 file lulus.
- Smoke test runtime (`ourin-baileys` 9.0.11): struktur `interactiveMessage`, `buttonParamsJson` stringified, node biz+bot (private) vs biz saja (group), fallback list, `fallback:false` throw, carousel — semua lulus.
- Boot smoke test `node socket.js`: FUNC memuat `message.js`, SCRAP/UTILS OK, pairing jalan tanpa error.

## Tugas Selanjutnya (Next Steps)
- Uji end-to-end di WA asli (button/list/card/carousel pada 1:1 & grup).
- Migrasi plugin lama yang masih kirim `buttons`/`nativeFlow` via `sendMessage` agar memakai helper baru (opsional).