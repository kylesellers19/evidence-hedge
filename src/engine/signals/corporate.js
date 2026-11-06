// Corporate document-level signals.
import { spansFor, phraseRe } from './util.js'
import { PLATITUDES } from '../lexicons/platitudes.js'

/** @typedef {import('../types.js').Signal} Signal */

// 4. platitude-density — content-free filler above threshold. NOT flagged as
//    unsupported (unsupportable); lowers the verdict's earned-confidence budget.
function platitudeDensity(doc) {
  const found = PLATITUDES.filter((p) => phraseRe(p).test(doc))
  if (found.length < 3) return null
  return {
    id: 'platitude-density',
    severity: 'note',
    summary: `${found.length} content-free platitudes detected — filler that reads as substance but carries no checkable claim.`,
    evidence: found.slice(0, 6),
    count: found.length,
  }
}

// Self-referential evidence framing (the company's own voice standing in for
// independent evidence). Vendor self-citation already sits a rung below
// third-party on the corporate ladder (self-reported, rank 2) — no ladder
// extension needed; this signal reports the document-level dominance.
const SELF_REF =
  /\b(our data|our study|our analysis|our research|our results|our survey|our internal(?:\s+\w+)?|we found|we measured|we surveyed|company data)\b/i

// 5. self-citation-dominance — evidence is predominantly the org's own voice.
function selfCitationDominance(doc, claims, citations) {
  const selfSpans = spansFor(doc, SELF_REF)
  const external = citations.filter((c) => ['url', 'doi', 'author-year', 'numeric', 'year'].includes(c.type)).length
  const self = selfSpans.length
  if (self > 0 && self >= external) {
    return {
      id: 'self-citation-dominance',
      severity: 'note',
      summary: `Evidence is predominantly self-referential (${self} self-citation${self === 1 ? '' : 's'} vs ${external} independent) — the vendor's own voice standing in for outside proof.`,
      evidence: selfSpans.slice(0, 4),
    }
  }
  return null
}

// 6. register-mismatch — research-like posture, but at least half the top-tier
//    claims fall short of independent evidence. The "marketing in a lab coat"
//    verdict input. (It once needed EVERY top claim to miss, so a single claim
//    carrying any URL defeated it.)
export const REGISTER_MISMATCH_SHARE = 0.5 // PROVISIONAL — not ratified
function registerMismatch(doc, claims, citations, posture) {
  if (posture !== 'research-like') return null
  const top = claims.filter((c) => c.tier.weight >= 3)
  if (top.length === 0) return null
  const short = top.filter((c) => c.rung.rank < 3) // below third-party / audited
  if (short.length / top.length < REGISTER_MISMATCH_SHARE) return null
  return {
    id: 'register-mismatch',
    severity: 'flag',
    summary: `Adopts a research-like register, yet ${short.length} of ${top.length} top-tier claims fall short of independent (third-party or audited) evidence — marketing in a lab coat.`,
    evidence: short.slice(0, 3).map((c) => c.text),
  }
}

export const signals = {
  'platitude-density': platitudeDensity,
  'self-citation-dominance': selfCitationDominance,
  'register-mismatch': registerMismatch,
}
