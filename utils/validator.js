/**
 * Input / command validation helpers.
 */
import { Func } from '#func'
import { S_WHATSAPP_NET } from '../lib/Constants.js'

/**
 * Check whether a raw text starts with one of the configured prefixes.
 */
export const hasValidPrefix = (text = '', prefixes = ['.']) => {
   const first = text[Symbol.iterator]().next().value
   if (!first) return false
   if (first === '\u200D' || first === '\uFE0F' || first.trim() === '') return false
   return prefixes.includes(first)
}

/**
 * Validate a phone number string (country-code format, digits only).
 */
export const isValidPhoneNumber = (number = '') =>
   /^[1-9]\d{7,15}$/.test(String(number).replace(/\D/g, ''))

/**
 * Convert any user input into a valid @s.whatsapp.net jid.
 */
export const toJid = (input = '') => {
   const cleaned = String(input).replace(/\D/g, '')
   if (!cleaned) return ''
   return cleaned.endsWith(S_WHATSAPP_NET) ? cleaned : cleaned + S_WHATSAPP_NET
}

/**
 * Check whether the given jid belongs to the bot owner (or the owner list).
 */
export const isOwner = (jid = '') => {
   const number = String(jid).split(':')[0].split('@')[0]
   if (number === global.ownerNumber) return true
   return (global.owners || []).includes(number)
}

/**
 * Validate that a numeric argument is a finite number within a range.
 */
export const validateNumberRange = (value, { min = 1, max = 1e9 } = {}) => {
   const parsed = Number(value)
   if (!Number.isFinite(parsed)) return null
   if (parsed < min || parsed > max) return null
   return parsed
}

/**
 * Parse a duration string like "1h", "30m", "2d" into milliseconds.
 * Returns null when invalid.
 */
export const parseDuration = (value = '') => {
   const match = String(value).trim().match(/^(\d+)\s*(s|m|h|d)$/i)
   if (!match) return null

   const amount = Number(match[1])
   const unit = match[2].toLowerCase()
   const multipliers = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }

   return amount * multipliers[unit]
}

/**
 * Validate a yes/no toggle argument ("on" / "off" / "true" / "false").
 */
export const parseToggle = (value = '') => {
   const normalized = String(value).toLowerCase()
   if (['on', 'true', '1', 'yes', 'y'].includes(normalized)) return true
   if (['off', 'false', '0', 'no', 'n'].includes(normalized)) return false
   return null
}

/**
 * Validate that a jid looks like a group jid.
 */
export const isGroupJid = (jid = '') => typeof jid === 'string' && jid.endsWith('@g.us')

/**
 * Validate that a jid looks like a private user jid.
 */
export const isUserJid = (jid = '') => typeof jid === 'string' && jid.endsWith(S_WHATSAPP_NET)

/**
 * Generic required-argument guard used inside plugin run() functions.
 * Returns the trimmed text or null when missing.
 */
export const requireText = (text = '', example = '') => {
   const cleaned = String(text || '').trim()
   if (!cleaned) return null
   return cleaned
}

/**
 * Escape special characters for regex to avoid ReDoS / injection.
 */
export const escapeRegExp = (text = '') =>
   String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export default {
   hasValidPrefix,
   isValidPhoneNumber,
   toJid,
   isOwner,
   validateNumberRange,
   parseDuration,
   parseToggle,
   isGroupJid,
   isUserJid,
   requireText,
   escapeRegExp
}
