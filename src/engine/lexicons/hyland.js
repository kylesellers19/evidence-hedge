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
