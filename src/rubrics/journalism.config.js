// ─────────────────────────────────────────────────────────────────────────────
// JOURNALISM — stub rubric.
//
// Shape-complete and runnable so the entry screen and engine work, but the
// values are DRAFTS pending tuning. The eventual focus here is sourcing
// (named vs. anonymous vs. uncited) and the dropped-attribution pattern.
// Filling this in is config-only — no engine changes.
// ─────────────────────────────────────────────────────────────────────────────

import { makeNullSeverity } from '../engine/nullSeverity.js'
import { SHARED_EXTRACTION, TIERS, DEFAULT_TIER } from '../engine/measure/index.js'
import { SHARED_PROVENANCE } from '../engine/profile/standards.js'

/** @type {import('../engine/types.js').RubricConfig} */
export const journalism = {
  id: 'journalism',
  label: 'Journalism',
  description: 'Reporting & opinion — articles, op-eds, newsletters.',
  documentNoun: 'article',
  stub: true,

  postures: ['news', 'opinion', 'sponsored', 'unlabeled'],
  defaultPosture: 'news',
  // A document with no posture signal is held to this.
  strictestPosture: 'unlabeled', // PROVISIONAL — not ratified
  documentSignals: ['per-claim-sourcing', 'label-transparency', 'method-disclosure', 'perspective-plurality', 'right-of-reply', 'anonymous-sourcing', 'completeness-gaps', 'equivalence-from-nonsignificance', 'subgroup-selection', 'covariate-inconsistency', 'self-disclaimed-causality'],

  ladder: [
    { key: 'unsourced',  label: 'Unsourced',          rank: 0, tint: 'unsupported' },
    { key: 'anonymous',  label: 'Anonymous source',   rank: 1, tint: 'partial',
      match: { keywords: ['sources say', 'a source', 'people familiar', 'reportedly', 'rumored'] } },
    { key: 'named',      label: 'Named attribution',  rank: 2, tint: 'partial',
      match: { types: ['phrase'], keywords: ['said', 'told', 'according to', 'stated'] } },
    { key: 'documented', label: 'Documented record',  rank: 3, tint: 'supported',
      match: { types: ['url', 'url-own', 'numeric'], keywords: ['records show', 'filing', 'transcript', 'data show'] } },
    { key: 'verified',   label: 'Independently verified', rank: 4, tint: 'supported',
      match: { types: ['doi'], keywords: ['verified', 'corroborated', 'confirmed by multiple'] } },
  ],

  // Claim strength is measured, not judged: the four shared tiers and their
  // Hyland cues live in engine/measure/certainty.js (rubric-invariant).
  tiers: TIERS,
  defaultTier: DEFAULT_TIER,

  // Rung an own-result claim reaches on the document's own evidence.
  ownResultRung: 'documented', // PROVISIONAL — not ratified

  // Shared extraction (engine/measure/index.js): identical under every rubric.
  extraction: SHARED_EXTRACTION,

  tolerance: {
    ceilings: {
      default: [1, 2, 3, 4, 4],     // migrated
      news: [1, 2, 3, 4, 4],        // PROVISIONAL — not ratified
      opinion: [2, 3, 4, 4, 4],     // PROVISIONAL — not ratified (opinion tolerated more)
      sponsored: [1, 2, 3, 4, 4],   // PROVISIONAL — not ratified
      unlabeled: [1, 2, 3, 4, 4],   // PROVISIONAL — not ratified
    },
    nullSeverity: makeNullSeverity({
      default: ['none', 'note', 'flag', 'critical'],   // PROVISIONAL — not ratified
      news: ['none', 'note', 'flag', 'critical'],      // PROVISIONAL — not ratified
      opinion: ['none', 'none', 'note', 'critical'],   // PROVISIONAL — not ratified
      sponsored: ['none', 'note', 'flag', 'critical'], // PROVISIONAL — not ratified
      unlabeled: ['none', 'note', 'flag', 'critical'], // PROVISIONAL — not ratified
    }),
  },

  provenance: [
    {
      criterion: 'per-claim sourcing, labels, method disclosure, plurality',
      standard: 'The Trust Project — 8 Trust Indicators',
      citation: 'The Trust Project — 8 Trust Indicators.',
      url: 'https://thetrustproject.org/trust-indicators/',
    },
    {
      criterion: 'credibility & transparency weighting',
      standard: 'NewsGuard',
      citation: 'NewsGuard — nine credibility and transparency criteria.',
      url: 'https://www.newsguardtech.com/ratings/rating-process-criteria/',
    },
    {
      criterion: 'sourcing & attribution ethics',
      standard: 'SPJ Code of Ethics',
      citation: 'Society of Professional Journalists — Code of Ethics.',
      url: 'https://www.spj.org/spj-code-of-ethics/', // was /ethicscode.asp (now a not-found page that redirects), checked 2026-11-06
    },
    ...SHARED_PROVENANCE,
  ],
}
