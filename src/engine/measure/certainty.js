// ─────────────────────────────────────────────────────────────────────────────
// measureCertainty(text) → { tier, hedges, boosters, attitude }
//
// Claim strength from Hyland's (2005) interactional markers only — never from
// copulas or auxiliaries. A plain declarative ("The office is ventilated") is
// `measured`; "strong" needs a booster or an absolute.
//
//   hedge, no booster          → hedged     (weight 1)
//   hedge + booster            → measured   (they cancel)
//   absolute, no hedge         → absolute   (weight 4)
//   booster, no hedge          → assertive  (weight 3)
//   unmarked                   → measured   (weight 2)
//
// A booster/absolute negated within two words ("not always", "does not prove")
// counts as a hedge. Attitude markers are recorded but do not move the tier.
// Rubric-invariant: every rubric reads the same tier for the same sentence.
// ─────────────────────────────────────────────────────────────────────────────

import { HEDGES, BOOSTERS, ABSOLUTES, ATTITUDE, NEGATORS, NEGATED_HEDGES } from '../lexicons/hyland.js'
import { escapeRe } from '../signals/util.js'

// The four tiers every rubric shares (labels, weights). Cues are the lexicon,
// listed for display; measureCertainty — not the rubric — assigns them.
export const TIERS = [
  { key: 'hedged', label: 'Hedged', weight: 1, cues: HEDGES },
  { key: 'measured', label: 'Measured', weight: 2, cues: [] },
  { key: 'assertive', label: 'Assertive', weight: 3, cues: BOOSTERS },
  { key: 'absolute', label: 'Absolute', weight: 4, cues: ABSOLUTES },
]
export const DEFAULT_TIER = 'measured'

// "may" is case-sensitive (the month); "#1" and "100%" need custom edges.
const termRe = (t) => {
  if (t === 'may') return /\bmay\b/g
  const body = escapeRe(t).replace(/\\?\s+/g, '\\s+')
  const left = /^\w/.test(t) ? '\\b' : '(?:^|(?<=\\s))'
  const right = /\w$/.test(t) ? '\\b' : ''
  return new RegExp(left + body + right, 'gi')
}
const compile = (list) => list.map((t) => [t, termRe(t)])
const H = compile([...HEDGES, ...NEGATED_HEDGES])
const B = compile(BOOSTERS)
const A = compile(ABSOLUTES)
const AT = compile(ATTITUDE)
const NEG = new RegExp(`(?:\\b(?:${NEGATORS.filter((n) => /^\w/.test(n)).join('|')})\\b|n't)(?:\\s+\\S+){0,1}\\s*$`, 'i')

function hits(text, compiled) {
  const out = []
  for (const [term, re] of compiled) {
    for (const m of text.matchAll(re)) out.push({ term, index: m.index })
  }
  return out
}

/**
 * @param {string} text
 * @returns {{ tier: 'hedged'|'measured'|'assertive'|'absolute', hedges: string[], boosters: string[], attitude: string[] }}
 */
export function measureCertainty(text) {
  const hedges = hits(text, H).map((h) => h.term)
  const boosters = []
  const absolutes = []
  for (const [list, into] of [[hits(text, B), boosters], [hits(text, A), absolutes]]) {
    for (const h of list) {
      // "never" is itself a negator; it is still an absolute.
      const before = text.slice(Math.max(0, h.index - 24), h.index)
      if (h.term !== 'never' && NEG.test(before)) hedges.push(`not ${h.term}`)
      else into.push(h.term)
    }
  }
  const attitude = hits(text, AT).map((h) => h.term)
  const strong = boosters.length + absolutes.length
  let tier
  if (hedges.length && !strong) tier = 'hedged'
  else if (hedges.length) tier = 'measured'
  else if (absolutes.length) tier = 'absolute'
  else if (boosters.length) tier = 'assertive'
  else tier = DEFAULT_TIER
  return { tier, hedges: [...new Set(hedges)], boosters: [...new Set([...absolutes, ...boosters])], attitude: [...new Set(attitude)] }
}
