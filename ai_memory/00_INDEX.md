# AI MEMORY MASTER INDEX

## Status Proyek Terkini
Subpath imports lengkap: `#func`, `#scrap`, `#utils` (folder fisik `lib/Function`, `lib/Scraper`, `lib/Utils`). Utility umum dipindah ke `lib/Utils/` dan di-bridge ke `Func` agar backward-compatible; scraper root (`lib/Scraper.js`) jadi shim re-export atas `Scrap`. Context plugin kini menyediakan `func/scrap/utils` (lowercase) selain `Func/Scrap/Utils`. Helper Native Flow selesai: `sendInteractiveMessage`, `sendButton`, `sendList`, `sendSections`, `sendCard`, `sendCarousel` via `#func` + bind ke `sock.*` + context plugin; Binary Node `biz`+`bot` (private) / `biz` (group) dengan fallback teks. `node --check` + smoke test runtime + boot smoke test lulus.

## Riwayat Log Tugas

| # | Tanggal | File Log | Ringkasan |
|---|---------|----------|-----------|
| 1 | 2026-08-13 | `task_20260813_0300_refactor_cleanup.md` | Refactor: hapus duplikasi, extraction maintenance, rapi SocketClient/Serialize |
| 2 | 2026-08-13 | `task_20260813_0400_new_features.md` | 10 plugin baru dari Baileys API yang belum dipakai, lengkap dgn hak akses & try-catch |
| 3 | 2026-08-13 | `task_20260813_0457_subpath_utils.md` | Subpath imports `#utils` + reorganisasi modul `lib/Function|Scraper|Utils`, context `func/scrap/utils` |
| 4 | 2026-08-13 | `task_20260813_0541_native_flow.md` | Helper Native Flow interactive (`lib/Function/message.js`), bind `sock.*`, context plugin, contoh plugin, fallback teks |
