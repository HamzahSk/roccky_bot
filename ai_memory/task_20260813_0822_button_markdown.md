# Task Log: Migrasi Button & Format Markdown AI

- **Status:** Selesai
- **Tanggal:** 2026-08-13

## Ringkasan Perubahan
1. **Helper Markdown AI baru** — `lib/Function/markdown.js` (baru):
   - `Func.formatMarkdown` / `parseAIMessage` / `parseMarkdownSegments` / `sendAI`.
   - Code block: header bahasa (```javascript) dibersihkan jadi ``` WA-native.
   - Tabel Markdown → box-drawing (┌─┬─┐) yang rapi di HP.
   - Escape sequence dihapus, marker `* _ ~ \`` diseimbangkan, `[t](u)` → `t (u)`, `**`→`*`.
   - `sendAI` membungkus kirim teks dengan try-catch fallback ke teks mentah.

2. **Helper button diperkuat** — `lib/Function/message.js`: `sendInteractiveMessage`/`sendButton`/`sendList` kini mendukung header media (`image`/`video`) + pemanggilan posisi `sock.sendButton(jid, text, buttons, m)`.

3. **Migrasi button legacy** (dari `nativeFlow`/`buttons`/`cards` di `sendMessage`):
   - `plugins/menu.js` style 2-9 → `sock.sendSections`/`sendButton`/`sendCarousel`.
   - `plugins/owner/manage-bot.js` (`setmodel`) → `sock.sendSections`.

4. **Chatbot pakai parser terpusat** — `plugins/ai/_chatbot.js` & `lib/Scraper/_chatbot.js`: hapus duplikasi `parseMarkdown` + `richResponse`, ganti `Func.formatMarkdown` dengan try-catch fallback.

## Verifikasi
- `node --check` 6 file lulus; smoke test helper markdown (5 kasus) lulus.
- Smoke test `sendButton`/`sendList` (12 kasus): posisi args, node biz+bot (private) / biz (group), fallback list, `fallback:false` throw, image header lulus.
- Boot `node socket.js`: FUNC `markdown.js`+`message.js` OK, SCRAP `_chatbot.js` OK, pairing jalan. (tokenizeCode.js gagal muat — pre-existing, sudah tidak dipakai.)

## Tugas Selanjutnya (Next Steps)
- Uji end-to-end menu styles & tombol di WA asli.
- Pertimbangkan hapus `lib/Function/tokenizeCode.js` yang kini tidak terpakai.
