import { LRUCache } from 'lru-cache'
import { cpus } from 'os'

const CPU_COUNT = cpus().length

Object.assign(globalThis, {
   // Owner name
   ownerName: 'AzahDev',

   // Owner phone number
   ownerNumber: '6283869821927',

   // Bot name
   botName: 'ROCKYY',

   // Footer text
   footer: '✦ Rockyy',

   // [IMPORTANT] Bot phone number for pairing code
   botNumber: '6281347951754',

   // Pairing using code method (set to true for pairing code, false for QR pairing)
   pairingCode: true,

   // User default limit (used for reset too)
   defaultLimit: 25,

   // Sticker pack name
   stickerPackName: '📦 Rockyy Sticker',

   // Sticker pack publisher
   stickerPackPublisher: 'ROCKYY BOT',

   // ********** API KEYS ********** //
   
   freeTheAi: 'sta_9cab5dd22e921a2b0cfa49617aa9dd5ca146fb82523dd065',

   // Google AI Studio for Chat Bot @ https://aistudio.google.com/
   googleApiKey: '',
   
   groqApiKeys: [""],
   
   logFlareApi: 'lfu_MLPNJEyMtDEl-KU_IW84FH_aPYCS-pyf',

   // SightEngine for Anti Porn @ https://sightengine.com/
   apiUser: '',
   apiSecret: '',

   // ********** ADVANCED SETTINGS ********** //

   // Local timezone
   localTimezone: 'Asia/Jakarta',

   // Bot thumbnail (optional, you can change it with setcover command)
   botThumbnail: 'https://raw.githubusercontent.com/HamzahSk/Aiyam-media/main/undefined/1754816025167.jpeg',
   
   // Bot menu music (optional, you can change it with setmenumusic command)
   botMenuMusic: './media/Audio/menu-music.mp3',

   // Temporary folder name (optional)
   temporaryFolder: 'temp',

   // Plugins folder name (optional)
   pluginsFolder: 'plugins',

   // Auth state folder name (optional)
   authFolder: 'session',

   // Store file name (optional)
   storeFilename: 'store.json',
   saluranName: 'rockky Dev',
   saluranJid: '120363400889431614@newsletter',
   
   donateUrl: 'https://youtube.com/watch?v=z4bsaSZj55E',
   
 //  supabaseKey: "Rocky",
   databaseName: "rocky",
   databaseUrl: "",
   
   proxyUrl: "",
  
   // Database file name (optional)
   databaseFilename: 'database.json',

   // Interval to clean temporary files (ms)
   temporaryFileInterval: 1_000 * 60 * 30,

   // Persist database to file interval (ms)
   dataInterval: 1_000 * 60,

   // Call the garbage collector if exposed (ms)
   gcInterval: 1_000 * 60 * 60,

   // API request timeout (ms)
   requestTimeout: 1_000 * 60 * 1.5,

   // FFmpeg process timeout (ms)
   ffmpegTimeout: 1_000 * 60,

   // Min delay response (ms)
   minDelay: 100,

   // Max delay response (ms)
   maxDelay: 1_000 * 3,

   // Ignore user old message (sec)
   ignoreOldMessageTS: 30,

   // RSS limit (mb)
   rssLimit: 1_024 * 1_024 * 768,

   // FFmpeg stream max concurrent processes (min: 1)
   ffmpegConcurrency: Math.max(4, Math.floor(CPU_COUNT * 1.3)),

   // Maximum allowed NSFW score (lower values are stricter)
   maxNSFWScore: 0.75,

   // Maximum chat bot history length
   maxHistoryChatSize: 20,

   // Global explore session cache
   ExploreSession: new LRUCache({
      max: 512,
      ttl: 1_000 * 60 * 1.5,
      updateAgeOnGet: false,
      updateAgeOnHas: false,
      ttlAutopurge: true
   })
})