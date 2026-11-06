// ─────────────────────────────────────────────────────────────────────────────
// Study-design cues (profile/design.js). Each cue scores only in a sentence
// that frames the document's OWN study ("we", "this study", "the researchers",
// "participants") and carries no citation to other work — a review that
// mentions someone else's RCT has not run one. PROVISIONAL — not ratified.
// ─────────────────────────────────────────────────────────────────────────────

export const DESIGN_CUES = {
  rct: ['\\brandomi[sz]ed\\s+controlled\\s+trials?\\b', '\\bRCT\\b', '\\brandomly\\s+(?:assigned|allocated)\\s+to\\s+(?:\\w+\\s+){0,3}(?:groups?|arms?|conditions?|intervention|control|treatment)\\b'],
  'controlled-experiment': ['\\bdouble[- ]blind(?:ed)?\\b', '\\bcontrolled[- ]exposure\\b', '\\bcontrolled\\s+experiment\\b', '\\bwithin[- ]subjects?\\s+design\\b', '\\bcrossover\\s+(?:design|study|trial)\\b', '\\blaboratory\\s+(?:experiment|study)\\b', '\\benvironmentally\\s+controlled\\b', '\\bsimulated\\s+(?:\\w+\\s+){0,2}conditions\\b'],
  'quasi-experimental': ['\\bquasi[- ]experiment(?:al)?\\b', '\\bdifference[- ]in[- ]differences?\\b', '\\bnatural\\s+experiment\\b', '\\bregression\\s+discontinuity\\b', '\\binterrupted\\s+time[- ]series\\b', '\\bpropensity[- ]score\\b', '\\bmatched\\s+control\\s+group\\b'],
  'cohort-longitudinal': ['\\b(?:prospective|retrospective)\\s+cohort\\b', '\\bcohort\\s+study\\b', '\\blongitudinal\\s+(?:study|survey|data|design|panel)\\b', '\\bfollowed\\s+(?:up\\s+)?for\\s+\\d+\\s+(?:years|months)\\b', '\\bpanel\\s+(?:study|survey|data)\\b'],
  'repeated-cross-sectional': ['\\brepeated\\s+cross[- ]sectional\\b', '\\b(?:annual|biennial|yearly)\\s+(?:\\w+\\s+){0,2}survey\\b', '\\bsurvey\\s+waves?\\b', '\\bcompared\\s+with\\s+(?:the\\s+)?(?:\\d{4}|previous|last\\s+year[\'’]s|prior)\\s+(?:\\w+\\s+){0,2}survey\\b', '\\bsince\\s+(?:19|20)\\d{2},?\\s+(?:\\w+\\s+){0,4}(?:surveyed|survey)\\b'],
  'cross-sectional': ['\\bcross[- ]sectional\\b', '\\bsurvey\\s+of\\s+(?:more\\s+than\\s+|over\\s+|nearly\\s+|about\\s+)?\\d[\\d,]*\\b', '\\bsurveyed\\s+(?:more\\s+than\\s+|over\\s+|nearly\\s+)?\\d[\\d,]*\\b', '\\b\\d[\\d,]*\\s+(?:\\w+\\s+){0,2}(?:respondents|workers|adults|employees)\\s+(?:were\\s+)?surveyed\\b', '\\b(?:Global\\s+)?Workplace\\s+Survey\\b', '\\bbased\\s+on\\s+(?:over\\s+|more\\s+than\\s+|nearly\\s+)?\\d[\\d,]*\\s+(?:\\w+\\s+){0,2}(?:responses|respondents|interviews)\\b', '\\bthe\\s+survey,?\\s+(?:was\\s+)?conducted\\b', '\\b(?:workers|employees|adults|people|respondents)\\s+surveyed\\b', '\\bthe\\s+survey\\s+was\\s+(?:conducted|fielded)\\b', '\\bonline\\s+(?:survey|panel)\\b', '\\bquestionnaire\\b'],
  'pre-post-uncontrolled': ['\\bpre[- ]?(?:and|/)\\s*post[- ]?\\b', '\\bbefore\\s+and\\s+after\\b', '\\b(?:changes?\\s+associated\\s+with|following)\\s+(?:the\\s+|a\\s+|an\\s+)?(?:office\\s+)?relocation\\b', '\\bpre[- ]occupancy\\b[\\s\\S]{0,200}\\bpost[- ]occupancy\\b', '\\bno\\s+control\\s+group\\b', '\\bobservations\\s+were\\s+not\\s+controlled\\b', '\\buncontrolled\\s+(?:study|design|before|pre|comparison|experiment|field)\\b'],
  'case-qualitative': ['\\bcase\\s+stud(?:y|ies)\\b', '\\bsemi[- ]structured\\s+interviews?\\b', '\\bfocus\\s+groups?\\b', '\\bthematic\\s+analysis\\b', '\\bqualitative\\s+(?:study|research|analysis|methods?)\\b', '\\bethnograph(?:y|ic)\\b'],
  modeling: ['\\b(?:simulation|computational|energy|agent-based|economic)\\s+model(?:l?ing)?\\b', '\\bscenario\\s+analysis\\b', '\\bwe\\s+(?:model(?:l)?ed|simulated)\\b', '\\bmodel(?:l)?ed\\s+(?:estimates?|projections?)\\b'],
  'systematic-review': ['\\bsystematic\\s+(?:literature\\s+)?review\\b', '\\bmeta[- ]analys[ie]s\\b', '\\bPRISMA\\b', '\\bsearched\\s+(?:\\w+\\s+){0,3}(?:databases|PubMed|Scopus|Web\\s+of\\s+Science)\\b'],
  'narrative-review': ['\\b(?:narrative|literature|scoping|integrative)\\s+review\\b', '\\breview\\s+of\\s+(?:the\\s+)?(?:literature|research|evidence|science)\\b', '\\bthis\\s+(?:report|paper|white\\s*paper|review)\\s+(?:synthesi[sz]es|reviews|summari[sz]es|draws\\s+on)\\b', '\\bstate\\s+of\\s+the\\s+(?:science|evidence|field)\\b'],
}

// The sentence frames the document's own study.
export const OWN_STUDY_FRAME = '\\b(?:we|our|this\\s+(?:study|survey|report|paper|research|review|pilot|analysis|experiment|trial)|the\\s+(?:present|current|new)\\s+(?:study|survey|research)|a\\s+new\\s+(?:study|survey|report)|the\\s+(?:study|survey|researchers|research\\s+team|investigators|authors)|its\\s+(?:report|survey|study)|participants|respondents|subjects|researchers|(?:workers|employees|adults|people)\\s+surveyed)\\b'

// Limitation language that disclaims causal reading (profile/design.js
// selfDisclaimsCausality; the causal-disclaimer list in causal-register.js too).
export const SELF_DISCLAIMER = [
  '\\b(?:cannot|can\\s?not|could\\s+not|unable\\s+to|does\\s+not\\s+allow\\s+(?:us\\s+)?to|do\\s+not\\s+allow)\\s+(?:\\w+\\s+){0,3}(?:establish|infer|determine|draw|prove|demonstrate|make)\\s+(?:\\w+\\s+){0,3}(?:causa(?:l|lity|tion)|cause)',
  '\\b(?:associative|correlational|exploratory)\\s+rather\\s+than\\s+causal\\b',
  '\\bcross-sectional\\s+(?:nature|design)\\b[\\s\\S]{0,120}\\b(?:causa(?:l|lity|tion)|direction)',
  '\\bcausal\\s+(?:inferences?|relationships?|claims?|conclusions?)\\s+(?:\\w+\\s+){0,2}(?:cannot|should\\s+not|can\\s?not|are\\s+not|is\\s+not)\\b',
  '\\bcorrelation\\s+(?:is\\s+not|does\\s+not\\s+(?:imply|equal|mean))\\s+caus',
  '\\bshould\\s+be\\s+interpreted\\s+as\\s+(?:associative|correlational|exploratory)',
]
