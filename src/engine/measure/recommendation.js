// ─────────────────────────────────────────────────────────────────────────────
// recommendationStrength(text) → { strength: 'none'|'weak'|'strong', cues }
//
// Advice strength in the Li, Wang & Yu (2021) scheme. A recommendation's
// strength is judged against the design ceiling (profile/design.js): a
// cross-sectional survey licenses weak advice at most. Rubric-invariant.
// ─────────────────────────────────────────────────────────────────────────────

import { STRONG_ADVICE, WEAK_ADVICE, NOT_ADVICE } from '../lexicons/advice.js'

export const STRENGTHS = ['none', 'weak', 'strong']
export const strengthRank = (s) => Math.max(0, STRENGTHS.indexOf(s))

const STRONG = STRONG_ADVICE.map((src) => new RegExp(src, 'i'))
const WEAK = WEAK_ADVICE.map((src) => new RegExp(src, 'i'))
const NOT = NOT_ADVICE.map((src) => new RegExp(src, 'i'))
// "May" as a month or a sentence-initial question is never advice.
const QUESTION = /\?\s*$/

/**
 * @param {string} text
 * @returns {{ strength: 'none'|'weak'|'strong', cues: string[] }}
 */
export function recommendationStrength(text) {
  const t = text.trim()
  if (QUESTION.test(t) || NOT.some((re) => re.test(t))) return { strength: 'none', cues: [] }
  const strong = STRONG.map((re) => t.match(re)?.[0]).filter(Boolean)
  if (strong.length) return { strength: 'strong', cues: strong }
  const weak = WEAK.map((re) => t.match(re)?.[0]).filter(Boolean)
  if (weak.length) return { strength: 'weak', cues: weak }
  return { strength: 'none', cues: [] }
}
