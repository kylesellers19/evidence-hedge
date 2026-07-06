// ─────────────────────────────────────────────────────────────────────────────
// CORPORATE — anchor rubric (fully wired).
//
// Tuned for marketing / investor / annual-report prose, where the signature
// failure is the confident superlative backed only by the company's own voice.
// Self-reported metrics (rank 2) carry a low ceiling, so "our data proves we're
// #1" surfaces as overconfident, while uncited superlatives surface as
// unsupported assertions.
// ─────────────────────────────────────────────────────────────────────────────

import { makeNullSeverity } from '../engine/nullSeverity.js'

/** @type {import('../engine/types.js').RubricConfig} */
export const corporate = {
  id: 'corporate',
  label: 'Corporate',
  description: 'Marketing, investor & annual-report writing — decks, sites, filings.',
  documentNoun: 'corporate document',

  postures: ['marketing', 'thought-leadership', 'research-like'],
  defaultPosture: 'marketing',
  documentSignals: ['platitude-density', 'self-citation-dominance', 'register-mismatch'],

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

  // Ceilings are rank-indexed (ladder rank 0→4) and posture-keyed. The migrated
  // provisional [1,2,2,3,4] becomes both the default and the research-like path
  // ("marketing in a lab coat" is held to the strictest bar). Marketing and
  // thought-leadership are looser, because assertive marketing copy is expected.
  tolerance: {
    ceilings: {
      default: [1, 2, 2, 3, 4],               // PROVISIONAL — not ratified (migrated)
      'research-like': [1, 2, 2, 3, 4],        // PROVISIONAL — not ratified (migrated)
      'thought-leadership': [2, 3, 3, 4, 4],   // PROVISIONAL — not ratified
      marketing: [2, 3, 4, 4, 4],              // PROVISIONAL — not ratified
    },
    // Undisclosed severity of an evidence-absence per tier (hedged→absolute).
    // Marketing stays none/note below the top tier; top tier is always critical.
    nullSeverity: makeNullSeverity({
      default: ['none', 'note', 'flag', 'critical'],              // PROVISIONAL — not ratified
      'research-like': ['none', 'note', 'flag', 'critical'],      // PROVISIONAL — not ratified
      'thought-leadership': ['none', 'note', 'note', 'critical'], // PROVISIONAL — not ratified
      marketing: ['none', 'none', 'note', 'critical'],            // PROVISIONAL — not ratified
    }),
  },

  provenance: [
    {
      criterion: 'assertiveness tiers (hedges / boosters)',
      standard: 'Hyland — Metadiscourse',
      citation: 'Hyland, K. (2005). Metadiscourse: Exploring Interaction in Writing.',
      url: '',
    },
    {
      criterion: 'uncertainty / modal word lists',
      standard: 'Loughran–McDonald Master Dictionary',
      citation: 'Loughran, T. & McDonald, B. (2011). "When Is a Liability Not a Liability?" Journal of Finance.',
      url: 'https://sraf.nd.edu/loughranmcdonald-master-dictionary/',
    },
  ],
}
