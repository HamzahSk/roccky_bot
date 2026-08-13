# Task Log: New Features (Unused Baileys API)

- **Status:** Selesai
- **Tanggal:** 2026-08-13

## Ringkasan Perubahan
Membuat 10 plugin baru memanfaatkan API Baileys di `DOCS.md` yang BELUM dipakai plugin manapun:
- **`plugins/tools/cekwa.js`** → `sock.onWhatsApp` (cek nomor terdaftar WA).
- **`plugins/tools/cekstatus.js`** → `sock.fetchStatus` (lihat status "About" user).
- **`plugins/tools/inviteinfo.js`** → `sock.groupGetInviteInfo` (info grup via link invite).
- **`plugins/group/poll.js`** → `poll` message (buat polling grup).
- **`plugins/group/pinmsg.js`** → `pin` message (pin/unpin, 24 jam).
- **`plugins/group/ephemeral.js`** → `sock.groupToggleEphemeral` (pesan sementara 1d/7d/90d/off).
- **`plugins/group/revokelink.js`** → `sock.groupRevokeInvite` (buat ulang link grup).
- **`plugins/group/addmode.js`** → `sock.groupMemberAddMode` (siapa boleh add member).
- **`plugins/group/joinreq.js`** → `groupRequestParticipantsList/Update` (list, approve, reject join request).
- **`plugins/owner/buatgc.js`** → `sock.groupCreate` (owner buat grup baru).

Pola mengikuti arsitektur plugin: `command`/`hidden`/`category`, `run(m, ctx)`, `frame()` untuk output, `m.react('🕒')`, try-catch penuh, serta flag akses (`owner`/`admin`/`botAdmin`/`group`/`limit`). Tidak ada duplikasi command. Alias `pin` dihindari (bentrok `plugins/download/pin.js`). Menu otomatis ter-update via `ModuleCache`.

## Verifikasi
- `node --check` lulus pada seluruh 10 file plugin baru.

## Tugas Selanjutnya (Next Steps)
- Uji end-to-end (poll, pin, ephemeral, joinreq, cekwa) di grup/chat WhatsApp sesungguhnya.
- Konfirmasi alias & status hak akses di menu (`menu.js`).