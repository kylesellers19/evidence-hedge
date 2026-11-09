// ─────────────────────────────────────────────────────────────────────────────
// scoreDocument(analysis) → DocumentScore
//
// A pure, deterministic 1–10 score of EVIDENTIAL SUPPORT: the share of the
// document's claims that hold, on a scale of 10 (engine cleanup, Nov. 2026).
//
//   · A claim HOLDS when it is stated no more firmly than its evidence allows
//     at the standard's strictest setting, and claims no more cause, or firmer
//     advice, than the design of the study behind it supports. A claim with a
//     flag (unsupported, overconfident, causal overreach) does not hold; a claim
//     with two flags counts once.
//   · score = 10 × (claims that hold ÷ claims), to one decimal
//   · each whole-document problem flagged (a check that comes back as a flag,
//     not a note) takes one point off, at most DOC_PROBLEM_CAP
//   · floor 1, cap 10; fewer than MIN_CLAIMS claims: no score, since one claim
//     would move it by more than a point
//
// So a 7 means about 7 in 10 of its claims stay within their evidence, and
// nothing about the document as a whole counts against it. Calibrated against
// the corpus audit's reviewers (scripts/score-calibrate.mjs): of the rules
// tried, this one lands nearest what they judged fair.
//
// GENRE-INVARIANT (D1). The score never reads the selected posture: claims are
// re-judged against the rubric's evidence standard (rubric.strictestPosture),
// and on a firm-vendor or press-office document an own result counts one rung
// lower (provenance discount on in-document evidence). The posture sets only
// the verdict sentence and a one-line genre note.
//
// ALL tunable values live in SCORE_WEIGHTS / BAND_THRESHOLDS / templates
// below, each PROVISIONAL — listed in the completion report for ratification.
// ─────────────────────────────────────────────────────────────────────────────

import { detectMismatch } from './detectMismatch.js'

/**
 * @typedef {Object} DocumentScore
 * @property {number|null} score    1–10, one decimal place; null with no claims
 * @property {number|null} display  Math.round(score) — the annotation numeral
 * @property {string} band       'failing' | 'weak' | 'mixed' | 'carried' | 'strong' | 'unscored'
 * @property {string} summary    the verdict sentence (posture-templated)
 * @property {string} genreNote  one line of advice for the reading (it never names the standard)
 * @property {Object} breakdown  per-component contributions, for auditability
 */

export const SCORE_WEIGHTS = {
  START_BUDGET: 10,          // the scale: 10 × the share of claims that hold
  MIN_CLAIMS: 10,            // PROVISIONAL — not ratified (fewer: no score)
  DOC_PROBLEM: 1,            // PROVISIONAL — not ratified (points per whole-document problem flagged)
  DOC_PROBLEM_CAP: 2,        // PROVISIONAL — not ratified
  // Provenance whose in-document evidence is discounted one rung.
  DISCOUNTED_PROVENANCE: ['firm-vendor', 'academic-press-office'], // PROVISIONAL — not ratified
  GATE_SCORE: 7.5,           // PROVISIONAL — not ratified (posture-gate → 'carried')
  MIN: 1,
  MAX: 10,
}

// Band thresholds over 1–10 (min inclusive), highest first, at half points so
// each whole number a brief shows sits in one band: 9–10 strong, 7–8 carried,
// 5–6 mixed, 3–4 weak, 1–2 failing. PROVISIONAL — not ratified.
export const BAND_THRESHOLDS = [
  { min: 8.5, band: 'strong' },
  { min: 6.5, band: 'carried' },
  { min: 4.5, band: 'mixed' },
  { min: 2.5, band: 'weak' },
  { min: 1.0, band: 'failing' },
]

// Verdict sentence: band → sentence. Verdict register — no exclamation marks,
// no praise adjectives, none of the words readers never see (docs/evidence-
// section.md: carry, outrun, ceiling…). PROVISIONAL — not ratified (templates).
export const SUMMARY = {
  failing: (n) => `The evidence does not support what this ${n} claims.`,
  weak: (n) => `Much of what this ${n} claims goes beyond its evidence.`,
  mixed: (n) => `This ${n} makes some claims its evidence does not support.`,
  carried: (n) => `The evidence supports most of what this ${n} claims.`,
  strong: (n) => `The evidence supports what this ${n} claims.`,
}
// Promotional postures speak of the copy, not of "the evidence", until the
// score earns the strong band. PROVISIONAL — not ratified (templates).
const PROMOTIONAL_SUMMARY = {
  failing: (n) => `This ${n} asserts far more than it shows evidence for.`,
  weak: (n) => `Most of what this ${n} asserts goes beyond the evidence it shows.`,
  mixed: (n) => `Parts of what this ${n} asserts go beyond the evidence it shows.`,
  carried: (n) => `Most of what this ${n} asserts stays within the evidence it shows.`,
}
const PROMOTIONAL = new Set(['marketing', 'press-release'])
export const GATE_SUMMARY = (n) => `Written from experience, this ${n} owes no evidence.` // PROVISIONAL — not ratified
// No claims found, or too few to score. PROVISIONAL — not ratified (templates).
export const UNSCORED_SUMMARY = (n) => `With no claims to weigh, this ${n} has no score.`
export const FEW_CLAIMS_SUMMARY = (n, k) => `With ${k === 1 ? 'one claim' : `${k} claims`}, this ${n} has too few to score.`

// What a single-genre document was read as, by posture: the brief's "Read as"
// line (src/components/results/briefTop.js). A hybrid reads as its scenario's
// name instead (rubrics/hybrids.js). PROVISIONAL — not ratified.
export const READ_AS = {
  standard: 'A research paper',
  marketing: 'Marketing copy',
  'thought-leadership': 'Thought leadership',
  'research-like': 'A research-style report from a firm or coalition',
  'press-release': 'A press release',
  news: 'News',
  opinion: 'Opinion',
  sponsored: 'Sponsored content',
  unlabeled: 'An article with no opinion, analysis or sponsored label',
  experiential: 'Writing from personal experience',
  authoritative: 'Advice on a consequential topic',
}
// One line under the headline: what the reading means for this document. It
// never names the standard (the "Held to" line does, from the same rubric), so
// the two cannot disagree. Empty when there is nothing to add.
// PROVISIONAL — not ratified.
export const GENRE_NOTES = {
  standard: '',
  marketing: 'Promotional confidence is expected, but the score still asks each claim for its evidence.',
  'thought-leadership': 'Opinion is expected, but the score counts only what its evidence shows.',
  'research-like': 'Its own data count as self-reported until a third party checks them.',
  'press-release': 'It reports a study it did not itself publish, so check the study before repeating its claims.',
  news: 'Its claims should trace to named, documented sources.',
  opinion: 'Argument is expected, but the score counts only what its evidence shows.',
  sponsored: 'A paid placement reads as advertising.',
  unlabeled: '',
  experiential: '',
  authoritative: '',
}

const round1 = (x) => Math.round(x * 10) / 10
const round2 = (x) => Math.round(x * 100) / 100

export function bandFor(score) {
  for (const t of BAND_THRESHOLDS) if (score >= t.min) return t.band
  return 'failing'
}

function verdictFor(band, posture, noun, promotional = false) {
  if ((promotional || PROMOTIONAL.has(posture)) && band !== 'strong') return PROMOTIONAL_SUMMARY[band](noun)
  return SUMMARY[band](noun)
}

// Re-judge one claim at the rubric's evidence standard, independent of posture.
function referenceFlag(c, rubric, refPosture, discountInDocument) {
  if (c.function === 'method') return null
  let rung = c.rung
  if (discountInDocument && c.inDocument) {
    const lower = [...rubric.ladder].sort((a, b) => b.rank - a.rank).find((r) => r.rank < rung.rank)
    rung = lower && lower.rank >= (c.citedRung?.rank ?? 0) ? lower : c.citedRung || rung
  }
  const m = detectMismatch({ tier: c.tier, rung }, rubric.tolerance, refPosture)
  if (!m) return null
  if (m.flag === 'unsupported-assertion' && c.disclosed) {
    const tierIndex = rubric.tiers.findIndex((t) => t.key === c.tier.key)
    const sev = rubric.tolerance.nullSeverity(tierIndex, refPosture, true)
    if (sev === 'none' || sev === 'note') return null
  }
  return m
}

/**
 * @param {Object} analysis  { claims, signals, posture, rubric, profile? }
 * @returns {DocumentScore}
 */
export function scoreDocument(analysis) {
  const W = SCORE_WEIGHTS
  const claims = analysis.claims || []
  const signals = analysis.signals || []
  const rubric = analysis.rubric
  const posture = analysis.posture
  const profile = analysis.profile || null
  const noun = rubric?.documentNoun || 'document'
  // A hybrid (rubrics/hybrids.js) carries its own genre note and register.
  const genreNote = rubric?.genreNote || GENRE_NOTES[posture] || ''
  const promotional = !!rubric?.promotional

  // Special case: the general/experiential posture-gate verdict. Makes no expert
  // claims → there is no evidence obligation, so this is 'carried', NOT a low
  // score. Its own summary, verbatim.
  const gate = signals.find((s) => s.gate)
  if (gate) {
    const score = round1(W.GATE_SCORE)
    return {
      score,
      display: Math.round(score),
      band: 'carried',
      summary: GATE_SUMMARY(noun),
      genreNote,
      breakdown: { gate: true, start: W.START_BUDGET, flagContribution: 0, signalPenalty: 0, platitudePenalty: 0, flagRate: 0, claimCount: claims.length },
    }
  }

  // No claims, or too few for a share to mean anything: no score.
  if (claims.length < W.MIN_CLAIMS) {
    return {
      score: null,
      display: null,
      band: 'unscored',
      summary: claims.length === 0 ? UNSCORED_SUMMARY(noun) : FEW_CLAIMS_SUMMARY(noun, claims.length),
      genreNote,
      breakdown: { gate: false, unscored: true, start: W.START_BUDGET, claimCount: claims.length, minClaims: W.MIN_CLAIMS },
    }
  }

  // Which claims hold, at the evidence standard (genre-invariant).
  const refPosture = rubric?.strictestPosture || rubric?.defaultPosture
  const discount = !!profile && W.DISCOUNTED_PROVENANCE.includes(profile.provenance.kind)
  let flagged = 0
  let notHolding = 0
  let discounted = 0
  for (const c of claims) {
    const m = rubric ? referenceFlag(c, rubric, refPosture, discount) : (c.flag ? { flag: c.flag, explanation: c.explanation } : null)
    if (discount && c.inDocument) discounted++
    if (m) flagged++
    if (m || c.overreach) notHolding++
  }
  const holding = claims.length - notHolding
  const share = holding / claims.length

  // Whole-document problems: every document-level check that comes back as a
  // flag (not a note), each a point, capped.
  const problems = signals.filter((s) => !s.gate && !s.positive && !s.informational && s.severity === 'flag').map((s) => s.id)
  const problemPenalty = Math.min(W.DOC_PROBLEM_CAP, problems.length * W.DOC_PROBLEM)

  let score = W.START_BUDGET * share - problemPenalty
  score = Math.min(W.MAX, Math.max(W.MIN, score))
  score = round1(score)

  const band = bandFor(score)
  return {
    score,
    display: Math.round(score),
    band,
    summary: verdictFor(band, posture, noun, promotional),
    genreNote,
    breakdown: {
      gate: false,
      start: W.START_BUDGET,
      referencePosture: refPosture,
      flaggedAtStandard: flagged,
      notHolding,
      holding,
      share: round2(share),
      problems,
      problemPenalty,
      provenanceDiscounted: discounted,
      claimCount: claims.length,
    },
  }
}
