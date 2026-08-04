# ✴️ @itsliaaa/starseed

![Logo](https://files.catbox.moe/75q4r7.jpg)

Starseed is a simple WhatsApp bot designed for quick setup and efficient use. It offers essential features such as sticker creation, social media content downloading, basic group management tools, and various general-purpose utilities, all accessible directly through WhatsApp.

> [!CAUTION]
This project is a direct implementation of [`@itsliaaa/baileys`](https://github.com/itsliaaa/baileys#readme). If you choose to replace it with any other fork, all resulting issues or bugs are entirely your responsibility.

### ⚙️ Architecture Overview

| Principle | Implementation |
|------------|----------------|
| ⚡ Native ESM Architecture | Fully structured using modern ECMAScript Modules (`type: module`) and designed for Node.js >=20.18.1 environments. |
| 🪶 Lean Dependency Strategy | Minimal, purpose-specific dependencies to keep the runtime lightweight. |
| 🧩 Runtime Minimalism | No obfuscation or bundling layers are used, ensuring predictable execution and optimal performance. |

### 📄 System Requirements

| 🔹 Minimum | ✨ Recommended |
|------------|------------|
| 1 vCPU | 1 vCPU |
| 512 MB RAM | 1 GB RAM |
| 1 GB Free Space | 2 GB Free Space |
| FFmpeg v6.x.x | FFmpeg v6.x.x |
| Node.js v20.18.1 LTS | Node.js v24.x.x LTS |
| Yarn v1.x.x | Yarn v1.22.22 |

### 🗄️ Server

To run the bot, I highly recommend the following services. They are not only affordable, but also ensure that user data stored in the database remains secure:

- [x] NAT VPS [Hostdata](https://hostdata.id/nat-vps-usa/) (Highly Recommended)
- [x] Hosting Panel [The Hoster](https://thehoster.net/bot-hosting/)
- [x] VPS [OVH Hosting](https://www.ovhcloud.com/asia/vps/)

### ⬇️ How to Download

![DownloadStep](https://files.catbox.moe/4dz3ip.jpg)

1. Click the **Code** button.
2. Select **Download ZIP**.
3. Extract the downloaded file.

### 📥 Installation & Run

> [!IMPORTANT]
Check this repository regularly for updates. The project is still under development. If you encounter any issues, please open an issue. Thank you!

> [!NOTE]
The installer supports Linux, macOS (Darwin), and Android (Termux).
>
> I’m not familiar with Windows because I primarily use Linux, so no Windows installation files are provided.

Make sure your system meets the required dependencies. Then run:

```bash
bash install.sh
```

After installation completes, start the bot using pm2:

```bash
pm2 start ecosystem.config.cjs && pm2 logs index
```

### 🔧 Configuration

Configuration lives in a `.env` file (created automatically from `.env.example` by `install.sh`). All keys are optional; sensible defaults apply when unset:

```dotenv
# ---------- BOT IDENTITY ----------
BOT_OWNER_NAME=AzahDev
BOT_OWNER_NUMBER=6283869821927
BOT_NAME=ROCKYY
BOT_FOOTER=✦ Rockyy
BOT_NUMBER=6281347951754      # Bot number for pairing code
PAIRING_CODE=true             # true = pairing code, false = QR scan
DEFAULT_LIMIT=25

# ---------- ONLINE DATABASE (users / groups / settings) ----------
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/
DATABASE_NAME=roccky

# ---------- ONLINE SESSION STORAGE (CRITICAL) ----------
# Persists the WhatsApp session so the bot never re-scans the QR after a restart.
# Prefer a database DIFFERENT from DATABASE_URL; leave empty to reuse it,
# or leave both empty to fall back to the local "session/" folder.
SESSION_DATABASE_URL=postgresql://user:pass@host:5432/roccky_session
SESSION_TABLE=wa_sessions
```

See [`.env.example`](https://github.com/itsliaaa/starseed/blob/main/.env.example) for the full list of options (API keys, timing, memory limits, prefixes, etc.).

### 📁 Plugins

You can follow this format to add your own plugins:

```javascript
export default {
   command: 'your_command',
   hidden: 'your_hidden_command',
   category: 'your_category_name',
   async run(m, {
      sock,
      // ...other values from handler.js
   }) {
      /* YOUR LOGIC HERE */
   },
   group: false, // is this command only for group chats?
   private: false, // is this command only for private chats?
   owner: false, // is this command only for the owner?
   partner: false, // is this command only for partners?
   admin: false, // is this command only for group admins?
   botAdmin: false, // does this command require the bot to be a group admin?
   limit: 1 // command usage cost
}
```

See the documentation in [`@itsliaaa/baileys`](https://github.com/itsliaaa/baileys#-sending-interactive-messages) for details about sending interactive messages.

### 👤 Credits

Starseed is an independent project built and maintained by:

- [itsliaaa](https://github.com/itsliaaa) — Project Maintainer & Creator

Support this project:

- [Saweria](https://saweria.co/itsliaaa)

#### 🌐 Third-Party Services

Starseed utilizes the following external APIs:

- [rynn-k](https://github.com/rynn-k) — Nekolabs API
- [elrayyxml](https://github.com/elrayyxml) — Nexray API
- [faa](https://whatsapp.com/channel/0029Vb7APG9InlqWTBGDnN3d) — Faa API 
- [Deline Clarissa](https://whatsapp.com/channel/0029VbB8WYS4CrfhJCelw33j) — Deline API
- [ZenzzXD](https://github.com/ZenzzXD) — Zennz API

These services are used as external integrations and are not directly affiliated with the development of Starseed.

#### 🧪 Testers & Community

Special thanks to:
- Starseed Group Members  
- And of course… **You** ✨

Your feedback and support help this project continue to grow 🌱
