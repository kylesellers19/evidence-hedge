// ─────────────────────────────────────────────────────────────────────────────
// Non-claim filter (Phase-1 ratified rules, tiered).
//
//   DROP (hard exclusion, regardless of likelihood):
//     · disclosure/legal boilerplate (lexicon)
//     · bylines / datelines / metadata (regex + no predicate)
//     · nav / UI chrome (≤4 words + no finite verb + no terminal punctuation +
//       CTA lexicon) — GUARDED by the imperative-advice / YMYL lexicons so real
//       short advice survives
//
//   DEMOTE (subtract from claimLikelihood, not drop):
//     · title-case headings (short + no terminal punct + majority-capitalized) —
//       EXEMPT under the journalism rubric (headlines are genuine claims)
//     · figure / table captions ("Figure 1: …")
//
//   EXCLUDED from v1: mission/values-statement dropping (too high a false-
//   exclusion risk on quantified pledges) — those flow through untouched.
//
// Every predicate is exported so each rule is independently testable.
// ─────────────────────────────────────────────────────────────────────────────

import { phraseRe, wordRe } from './signals/util.js'
import { BOILERPLATE } from './lexicons/boilerplate.js'
import { NAV_CTA } from './lexicons/nav-cta.js'
import { IMPERATIVE_ADVICE } from './lexicons/imperative-advice.js'
import { YMYL_TERMS } from './lexicons/ymyl.js'

// A permissive finite-verb probe for the nav-chrome rule (a true nav item has none).
const FINITE_VERB =
  /\b(?:is|are|was|were|be|will|would|can|cannot|can't|does|do|did|has|have|had|shows?|proves?|makes?|found|reported|said|grew|rose|fell|reduced|increased|caused|leads?|means?|offers?|provides?)\b/i
const TERMINAL = /[.!?]["')]?$/

const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length
const anyPhrase = (text, list) => list.some((p) => phraseRe(p).test(text))

// ── DROP predicates ──────────────────────────────────────────────────────────
export function isBoilerplate(s) {
  return anyPhrase(s, BOILERPLATE)
}

export function isBylineOrMeta(s) {
  const t = s.trim()
  if (/^[Bb]y\s+[A-Z][a-z]+(?:\s+[A-Z][a-z.'-]+){0,2}\s*$/.test(t)) return true // "By Jane Doe"
  if (/\b\d+\s*min(?:ute)?s?\s+read\b/i.test(t)) return true                 // "5 min read"
  if (/^(?:posted|updated|published)\s+(?:on\s+)?/i.test(t)) return true
  if (/^share\s+(?:on|this)\b/i.test(t)) return true
  // Bare date lines.
  if (/^(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\s*$/i.test(t)) return true
  if (/^\d{4}-\d{2}-\d{2}\s*$/.test(t)) return true
  return false
}

export function hasAdviceGuard(s) {
  return anyPhrase(s, IMPERATIVE_ADVICE) || YMYL_TERMS.some((term) => wordRe(term).test(s))
}

export function isNavChrome(s) {
  if (wordCount(s) > 4) return false
  if (FINITE_VERB.test(s)) return false
  if (TERMINAL.test(s.trim())) return false
  return anyPhrase(s, NAV_CTA)
}

// ── DEMOTE predicates ────────────────────────────────────────────────────────
export function isTitleCaseHeading(s) {
  const t = s.trim()
  if (TERMINAL.test(t)) return false
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length === 0 || words.length > 10) return false
  const capitalized = words.filter((w) => /^[A-Z]/.test(w)).length
  return capitalized / words.length > 0.6
}

export function isFigureCaption(s) {
  return /^(?:figure|fig\.?|table|chart|exhibit)\s*\d+\b/i.test(s.trim())
}

// ── Combined tier decisions ──────────────────────────────────────────────────
export function isDropped(s) {
  return isBoilerplate(s) || isBylineOrMeta(s) || (isNavChrome(s) && !hasAdviceGuard(s))
}

// Penalty subtracted from claimLikelihood; enough to sink a borderline heading
// below the extraction sensitivity threshold. PROVISIONAL.
export const DEMOTE_PENALTY = 0.2

export function demotionPenalty(s, rubricId) {
  let pen = 0
  if (isFigureCaption(s)) pen += DEMOTE_PENALTY
  if (isTitleCaseHeading(s) && rubricId !== 'journalism') pen += DEMOTE_PENALTY
  return pen
}

// Classify a sentence for auditing/measurement: which rule (if any) acted.
export function classifyNonClaim(s, rubricId) {
  if (isBoilerplate(s)) return { action: 'drop', rule: 'boilerplate' }
  if (isBylineOrMeta(s)) return { action: 'drop', rule: 'byline-meta' }
  if (isNavChrome(s) && !hasAdviceGuard(s)) return { action: 'drop', rule: 'nav-chrome' }
  if (isFigureCaption(s)) return { action: 'demote', rule: 'figure-caption' }
  if (isTitleCaseHeading(s) && rubricId !== 'journalism') return { action: 'demote', rule: 'title-heading' }
  return { action: 'keep', rule: null }
}
