// Corporate document-level signals.
import { phraseRe } from './util.js'
import { PLATITUDES } from '../lexicons/platitudes.js'
import { researchLikeRegister } from '../classifyPosture.js'

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

// Self-referential evidence (the company's own voice standing in for
// independent evidence). Vendor self-citation already sits a rung below
// third-party on the corporate ladder (self-reported, rank 2) — no ladder
// extension needed; this signal reports the document-level dominance.
//
// It reads the one self-citation counter the profile shows
// (profile.provenance.selfCitation, built by attribution.js): citation targets
// that name the publisher, against the independent rest. Reporting its own
// study ("we surveyed", "our analysis") is own-current attribution, not a
// citation, and never counts here.

// 5. self-citation-dominance — evidence is predominantly the org's own voice.
function selfCitationDominance(doc, claims, citations, posture, ctx = {}) {
  const sc = ctx.profile?.provenance?.selfCitation
  if (!sc) return null
  const self = sc.matched
  const independent = sc.independent ?? sc.pool - sc.matched
  if (self > 0 && self >= independent) {
    return {
      id: 'self-citation-dominance',
      severity: 'note',
      summary: `Evidence is predominantly self-referential (${self} self-citation${self === 1 ? '' : 's'} vs ${independent} independent) — the vendor's own voice standing in for outside proof.`,
      evidence: (sc.targets || []).slice(0, 4),
    }
  }
  return null
}

// 6. register-mismatch — a research-like register (read from the TEXT, so the
//    selected posture cannot switch it on or off), but at least half the
//    top-tier claims fall short of independent evidence. The "marketing in a
//    lab coat" verdict input. (It once needed EVERY top claim to miss, so a
//    single claim carrying any URL defeated it.)
export const REGISTER_MISMATCH_SHARE = 0.5 // PROVISIONAL — not ratified
function registerMismatch(doc, claims) {
  if (!researchLikeRegister(doc)) return null
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
