// ─────────────────────────────────────────────────────────────────────────────
// Reader-only site-chrome line stripper.
//
// The reader returns page text one rendered line per line, with menus, account
// links and cookie banners left between the paragraphs. A line is dropped only
// if ALL hold:
//   · ≤ CHROME_MAX_WORDS words
//   · no terminal punctuation
//   · no finite verb
//   · it matches the site-chrome lexicon (src/engine/lexicons/site-chrome.js)
// Runs on the raw reader body, before the normalizer joins soft line breaks —
// after that, a chrome line is already glued to the paragraph beside it.
// Uploads and pasted text never pass through here.
// ─────────────────────────────────────────────────────────────────────────────

import { CHROME_LINES, CHROME_PHRASES } from '../engine/lexicons/site-chrome.js'
import { FINITE_VERB } from '../engine/nonClaimFilter.js'
import { phraseRe } from '../engine/signals/util.js'

export const CHROME_MAX_WORDS = 12 // PROVISIONAL — not ratified

const TERMINAL = /[.!?]["')\]]?$/
const LINE_SET = new Set(CHROME_LINES)
const PHRASE_RES = CHROME_PHRASES.map(phraseRe)

const norm = (s) => s.toLowerCase().replace(/[»›→]+/g, ' ').replace(/\s+/g, ' ').trim()

export function isChromeLine(line) {
  const t = line.trim()
  if (!t) return false
  if (t.split(/\s+/).length > CHROME_MAX_WORDS) return false
  if (TERMINAL.test(t)) return false
  if (FINITE_VERB.test(t)) return false
  const n = norm(t)
  if (LINE_SET.has(n)) return true
  // A bar of chrome items: "Privacy Statement | Cookie Descriptions", or a row of
  // one-word items such as a share bar ("X Facebook Threads LinkedIn").
  const parts = n.split(/\s*[|•·]\s*|\s{2,}/).filter(Boolean)
  if (parts.length > 1 && parts.every((p) => LINE_SET.has(p))) return true
  const words = n.split(' ')
  if (words.length > 1 && words.every((w) => LINE_SET.has(w))) return true
  return PHRASE_RES.some((re) => re.test(t))
}

/**
 * @param {string} body  raw reader text
 * @returns {{ text: string, dropped: string[] }}
 */
export function stripChromeLines(body) {
  const kept = []
  const dropped = []
  for (const line of (body || '').replace(/\r\n?/g, '\n').split('\n')) {
    if (isChromeLine(line)) dropped.push(line.trim())
    else kept.push(line)
  }
  return { text: kept.join('\n'), dropped }
}
