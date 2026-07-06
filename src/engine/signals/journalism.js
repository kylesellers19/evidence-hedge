// Journalism document-level signals — a document-level subset of the Trust
// Project indicators (provenance in the journalism rubric config).
import { spansFor } from './util.js'
import { RIGHT_OF_REPLY } from '../disclosure.js'

/** @typedef {import('../types.js').Signal} Signal */

// 7. per-claim-sourcing — share of the strongest claims that carry attribution.
function perClaimSourcing(doc, claims) {
  const top = claims.filter((c) => c.tier.weight >= 3)
  if (top.length === 0) return null
  const attributed = top.filter((c) => c.citations.length > 0 || c.rung.rank >= 1)
  const share = attributed.length / top.length
  if (share >= 0.5) return null
  return {
    id: 'per-claim-sourcing',
    severity: 'flag',
    summary: `Only ${Math.round(share * 100)}% of the strongest claims carry any attribution.`,
    evidence: top.filter((c) => c.citations.length === 0 && c.rung.rank < 1).slice(0, 3).map((c) => c.text),
  }
}

// 8. label-transparency — an unlabeled piece sets no reader expectation.
function labelTransparency(doc, claims, citations, posture) {
  if (posture !== 'unlabeled') return null
  return {
    id: 'label-transparency',
    severity: 'note',
    summary: 'The piece is unlabeled — no Opinion / Analysis / Sponsored kicker to set reader expectations.',
    evidence: [],
  }
}

const METHOD =
  /\b(reviewed documents|interviewed|obtained records|examined (documents|records)|analy[sz]ed data|according to (documents|records|a review))\b/i

// 9. method-disclosure — no reporting method disclosed.
function methodDisclosure(doc) {
  if (METHOD.test(doc)) return null
  return {
    id: 'method-disclosure',
    severity: 'note',
    summary: 'No reporting method is disclosed (no "reviewed documents / interviewed / obtained records").',
    evidence: [],
  }
}

// 10. perspective-plurality — count distinct attributed voices.
function perspectivePlurality(doc) {
  const voices = new Set()
  for (const m of doc.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(said|told|stated|added|noted)\b/g)) voices.add(m[1])
  for (const m of doc.matchAll(/\baccording to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g)) voices.add(m[1])
  if (voices.size > 1) return null
  return {
    id: 'perspective-plurality',
    severity: 'note',
    summary: voices.size === 0
      ? 'No attributed voices found — the piece cites no distinct sources.'
      : `Single-source: only one attributed voice (${[...voices][0]}).`,
    evidence: [...voices],
  }
}

// 11. right-of-reply — POSITIVE signal (a disclosed absence). Never penalized;
//     the containing claim is treated as disclosed in analyze.js.
function rightOfReply(doc) {
  const spans = spansFor(doc, RIGHT_OF_REPLY)
  if (!spans.length) return null
  return {
    id: 'right-of-reply',
    severity: 'note',
    positive: true,
    summary: 'Right of reply is documented (a subject declined or did not respond) — a disclosed absence, not a gap.',
    evidence: spans.slice(0, 3),
  }
}

const ANON = /\b(sources said|a source|people familiar with|a person familiar with|speaking on condition of anonymity|anonymous sources?)\b/i

// 12. anonymous-sourcing — anonymous sourcing with no named source anywhere.
function anonymousSourcing(doc) {
  const spans = spansFor(doc, ANON)
  if (!spans.length) return null
  const named = /\b[A-Z][a-z]+\s+(said|told|stated)\b/.test(doc) || /\baccording to\s+[A-Z][a-z]+/.test(doc)
  if (named) return null
  return {
    id: 'anonymous-sourcing',
    severity: 'note',
    summary: 'Relies on anonymous sourcing with no named source anywhere in the piece.',
    evidence: spans.slice(0, 3),
  }
}

export const signals = {
  'per-claim-sourcing': perClaimSourcing,
  'label-transparency': labelTransparency,
  'method-disclosure': methodDisclosure,
  'perspective-plurality': perspectivePlurality,
  'right-of-reply': rightOfReply,
  'anonymous-sourcing': anonymousSourcing,
}
