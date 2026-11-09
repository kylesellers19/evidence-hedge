// ─────────────────────────────────────────────────────────────────────────────
// scoreDocument(analysis) → DocumentScore
//
// A pure, deterministic 1–10 score of EVIDENTIAL SUPPORT: same input always
// yields the same output (no Math.random, no Date). Starts from a budget of 10
// and subtracts:
//   · per-claim evidence flags, normalized by claim count, on a linear curve
//     (FLAG_RATE_SCALE)
//   · causal-overreach, scaled by register distance — an absolute, capped sum,
//     so adding or removing a limitations paragraph cannot move it
//     (disclosure-invariant)
//   · document signals; completeness gaps and reporting patterns at their own
//     weights; zero-weight notes (self-disclaimed causality) never count
//   · platitude density
//   · self-citation share
// Floors at 1, caps at 10. A document with no claims gets no score (null):
// there is nothing for its evidence to carry or fail to carry, and starting
// from the full budget would call it strong.
//
// GENRE-INVARIANT (D1). The score never reads the selected posture: claims are
// re-judged against the rubric's evidence standard (rubric.strictestPosture),
// and on a firm-vendor or press-office document an own result counts one rung
// lower (provenance discount on in-document evidence). The posture sets only
// the verdict sentence and a one-line genre note; marketing and press-release
// postures never say "The evidence supports…" unless the score earns the band.
//
// ALL tunable weights live in SCORE_WEIGHTS / BAND_THRESHOLDS / templates
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
  START_BUDGET: 10,          // PROVISIONAL — not ratified
  // Per-claim flag weight, multiplied by the over-assertion distance
  // (tierAsserted.weight − ceiling). Unsupported assertion weighs heavier.
  flag: {
    'unsupported-assertion': 1.4, // PROVISIONAL — not ratified
    overconfident: 0.9,           // PROVISIONAL — not ratified
  },
  // Linear flag curve (no recalibration branch to build on): the prior
  // recalibration target. Was 2.0.
  FLAG_RATE_SCALE: 5.5,      // PROVISIONAL — not ratified
  // causal-overreach: per unit of register/advice distance above the design
  // ceiling, summed over claims and capped.
  OVERREACH_PER: 0.3,        // PROVISIONAL — not ratified
  OVERREACH_CAP: 2.5,        // PROVISIONAL — not ratified
  // Document-signal penalty by severity. Positive and zero-weight signals and
  // the gate never penalize; platitude-density and completeness have their own.
  signal: {
    flag: 1.2,               // PROVISIONAL — not ratified
    note: 0.4,               // PROVISIONAL — not ratified
  },
  COMPLETENESS_PER_GAP: 0.15, // PROVISIONAL — not ratified (each unreported item)
  COMPLETENESS_CAP: 0.9,      // PROVISIONAL — not ratified
  REPORTING_PATTERN: 0.4,     // PROVISIONAL — not ratified (equivalence / subgroup / covariate)
  PLATITUDE_PER: 0.15,       // PROVISIONAL — not ratified (per platitude, direct)
  // Share of references + claim links that name the publisher itself.
  SELF_CITATION: 1.5,        // PROVISIONAL — not ratified (× share)
  SELF_CITATION_MIN_POOL: 5, // PROVISIONAL — not ratified
  // Provenance whose in-document evidence is discounted one rung.
  DISCOUNTED_PROVENANCE: ['firm-vendor', 'academic-press-office'], // PROVISIONAL — not ratified
  GATE_SCORE: 7.5,           // PROVISIONAL — not ratified (posture-gate → 'carried')
  MIN: 1,
  MAX: 10,
}

// Band thresholds over 1–10 (min inclusive), highest first. PROVISIONAL.
export const BAND_THRESHOLDS = [
  { min: 8.5, band: 'strong' },  // PROVISIONAL — not ratified
  { min: 6.5, band: 'carried' }, // PROVISIONAL — not ratified
  { min: 5.0, band: 'mixed' },   // PROVISIONAL — not ratified
  { min: 3.0, band: 'weak' },    // PROVISIONAL — not ratified
  { min: 1.0, band: 'failing' }, // PROVISIONAL — not ratified
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
// No claims found, so no score. PROVISIONAL — not ratified (template).
export const UNSCORED_SUMMARY = (n) => `With no claims to weigh, this ${n} has no score.`

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

  // No claims: no score, rather than the full budget.
  if (claims.length === 0) {
    return {
      score: null,
      display: null,
      band: 'unscored',
      summary: UNSCORED_SUMMARY(noun),
      genreNote,
      breakdown: { gate: false, unscored: true, start: W.START_BUDGET, claimCount: 0 },
    }
  }

  // Per-claim evidence flags at the evidence standard (genre-invariant),
  // weighted by over-assertion distance, normalized by claim count.
  const refPosture = rubric?.strictestPosture || rubric?.defaultPosture
  const discount = !!profile && W.DISCOUNTED_PROVENANCE.includes(profile.provenance.kind)
  let rawFlag = 0
  let flagged = 0
  let discounted = 0
  for (const c of claims) {
    const m = rubric ? referenceFlag(c, rubric, refPosture, discount) : (c.flag ? { flag: c.flag, explanation: c.explanation } : null)
    if (discount && c.inDocument) discounted++
    if (!m) continue
    flagged++
    const w = W.flag[m.flag] ?? 1
    const ceiling = m.explanation?.ceiling ?? 0
    const asserted = m.explanation?.tierAsserted?.weight ?? ceiling + 1
    rawFlag += w * Math.max(1, asserted - ceiling)
  }
  const claimCount = Math.max(1, claims.length)
  const flagRate = rawFlag / claimCount
  const flagContribution = flagRate * W.FLAG_RATE_SCALE

  // causal-overreach: absolute, capped — never diluted by added disclosure text.
  const overreachDistance = claims.reduce((s, c) => s + (c.overreach ? c.overreach.distance : 0), 0)
  const overreachPenalty = Math.min(W.OVERREACH_CAP, overreachDistance * W.OVERREACH_PER)

  // Document signals, completeness, platitudes.
  let signalPenalty = 0
  let completenessPenalty = 0
  let platitudePenalty = 0
  for (const s of signals) {
    if (s.gate || s.positive || s.informational) continue
    if (s.id === 'platitude-density') { platitudePenalty += (s.count || 0) * W.PLATITUDE_PER; continue }
    if (s.id === 'completeness-gaps') { completenessPenalty += Math.min(W.COMPLETENESS_CAP, (s.count || 0) * W.COMPLETENESS_PER_GAP); continue }
    if (s.completeness) { completenessPenalty += W.REPORTING_PATTERN; continue }
    signalPenalty += W.signal[s.severity] ?? 0
  }

  // Self-citation share (references + claim links naming the publisher).
  const self = profile?.provenance?.selfCitation
  const selfCitationPenalty = self && self.pool >= W.SELF_CITATION_MIN_POOL ? self.share * W.SELF_CITATION : 0

  let score = W.START_BUDGET - flagContribution - overreachPenalty - signalPenalty - completenessPenalty - platitudePenalty - selfCitationPenalty
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
      provenanceDiscounted: discounted,
      rawFlag: round2(rawFlag),
      flagRate: round2(flagRate),
      flagContribution: round2(flagContribution),
      overreachDistance,
      overreachPenalty: round2(overreachPenalty),
      signalPenalty: round2(signalPenalty),
      completenessPenalty: round2(completenessPenalty),
      platitudePenalty: round2(platitudePenalty),
      selfCitationPenalty: round2(selfCitationPenalty),
      claimCount: claims.length,
    },
  }
}
