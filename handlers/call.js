/**
 * WhatsApp `call` event handler (incoming call rejection).
 */
export const createCallHandler = ({ state }) =>
   async (calls) => {
      const sock = state.sock
      if (!sock) return

      for (const call of calls) {
         try {
            if (call.status !== 'offer') continue

            await sock.rejectCall(call.id, call.from)
            if (global.blockIfCall) await sock.updateBlockStatus(call.from, 'block')
            console.log(`📞 Tolak panggilan dari ${call.from}`)
         }
         catch (error) {
            console.error('❌ Error menangani panggilan:', error.message)
         }
      }
   }

export default createCallHandler
