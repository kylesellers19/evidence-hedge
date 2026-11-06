// ─────────────────────────────────────────────────────────────────────────────
// RESEARCH — anchor rubric (fully wired).
//
// Pure config. No logic. Plugs into the shared engine via the four fields:
// { ladder, tiers, extraction, tolerance }. Strict tolerance: an academic
// reader expects strong claims to rest on primary or peer-reviewed evidence,
// so unsourced/anecdotal lines are allowed only the most hedged phrasing.
// ─────────────────────────────────────────────────────────────────────────────

import { makeNullSeverity } from '../engine/nullSeverity.js'
import { SHARED_EXTRACTION, TIERS, DEFAULT_TIER } from '../engine/measure/index.js'

/** @type {import('../engine/types.js').RubricConfig} */
export const research = {
  id: 'research',
  label: 'Research',
  description: 'Academic & scientific writing — papers, reviews, preprints, theses.',
  documentNoun: 'research paper',

  postures: ['standard'],
  defaultPosture: 'standard',
  documentSignals: ['limitations-absent', 'abstract-body-confidence-delta', 'secondary-evidence-dominance'],

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
        // 'study', 'survey', 'found that' removed: they name a source without
        // grading it, and own results now reach this rung via ownResultRung.
        keywords: ['trial', 'experiment', 'dataset', 'cohort', 'observed', 'measured', 'sample of'],
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

  // Claim strength is measured, not judged: the four shared tiers and their
  // Hyland cues live in engine/measure/certainty.js (rubric-invariant).
  tiers: TIERS,
  defaultTier: DEFAULT_TIER,

  // Rung an own-result claim reaches on the document's own evidence.
  ownResultRung: 'primary', // PROVISIONAL — not ratified

  // Shared extraction (engine/measure/index.js): identical under every rubric.
  extraction: SHARED_EXTRACTION,

  // ceilings[posture][rank] = strongest tier weight this evidence grade may
  // assert. Research has a single 'standard' posture, so only 'default' is needed.
  tolerance: {
    ceilings: {
      default: [1, 2, 3, 4, 4],   // migrated (unchanged)
      standard: [1, 2, 3, 4, 4],  // sole posture — same as default
    },
    nullSeverity: makeNullSeverity({
      default: ['none', 'note', 'flag', 'critical'],  // PROVISIONAL — not ratified
      standard: ['none', 'note', 'flag', 'critical'], // PROVISIONAL — not ratified
    }),
  },

  provenance: [
    {
      criterion: 'certainty-of-evidence framework',
      standard: 'GRADE Working Group',
      citation: 'GRADE Working Group — certainty-of-evidence framework.',
      url: 'https://www.gradeworkinggroup.org/',
    },
    {
      criterion: 'evidence-ladder rung placement',
      standard: 'OCEBM Levels of Evidence',
      citation: 'OCEBM Levels of Evidence, Centre for Evidence-Based Medicine, University of Oxford.',
      url: 'https://www.cebm.ox.ac.uk/resources/levels-of-evidence/oxford-centre-for-evidence-based-medicine-levels-of-evidence-march-2009',
    },
    {
      criterion: 'critical appraisal of study quality',
      standard: 'CASP Checklists',
      citation: 'CASP Checklists, Critical Appraisal Skills Programme.',
      url: 'https://casp-uk.net/casp-tools-checklists/',
    },
    {
      criterion: 'gray-literature rung placement',
      standard: 'AACODS Checklist',
      citation: 'Tyndall, J. AACODS Checklist (gray literature appraisal), Flinders University.',
      url: 'https://dspace.flinders.edu.au/xmlui/handle/2328/3326',
    },
  ],
}
