/**
 * Message / text formatting helpers.
 */
import { Func } from '#func'

/**
 * Truncate a string to a maximum length (keeps it safe for WhatsApp messages).
 */
export const truncate = (text = '', maxLength = 4000) => {
   if (typeof text !== 'string') return String(text)
   if (text.length <= maxLength) return text
   return text.slice(0, maxLength) + '…'
}

/**
 * Remove markdown-asterisks that could break formatting inside a code block.
 */
export const escapeMarkdown = (text = '') =>
   String(text).replace(/(\*|_|~|`)/g, '\\$1')

/**
 * Build a simple key-value list block.
 */
export const formatKeyValue = (entries = {}, { title = '', icon = '✦' } = {}) => {
   const lines = Object.entries(entries).map(([key, value]) => `│ ${key}: ${value}`)
   return Func.frame(title, lines, icon)
}

/**
 * Sanitize a text so it can be used as a WhatsApp caption / file name.
 */
export const sanitizeText = (text = '', fallback = '-') => {
   const cleaned = String(text)
      .replace(/[\n\r\t]+/g, ' ')
      .replace(/[*_~`]/g, '')
      .trim()
   return cleaned || fallback
}

/**
 * Pluralize a simple English word.
 */
export const pluralize = (count, singular, plural = singular + 's') =>
   `${count} ${count === 1 ? singular : plural}`

/**
 * Format a count with Indonesian-style separators.
 */
export const formatCount = (number) =>
   Number(number || 0).toLocaleString('id-ID')

/**
 * Build a quoted block (nice for terminal / reply previews).
 */
export const formatQuote = (text = '') =>
   String(text)
      .split('\n')
      .map(line => `> ${line}`)
      .join('\n')

export default {
   truncate,
   escapeMarkdown,
   formatKeyValue,
   sanitizeText,
   pluralize,
   formatCount,
   formatQuote
}
