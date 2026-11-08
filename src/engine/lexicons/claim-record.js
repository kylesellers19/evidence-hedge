// ─────────────────────────────────────────────────────────────────────────────
// Claim-record lexicons (engine/claimRecord.js). PROVISIONAL — not ratified.
//
// Scope markers follow the generalization markers studied by Peters & Chin-Yee
// (generic statements, present tense, action-guiding language in science
// summaries); the word lists are Evidence Hedge's own.
// ─────────────────────────────────────────────────────────────────────────────

// The identification strategy a sentence claims for a study. Records what the
// document says it did, never whether it was done well.
export const IDENTIFICATION_STRATEGIES = [
  ['randomized', '\\brandomi[sz]ed\\b|\\brandomly\\s+(?:assigned|allocated)\\b|\\bRCTs?\\b'],
  ['difference-in-differences', '\\bdifference[- ]in[- ]differences?\\b|\\bdiff-in-diff\\b'],
  ['instrumental-variable', '\\binstrumental\\s+variables?\\b'],
  ['regression-discontinuity', '\\bregression\\s+discontinuit(?:y|ies)\\b'],
  ['propensity-score', '\\bpropensity[- ]score\\b'],
  ['natural-experiment', '\\bnatural\\s+experiments?\\b'],
  ['cohort', '\\bcohort\\b|\\blongitudinal\\b|\\bpanel\\s+(?:study|data|survey)\\b'],
  ['cross-sectional', '\\bcross[- ]sectional\\b|\\bsurvey(?:ed)?\\b|\\bpoll(?:ed)?\\b|\\bquestionnaire\\b'],
  ['case-study', '\\bcase\\s+stud(?:y|ies)\\b'],
]
// Design-profile designs that name a strategy (a claim attributed to the
// document's own study inherits it, with the design evidence as its span).
export const DESIGN_STRATEGY = {
  rct: 'randomized', 'controlled-experiment': 'randomized', 'cohort-longitudinal': 'cohort',
  'cross-sectional': 'cross-sectional', 'repeated-cross-sectional': 'cross-sectional', 'case-qualitative': 'case-study',
}

// Result verbs, present and past.
export const RESULT_PRESENT = '\\b(?:shows?|finds?|demonstrates?|reveals?|suggests?|indicates?|confirms?|proves?|reduces?|increases?|improves?|boosts?|lowers?|raises?|causes?|leads?\\s+to|predicts?|affects?|drives?|enhances?|harms?|helps?|protects?|prevents?|is\\s+(?:linked|associated|tied|correlated|related)|are\\s+(?:linked|associated|tied|correlated|related)|makes?)\\b'
export const RESULT_PAST = '\\b(?:showed|shown|found|demonstrated|revealed|suggested|indicated|confirmed|proved|reduced|increased|improved|boosted|lowered|raised|caused|led\\s+to|predicted|affected|drove|enhanced|harmed|helped|protected|prevented|was\\s+(?:linked|associated|tied|correlated|related)|were\\s+(?:linked|associated|tied|correlated|related)|had)\\b'

// A quantifier bounds a statement to part of a population.
export const QUANTIFIER = '\\b(?:\\d[\\d,.]*\\s*%|\\d[\\d,.]*\\s+(?:percent|in\\s+\\d+|of\\s+\\d+|out\\s+of)|some|many|most|few|several|half|majority|minority|one\\s+in|proportion|share|more\\s+than|less\\s+than|fewer\\s+than|up\\s+to|nearly|almost|about\\s+\\d|roughly)\\b'
// A sample reference ties a statement to the study's own sample.
export const SAMPLE_REF = '\\b(?:respondents|participants|subjects|in\\s+(?:this|our|the)\\s+(?:sample|study|survey|trial|cohort)|those\\s+(?:surveyed|polled|studied)|the\\s+sample|study\\s+population|attendees\\s+(?:we\\s+)?surveyed)\\b'

// Action-guiding language besides the engine's recommendation measure.
export const ACTION_GUIDING = '\\b(?:should|must|need(?:s)?\\s+to|ought\\s+to|recommend(?:s|ed)?|advis(?:e|es|ed)|have\\s+to|it\\s+is\\s+(?:essential|critical|imperative|vital)\\s+(?:to|that))\\b'
