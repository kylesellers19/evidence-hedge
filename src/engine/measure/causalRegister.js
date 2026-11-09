// ─────────────────────────────────────────────────────────────────────────────
// causalRegister(text) → { register, cues, strength, conditioned }
//
// How strongly a sentence claims cause, in the Yu, Li & Wang (2019) scheme:
//   none                no relationship stated (incl. recommendations and calls
//                       for further research, which Yu annotate as none)
//   correlational       relationship without causal force (associated, linked,
//                       more likely, predicts, "reduced risk", "improvements")
//   conditional-causal  causal language under a hedge (may reduce, can improve)
//   direct-causal       unhedged causal language (reduces, leads to, improves)
//
// Causal force comes from Haber et al. (2022)'s rated linking words: a matched
// root rated ≥ CAUSAL_ROOT_MIN is causal, below it associational. Change verbs
// (reduce, increase, lower …) count as causal only when used as a verb.
// Rubric-invariant. Evaluated on the Yu corpus by scripts/eval-causal-register.mjs.
// ─────────────────────────────────────────────────────────────────────────────

import { HABER_ROOT_STRENGTH } from '../lexicons/haber-2022.js'
import {
  RATED_PATTERNS, EXTRA_CAUSAL, EXTRA_STRENGTH, CONDITIONING, CHANGE_ROOTS, CHANGE_NOUNS,
  VERBAL_CHANGE_STRENGTH, NOMINAL_CHANGE_STRENGTH, NO_FINDING, PURPOSE, CAUSAL_DISCLAIMER, REPORTED_BELIEF,
} from '../lexicons/causal-register.js'
import { phraseRe } from '../signals/util.js'

export const CAUSAL_ROOT_MIN = 2.0 // PROVISIONAL — not ratified (Haber mean rating, 0–3)

export const REGISTERS = ['none', 'correlational', 'conditional-causal', 'direct-causal']
export const registerRank = (r) => Math.max(0, REGISTERS.indexOf(r))

const g = (src) => new RegExp(src, 'gi')
const CUES = [
  ...Object.entries(RATED_PATTERNS).map(([root, src]) => ({ root, strength: HABER_ROOT_STRENGTH[root] ?? 1, re: g(src) })),
  ...Object.entries(EXTRA_CAUSAL).map(([root, src]) => ({ root, strength: EXTRA_STRENGTH, re: g(src) })),
]
const CHANGE = Object.entries(CHANGE_ROOTS).map(([root, forms]) => ({ root, re: g(`\\b(?:${forms})\\b`) }))
const CHANGE_NOUN_RE = new RegExp(`\\b(?:${CHANGE_NOUNS})\\s+(?:in|of)\\b`, 'i')
const NO_FINDING_RES = [...NO_FINDING, ...CAUSAL_DISCLAIMER].map((src) => new RegExp(src, 'i'))
export const CAUSAL_DISCLAIMER_RES = CAUSAL_DISCLAIMER.map((src) => new RegExp(src, 'i'))
const PURPOSE_RE = new RegExp(PURPOSE, 'i')
const BELIEF_RE = new RegExp(REPORTED_BELIEF, 'gi')

// Where the reported-belief clause ends: cues after it are the respondents' words.
function beliefStart(text) {
  const m = BELIEF_RE.exec(text)
  BELIEF_RE.lastIndex = 0
  return m ? m.index + m[0].length : -1
}
// Lowercase "may"/"can" only: the month and sentence-initial "Can" questions are not hedges.
const CONDITIONING_RES = CONDITIONING.map((c) => (c === 'may' || c === 'can' ? /\b(?:may|can)\b/ : phraseRe(c)))

// Before a change verb: a modal, "to", "help", "not", "did" → verbal use.
const VERBAL_BEFORE = /\b(?:can|cannot|could|may|might|will|would|to|does|did|do|not|help|helps|helped|helping)\s+(?:\w+ly\s+)?$/i
// A determiner, preposition or be-form right before → adjective/participle use.
const NOMINAL_BEFORE = /\b(?:the|a|an|with|of|and|or|in|for|from|among|by|at|on|than|to|their|its|his|her|our|is|are|was|were|be|been|being|has|have|had|significantly|statistically)\s+$/i
// After a passive "was reduced", only an agent ("by …") makes it causal.
const BE_BEFORE = /\b(?:is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?$/i
const AFTER_OBJECT = /^\s+(?!(?:in|of|by|from|with|among|after|during|over|at|and|or)\b(?!-)|(?:risks?|odds|likelihood|rates?|levels?)\b|[.,;:)])\S/i

function verbalChange(text, m) {
  const before = text.slice(Math.max(0, m.index - 40), m.index)
  const after = text.slice(m.index + m[0].length, m.index + m[0].length + 30)
  if (PURPOSE_RE.test(before)) return null // "interventions to reduce …": a purpose, not a claim
  if (VERBAL_BEFORE.test(before)) return true
  if (BE_BEFORE.test(before)) return /^\s+by\s+(?!\d)/i.test(after)
  if (NOMINAL_BEFORE.test(before)) return false
  if (/^[A-Z]/.test(m[0]) && m.index === 0) return false // sentence-initial "Reduced X …"
  return /(?:s|ed)$/i.test(m[0]) && AFTER_OBJECT.test(after)
}

// The cues causalRegister records, each with where the word that matched sits
// (the first match for a root; for a change verb, the strongest use).
function scanCues(text) {
  const cues = []
  const spans = []
  const belief = beliefStart(text)
  const reported = (i) => belief >= 0 && i >= belief
  for (const c of CUES) {
    for (const m of text.matchAll(c.re)) {
      if (reported(m.index)) continue
      if (PURPOSE_RE.test(text.slice(Math.max(0, m.index - 40), m.index))) continue
      cues.push({ root: c.root, strength: c.strength })
      spans.push({ index: m.index, length: m[0].length })
      break
    }
  }
  for (const c of CHANGE) {
    let best = null
    let at = null
    for (const m of text.matchAll(c.re)) {
      if (reported(m.index)) continue
      const verbal = verbalChange(text, m)
      if (verbal === null) continue
      const s = verbal ? Math.max(HABER_ROOT_STRENGTH[c.root] ?? 0, VERBAL_CHANGE_STRENGTH)
        : Math.min(HABER_ROOT_STRENGTH[c.root] ?? NOMINAL_CHANGE_STRENGTH, NOMINAL_CHANGE_STRENGTH)
      if (best === null || s > best) { best = s; at = { index: m.index, length: m[0].length } }
    }
    if (best !== null) { cues.push({ root: c.root, strength: best }); spans.push(at) }
  }
  if (CHANGE_NOUN_RE.test(text) && !cues.length) {
    const m = text.match(CHANGE_NOUN_RE)
    cues.push({ root: 'change-noun', strength: NOMINAL_CHANGE_STRENGTH })
    spans.push({ index: m.index, length: m[0].length })
  }
  return { cues, spans }
}

/**
 * Where the causal cue words of a sentence sit, for display only:
 * [{ index, length }], one per cue causalRegister records.
 */
export const causalCueSpans = (text) => scanCues(text).spans

/**
 * @param {string} text
 * @returns {{ register: string, cues: {root:string, strength:number}[], strength: number, conditioned: boolean }}
 */
export function causalRegister(text) {
  const { cues } = scanCues(text)
  if (cues.length === 0 || NO_FINDING_RES.some((re) => re.test(text))) {
    return { register: 'none', cues, strength: 0, conditioned: false }
  }
  const strength = Math.max(...cues.map((c) => c.strength))
  if (strength < CAUSAL_ROOT_MIN) return { register: 'correlational', cues, strength, conditioned: false }
  const conditioned = CONDITIONING_RES.some((re) => re.test(text))
  return { register: conditioned ? 'conditional-causal' : 'direct-causal', cues, strength, conditioned }
}
