
import { CATEGORY_DESCRIPTIONS, CATEGORY_EMOJIS, FAKE_QUOTE, POPULAR_CATEGORIES } from '../lib/Constants.js'

import { Func } from '#func'
import { CommandIndex, ModuleCache } from '../lib/Watcher.js'

const OFFER_EXPIRATION = Date.now() * 2

const HIGHLIGHT_LABEL = { highlight_label: 'Most Used' }

let CACHED_REGISTRY = null,
   LAST_REGISTRY_SIZE = 0

const getCommandRegistry = () => {
   const commandIndexSize = CommandIndex.size
   if (CACHED_REGISTRY && LAST_REGISTRY_SIZE === commandIndexSize)
      return CACHED_REGISTRY

   const commandsSet = new Set()
   const categoriesSet = new Set()
   const grouped = {}

   for (const modules of ModuleCache.values()) {
      const { command: cachedCommand, category } = modules

      if (cachedCommand)
         for (const cmd of Func.toArray(cachedCommand))
            commandsSet.add(cmd)

      if (category) {
         categoriesSet.add(category)
         grouped[category] ??= []
         grouped[category].push(...Func.toArray(cachedCommand))
      }
   }

   const commands = [...commandsSet].sort()
   const categories = [...categoriesSet].sort()

   for (const key in grouped)
      grouped[key].sort()

   CACHED_REGISTRY = { commands, categories, grouped }
   LAST_REGISTRY_SIZE = commandIndexSize

   return CACHED_REGISTRY
}

export default {
   command: ['menu', 'command', 'help', 'allmenu'],
   async run(m, {
      sock,
      user,
      setting,
      isPrefix,
      command,
      text,
      scrap
   }) {
      try {
         const { commands, categories, grouped } = getCommandRegistry()
         let message = setting.menuMessage
            .replace('+tag', '@' + m.sender.split('@')[0])
            .replace('+name', m.pushName)
            .replace('+greeting', Func.greeting()) +
            '\n\n'
         if (command === 'allmenu') {
            message += String.fromCharCode(8206).repeat(1000)
            for (const category in grouped) {
               message += Func.frame(category.toUpperCase(), grouped[category].map(cmd => isPrefix + cmd), CATEGORY_EMOJIS[category] ?? '📁') +
                  '\n\n'
            }
            return m.reply(message.trim(), {
               externalAdReply: {
                  title: botName,
                  body: Func.greeting(),
                  thumbnail: await Func.fetchThumbnail(),
                  largeThumbnail: true
               }
            })
         }
         else if (categories.includes(text)) {
            const print = Func.frame(text.toUpperCase(), grouped[text].map(cmd => isPrefix + cmd), CATEGORY_EMOJIS[text] ?? '📁')
            return m.reply(print.trim())
         }
         else if (setting.menuStyle == 1) {
            message += Func.frame('CATEGORIES', categories.map(cmd => isPrefix + command + ' ' + cmd), '📋')
            m.reply(message.trim(), {
               externalAdReply: {
                  title: botName,
                  body: Func.greeting(),
                  thumbnail: await Func.fetchThumbnail(),
                  largeThumbnail: true
               }
            })
         }
         else if (setting.menuStyle == 2) {
            return sock.sendSections(m.chat, {
               text: message.trim(),
               image: botThumbnail,
               footer,
               title: '📚 List Menu',
               buttonText: 'Pilih',
               sections: categories.map(category => ({
                  ...(POPULAR_CATEGORIES[category] ? HIGHLIGHT_LABEL : {}),
                  rows: [{
                     title: (CATEGORY_EMOJIS[category] ?? '📁') + ' ' + Func.toTitleCase(category),
                     description: `📦 There are ${grouped[category].length} commands`,
                     id: `${isPrefix + command} ${category}`
                  }]
               })),
               quoted: m
            })
         }
         else if (setting.menuStyle == 3) {
            return sock.sendButton(m.chat, {
               text: message.trim(),
               image: botThumbnail,
               footer,
               buttons: [
                  {
                     type: 'list',
                     title: '📚 List Menu',
                     displayText: '📚 List Menu',
                     sections: categories.map(category => ({
                        ...(POPULAR_CATEGORIES[category] ? HIGHLIGHT_LABEL : {}),
                        rows: [{
                           title: (CATEGORY_EMOJIS[category] ?? '📁') + ' ' + Func.toTitleCase(category),
                           description: `📦 There are ${grouped[category].length} commands`,
                           id: `${isPrefix + command} ${category}`
                        }]
                     }))
                  },
                  { type: 'reply', displayText: '📃 All Menu', id: `${isPrefix}allmenu` },
                  { type: 'reply', displayText: '📊 Statistic', id: `${isPrefix}statistic` },
                  { type: 'url', displayText: '💰 Donate', url: donateUrl }
               ],
               messageParams: {
                  optionText: '✴️ Tap Here',
                  optionTitle: '📋 Select Options',
                  offerText: botName,
                  offerUrl: donateUrl,
                  offerExpiration: OFFER_EXPIRATION
               },
               quoted: m
            })
         }
         else if (setting.menuStyle == 4) {
            return sock.sendButton(m.chat, {
               text: message.trim(),
               image: botThumbnail,
               footer,
               buttons: [
                  {
                     type: 'list',
                     title: '📚 List Menu',
                     displayText: '📚 List Menu',
                     sections: categories.map(category => ({
                        ...(POPULAR_CATEGORIES[category] ? HIGHLIGHT_LABEL : {}),
                        rows: [{
                           title: (CATEGORY_EMOJIS[category] ?? '📁') + ' ' + Func.toTitleCase(category),
                           description: `📦 There are ${grouped[category].length} commands`,
                           id: `${isPrefix + command} ${category}`
                        }]
                     }))
                  },
                  { type: 'reply', displayText: '📃 All Menu', id: `${isPrefix}allmenu` },
                  { type: 'url', displayText: '💰 Donate', url: donateUrl }
               ],
               quoted: m
            })
         }
         else if (setting.menuStyle == 5) {
            return sock.sendButton(m.chat, {
               text: message.trim(),
               image: botThumbnail,
               footer,
               buttons: [
                  {
                     type: 'list',
                     title: '📚 List Menu',
                     displayText: '📚 List Menu',
                     sections: categories.map(category => ({
                        ...(POPULAR_CATEGORIES[category] ? HIGHLIGHT_LABEL : {}),
                        rows: [{
                           title: (CATEGORY_EMOJIS[category] ?? '📁') + ' ' + Func.toTitleCase(category),
                           description: `📦 There are ${grouped[category].length} commands`,
                           id: `${isPrefix + command} ${category}`
                        }]
                     }))
                  },
                  { type: 'reply', displayText: '📃 All Menu', id: `${isPrefix}allmenu` },
                  { type: 'url', displayText: '💰 Donate', url: donateUrl }
               ],
               messageParams: {
                  optionText: '✴️ Tap Here',
                  optionTitle: '📋 Select Options'
               },
               quoted: m
            })
         }
         else if (setting.menuStyle == 6) {
            const profilePicture = await sock.profilePicture(m.sender)
            return sock.sendButton(m.chat, {
               text: message.trim(),
               image: profilePicture,
               footer,
               buttons: [
                  {
                     type: 'list',
                     title: '📚 List Menu',
                     displayText: '📚 List Menu',
                     sections: categories.map(category => ({
                        ...(POPULAR_CATEGORIES[category] ? HIGHLIGHT_LABEL : {}),
                        rows: [{
                           title: (CATEGORY_EMOJIS[category] ?? '📁') + ' ' + Func.toTitleCase(category),
                           description: `📦 There are ${grouped[category].length} commands`,
                           id: `${isPrefix + command} ${category}`
                        }]
                     }))
                  },
                  { type: 'reply', displayText: '📃 All Menu', id: `${isPrefix}allmenu` },
                  { type: 'reply', displayText: '📊 Statistic', id: `${isPrefix}statistic` }
               ],
               quoted: m
            })
         }
         else if (setting.menuStyle == 7) {
            const profilePicture = await sock.profilePicture(m.sender)
            return sock.sendButton(m.chat, {
               text: message.trim(),
               image: profilePicture,
               footer,
               buttons: [
                  {
                     type: 'list',
                     title: '📚 List Menu',
                     displayText: '📚 List Menu',
                     sections: categories.map(category => ({
                        ...(POPULAR_CATEGORIES[category] ? HIGHLIGHT_LABEL : {}),
                        rows: [{
                           title: (CATEGORY_EMOJIS[category] ?? '📁') + ' ' + Func.toTitleCase(category),
                           description: `📦 There are ${grouped[category].length} commands`,
                           id: `${isPrefix + command} ${category}`
                        }]
                     }))
                  },
                  { type: 'reply', displayText: '📃 All Menu', id: `${isPrefix}allmenu` },
                  { type: 'reply', displayText: '📊 Statistic', id: `${isPrefix}statistic` }
               ],
               quoted: m
            })
         }
         else if (setting.menuStyle == 8) {
            const profilePicture = await sock.profilePicture(m.sender)
            return sock.sendButton(m.chat, {
               text: message.trim(),
               image: profilePicture,
               footer,
               buttons: [
                  {
                     type: 'list',
                     title: '📚 List Menu',
                     displayText: '📚 List Menu',
                     sections: categories.map(category => ({
                        ...(POPULAR_CATEGORIES[category] ? HIGHLIGHT_LABEL : {}),
                        rows: [{
                           title: (CATEGORY_EMOJIS[category] ?? '📁') + ' ' + Func.toTitleCase(category),
                           description: `📦 There are ${grouped[category].length} commands`,
                           id: `${isPrefix + command} ${category}`
                        }]
                     }))
                  },
                  { type: 'reply', displayText: '📃 All Menu', id: `${isPrefix}allmenu` },
                  { type: 'reply', displayText: '📊 Statistic', id: `${isPrefix}statistic` }
               ],
               quoted: m
            })
         }
         else if (setting.menuStyle == 9) {
            return sock.sendCarousel(m.chat, {
               text: message.trim(),
               footer,
               cards: categories.map(category => ({
                  title: (CATEGORY_EMOJIS[category] ?? '📁') + ' ' + Func.toTitleCase(category),
                  text: Func.frame(category.toUpperCase(), [CATEGORY_DESCRIPTIONS[category]], CATEGORY_EMOJIS[category] ?? '📁'),
                  image: botThumbnail,
                  buttons: [{
                     type: 'reply',
                     displayText: 'Pilih',
                     id: `${isPrefix + command} ${category}`
                  }]
               })),
               quoted: m
            })
         }
         if (setting.menuMusic)
            sock.sendMedia(m.chat, botMenuMusic, '', FAKE_QUOTE, {
               ptt: true
            })
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   }
}