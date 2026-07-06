// ─────────────────────────────────────────────────────────────────────────────
// CORPORATE — anchor rubric (fully wired).
//
// Tuned for marketing / investor / annual-report prose, where the signature
// failure is the confident superlative backed only by the company's own voice.
// Self-reported metrics (rank 2) carry a low ceiling, so "our data proves we're
// #1" surfaces as overconfident, while uncited superlatives surface as
// unsupported assertions.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {import('../engine/types.js').RubricConfig} */
export const corporate = {
  id: 'corporate',
  label: 'Corporate',
  description: 'Marketing, investor & annual-report writing — decks, sites, filings.',
  documentNoun: 'corporate document',

  ladder: [
    { key: 'unsourced', label: 'Unsourced', rank: 0, tint: 'unsupported' },
    {
      key: 'internal', label: 'Internal assertion', rank: 1, tint: 'partial',
      match: {
        types: ['phrase'],
        keywords: ['we believe', 'our mission', 'committed to', 'we are confident', 'management believes', 'we expect', 'our vision', 'we strive'],
      },
    },
    {
      key: 'self-reported', label: 'Self-reported metric', rank: 2, tint: 'partial',
      match: {
        keywords: ['our data', 'internal data', 'our results', 'we measured', 'company data', 'our analysis', 'year over year', 'our customers report', 'internal study'],
      },
    },
    {
      key: 'third-party', label: 'Third-party / analyst', rank: 3, tint: 'supported',
      match: {
        types: ['url'],
        keywords: ['independent', 'third-party', 'third party', 'external', 'gartner', 'forrester', 'mckinsey', 'survey by', 'analyst', 'industry report'],
      },
    },
    {
      key: 'audited', label: 'Audited / verified disclosure', rank: 4, tint: 'supported',
      match: {
        types: ['doi'],
        keywords: ['audited', 'sec filing', '10-k', '10-q', 'gaap', 'regulatory filing', 'independently verified', 'externally verified', 'certified'],
      },
    },
  ],

  tiers: [
    { key: 'hedged',    label: 'Hedged',    weight: 1, cues: ['aim to', 'hope to', 'strive to', 'intend to', 'may', 'could', 'working toward', 'seek to'] },
    { key: 'measured',  label: 'Measured',  weight: 2, cues: ['offer', 'provides', 'includes', 'supports', 'designed to', 'helps', 'enables'] },
    { key: 'assertive', label: 'Assertive', weight: 3, cues: ['leading', 'best-in-class', 'is', 'delivers', 'ensures', 'drives', 'trusted', 'proven track record', 'industry-leading'] },
    { key: 'absolute',  label: 'Absolute',  weight: 4, cues: ['guaranteed', '#1', 'unmatched', 'unrivaled', 'world-class', 'revolutionary', 'the only', 'always', 'never fails', '100%', 'best'] },
  ],
  defaultTier: 'measured',

  extraction: {
    sensitivity: 0.5,
    minClaimLength: 25,
    assertivenessCues: {
      boosters: ['leading', 'best-in-class', 'world-class', 'unmatched', 'guaranteed', 'proven', 'revolutionary', '#1', 'unrivaled', 'trusted', 'best'],
      hedges: ['aim to', 'hope to', 'strive to', 'intend to', 'may', 'could', 'working toward', 'seek to'],
    },
  },

  // Slightly more lenient at the top than research, but self-reported metrics
  // (rank 2) stay capped at "measured" so confident self-claims get caught.
  tolerance: {
    ceilings: [1, 2, 2, 3, 4],
    nearNullRank: 0,
  },
}
