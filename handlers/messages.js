/**
 * WhatsApp `messages.upsert` event handler.
 *
 * Handles status broadcasts, incoming calls, owner eval/shell commands and
 * finally delegates the message to the shared listener (plugin system).
 */
import { inspect } from 'util'
import { exec } from 'child_process'
import { promisify } from 'util'

import { STATUS_BROADCAST } from '../lib/Constants.js'

const execAsync = promisify(exec)
const MAX_EXEC_OUTPUT = 3500

const parseTimestamp = (messageTimestamp) => {
   if (!messageTimestamp) return 0
   return (typeof messageTimestamp === 'number' ? messageTimestamp : messageTimestamp.toNumber?.()) * 1000
}

const handleStatusBroadcast = async (sock, db, msg) => {
   const autoReadSW = db.getSetting()?.autoReadSW || {}
   const autoReactSW = db.getSetting()?.autoReactSW || {}

   if (autoReadSW.enabled) await sock.readMessages([msg.key]).catch(() => {})

   if (autoReactSW.enabled && msg.key.participant) {
      await sock.sendMessage(
         'status@broadcast',
         { react: { text: autoReactSW.emoji || '🔥', key: msg.key } },
         { statusJidList: [msg.key.participant] }
      ).catch(() => {})
   }
}

const handleIncomingCall = async (sock, msg) => {
   if (!msg.message?.call) return
   await sock.rejectCall(msg.key.id, msg.key.remoteJid)
   if (global.blockIfCall) await sock.updateBlockStatus(msg.key.remoteJid, 'block')
}

const handleOwnerEval = async (sock, msg, code) => {
   try {
      const result = await eval(`(async () => { ${code} })()`)
      const output = `✅ Hasil: ${inspect(result, { depth: 2 })}`
      await sock.sendMessage(msg.key.remoteJid, { text: output }, { quoted: msg })
   }
   catch (error) {
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg })
   }
}

const handleOwnerShell = async (sock, msg, command) => {
   try {
      const { stdout, stderr } = await execAsync(command, { timeout: 60000 })
      const output = (stdout || stderr).slice(0, MAX_EXEC_OUTPUT)
      await sock.sendMessage(msg.key.remoteJid, { text: `\`\`\`${output}\`\`\`` }, { quoted: msg })
   }
   catch (error) {
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ ${error.message}` }, { quoted: msg })
   }
}

export const createMessagesHandler = ({
   state,
   db,
   store,
   listener,
   watchdog,
   processedMessages
}) => {
   const isOwnerSender = (senderJid) => {
      const number = String(senderJid).split('@')[0]
      return global.owners?.includes(number) || number === String(global.ownerNumber)
   }

   return async ({ messages, type }) => {
      watchdog.ping()
      if (type !== 'notify' && type !== 'append') return

      const sock = state.sock
      if (!sock) return

      for (const msg of messages) {
         try {
            if (processedMessages.has(msg.key.id)) continue
            processedMessages.set(msg.key.id, true)

            const msgTimestamp = parseTimestamp(msg.messageTimestamp)
            if (msgTimestamp && Date.now() - msgTimestamp > 5 * 60 * 1000) continue

            if (msg.key.remoteJid === STATUS_BROADCAST) {
               await handleStatusBroadcast(sock, db, msg)
               continue
            }

            if (global.antiCall && msg.message?.call) {
               await handleIncomingCall(sock, msg)
               continue
            }

            const senderJid = msg.key.participant || msg.key.remoteJid
            const isOwner = isOwnerSender(senderJid)
            const messageBody =
               msg.message?.conversation ||
               msg.message?.extendedTextMessage?.text ||
               ''

            if (isOwner) {
               if (messageBody.startsWith('=>')) {
                  const code = messageBody.slice(2).trim()
                  if (code) await handleOwnerEval(sock, msg, code)
                  continue
               }
               if (messageBody.startsWith('$')) {
                  const command = messageBody.slice(1).trim()
                  if (command) await handleOwnerShell(sock, msg, command)
                  continue
               }
            }

            await listener.message(msg)
         }
         catch (error) {
            console.error('❌ Error memproses pesan:', error.message)
         }
      }
   }
}

export default createMessagesHandler
