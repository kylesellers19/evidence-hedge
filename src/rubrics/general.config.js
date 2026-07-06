// ─────────────────────────────────────────────────────────────────────────────
// GENERAL WEB — stub rubric.
//
// Shape-complete and runnable; DRAFT values. The most lenient tolerance of the
// four — general web writing is held to a lower sourcing bar — but it still
// catches the confident, link-free assertion. Filling this in is config-only.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {import('../engine/types.js').RubricConfig} */
export const general = {
  id: 'general',
  label: 'General web',
  description: 'Blogs, marketing pages & general explainer content.',
  documentNoun: 'page',
  stub: true,

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

  // Most lenient ladder ceilings of the four rubrics.
  tolerance: {
    ceilings: [2, 3, 3, 4, 4],
    nearNullRank: 0,
  },
}
