// ─────────────────────────────────────────────────────────────────────────────
// Causal strength of linking words, from Haber et al. (2022).
//
// Haber, N. A., Wieten, S. E., Rohrer, J. M., et al. (2022). Causal and
// Associational Language in Observational Health Research: A Systematic
// Evaluation. American Journal of Epidemiology, 191(12), 2084–2097.
// Data: "Just imply causation", https://osf.io/jtdaz/ (CC BY 4.0),
// file "linking word ratings.RData" (df.word.ratings: 3216 ratings).
//
// Each value is the mean rating of how strongly the root word implies cause,
// None = 0, Weak = 1, Moderate = 2, Strong = 3, across ~47 raters ("NA" ratings
// excluded). Derived here as a weighting table; the raw ratings stay in the
// gitignored fixtures/cache/haber2022/.
//
// causalRegister.js reads these as weights: a root at or above
// CAUSAL_ROOT_MIN carries causal force, below it associational.
// The cut-off is PROVISIONAL — not ratified; the ratings themselves are data.
// ─────────────────────────────────────────────────────────────────────────────

export const HABER_ROOT_STRENGTH = {
  'cause': 2.98,
  'prevent': 2.83,
  'affect': 2.72,
  'protect': 2.72,
  'effect': 2.68,
  'effective': 2.68,
  'lead': 2.64,
  'impact': 2.62,
  'attribute': 2.55,
  'due': 2.55,
  'determinant': 2.45,
  'produce': 2.45,
  'reduce': 2.45,
  'result': 2.45,
  'influence': 2.38,
  'benefit': 2.36,
  'improve': 2.36,
  'explain': 2.28,
  'alter': 2.23,
  'contribute': 2.19,
  'enhance': 2.09,
  'decrease': 2.06,
  'confer': 2.00,
  'increase': 1.98,
  'change': 1.85,
  'achieve': 1.83,
  'risk factor': 1.81,
  'elevate': 1.77,
  'response': 1.77,
  'decline': 1.70,
  'role': 1.68,
  'excess': 1.64,
  'risk': 1.64,
  'lower': 1.51,
  'maintain': 1.51,
  'higher': 1.40,
  'factor': 1.38,
  'worse': 1.38,
  'better': 1.36,
  'predict': 1.36,
  'encourage': 1.34,
  'likelihood': 1.34,
  'precede': 1.32,
  'greater': 1.23,
  'marker': 1.23,
  'relate': 1.21,
  'link': 1.19,
  'demonstrate': 1.13,
  'less': 1.13,
  'indicate': 1.00,
  'reveal': 0.98,
  'experience': 0.96,
  'likely': 0.96,
  'associate': 0.87,
  'twice': 0.85,
  'differ': 0.81,
  'trend': 0.77,
  'face': 0.74,
  'appear': 0.72,
  'present': 0.70,
  'similar': 0.70,
  'compare': 0.68,
  'occur': 0.68,
  'consistent': 0.64,
  'observe': 0.64,
  'vary': 0.62,
  'correlate': 0.60,
}
