// ─────────────────────────────────────────────────────────────────────────────
// Attribution cues (engine/attribution.js) — whose finding a sentence reports.
// Word lists that come from UnScientify are read from unscientify_lexicon.json
// (BSD 3-Clause, notice kept); everything in this file is Evidence Hedge's own
// and PROVISIONAL — not ratified.
// ─────────────────────────────────────────────────────────────────────────────

// Research and reporting verbs a first-person subject, the publisher's name or
// "the authors" can take ("we surveyed", "Pew Research Center analyzed").
export const RESEARCH_VERBS = [
  'surveyed', 'survey', 'polled', 'asked', 'interviewed', 'found', 'find', 'finds', 'analy[sz]ed', 'analy[sz]e', 'analy[sz]es',
  'measured', 'measure', 'observed', 'observe', 'estimated', 'estimate', 'examined', 'examine', 'tested', 'test',
  'compared', 'compare', 'collected', 'conducted', 'conducts', 'conduct', 'designed', 'recruited', 'identified', 'calculated', 'model(?:l)?ed',
  'tracked', 'studied', 'explored', 'investigated', 'assessed', 'evaluated', 'show', 'showed', 'shown', 'report', 'reported',
  'used', 'ran', 'performed', 'coded', 'classified', 'reviewed', 'hypothesi[sz]ed', 'developed', 'created', 'looked',
  'discovered', 'documented', 'quantified', 'mapped', 'sampled', 'weighted', 'fielded', 'partnered', 'commissioned',
  'gathered', 'captured', 'scored', 'ranked', 'categori[sz]ed', 'segmented', 'learned', 'uncovered', 'saw', 'note', 'noted',
]

// Nouns that complete "our …" beyond UnScientify's list (its authorPossessiveNouns
// are added at load time).
export const OWN_NOUNS_EXTRA = [
  'survey', 'data', 'dataset', 'findings', 'results', 'sample', 'respondents', 'experiment', 'team', 'report', 'model',
  'interviews', 'panel', 'poll', 'questionnaire', 'social listening', 'metrics', 'index', 'benchmark', 'estimates', 'review',
]

// Nouns after "this …" that name the document's own study (OWN_STUDY_FRAME's list).
export const THIS_STUDY_NOUNS = ['study', 'survey', 'report', 'paper', 'research', 'review', 'analysis', 'experiment', 'trial', 'pilot', 'article', 'white\\s*paper', 'brief', 'pilot study']

// Sample references: the respondents of the document's own study (weak own-current).
export const SAMPLE_REFERENCE =
  '\\b(?:respondents|participants|subjects|survey\\s+takers|those\\s+(?:surveyed|polled|asked|interviewed)|(?:workers|employees|adults|people|fans|consumers|attendees|parents|teens|students|patients|users|customers|voters|residents|members)\\s+(?:surveyed|polled|interviewed|we\\s+(?:surveyed|asked|interviewed)))\\b'

// A definite reference to a study that the sentence does not name (weak own-current,
// or the antecedent's attribution by paragraph carryover).
export const DEFINITE_STUDY = '\\b(?:the|this)\\s+(?:new\\s+|latest\\s+)?(?:study|survey|research|analysis|experiment|trial|researchers|research\\s+team|investigators|study\\s+authors|team)\\b'

// Earlier own work.
export const OWN_PRIOR = [
  '\\b(?:our|my)\\s+(?:previous|prior|earlier|past|former|last|first|(?:19|20)\\d{2})\\s+(?:[\\w-]+\\s+){0,2}?(?:study|studies|survey|surveys|report|reports|paper|papers|work|research|analysis|analyses|findings|publication|publications|edition|index)\\b',
  '\\bwe\\s+(?:have\\s+)?(?:previously|earlier|already)\\s+(?:reported|showed|shown|found|described|published|documented|argued|estimated)\\b',
  '\\bin\\s+(?:a|an)\\s+(?:previous|prior|earlier)\\s+(?:study|report|paper|survey)\\s+(?:we|of\\s+ours)\\b',
]
// "last year's survey" in a document that runs its own survey (weak own-prior).
export const OWN_PRIOR_WEAK = '\\b(?:last|previous)\\s+year[\'’]s\\s+(?:survey|report|study|index|edition)\\b'

// Other sources.
export const ET_AL = '\\bet\\.?\\s*al\\b'
export const ACCORDING_TO_NAMED = '\\baccording\\s+to\\s+(?:the\\s+|a\\s+|an\\s+)?(?!our\\b|we\\b|this\\b|these\\b|the\\s+(?:survey|study|report|data|findings|results|analysis)\\b)(?:[A-Z][\\w&.\'’-]+|\\d{4}\\s+[A-Z])'
export const ACCORDING_TO_VAGUE = '\\baccording\\s+to\\s+(?:a|an|one|some|recent|new|several)\\s+(?:new\\s+|recent\\s+)?(?:study|studies|report|reports|survey|surveys|analysis|research|experts?)\\b'
export const A_STUDY_BY = '\\b(?:a|an|one|another|the)\\s+(?:[\\w-]+\\s+){0,2}?(?:study|survey|report|analysis|paper|review|meta-analysis|trial|experiment|poll)\\s+(?:by|from|conducted\\s+by|published\\s+(?:in|by)|led\\s+by|commissioned\\s+by)\\s+(?:the\\s+)?[A-Z]'
export const PUBLISHED_IN = '\\b(?:published|appeared)\\s+in\\s+(?:the\\s+)?(?:journal\\s+)?[A-Z]'
export const RESEARCHERS_AT = '\\b(?:researchers|scientists|investigators|economists|analysts|experts)\\s+(?:at|from|with)\\s+(?:the\\s+)?([A-Z][\\w&.\'’-]+(?:\\s+(?:of\\s+|for\\s+|and\\s+)?[A-Z][\\w&.\'’-]+){0,6})'
// A named organization (a run of capitalized words ending in an institution noun)
// with a research verb within the clause; it is the publisher or another source.
export const NAMED_ORG = '((?:[A-Z][\\w&.\'’-]+\\s+){0,5}(?:University|Institute|Center|Centre|Foundation|Association|Agency|Organi[sz]ation|Council|Bureau|Department|Group|Lab(?:oratory)?|School|College|Society|Commission|Office|Partners|Research|Consulting|Insights))\\b'
// Vague appeals to other work (weak cited-other): an unnamed source outside the document.
export const PRIOR_WORK = [
  '\\b(?:previous|prior|earlier|past|other|existing|recent|former|numerous|many|several|some|various|most)\\s+(?:of\\s+the\\s+)?(?:[\\w-]+\\s+)?(?:studies|research|work|literature|analyses|papers|investigations|reports|surveys|evidence|scholars|researchers|scientists)\\b',
  '\\b(?:research|studies|evidence|the\\s+literature|science|scientists|experts)\\s+(?:has\\s+|have\\s+)?(?:consistently\\s+|long\\s+|repeatedly\\s+)?(?:shows?|shown|suggests?|suggested|indicates?|indicated|finds?|found|demonstrates?|demonstrated|confirms?|confirmed|agree|says?)\\b',
  '\\b(?:a\\s+(?:growing|large|substantial)\\s+body\\s+of)\\s+(?:research|evidence|literature|work)\\b',
]

// Quotation and reported speech.
export const QUOTE = '[“"][^”"]{20,}[”"]'
export const SPEECH_VERB = '\\b(?:said|says|say|told|tells|stated|states|explained|explains|added|adds|noted|notes|commented|comments|wrote|writes|asked|recalled|argued|argues|cautioned|emphasi[sz]ed|according\\s+to)\\b'
export const REPORTED_SPEECH = '(?:\\b(?:he|she)\\s+(?:said|says|told|explained|added|noted|argued|wrote)\\b|\\b(?:Dr|Prof|Mr|Ms|Mrs)\\.?\\s+[A-Z][\\w\'’-]+\\s+(?:said|says|told|explained|added|noted|argued|wrote)\\b|\\b[A-Z][a-z\'’-]+\\s+[A-Z][\\w\'’-]+(?:,\\s+[^,]{3,80},)?\\s+(?:said|says|told|explained|added|noted|argued|wrote)\\b)'

// Applying the authors' method to someone else's design or data.
export const BUILDS_ON = '\\b(?:replicat\\w*|re-?analy[sz]\\w*|following|adapted\\s+from|building\\s+on|extend(?:s|ed|ing)?|using\\s+(?:the\\s+)?(?:data|method|approach|scale|framework|instrument|measures?|protocol)\\s+(?:from|of|developed\\s+by|described\\s+by))\\b'

// A pronoun subject that takes its attribution from the paragraph.
export const PRONOUN_SUBJECT = '^(?:[“"]?\\s*)(?:They|He|She|Their|His|Her)\\s+(?:[\\w-]+\\s+){0,2}?(?:found|find|finds|report|reported|reports|showed|show|shows|surveyed|estimated|concluded|conclude|argued|argue|note|noted|observed|suggest|suggested|say|said|wrote)\\b'

// Section headings, for section context. A first-person claim under a literature
// review is low confidence.
export const SECTION_KINDS = [
  ['references', /^(?:\d+(?:\.\d+)*\.?\s+)?(?:References|Bibliography|Works\s+Cited|Endnotes|Notes|Sources)\s*$/i],
  ['literature-review', /^(?:\d+(?:\.\d+)*\.?\s+)?(?:Background|Literature\s+Review|Review\s+of\s+(?:the\s+)?Literature|Related\s+Work|Prior\s+Research|Previous\s+Research|What\s+(?:We|the\s+Research)\s+Knows?|State\s+of\s+(?:the\s+)?(?:Research|Evidence|Science))\b/i],
  ['methods', /^(?:\d+(?:\.\d+)*\.?\s+)?(?:Materials\s+and\s+Methods|Methods?|Methodology|Study\s+Design|Data\s+and\s+Methods|Survey\s+Methodology|How\s+we\s+did\s+this|About\s+(?:this|the)\s+(?:survey|report|data|study|research))\b/i],
  // An executive summary or highlights section reports the document's key
  // findings; so does a short heading naming its own survey or analysis
  // ("POST-WORLD CUP SURVEY", "IN-MATCH SOCIAL MEDIA ANALYSIS").
  ['results', /^(?:\d+(?:\.\d+)*\.?\s+)?(?:Results?|Findings|Key\s+Findings|Key\s+Takeaways|What\s+We\s+Found|Executive\s+Summary|Highlights|At\s+a\s+Glance|Summary\s+of\s+Findings)\b/i],
  ['results', /^(?:[A-Z0-9][\w'’&-]*\s+){0,4}(?:SURVEY|ANALYSIS|FINDINGS|RESULTS|Survey|Analysis|Findings|Results)\s*$/],
  ['discussion', /^(?:\d+(?:\.\d+)*\.?\s+)?(?:Discussion|Conclusions?|Implications|Limitations|Strengths\s+and\s+Limitations|Recommendations)\b/i],
  ['introduction', /^(?:\d+(?:\.\d+)*\.?\s+)?(?:Introduction|Overview)\b/i],
]
export const HEADING_MAX_CHARS = 80 // PROVISIONAL — not ratified (a line this short can be a heading)
// The publisher's name counts only when it comes from the source URL's host or
// appears this early in the body (the masthead or title block); a name met only
// later is someone the document cites.
export const PUBLISHER_FRONT_CHARS = 2000 // PROVISIONAL — not ratified
