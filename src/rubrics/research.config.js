// ─────────────────────────────────────────────────────────────────────────────
// RESEARCH — anchor rubric (fully wired).
//
// Pure config. No logic. Plugs into the shared engine via the four fields:
// { ladder, tiers, extraction, tolerance }. Strict tolerance: an academic
// reader expects strong claims to rest on primary or peer-reviewed evidence,
// so unsourced/anecdotal lines are allowed only the most hedged phrasing.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {import('../engine/types.js').RubricConfig} */
export const research = {
  id: 'research',
  label: 'Research',
  description: 'Academic & scientific writing — papers, reviews, preprints, theses.',
  documentNoun: 'research paper',

  // Evidence-strength ladder, bottom (rank 0, unsourced) → top.
  ladder: [
    { key: 'unsourced', label: 'Unsourced', rank: 0, tint: 'unsupported' },
    {
      key: 'anecdotal', label: 'Anecdotal / opinion', rank: 1, tint: 'partial',
      match: {
        types: ['phrase'],
        keywords: ['according to', 'we believe', 'in our view', 'blog', 'opinion', 'commentary', 'anecdotally'],
      },
    },
    {
      key: 'secondary', label: 'Secondary source', rank: 2, tint: 'partial',
      match: {
        types: ['url'],
        keywords: ['as reported', 'news', 'magazine', 'review article', 'textbook', 'press release'],
      },
    },
    {
      key: 'primary', label: 'Primary study', rank: 3, tint: 'supported',
      match: {
        types: ['author-year', 'year', 'numeric'],
        keywords: ['study', 'trial', 'experiment', 'survey', 'dataset', 'cohort', 'observed', 'measured', 'found that', 'sample of'],
      },
    },
    {
      key: 'peer-reviewed', label: 'Peer-reviewed / meta-analysis', rank: 4, tint: 'supported',
      match: {
        types: ['doi'],
        keywords: ['meta-analysis', 'systematic review', 'peer-reviewed', 'randomized controlled trial', 'randomised controlled trial', 'rct', 'published in', 'replicated'],
      },
    },
  ],

  // Claim-strength bands, low → high weight.
  tiers: [
    { key: 'hedged',    label: 'Hedged',    weight: 1, cues: ['may', 'might', 'could', 'suggests', 'appears', 'seems', 'possibly', 'perhaps', 'potentially', 'tends to'] },
    { key: 'measured',  label: 'Measured',  weight: 2, cues: ['shows', 'found', 'observed', 'associated', 'reported', 'correlates', 'indicates', 'supports'] },
    { key: 'assertive', label: 'Assertive', weight: 3, cues: ['is', 'are', 'will', 'demonstrates', 'establishes', 'confirms', 'clearly', 'evidently', 'shows that'] },
    { key: 'absolute',  label: 'Absolute',  weight: 4, cues: ['proves', 'proven', 'definitively', 'undeniable', 'conclusively', 'always', 'never', 'guarantees', 'unequivocally', 'beyond doubt'] },
  ],
  defaultTier: 'measured',

  extraction: {
    sensitivity: 0.55,
    minClaimLength: 30,
    assertivenessCues: {
      boosters: ['clearly', 'obviously', 'undeniably', 'definitively', 'certainly', 'proves', 'conclusively', 'unequivocally', 'evidently', 'without doubt'],
      hedges: ['may', 'might', 'could', 'possibly', 'perhaps', 'suggests', 'appears', 'seems', 'arguably', 'potentially', 'likely'],
    },
  },

  // ceilings[rank] = strongest tier weight this evidence grade may assert.
  tolerance: {
    ceilings: [1, 2, 3, 4, 4],
    nearNullRank: 0,
  },
}
