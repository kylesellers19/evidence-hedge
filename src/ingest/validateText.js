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
//   not-english   mostly another script, or more of another language's
//                 function words than English ones (notEnglish)
//   empty         nothing left after trimming
//
// reader-error, blocked and not-english apply on every input path (link, file,
// paste); none of them reaches analyze(). The lexicons and sentence rules are
// English, so a document in another language would be scored on what they
// happen to match.
// ─────────────────────────────────────────────────────────────────────────────

import { INTERSTITIAL } from '../engine/lexicons/interstitial.js'
import { phraseRe } from '../engine/signals/util.js'

export const MIN_LINK_WORDS = 150         // PROVISIONAL — not ratified
export const INTERSTITIAL_MAX_WORDS = 400 // PROVISIONAL — not ratified (walls are short; a long
                                          //   article that mentions "access denied" is not one)

export const LANGUAGE_MIN_LETTERS = 500  // PROVISIONAL — not ratified (shorter text is not judged)
export const LATIN_SHARE_MIN = 0.5        // PROVISIONAL — not ratified (share of letters in Latin script)

// Common function words: English, then other Latin-script languages' that are
// not also English words or abbreviations. PROVISIONAL — not ratified.
const EN_FUNCTION = new Set('the of and to in a is that for with on are as by this be it from at or an we our their which not have has will was were can more these its than they'.split(' '))
const OTHER_FUNCTION = new Set('les des une dans sur qui que las por una der das und ist ein eine nicht zu auf och att som är för på het een niet zijn voor della dei che não uma'.split(' '))

// Not English: mostly another script (Chinese, Arabic, Cyrillic…), or a Latin-
// script text with more of another language's function words than English ones.
export function notEnglish(text) {
  const t = text || ''
  const letters = (t.match(/\p{L}/gu) || []).length
  if (letters < LANGUAGE_MIN_LETTERS) return null
  const latinShare = (t.match(/\p{Script=Latin}/gu) || []).length / letters
  if (latinShare < LATIN_SHARE_MIN) return { latinShare: Math.round(latinShare * 100) / 100 }
  const words = t.toLowerCase().match(/\p{Script=Latin}+/gu) || []
  let en = 0
  let other = 0
  for (const w of words) { if (EN_FUNCTION.has(w)) en++; else if (OTHER_FUNCTION.has(w)) other++ }
  return other > en ? { latinShare: Math.round(latinShare * 100) / 100, englishWords: en, otherWords: other } : null
}

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
  const language = notEnglish(t)
  if (language) return { ok: false, reason: 'not-english', detail: language }
  return { ok: true }
}
