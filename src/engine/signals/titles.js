// Display titles for document signals — shared by the branch screen ("also
// audited for") and the results page (Document signals).
export const SIGNAL_TITLES = {
  'limitations-absent': 'Limitations absent',
  'abstract-body-confidence-delta': 'Abstract outruns the body',
  'secondary-evidence-dominance': 'Discursive evidence dominance',
  'platitude-density': 'Platitude density',
  'self-citation-dominance': 'Self-citation dominance',
  'register-mismatch': 'Register mismatch',
  'per-claim-sourcing': 'Per-claim sourcing',
  'label-transparency': 'Label transparency',
  'method-disclosure': 'Method disclosure',
  'perspective-plurality': 'Perspective plurality',
  'right-of-reply': 'Right of reply',
  'anonymous-sourcing': 'Anonymous sourcing',
  'posture-gate': 'No expert claims',
  'completeness-gaps': 'Reporting gaps',
  'equivalence-from-nonsignificance': 'Equivalence from non-significance',
  'subgroup-selection': 'Subgroup selection',
  'covariate-inconsistency': 'Covariate-set inconsistency',
  'self-disclaimed-causality': 'Causality disclaimed',
  'study-traceability': 'Study traceability',
  'sponsorship-disclosure': 'Sponsorship disclosure',
  'subject-source-dependence': 'Dependence on the subject firm',
  'undisclosed-interest': 'Interest disclosure',
}

export const signalTitle = (id) => SIGNAL_TITLES[id] || id.replace(/-/g, ' ')
