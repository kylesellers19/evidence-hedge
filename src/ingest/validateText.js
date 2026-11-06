// ─────────────────────────────────────────────────────────────────────────────
// validateText(text, { path }) → { ok: true } | { ok: false, reason, detail? }
//
// The gate in front of analyze(). A reader error body or a bot-check wall is
// not a document; scoring one produced an 8/10 "no expert claims" verdict for a
// page that said "Making sure you're not a bot!".
//
//   reader-error  JSON body with code ≥ 400, or a name ending in "Error"
//   blocked       a short text matching the interstitial lexicon
//   too-short     under MIN_LINK_WORDS words — link path only
//   empty         nothing left after trimming
//
// reader-error and blocked apply on every input path (link, file, paste);
// blocked text never reaches analyze().
// ─────────────────────────────────────────────────────────────────────────────

import { INTERSTITIAL } from '../engine/lexicons/interstitial.js'
import { phraseRe } from '../engine/signals/util.js'

export const MIN_LINK_WORDS = 150         // PROVISIONAL — not ratified
export const INTERSTITIAL_MAX_WORDS = 400 // PROVISIONAL — not ratified (walls are short; a long
                                          //   article that mentions "access denied" is not one)

const INTERSTITIAL_RES = INTERSTITIAL.map((p) => [p, phraseRe(p)])
const wordCount = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0)

// The reader's error envelope: {"code":403,"name":"AbuseAlleviationError",…}.
export function readerErrorOf(text) {
  const t = (text || '').trim()
  if (!t.startsWith('{')) return null
  let body
  try { body = JSON.parse(t) } catch { return null }
  if (!body || typeof body !== 'object') return null
  const code = Number(body.code)
  const name = typeof body.name === 'string' ? body.name : ''
  if (!(code >= 400) && !/Error$/.test(name)) return null
  return { code: code || null, name: name || null, message: typeof body.message === 'string' ? body.message : '' }
}

/**
 * @param {string} text
 * @param {{ path?: 'link'|'file'|'paste' }} [options]
 */
export function validateText(text, { path = 'paste' } = {}) {
  const t = (text || '').trim()
  if (!t) return { ok: false, reason: 'empty' }
  const err = readerErrorOf(t)
  if (err) return { ok: false, reason: 'reader-error', detail: err }
  const words = wordCount(t)
  if (words <= INTERSTITIAL_MAX_WORDS) {
    const hit = INTERSTITIAL_RES.find(([, re]) => re.test(t))
    if (hit) return { ok: false, reason: 'blocked', detail: { phrase: hit[0], words } }
  }
  if (path === 'link' && words < MIN_LINK_WORDS) return { ok: false, reason: 'too-short', detail: { words } }
  return { ok: true }
}
