// ─────────────────────────────────────────────────────────────────────────────
// GENERAL WEB — stub rubric.
//
// Shape-complete and runnable; DRAFT values. The most lenient tolerance of the
// four — general web writing is held to a lower sourcing bar — but it still
// catches the confident, link-free assertion. Filling this in is config-only.
// ─────────────────────────────────────────────────────────────────────────────

import { makeNullSeverity } from '../engine/nullSeverity.js'

/** @type {import('../engine/types.js').RubricConfig} */
export const general = {
  id: 'general',
  label: 'General web',
  description: 'Blogs, marketing pages & general explainer content.',
  documentNoun: 'page',
  stub: true,

  postures: ['experiential', 'authoritative'],
  defaultPosture: 'experiential',
  documentSignals: ['posture-gate'],

  ladder: [
    { key: 'unsourced', label: 'Unsourced',        rank: 0, tint: 'unsupported' },
    { key: 'asserted',  label: 'Bare assertion',   rank: 1, tint: 'partial',
      match: { keywords: ['everyone knows', 'it is well known', 'studies show', 'experts agree'] } },
    { key: 'linked',    label: 'Linked source',    rank: 2, tint: 'partial',
      match: { types: ['url', 'phrase'], keywords: ['according to', 'source:', 'via'] } },
    { key: 'cited',     label: 'Cited reference',   rank: 3, tint: 'supported',
      match: { types: ['author-year', 'year', 'numeric'], keywords: ['study', 'report', 'survey', 'data'] } },
    { key: 'primary',   label: 'Primary / verified', rank: 4, tint: 'supported',
      match: { types: ['doi'], keywords: ['peer-reviewed', 'official', 'verified'] } },
  ],

  tiers: [
    { key: 'hedged',    label: 'Hedged',    weight: 1, cues: ['may', 'might', 'could', 'often', 'sometimes', 'tends to'] },
    { key: 'measured',  label: 'Measured',  weight: 2, cues: ['can', 'helps', 'provides', 'shows'] },
    { key: 'assertive', label: 'Assertive', weight: 3, cues: ['is', 'are', 'will', 'always', 'the best way', 'guarantees'] },
    { key: 'absolute',  label: 'Absolute',  weight: 4, cues: ['definitely', 'undeniable', 'never', 'guaranteed', '100%', 'the only'] },
  ],
  defaultTier: 'measured',

  extraction: {
    sensitivity: 0.5,
    minClaimLength: 24,
    assertivenessCues: {
      boosters: ['definitely', 'undeniably', 'guaranteed', 'the best', '100%'],
      hedges: ['may', 'might', 'could', 'often', 'sometimes', 'tends to'],
    },
  },

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
      criterion: 'E-E-A-T and YMYL authority thresholds',
      standard: 'Google Search Quality Rater Guidelines',
      citation: 'Google Search Quality Rater Guidelines — E-E-A-T and YMYL.',
      url: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content',
    },
  ],
}
