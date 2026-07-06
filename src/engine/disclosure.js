// ─────────────────────────────────────────────────────────────────────────────
// Disclosed-absence detection.
//
// An absence of evidence that is openly stated (a subject declined to comment,
// "we did not verify", "in my experience") is honest hedging, not a hidden gap.
// When a claim's absence is disclosed, its nullSeverity is lowered (Part A), and
// analyze.js suppresses the unsupported-assertion penalty on that claim when the
// disclosed severity falls below 'flag'. Reuses the rubric's hedge cues plus the
// explicit-absence phrases below.
// ─────────────────────────────────────────────────────────────────────────────

import { wordRe } from './signals/util.js'

// Right-of-reply / explicit-absence phrasing (shared with the journalism
// right-of-reply signal).
export const RIGHT_OF_REPLY =
  /\b(declined to comment|did not respond to (a )?requests? for comment|could not be reached for comment)\b/i

const EXPLICIT_ABSENCE =
  /\b(declined to comment|did not respond to (a )?requests? for comment|could not be reached for comment|we did not verify|we have not verified|could not (be )?(independently )?verified?|unable to (confirm|verify)|in my experience|no data (were|was) available)\b/i

/**
 * @param {string} text
 * @param {import('./types.js').RubricConfig} rubric
 * @returns {boolean}
 */
export function isDisclosedAbsence(text, rubric) {
  if (EXPLICIT_ABSENCE.test(text)) return true
  const hedges = rubric?.extraction?.assertivenessCues?.hedges || []
  return hedges.some((h) => wordRe(h).test(text))
}
