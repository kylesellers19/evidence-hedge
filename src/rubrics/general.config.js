// ─────────────────────────────────────────────────────────────────────────────
// GENERAL WEB — stub rubric.
//
// Shape-complete and runnable; DRAFT values. The most lenient tolerance of the
// four — general web writing is held to a lower sourcing bar — but it still
// catches the confident, link-free assertion. Filling this in is config-only.
// ─────────────────────────────────────────────────────────────────────────────

import { makeNullSeverity } from '../engine/nullSeverity.js'
import { SHARED_EXTRACTION, TIERS, DEFAULT_TIER } from '../engine/measure/index.js'
import { SHARED_PROVENANCE } from '../engine/profile/standards.js'

/** @type {import('../engine/types.js').RubricConfig} */
export const general = {
  id: 'general',
  label: 'General web',
  description: 'Blogs, marketing pages & general explainer content.',
  documentNoun: 'page',
  stub: true,

  postures: ['experiential', 'authoritative'],
  defaultPosture: 'experiential',
  // A document with no posture signal is held to this.
  strictestPosture: 'authoritative', // PROVISIONAL — not ratified
  documentSignals: ['posture-gate', 'completeness-gaps', 'equivalence-from-nonsignificance', 'subgroup-selection', 'covariate-inconsistency', 'self-disclaimed-causality'],

  ladder: [
    { key: 'unsourced', label: 'Unsourced',        rank: 0, tint: 'unsupported' },
    { key: 'asserted',  label: 'Bare assertion',   rank: 1, tint: 'partial',
      match: { keywords: ['everyone knows', 'it is well known', 'studies show', 'experts agree'] } },
    { key: 'linked',    label: 'Linked source',    rank: 2, tint: 'partial',
      match: { types: ['url', 'url-own', 'phrase'], keywords: ['according to', 'source:', 'via'] } },
    { key: 'cited',     label: 'Cited reference',   rank: 3, tint: 'supported',
      match: { types: ['author-year', 'year', 'numeric'], keywords: ['study', 'report', 'survey', 'data'] } },
    { key: 'primary',   label: 'Primary / verified', rank: 4, tint: 'supported',
      match: { types: ['doi'], keywords: ['peer-reviewed', 'official', 'verified'] } },
  ],

  // Claim strength is measured, not judged: the four shared tiers and their
  // Hyland cues live in engine/measure/certainty.js (rubric-invariant).
  tiers: TIERS,
  defaultTier: DEFAULT_TIER,

  // Rung an own-result claim reaches on the document's own evidence.
  ownResultRung: 'primary', // PROVISIONAL — not ratified

  // Shared extraction (engine/measure/index.js): identical under every rubric.
  extraction: SHARED_EXTRACTION,

  // Most lenient ladder ceilings of the four rubrics. Experiential writing carries
  // no evidence obligation; authoritative (prescriptive + YMYL) is held stricter.
  tolerance: {
    ceilings: {
      default: [2, 3, 3, 4, 4],        // migrated
      experiential: [2, 3, 3, 4, 4],    // PROVISIONAL — not ratified
      authoritative: [1, 2, 3, 4, 4],   // PROVISIONAL — not ratified (stricter for YMYL)
    },
    nullSeverity: makeNullSeverity({
      default: ['none', 'none', 'note', 'critical'],       // PROVISIONAL — not ratified
      experiential: ['none', 'none', 'note', 'critical'],  // PROVISIONAL — not ratified (none for low tiers)
      authoritative: ['none', 'note', 'flag', 'critical'], // PROVISIONAL — not ratified
    }),
  },

  provenance: [
    {
      criterion: 'E-E-A-T (experience, expertise, authoritativeness and trustworthiness) and YMYL (“your money or your life”) authority thresholds',
      standard: 'Google Search Quality Rater Guidelines',
      citation: 'Google Search Quality Rater Guidelines — E-E-A-T and YMYL.',
      url: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content',
    },
    ...SHARED_PROVENANCE,
  ],
}
