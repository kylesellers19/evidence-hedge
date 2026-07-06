// ─────────────────────────────────────────────────────────────────────────────
// JOURNALISM — stub rubric.
//
// Shape-complete and runnable so the entry screen and engine work, but the
// values are DRAFTS pending tuning. The eventual focus here is sourcing
// (named vs. anonymous vs. uncited) and the dropped-attribution pattern.
// Filling this in is config-only — no engine changes.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {import('../engine/types.js').RubricConfig} */
export const journalism = {
  id: 'journalism',
  label: 'Journalism',
  description: 'Reporting & opinion — articles, op-eds, newsletters.',
  documentNoun: 'article',
  stub: true,

  ladder: [
    { key: 'unsourced',  label: 'Unsourced',          rank: 0, tint: 'unsupported' },
    { key: 'anonymous',  label: 'Anonymous source',   rank: 1, tint: 'partial',
      match: { keywords: ['sources say', 'a source', 'people familiar', 'reportedly', 'rumored'] } },
    { key: 'named',      label: 'Named attribution',  rank: 2, tint: 'partial',
      match: { types: ['phrase'], keywords: ['said', 'told', 'according to', 'stated'] } },
    { key: 'documented', label: 'Documented record',  rank: 3, tint: 'supported',
      match: { types: ['url', 'numeric'], keywords: ['records show', 'filing', 'transcript', 'data show'] } },
    { key: 'verified',   label: 'Independently verified', rank: 4, tint: 'supported',
      match: { types: ['doi'], keywords: ['verified', 'corroborated', 'confirmed by multiple'] } },
  ],

  tiers: [
    { key: 'hedged',    label: 'Hedged',    weight: 1, cues: ['may', 'might', 'could', 'reportedly', 'allegedly', 'appears'] },
    { key: 'measured',  label: 'Measured',  weight: 2, cues: ['said', 'reported', 'described', 'noted'] },
    { key: 'assertive', label: 'Assertive', weight: 3, cues: ['is', 'are', 'will', 'shows', 'reveals', 'proves'] },
    { key: 'absolute',  label: 'Absolute',  weight: 4, cues: ['undeniable', 'definitively', 'always', 'never', 'conclusively'] },
  ],
  defaultTier: 'measured',

  extraction: {
    sensitivity: 0.55,
    minClaimLength: 28,
    assertivenessCues: {
      boosters: ['clearly', 'undeniably', 'definitively', 'conclusively'],
      hedges: ['may', 'might', 'could', 'reportedly', 'allegedly', 'appears'],
    },
  },

  tolerance: {
    ceilings: [1, 2, 3, 4, 4],
    nearNullRank: 0,
  },
}
