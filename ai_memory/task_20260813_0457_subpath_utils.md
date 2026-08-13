# Task Log: Subpath Imports + Modul Organisasi (#utils)

- **Status:** Selesai
- **Tanggal:** 2026-08-13

## Ringkasan Perubahan
- **`package.json`** → entri `imports` kini `#func` → `./lib/Function/index.js`, `#scrap` → `./lib/Scraper/index.js`, `#utils` → `./lib/Utils/index.js` (huruf kapital disesuaikan dgn folder fisik).
- **`lib/Utils/` (baru)** → loader dinamis (`Utils` + `loadUtils`, hot-reload) dgn named re-export. File: `general.js` (isEmptyObject, toArray, shuffleArray, randomInteger, randomValue, createFileName, randomHex, toTitleCase, formatNumber, medal, applySchema), `text.js` (parseMentions, style, toTime, levenshtein), `url.js` (isURL, isWhatsAppURL), `size.js` (formatSize), `datetime.js` (HourFormatter, DateTimeFormatter, getNowInTZ, getNextMidnight, getIndonesianTimezone, greeting, formatTime). Setiap export di-bridge ke `Func` agar `Func.*` lama tetap jalan.
- **`lib/Function/`** → strip utility umum yg pindah ke `#utils`; `dateTime.js` dihapus. `frame`, `findTopSuggestions`, `messageLogger`, media/sticker/ffmpeg, fs helpers tetap di `#func`.
- **`lib/Scraper.js`** → jd shim re-export: `catbox, uguu, quax` (uploader.js), `reelsvideo, tikwm` (reels.js), `meloboom, getStickerPack, stickerLy` (search.js); semua jg terdaftar di namespace `Scrap` (#scrap).
- **`socket.js`** → panggil `await loadUtils()` setelah loadFunc/loadScrap.
- **`lib/Listener.js`** → context plugin kini menyediakan `Func/Scrap/Utils` (lama) + alias lowercase `func/scrap/utils`.
- **Plugin** → youtube, aio, tiktok, youtube-play, ai/_chatbot, gpt-image, menu, owner/_evaluate pindah ke destructuring lowercase `func/scrap`; `sfile-upl.js` ditulis ulang sbg contoh (top-level `import { randomHex } from '#utils'` + param `func/scrap/utils`, bug `Func.frame` tak-terdefinisi diperbaiki).

## Verifikasi
- `node --check` 201 file lulus.
- Boot smoke test: config, loadFunc/Scrap/Utils, DB, 145 plugin, pairing berjalan tanpa error (401 logout wajar tanpa kredensial).

## Tugas Selanjutnya (Next Steps)
- Uji end-to-end di WA asli (terutama uploader catbox/uguu/quax & SfileMobi yg pindah ke `Scrap`).
- Onboard plugin lama yg masih import `../../lib/Scraper.js` agar pakai `scrap.*` dari context (opsional).