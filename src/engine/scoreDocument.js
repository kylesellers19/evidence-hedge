// ─────────────────────────────────────────────────────────────────────────────
// scoreDocument(analysis) → DocumentScore
//
// A pure, deterministic overall-quality score for a document: same input always
// yields the same output (run-to-run consistency is the product differentiator —
// no Math.random, no Date). Starts from an earned-confidence budget of 10 and
// subtracts penalties for per-claim flags (normalized by claim count so long
// documents aren't punished for having more sentences), document signals, and
// platitude density. Floors at 1, caps at 10.
//
// ALL tunable weights live in SCORE_WEIGHTS below, each PROVISIONAL — the full
// table is in the completion report for ratification. No constants buried in
// expressions.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} DocumentScore
 * @property {number} score      1–10, one decimal place
 * @property {number} display    Math.round(score) — the annotation numeral
 * @property {string} band       'failing' | 'weak' | 'mixed' | 'carried' | 'strong'
 * @property {string} summary    one plain-language sentence, band-templated
 * @property {Object} breakdown  per-component contributions, for auditability
 */

export const SCORE_WEIGHTS = {
  START_BUDGET: 10,          // PROVISIONAL — not ratified
  // Per-claim flag weight, multiplied by the over-assertion distance
  // (tierAsserted.weight − ceiling): how far the claim's confidence outran what
  // its evidence licenses. Unsupported assertion is weighted heavier.
  flag: {
    'unsupported-assertion': 1.4, // PROVISIONAL — not ratified
    overconfident: 0.9,           // PROVISIONAL — not ratified
  },
  FLAG_RATE_SCALE: 2.0,      // PROVISIONAL — not ratified (scales normalized flag rate)
  // Document-signal penalty by severity (flag heavier than note). Positive
  // signals (right-of-reply) and the gate signal never penalize; platitude-
  // density is handled separately below.
  signal: {
    flag: 1.2,               // PROVISIONAL — not ratified
    note: 0.4,               // PROVISIONAL — not ratified
  },
  PLATITUDE_PER: 0.15,       // PROVISIONAL — not ratified (per platitude, direct)
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

// Band → one plain-language sentence. Verdict register — no exclamation marks,
// no praise adjectives. Uses the rubric's documentNoun. PROVISIONAL.
const SUMMARY = {
  failing: (n) => `The evidence does not support what this ${n} claims.`,
  weak: (n) => `Much of what this ${n} claims outruns its evidence.`,
  mixed: (n) => `This ${n} makes some claims its evidence does not carry.`,
  carried: (n) => `The evidence largely carries what this ${n} claims.`,
  strong: (n) => `The evidence supports what this ${n} claims.`,
}
const GATE_SUMMARY = (n) => `This ${n} makes no expert claims — there is no evidence obligation to assess.`

const round1 = (x) => Math.round(x * 10) / 10
const round2 = (x) => Math.round(x * 100) / 100

export function bandFor(score) {
  for (const t of BAND_THRESHOLDS) if (score >= t.min) return t.band
  return 'failing'
}

/**
 * @param {Object} analysis  { claims, signals, posture, rubric }
 * @returns {DocumentScore}
 */
export function scoreDocument(analysis) {
  const W = SCORE_WEIGHTS
  const claims = analysis.claims || []
  const signals = analysis.signals || []
  const noun = analysis.rubric?.documentNoun || 'document'

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
      breakdown: { gate: true, start: W.START_BUDGET, flagContribution: 0, signalPenalty: 0, platitudePenalty: 0, flagRate: 0, claimCount: claims.length },
    }
  }

  // Per-claim flags, weighted by over-assertion distance, normalized by count.
  const flagged = claims.filter((c) => c.flag)
  let rawFlag = 0
  for (const c of flagged) {
    const w = W.flag[c.flag] ?? 1
    const ceiling = c.explanation?.ceiling ?? 0
    const asserted = c.explanation?.tierAsserted?.weight ?? ceiling + 1
    const over = Math.max(1, asserted - ceiling)
    rawFlag += w * over
  }
  const claimCount = Math.max(1, claims.length)
  const flagRate = rawFlag / claimCount
  const flagContribution = flagRate * W.FLAG_RATE_SCALE

  // Document signals + platitude density.
  let signalPenalty = 0
  let platitudePenalty = 0
  for (const s of signals) {
    if (s.gate || s.positive) continue
    if (s.id === 'platitude-density') { platitudePenalty += (s.count || 0) * W.PLATITUDE_PER; continue }
    signalPenalty += W.signal[s.severity] ?? 0
  }

  let score = W.START_BUDGET - flagContribution - signalPenalty - platitudePenalty
  score = Math.min(W.MAX, Math.max(W.MIN, score))
  score = round1(score)

  const band = bandFor(score)
  return {
    score,
    display: Math.round(score),
    band,
    summary: SUMMARY[band](noun),
    breakdown: {
      gate: false,
      start: W.START_BUDGET,
      rawFlag: round2(rawFlag),
      flagRate: round2(flagRate),
      flagContribution: round2(flagContribution),
      signalPenalty: round2(signalPenalty),
      platitudePenalty: round2(platitudePenalty),
      claimCount: claims.length,
    },
  }
}
