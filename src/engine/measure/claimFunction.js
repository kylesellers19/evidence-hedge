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

import { METHOD, OWN_RESULT, INTERPRETATION, BACKGROUND, SURVEY_RESULT, OWN_STUDY_RESULT } from '../lexicons/claim-function.js'

export const FUNCTIONS = ['method', 'own-result', 'background', 'interpretation', 'recommendation', 'other']

const re = (list) => list.map((src) => new RegExp(src, 'i'))
const M = re(METHOD)
const R = re(OWN_RESULT)
const I = re(INTERPRETATION)
const B = re(BACKGROUND)
const S = re(SURVEY_RESULT)
const O = re(OWN_STUDY_RESULT)
const SURVEY_DESIGNS = new Set(['cross-sectional', 'repeated-cross-sectional', 'cohort-longitudinal'])
// A sentence no cue claims takes its section's function (IMRaD).
const SECTION_FUNCTION = { method: 'method', result: 'own-result', discussion: 'interpretation', introduction: 'background' }
const any = (rs, t) => rs.some((r) => r.test(t))

// Citation types that point at OTHER work (a URL alone may be the publisher's own).
const EXTERNAL_CITATION = new Set(['author-year', 'numeric', 'doi', 'year'])

/**
 * @param {string} text
 * @param {{ citations?: {type:string}[], recommendation?: {strength:string}, section?: string|null, design?: string, regulatory?: boolean }} [ctx]
 *   section: the IMRaD section the sentence sits in; design: the document's own
 *   study design; regulatory: the document summarizes a rule (all rubric-invariant)
 */
// In a document that summarizes a rule (it cites the rule's sections again and
// again), a sentence in the rule's language reports the rule; advice in the
// document's own voice ("we recommend", "you should") is still advice.
// PROVISIONAL — not ratified.
const RULE_LANGUAGE = /\b(?:must|shall|(?:is|are|will\s+be)\s+required\s+to|requires?|mandates?|prohibits?)\b/i
const OWN_ADVICE = /\b(?:we|our\s+(?:team|experts?))\s+(?:\w+\s+)?(?:recommend|suggest|advise|encourage|urge)|\byou\s+should\b|\bshould\s+consider\b|\bbest\s+practice\b/i

export function claimFunction(text, ctx = {}) {
  if (any(M, text)) return 'method'
  if (ctx.regulatory && RULE_LANGUAGE.test(text) && !OWN_ADVICE.test(text)) return 'background'
  if (ctx.recommendation && ctx.recommendation.strength !== 'none') return 'recommendation'
  const cited = (ctx.citations || []).some((c) => EXTERNAL_CITATION.has(c.type))
  if (any(R, text) && !(cited && any(B, text))) return 'own-result'
  if (SURVEY_DESIGNS.has(ctx.design) && !cited && any(S, text)) return 'own-result'
  // A document reporting its own study states that study's results in its own
  // words (the survey's population, the model's outputs, the index's movement,
  // the project's measured result); with no other work cited, they are its own.
  if (OWN_STUDY_SECTIONS(ctx.design) && !cited && any(O, text)) return 'own-result'
  if (any(I, text)) return 'interpretation'
  if (cited || any(B, text)) return 'background'
  // Section defaults hold only for a document reporting its own study: a
  // narrative review's "Methods" chapter surveys other people's methods.
  if (OWN_STUDY_SECTIONS(ctx.design)) return SECTION_FUNCTION[ctx.section] || 'other'
  return 'other'
}

const NO_OWN_STUDY = new Set(['none-reported', 'narrative-review'])
const OWN_STUDY_SECTIONS = (design) => !!design && !NO_OWN_STUDY.has(design)
