// ─────────────────────────────────────────────────────────────────────────────
// Certainty and stance markers, after Hyland (2005), Metadiscourse, Appendix
// (hedges, boosters, attitude markers). Copulas and auxiliaries (is, are, will,
// does) are NOT markers — a plain declarative is "measured", not "strong".
//
//   HEDGES      withhold full commitment        → hedged
//   BOOSTERS    express certainty               → assertive
//   ABSOLUTES   categorical / universal / proof → absolute (Hyland's strongest
//               boosters plus promotional absolutes such as "#1", "unmatched")
//   ATTITUDE    affective/importance stance (recorded; does not move the tier)
//
// Deliberate exclusions, each a judgment call:
//   · "about", "around" (prepositions far more often than approximators)
//   · "should", "ought" (deontic → recommendation.js, not epistemic hedges)
//   · "find/found", "show" without "that", "know", "think", "believe"
//     (reporting / cognitive verbs: "we found no difference" is not a booster;
//     "we believe" is the corporate ladder's internal-assertion rung)
//   · "more/less likely", "likelihood" (comparative statistics → causalRegister)
//   · "significantly" (statistical, not epistemic)
// Lowercase "may" only, so the month "May 2024" is not a hedge.
// PROVISIONAL — not ratified (every list).
// ─────────────────────────────────────────────────────────────────────────────

export const HEDGES = [
  'may', 'might', 'could', 'would', 'possibly', 'possible', 'perhaps', 'probably', 'probable',
  'plausibly', 'plausible', 'presumably', 'potentially', 'likely', 'unlikely', 'apparently',
  'appear', 'appears', 'appeared', 'seem', 'seems', 'seemed', 'suggest', 'suggests', 'suggested',
  'suggesting', 'indicate', 'indicates', 'indicated', 'tend to', 'tends to', 'tended to',
  'approximately', 'roughly', 'almost', 'largely', 'mainly', 'mostly', 'partly', 'relatively',
  'somewhat', 'fairly', 'generally', 'in general', 'typically', 'usually', 'often', 'sometimes',
  'frequently', 'on the whole', 'to some extent', 'in most cases', 'estimate', 'estimated',
  'assume', 'assumed', 'suppose', 'suspect', 'speculate', 'postulate', 'uncertain', 'unclear',
  'in our view', 'in my view', 'in my opinion', 'from our perspective', 'we argue', 'I argue',
]

export const BOOSTERS = [
  'clearly', 'obviously', 'evidently', 'of course', 'indeed', 'in fact', 'certainly', 'definitely',
  'surely', 'truly', 'it is clear', 'it is evident', 'it is obvious', 'clear that', 'evident that',
  'demonstrate', 'demonstrates', 'demonstrated', 'establish', 'establishes', 'established',
  'confirm', 'confirms', 'confirmed', 'show that', 'shows that', 'showed that', 'shown that',
  'well known', 'well established', 'well documented', 'it is known',
]

export const ABSOLUTES = [
  'prove', 'proves', 'proved', 'proven', 'proof', 'conclusively', 'definitively', 'undeniable',
  'undeniably', 'unequivocal', 'unequivocally', 'indisputable', 'indisputably', 'incontrovertible',
  'unquestionably', 'undoubtedly', 'without doubt', 'without a doubt', 'beyond doubt',
  'beyond any doubt', 'no doubt', 'always', 'never', 'guarantee', 'guarantees', 'guaranteed',
  '100%', 'the only', '#1', 'unmatched', 'unrivaled', 'unrivalled', 'best-in-class', 'world-class',
  'industry-leading', 'revolutionary', 'the best',
]

export const ATTITUDE = [
  'important', 'importantly', 'essential', 'critical', 'critically', 'crucial', 'crucially', 'vital',
  'remarkable', 'remarkably', 'striking', 'strikingly', 'surprising', 'surprisingly', 'interesting',
  'interestingly', 'unfortunately', 'fortunately', 'dramatic', 'dramatically', 'notably', 'alarming',
  'unprecedented', 'unexpected', 'unexpectedly', 'disappointing', 'desirable', 'appropriate',
]

// A booster or absolute within two words after a negator reads as a hedge
// ("not always", "does not prove", "not necessarily").
export const NEGATORS = ['not', "n't", 'no', 'never', 'nor', 'without']
export const NEGATED_HEDGES = ['not necessarily', 'not always', 'not clear', 'not clearly', 'not certain']

// Uses of a marker that assert nothing about certainty, so the marker does not
// count there (engine cleanup, Nov. 2026). Each pattern masks the marker's word
// where it means something else: "established" as founded or set up, "proof"
// in a compound, a quantity of 100%, "always" and "the best" in idioms, a
// financial guarantee. "established that", "well established" and "the best"
// as a ranking still count. PROVISIONAL — not ratified.
export const NOT_CERTAINTY = [
  // establish = set up or found, not "show to be true"
  String.raw`\b(?:was|were|been|be|is|are|being|newly|recently|first|long|an?|the|its|our|their|to|and|help|helped|helps|will|would|must|should|can|could)\s+(?:(?!well\b|firmly\b|clearly\b)\w+\s+)?establish(?:ed|es|ing)?\b(?!\s+that\b)`,
  String.raw`\bestablish(?:ed|es|ing)?\s+(?:in|by|during|since|on|at|under|through|a|an|the|new|its|their|our|clear|common|baseline|guidelines|goals|targets|mechanisms|partnerships?|programs?|processes|standards|criteria|frameworks?|policies|procedures|protocols|teams?|offices?)\b`,
  String.raw`\b(?:long|well|newly|recently|an|already)[-\s]established\s+(?!that\b)(?:[a-z]+\s+){0,2}(?:sector|industry|market|firm|company|practice|business|network|brand|player|technology|process|route|presence|community|neighbou?rhood|organi[sz]ation)s?\b`,
  // "proof" inside a compound or a phrase
  String.raw`[\w]-proof\b|\bproof[-\s]of[-\s]concept\b|\bproof\s+of\s+(?:payment|purchase|insurance|delivery|identity|address|residency|ownership)\b|\b(?:fire|water|weather|sound|flood|bullet|rust|child|future|paris)\s*proof(?:ing|ed)?\b`,
  // 100% as a quantity, not certainty ("100% renewable", "100% of 1990 levels")
  String.raw`\b100\s?%(?!\s+(?:sure|certain|confident|guaranteed|effective|accurate|reliable|safe|proven|correct|true|of\s+the\s+time))`,
  // idioms with "always" and "the best"
  String.raw`\bas\s+always\b|\balways[-\s](?:on|connected|available)\b`,
  String.raw`\b(?:in|to)\s+the\s+best\s+interests?\b|\bthe\s+best\s+of\s+both\s+worlds\b|\bto\s+the\s+best\s+of\s+(?:our|my|their|his|her)\s+(?:knowledge|ability|abilities)\b|\b(?:one|some|many)\s+of\s+the\s+best\b|\bthe\s+best\s+(?:way|ways|approach|practices?|route|time|place|fit|balance|option|options|use)\s+(?:to|for|of|is|are)\b|\bmake\s+the\s+best\s+of\b|\bat\s+best\b`,
  // a financial or contractual guarantee, a noun
  String.raw`\b(?:loan|government|federal|state|bank|credit|performance|price|financial|bid|payment|sovereign|public|export)\s+guarantees?\b`,
]
