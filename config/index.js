import './env.js'

import { LRUCache } from 'lru-cache'
import { cpus } from 'os'

const env = (key, fallback) => {
   const value = process.env[key]
   if (value === undefined || value === '') return fallback
   return value
}

const envBool = (key, fallback) => {
   const value = process.env[key]
   if (value === undefined || value === '') return fallback
   return value === 'true' || value === '1'
}

const envNumber = (key, fallback) => {
   const value = Number(process.env[key])
   return Number.isFinite(value) && value > 0 ? value : fallback
}

const envArray = (key, fallback = []) => {
   const value = process.env[key]
   if (!value) return fallback
   return value.split(',').map(item => item.trim()).filter(Boolean)
}

const CPU_COUNT = cpus().length

Object.assign(globalThis, {
   // ========== IDENTITY ==========
   ownerName: env('BOT_OWNER_NAME', 'AzahDev'),
   ownerNumber: env('BOT_OWNER_NUMBER', '6283869821927'),
   botName: env('BOT_NAME', 'ROCKYY'),
   footer: env('BOT_FOOTER', '✦ Rockyy'),
   botNumber: env('BOT_NUMBER', '6281347951754'),
   pairingCode: envBool('PAIRING_CODE', true),
   defaultLimit: envNumber('DEFAULT_LIMIT', 25),
   stickerPackName: env('STICKER_PACK_NAME', '📦 Rockyy Sticker'),
   stickerPackPublisher: env('STICKER_PACK_PUBLISHER', 'ROCKYY BOT'),

   // ========== API KEYS ==========
   freeTheAi: env('FREE_THE_AI_KEY', 'sta_9cab5dd22e921a2b0cfa49617aa9dd5ca146fb82523dd065'),
   googleApiKey: env('GOOGLE_API_KEY', ''),
   groqApiKeys: envArray('GROQ_API_KEYS', ['']),
   logFlareApi: env('LOGFLARE_API_KEY', 'lfu_MLPNJEyMtDEl-KU_IW84FH_aPYCS-pyf'),
   apiUser: env('SIGHT_ENGINE_USER', ''),
   apiSecret: env('SIGHT_ENGINE_SECRET', ''),

   // ========== BOT SETTINGS ==========
   localTimezone: env('LOCAL_TIMEZONE', 'Asia/Jakarta'),
   botThumbnail: env('BOT_THUMBNAIL', 'https://raw.githubusercontent.com/HamzahSk/Aiyam-media/main/undefined/1754816025167.jpeg'),
   botMenuMusic: env('BOT_MENU_MUSIC', './media/Audio/menu-music.mp3'),
   temporaryFolder: env('TEMP_FOLDER', 'temp'),
   pluginsFolder: env('PLUGINS_FOLDER', 'plugins'),
   authFolder: env('AUTH_FOLDER', 'session'),
   storeFilename: env('STORE_FILENAME', 'store.json'),
   saluranName: env('CHANNEL_NAME', 'rockky Dev'),
   saluranJid: env('CHANNEL_JID', '120363400889431614@newsletter'),
   donateUrl: env('DONATE_URL', 'https://youtube.com/watch?v=z4bsaSZj55E'),

   // ========== DATABASE ==========
   databaseName: env('DATABASE_NAME', 'rocky'),
   databaseUrl: env('DATABASE_URL', ''),

   // ========== ONLINE SESSION STORAGE ==========
   // Dedicated online database for the WhatsApp session (survives restarts).
   sessionDatabaseUrl: env('SESSION_DATABASE_URL', ''),
   sessionDatabaseName: env('SESSION_DATABASE_NAME', ''),
   sessionTable: env('SESSION_TABLE', 'wa_sessions'),

   proxyUrl: env('PROXY_URL', ''),
   databaseFilename: env('DATABASE_FILENAME', 'database.json'),

   // ========== TIMING & LIMITS ==========
   temporaryFileInterval: envNumber('TEMP_FILE_INTERVAL_MS', 1_000 * 60 * 30),
   dataInterval: envNumber('DATA_INTERVAL_MS', 1_000 * 60),
   gcInterval: envNumber('GC_INTERVAL_MS', 1_000 * 60 * 60),
   requestTimeout: envNumber('REQUEST_TIMEOUT_MS', 1_000 * 60 * 1.5),
   ffmpegTimeout: envNumber('FFMPEG_TIMEOUT_MS', 1_000 * 60),
   minDelay: envNumber('MIN_DELAY_MS', 100),
   maxDelay: envNumber('MAX_DELAY_MS', 1_000 * 3),
   ignoreOldMessageTS: envNumber('IGNORE_OLD_MESSAGE_TS', 30),
   rssLimit: envNumber('RSS_LIMIT_BYTES', 1_024 * 1_024 * 768),
   ffmpegConcurrency: Math.max(4, Math.floor(CPU_COUNT * 1.3)),
   maxNSFWScore: envNumber('MAX_NSFW_SCORE', 0.75),
   maxHistoryChatSize: envNumber('MAX_HISTORY_CHAT_SIZE', 20),

   // ========== ACCESS CONTROL ==========
   owners: envArray('BOT_OWNERS', []),
   commandPrefix: env('COMMAND_PREFIX', '.'),
   autoNewsletters: envArray('AUTO_NEWSLETTERS', []),
   autoGroups: envArray('AUTO_GROUPS', []),
   antiCall: envBool('ANTI_CALL', false),
   blockIfCall: envBool('BLOCK_IF_CALL', false),

   // ========== CACHES ==========
   ExploreSession: new LRUCache({
      max: 512,
      ttl: 1_000 * 60 * 1.5,
      updateAgeOnGet: false,
      updateAgeOnHas: false,
      ttlAutopurge: true
   })
})
