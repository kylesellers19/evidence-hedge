// ─────────────────────────────────────────────────────────────────────────────
// Advice strength cues, after Li, Wang & Yu (2021), "Detecting Health Advice in
// Medical Research Literature" (EMNLP 2021): no advice | weak | strong.
//
//   STRONG  an explicit directive: should, must, need to, it is essential to,
//           we recommend, sentence-initial imperatives
//   WEAK    hedged or capability-framed advice: may want to, could consider,
//           may be beneficial, can be used to
// Calls for further research are not advice (Li et al. annotate them as none).
// PROVISIONAL — not ratified.
// ─────────────────────────────────────────────────────────────────────────────

export const STRONG_ADVICE = [
  '\\bshould\\b(?!\\s+(?:be\\s+)?(?:noted|mentioned|emphasi[sz]ed|interpreted|taken\\s+into))',
  '\\bmust\\b',
  '\\bought\\s+to\\b',
  '\\bneeds?\\s+to\\b',
  '\\bhave\\s+to\\b',
  '\\bit\\s+is\\s+(?:essential|imperative|crucial|critical|vital|necessary|important|advisable)\\s+(?:to|that)\\b',
  '\\b(?:we|I)\\s+(?:strongly\\s+)?(?:recommend|advise|urge|encourage)\\b',
  '\\b(?:is|are)\\s+(?:strongly\\s+)?(?:recommended|advised)\\b',
  '\\brecommend(?:s|ed)?\\s+that\\b',
  '^(?:Ensure|Use|Avoid|Design|Make\\s+sure|Prioriti[sz]e|Invest|Provide|Create|Implement|Adopt|Choose|Keep|Add|Open|Place|Opt|Install|Bring|Start|Stop|Include|Build|Give|Let|Take|Try)\\b',
]

export const WEAK_ADVICE = [
  '\\b(?:may|might|could)\\s+(?:want|wish|consider|benefit|need)\\b',
  '\\b(?:may|might|could|can)\\s+be\\s+(?:used|useful|beneficial|helpful|advisable|warranted|considered|leveraged|applied|designed)\\b',
  '\\b(?:is|are)\\s+(?:worth|a\\s+good\\s+idea)\\b',
  '\\bconsider(?:ing)?\\b(?!\\s+(?:the|that|this|how|whether|what)\\s+\\w+\\s+(?:is|was|are|were))',
  '\\b(?:it\\s+)?(?:may|might|could)\\s+(?:help|pay|make\\s+sense)\\b',
  '\\bopportunit(?:y|ies)\\s+to\\b',
]

// Not advice whatever the modal (Li et al. 2021): research agendas and the
// reading instructions of the document itself.
export const NOT_ADVICE = [
  '\\b(?:future|further|larger|longer|additional|more)\\s+(?:\\w+\\s+){0,3}(?:studies|research|work|trials?|investigations?)\\b',
  '\\b(?:results?|findings?|data|these)\\s+should\\s+be\\s+interpreted\\b',
  '\\bshould\\s+be\\s+noted\\b',
  // meta-statements about the text itself
  '\\b(?:one|readers?|you)\\s+should\\s+(?:bear|keep)\\s+in\\s+mind\\b',
  '\\bit\\s+is\\s+(?:important|necessary|worth)\\s+(?:to\\s+)?(?:note|noting|clarify|emphasi[sz]e|acknowledge|recogni[sz]e|remember|mention|stress|point\\s+out)\\b',
]
