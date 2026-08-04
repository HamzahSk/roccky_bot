/**
 * WhatsApp group events handler: `groups.update` and `group-participants.update`.
 */
import { delay } from 'baileys'

const BOT_JOIN_COOLDOWN_MS = 15_000

const getBotNumber = (sock) =>
   String(sock?.user?.id || '').split(':')[0]?.split('@')[0] || ''

const sendGroupWelcome = async (sock, { id, author, groupName }) => {
   const inviterMention = author ? `@${author.split('@')[0]}` : 'seseorang'
   const prefix = global.commandPrefix || '.'
   const welcomeText =
      `👋 *Halo!* Terima kasih sudah mengundangku ke *${groupName}*.\n` +
      `Diundang oleh ${inviterMention}.\n\n` +
      `Ketik \`${prefix}menu\` untuk melihat fitur.`

   await sock.sendMessage(id, {
      text: welcomeText,
      contextInfo: { mentionedJid: author ? [author] : [] }
   })
   console.log(`🎉 Bot bergabung ke grup: ${groupName}`)
}

export const createGroupsUpdateHandler = ({ store, groupCache }) =>
   async (groups) => {
      try {
         for (const group of groups) {
            if (group.id) groupCache.set(group.id, { ...groupCache.get(group.id), ...group })

            if (store.hasGroup(group.id))
               store.setGroup(group.id, Object.assign(store.getGroup(group.id) || {}, group))
            else
               store.setGroup(group.id, group)
         }
      }
      catch (error) {
         console.error('❌ Error groups.update:', error.message)
      }
   }

export const createGroupParticipantsHandler = ({ state, db, store, listener }) =>
   async ({ id, author, participants, action }) => {
      try {
         const sock = state.sock
         if (!sock) return

         if (Date.now() - (global._connectedAt || 0) < BOT_JOIN_COOLDOWN_MS) return

         const botNumber = getBotNumber(sock)
         const isBotAdded = action === 'add' && participants.some((p) => p.includes(botNumber))

         if (isBotAdded) {
            const sewaEnabled = db.getSetting()?.sewa?.enabled || false

            if (sewaEnabled) {
               const groupSewa = db.getGroup(id)?.sewa
               const isWhitelisted = groupSewa && (groupSewa.isLifetime || groupSewa.expiredAt > Date.now())

               if (!isWhitelisted) {
                  await sock.sendMessage(id, { text: '⛔ Grup tidak terdaftar dalam sistem sewa, bot akan keluar.' })
                  await delay(2000)
                  await sock.groupLeave(id)
                  console.log(`🚪 Auto-left non-sewa group: ${id}`)
                  return
               }
            }

            let groupName = 'grup ini'
            try {
               const meta = await sock.groupMetadata(id)
               groupName = meta.subject
            }
            catch { }

            await sendGroupWelcome(sock, { id, author, groupName })
         }

         for (const participant of participants)
            await listener.participant({ id, author, participant, action })
      }
      catch (error) {
         console.error('❌ Error group-participants.update:', error.message)
      }
   }

export default {
   createGroupsUpdateHandler,
   createGroupParticipantsHandler
}
