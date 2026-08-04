/**
 * WhatsApp `presence.update` event handler.
 */
export const createPresenceHandler = ({ state, listener }) =>
   async ({ id, presences }) => {
      const sock = state.sock
      if (!sock) return

      for (const presence in presences) {
         try {
            await listener.presence({ id, presence, presences })
         }
         catch (error) {
            console.error('❌ Error presence.update:', error.message)
         }
      }
   }

export default createPresenceHandler
