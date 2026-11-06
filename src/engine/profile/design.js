// ─────────────────────────────────────────────────────────────────────────────
// profileDesign(body, { provenance }) → what kind of study stands behind the text
//
//   design: rct | controlled-experiment | quasi-experimental | cohort-longitudinal |
//           repeated-cross-sectional | cross-sectional | pre-post-uncontrolled |
//           case-qualitative | modeling | systematic-review | narrative-review |
//           none-reported
//   evidence           the sentences that set it
//   inherited          a derivative document (press release, news, vendor page)
//                      inherits the design of the study it describes
//   selfDisclaimsCausality  limitation language that disclaims a causal reading
//   ceiling            the GRADE start-low ceiling: the strongest causal register
//                      and recommendation the design can license
//
// Never reads the reference list (the caller passes the body), and a design cue
// counts only in a sentence that frames the document's own study, cites no
// other work and does not deny it ("unlike an RCT"). Positive evidence only: a
// disclosed limitation never changes the design. Rubric-invariant.
// ─────────────────────────────────────────────────────────────────────────────

import { DESIGN_CUES, OWN_STUDY_FRAME, SELF_DISCLAIMER } from '../lexicons/design.js'

export const DESIGNS = ['rct', 'controlled-experiment', 'quasi-experimental', 'cohort-longitudinal', 'repeated-cross-sectional', 'cross-sectional', 'pre-post-uncontrolled', 'case-qualitative', 'modeling', 'systematic-review', 'narrative-review', 'none-reported']

// GRADE start-low: randomized and controlled experiments can license direct
// causal language and strong advice; designs that adjust for or model
// confounding license conditional causal and weak advice; everything else
// licenses association and weak advice. PROVISIONAL — not ratified.
const STRONG = { maxRegister: 'direct-causal', maxRecommendation: 'strong' }
const MIDDLE = { maxRegister: 'conditional-causal', maxRecommendation: 'weak' }
const LOW = { maxRegister: 'correlational', maxRecommendation: 'weak' }
export const DESIGN_CEILINGS = {
  rct: STRONG, 'controlled-experiment': STRONG,
  'quasi-experimental': MIDDLE, 'cohort-longitudinal': MIDDLE, modeling: MIDDLE, 'systematic-review': MIDDLE,
  'repeated-cross-sectional': LOW, 'cross-sectional': LOW, 'pre-post-uncontrolled': LOW, 'case-qualitative': LOW,
  'narrative-review': LOW, 'none-reported': LOW,
}

// Tie order: the more specific design first.
const PRECEDENCE = ['rct', 'controlled-experiment', 'quasi-experimental', 'cohort-longitudinal', 'repeated-cross-sectional', 'pre-post-uncontrolled', 'cross-sectional', 'systematic-review', 'case-qualitative', 'modeling', 'narrative-review']
const DERIVATIVE = new Set(['academic-press-office', 'news-outlet', 'trade-press', 'firm-vendor', 'individual'])
export const CITATION_DENSE_MIN = 15 // PROVISIONAL — not ratified (citations to others → narrative review)
const CUE_CAP = 3

const CUES = Object.fromEntries(Object.entries(DESIGN_CUES).map(([d, list]) => [d, list.map((src) => new RegExp(src, 'i'))]))
const FRAME = new RegExp(OWN_STUDY_FRAME, 'i')
const FIRST_PERSON = /\b(?:we|our)\b/i
const OTHER_WORK = /\(\s*[A-Z][\p{L}'’-]+(?:\s+(?:et\s+al\.?|and|&)\s*[A-Z]?[\p{L}'’-]*)?,?\s*(?:19|20)\d{2}[a-z]?\s*\)|\[\d+(?:[-,]\s*\d+)*\]|\bet\s+al\.?|\b[a-z]{3,}\d{1,3}(?:[,–-]\d{1,3})+\b/u
// A design named only to be denied ("does not provide a control … unlike an
// RCT") is not evidence for it. Design is read from positive evidence only, so
// disclosing what a study lacks never moves it to a stricter or looser class.
const NEGATED_BEFORE = /(?:\b(?:not|no|never|without|unlike|rather\s+than|instead\s+of|lacks?|absence\s+of|nor|as\s+would\s+be|as\s+in\s+an?)\b|n't\b)[^.;]{0,110}$/i
const DISCLAIMERS = SELF_DISCLAIMER.map((src) => new RegExp(src, 'i'))
const sentencesOf = (t) => t.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)

/**
 * @param {string} body
 * @param {{ provenance?: string, references?: number }} [options]
 */
export function profileDesign(body, { provenance = 'unknown', references = 0 } = {}) {
  const scores = {}
  const evidence = {}
  let firstPerson = false
  let otherCitations = 0
  for (const s of sentencesOf(body || '')) {
    if (OTHER_WORK.test(s)) { otherCitations++; continue }
    const own = FRAME.test(s)
    if (!own) continue
    for (const [design, res] of Object.entries(CUES)) {
      const m = res.map((re) => s.match(re)).find((x) => x && !NEGATED_BEFORE.test(s.slice(0, x.index)))
      if (!m) continue
      if ((scores[design] || 0) >= CUE_CAP) continue
      scores[design] = (scores[design] || 0) + 1
      ;(evidence[design] ||= []).push({ signal: m[0], span: s.slice(0, 200) })
      if (FIRST_PERSON.test(s)) firstPerson = true
    }
  }

  let design = 'none-reported'
  const ranked = PRECEDENCE.filter((d) => scores[d]).sort((a, b) => scores[b] - scores[a] || PRECEDENCE.indexOf(a) - PRECEDENCE.indexOf(b))
  if (ranked.length) design = ranked[0]
  else if (otherCitations + references >= CITATION_DENSE_MIN) {
    design = 'narrative-review'
    evidence[design] = [{ signal: 'cites other work, reports no study of its own', span: `${otherCitations} citing sentences, ${references} reference entries` }]
  }

  const disclaimers = DISCLAIMERS.map((re) => (body || '').match(re)?.[0]).filter(Boolean)
  return {
    design,
    evidence: evidence[design] || [],
    inherited: design !== 'none-reported' && DERIVATIVE.has(provenance) && !firstPerson,
    selfDisclaimsCausality: disclaimers.length > 0,
    disclaimerEvidence: disclaimers.slice(0, 3),
    ceiling: DESIGN_CEILINGS[design],
    scores,
  }
}
