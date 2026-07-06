// Research document-level signals (detectable-only; no judgment criteria yet).
import { spansFor } from './util.js'

/** @typedef {import('../types.js').Signal} Signal */

const LIMITATIONS =
  /\b(limitations?|constraints of this study|should be interpreted with caution|caveats?|further (research|study|work) is needed)\b/i

// 1. limitations-absent — the paper never bounds its own claims.
function limitationsAbsent(doc) {
  if (LIMITATIONS.test(doc)) return null
  return {
    id: 'limitations-absent',
    severity: 'note',
    summary: 'No limitations or caveats passage was found — the paper does not bound its own claims.',
    evidence: [],
  }
}

// 2. abstract-body-confidence-delta — front matter outruns the body.
function abstractBodyConfidenceDelta(doc, claims) {
  if (claims.length < 4) return null
  const L = doc.length || 1
  const front = [], body = []
  for (const c of claims) {
    const i = doc.indexOf(c.text)
    if (i < 0) continue
    ;(i < L * 0.4 ? front : body).push(c)
  }
  if (front.length === 0 || body.length === 0) return null
  const mean = (arr) => arr.reduce((s, c) => s + c.tier.weight, 0) / arr.length
  const delta = mean(front) - mean(body)
  if (delta < 0.8) return null
  return {
    id: 'abstract-body-confidence-delta',
    severity: 'note',
    summary: `The front matter asserts more confidently than the body (mean tier ${mean(front).toFixed(1)} vs ${mean(body).toFixed(1)}).`,
    evidence: front.filter((c) => c.tier.weight >= 3).slice(0, 2).map((c) => c.text),
  }
}

const EMPIRICAL = /\b(found|measured|demonstrated|observed|showed|recorded|quantified)\b/i
const DISCURSIVE = /\b(argued|suggested|proposed|framed|posited|contended|theorized|speculated)\b/i

// 3. secondary-evidence-dominance — top-tier claims lean on discursive framing.
function secondaryEvidenceDominance(doc, claims) {
  const top = claims.filter((c) => c.tier.weight >= 3)
  if (top.length === 0) return null
  let emp = 0, dis = 0
  const evidence = []
  for (const c of top) {
    if (DISCURSIVE.test(c.text)) { dis++; if (evidence.length < 3) evidence.push(c.text) }
    else if (EMPIRICAL.test(c.text)) emp++
  }
  if (dis > emp && dis > 0) {
    return {
      id: 'secondary-evidence-dominance',
      severity: 'note',
      summary: `Top-tier claims lean on discursive framing (argued/suggested) over empirical verbs (found/measured): ${dis} vs ${emp}.`,
      evidence,
    }
  }
  return null
}

export const signals = {
  'limitations-absent': limitationsAbsent,
  'abstract-body-confidence-delta': abstractBodyConfidenceDelta,
  'secondary-evidence-dominance': secondaryEvidenceDominance,
}
