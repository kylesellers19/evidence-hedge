// ─────────────────────────────────────────────────────────────────────────────
// Surface patterns for causal-register detection (Yu, Li & Wang 2019 scheme:
// none | correlational | conditional-causal | direct-causal).
//
// CAUSAL: root → surface regex. Roots rated by Haber et al. (2022) carry that
// mean causal-strength rating (lexicons/haber-2022.js); the EXTRA verbs below
// are unrated causal verbs common outside health research (shape, boost,
// trigger …) and take EXTRA_STRENGTH.
// ASSOCIATIONAL: relationship language without causal force (associated with,
// linked to, more likely, predicts …), also Haber-rated where a root exists.
// Patterns, extras and EXTRA_STRENGTH are PROVISIONAL — not ratified.
// ─────────────────────────────────────────────────────────────────────────────

const v = (stem, tails = '(?:s|es|ed|d|ing)?') => `${stem}${tails}`

// Rated roots (Haber 2022) → pattern. Only roots that read as linking words in
// running text are listed; purely reporting/existence roots (demonstrate,
// indicate, reveal, observe, appear, present, occur, experience, face, likely,
// consistent, similar, compare, vary, differ, trend) are not relationship cues.
export const RATED_PATTERNS = {
  cause: `\\b(?:${v('caus', '(?:e|es|ed|ing|al|ally|ation)')})\\b`,
  prevent: `\\b${v('prevent', '(?:s|ed|ing|ion|ive|able)?')}\\b`,
  affect: `\\b${v('affect', '(?:s|ed|ing)?')}\\b(?!ive)`,
  protect: `\\b${v('protect', '(?:s|ed|ing|ion|ive)?')}\\b`,
  effect: `\\beffects?\\s+(?:of|on)\\b|\\b(?:positive|negative|beneficial|adverse|causal|significant|direct|indirect|protective|harmful)\\s+effects?\\b`,
  effective: `\\beffective(?:ly|ness)?\\b`,
  lead: `\\b(?:lead|leads|led|leading)\\s+to\\b`,
  impact: `\\bimpact(?:s|ed|ing|ful)?\\b`,
  due: `\\bdue\\s+to\\b`,
  attribute: `\\battribut(?:e|es|ed|able)\\s+to\\b`,
  determinant: `\\bdeterminants?\\b`,
  result: `\\bresult(?:s|ed|ing)?\\s+in\\b|\\bas\\s+a\\s+result\\s+of\\b`,
  produce: `\\bproduc(?:e|es|ed|ing)\\b`,
  influence: `\\binfluenc(?:e|es|ed|ing)\\b`,
  benefit: `\\bbenefi(?:t|ts|ted|tted|ting|cial)\\b`,
  explain: `\\bexplain(?:s|ed|ing)?\\b`,
  contribute: `\\bcontribut(?:e|es|ed|ing)\\s+to\\b`,
  confer: `\\bconfer(?:s|red|ring)?\\b`,
  change: `\\bchang(?:e|es|ed|ing)\\s+(?:in|the|their|our|your|how)\\b`,
  'risk factor': `\\brisk\\s+factors?\\b`,
  role: `\\b(?:key|important|major|central|critical|causal|significant|protective)?\\s*roles?\\s+(?:in|of|for)\\b`,
  risk: `\\b(?:higher|lower|greater|increased|decreased|reduced|elevated)\\s+risks?\\b|\\brisks?\\s+of\\b`,
  higher: `\\bhigher\\b`,
  greater: `\\bgreater\\b`,
  less: `\\bless\\s+(?:likely|\\w+\\s+than)\\b`,
  better: `\\bbetter\\b`,
  worse: `\\bworse\\b`,
  factor: `\\bfactors?\\s+(?:in|for|of|that)\\b`,
  predict: `\\bpredict(?:s|ed|ing|or|ors|ive|ion)?\\b`,
  likelihood: `\\blikelihood\\b|\\b(?:more|less|most|least|as)\\s+likely\\b`,
  encourage: `\\bencourag(?:e|es|ed|ing)\\b`,
  precede: `\\bpreced(?:e|es|ed|ing)\\b`,
  marker: `\\b(?:bio)?markers?\\b`,
  relate: `\\brelat(?:ed|es|ion|ionship|ionships)\\s+(?:to|with|between)\\b`,
  link: `\\blink(?:s|ed|age)?\\s+(?:to|with|between)\\b`,
  associate: `\\bassociat(?:ed|ion|ions)\\b`,
  twice: `\\btwice\\s+as\\b`,
  correlate: `\\bcorrelat(?:e|es|ed|ion|ions)\\b`,
}

// Causal verbs Haber did not rate. PROVISIONAL — not ratified.
export const EXTRA_STRENGTH = 2.3
export const EXTRA_CAUSAL = {
  drive: `\\b(?:drive|drives|drove|driven|driving)\\b`,
  trigger: `\\btrigger(?:s|ed|ing)?\\b`,
  harm: `\\bharm(?:s|ed|ing|ful)?\\b`,
  damage: `\\bdamag(?:e|es|ed|ing)\\b`,
  shape: `\\bshap(?:e|es|ed|ing)\\s+(?:how|what|the|our|their|your|who|whether)\\b`,
  promote: `\\bpromot(?:e|es|ed|ing)\\b`,
  induce: `\\binduc(?:e|es|ed|ing)\\b`,
  foster: `\\bfoster(?:s|ed|ing)?\\b`,
  mitigate: `\\bmitigat(?:e|es|ed|ing)\\b`,
  alleviate: `\\balleviat(?:e|es|ed|ing)\\b`,
  worsen: `\\bworsen(?:s|ed|ing)?\\b`,
  exacerbate: `\\bexacerbat(?:e|es|ed|ing)\\b`,
  impair: `\\bimpair(?:s|ed|ing|ment)?\\b`,
  undermine: `\\bundermin(?:e|es|ed|ing)\\b`,
  'stress out': `\\bstress(?:es|ed)?\\s+(?:us|you|them|people|workers|employees|patients|staff|me)\\s+out\\b`,
  'follows home': `\\bfollows?\\s+(?:you|us|them|people|workers|employees)\\s+home\\b`,
  'help reduce': `\\bhelps?\\s+(?:to\\s+)?(?:reduce|improve|prevent|lower|protect|boost|increase)\\b`,
}

// Change roots (Haber-rated where a root exists). Used as a VERB — after a
// modal or "to"/"help", or as a finite verb with an object ("ventilation
// lowered scores", "X was reduced by Y") — they assert cause. As a participial
// adjective or noun ("associated with reduced risk", "improvements were
// observed") they only describe a difference, which is associational.
// PROVISIONAL — not ratified.
export const CHANGE_ROOTS = {
  increase: 'increas(?:e|es|ed|ing)',
  decrease: 'decreas(?:e|es|ed|ing)',
  reduce: 'reduc(?:e|es|ed|ing)',
  lower: 'lower(?:s|ed|ing)?',
  raise: 'rais(?:e|es|ed|ing)',
  improve: 'improv(?:e|es|ed|ing)',
  enhance: 'enhanc(?:e|es|ed|ing)',
  elevate: 'elevat(?:e|es|ed|ing)',
  decline: 'declin(?:e|es|ed|ing)',
  alter: 'alter(?:s|ed|ing)?',
  boost: 'boost(?:s|ed|ing)?',
  double: 'doubl(?:e|es|ed|ing)',
  halve: 'halv(?:e|es|ed|ing)',
}
export const CHANGE_NOUNS = 'increases?|decreases?|reductions?|improvements?|enhancements?|elevations?|declines?|alterations?|boosts?|gains?'
export const VERBAL_CHANGE_STRENGTH = 2.3 // PROVISIONAL — not ratified
export const NOMINAL_CHANGE_STRENGTH = 1.5 // PROVISIONAL — not ratified

// Statements Yu et al. annotate as "no relationship" whatever verbs they hold:
// recommendations and calls for further research (recommendation.js measures
// advice separately), and purpose clauses ("interventions to improve …").
export const NO_FINDING = [
  '\\bshould\\b', '\\bmust\\b', '\\bneeds?\\s+to\\b', '\\b(?:is|are|was|were)\\s+(?:still\\s+)?(?:needed|warranted|required|necessary)\\b',
  '\\b(?:future|further|larger|longer|additional|more)\\s+(?:\\w+\\s+){0,3}(?:studies|research|work|trials?|investigations?|data|follow-up)\\b',
  '\\bwarrants?\\b', '\\bmerits?\\b', '\\bremains?\\s+(?:unclear|unknown|to\\s+be)\\b', '\\byet\\s+to\\s+be\\b',
]
// A survey finding about what people BELIEVE ("32% of workers think AI will
// lead to fewer jobs") measures an attitude; the causal language belongs to
// the respondents, not the document. A population subject (or a share) followed
// by a belief/report verb, with the cue after it, is reported belief.
export const REPORTED_BELIEF = '(?:\\b(?:workers|respondents|employees|adults|americans|people|participants|users|consumers|leaders|executives|managers|staff|parents|teachers|students|occupants|members|public)\\b|\\d+(?:\\.\\d+)?\\s?%|\\b(?:most|many|few|some|half|majority|minority|third|quarter|fifth|share)\\b)[^.;]{0,80}?\\b(?:say|says|said|think|thinks|thought|believe|believes|expect|expects|feel|feels|felt|agree|agrees|report|reports|reported|worry|worried|predict|predicts|anticipate|fear|fears|hope|hopes)\\b'

// A sentence that disclaims causation states no causal claim; profile/design.js
// reads the same language as selfDisclaimsCausality.
export const CAUSAL_DISCLAIMER = [
  '\\b(?:cannot|can\'t|could\\s+not|does\\s+not|do\\s+not|did\\s+not|not|nor)\\s+(?:\\w+\\s+){0,3}(?:prove|establish|infer|imply|determine|demonstrate|show|support|confirm)s?\\s+(?:\\w+\\s+){0,3}(?:causation|causality|causal|cause)',
  '\\b(?:causation|causality|causal\\s+(?:relationships?|inferences?|claims?|links?|effects?|conclusions?))\\s+(?:\\w+\\s+){0,2}(?:cannot|can\'t|could\\s+not|is\\s+not|was\\s+not|were\\s+not|are\\s+not|remains?\\s+(?:unclear|unknown|uncertain))\\b',
  '\\bcorrelation\\s+(?:is\\s+not|does\\s+not\\s+(?:imply|equal|mean))\\s+caus',
  '\\b(?:cross-sectional|observational)\\s+(?:\\w+\\s+){0,3}(?:precludes?|limits?|prevents?)\\s+(?:\\w+\\s+){0,3}causal',
]
export const PURPOSE = '\\b(?:in\\s+order|aim(?:s|ed)?|designed|efforts?|interventions?|strategies|strategy|measures|programs?|programmes?|ways?|plans?|policies|policy|needed|required|attempts?|seeks?|sought)\\s+to\\s+$'

// Hedges that make a causal claim conditional (Yu 2019 "conditional causal").
// "can" is included: Yu's guideline treats ability/possibility modals as
// conditioning the causal claim. "suggest(s) that" is not: it reports a finding
// rather than hedging the relation (Yu label "the data suggest that X improved
// Y" direct causal; tuned on the development split). PROVISIONAL — not ratified.
export const CONDITIONING = [
  'may', 'might', 'could', 'can', 'possibly', 'potentially', 'potential', 'likely', 'probably',
  'perhaps', 'appear to', 'appears to', 'appeared to', 'seem to', 'seems to', 'would',
  'plausibly', 'presumably', 'putative',
]
