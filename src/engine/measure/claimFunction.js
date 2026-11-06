// ─────────────────────────────────────────────────────────────────────────────
// claimFunction(text, { citations, recommendation }) →
//   'method' | 'own-result' | 'background' | 'interpretation' | 'recommendation' | 'other'
//
// What a sentence does in the document, which decides how it is judged:
//   · method claims are never flagged (a procedure is not an assertion)
//   · own-result claims rest on the document's own evidence — they reach the
//     rubric's in-document rung (research → primary, corporate → self-reported,
//     journalism → documented, general → primary)
//   · own-result, interpretation and recommendation claims are checked against
//     the design ceiling (causal-overreach)
// A sentence that carries a citation to other work and no result marker reads as
// background. Rubric-invariant. checks/claim-function-sample.csv holds a sample
// for hand labeling.
// ─────────────────────────────────────────────────────────────────────────────

import { METHOD, OWN_RESULT, INTERPRETATION, BACKGROUND } from '../lexicons/claim-function.js'

export const FUNCTIONS = ['method', 'own-result', 'background', 'interpretation', 'recommendation', 'other']

const re = (list) => list.map((src) => new RegExp(src, 'i'))
const M = re(METHOD)
const R = re(OWN_RESULT)
const I = re(INTERPRETATION)
const B = re(BACKGROUND)
const any = (rs, t) => rs.some((r) => r.test(t))

// Citation types that point at OTHER work (a URL alone may be the publisher's own).
const EXTERNAL_CITATION = new Set(['author-year', 'numeric', 'doi', 'year'])

/**
 * @param {string} text
 * @param {{ citations?: {type:string}[], recommendation?: {strength:string} }} [ctx]
 */
export function claimFunction(text, ctx = {}) {
  if (any(M, text)) return 'method'
  if (ctx.recommendation && ctx.recommendation.strength !== 'none') return 'recommendation'
  const cited = (ctx.citations || []).some((c) => EXTERNAL_CITATION.has(c.type))
  if (any(R, text) && !(cited && any(B, text))) return 'own-result'
  if (any(I, text)) return 'interpretation'
  if (cited || any(B, text)) return 'background'
  return 'other'
}
