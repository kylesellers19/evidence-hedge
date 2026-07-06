// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — detectMismatch(claim, tolerance) → { flag, explanation } | null
//
// Same machinery, two flags:
//
//   ceiling = tolerance.ceilings[rungReached.rank]
//             ── the strongest tier this evidence grade is ALLOWED to assert.
//
//   asserted tier weight <= ceiling   → within tolerance, no flag.
//   asserted tier weight  > ceiling   → over-assertion. Which kind?
//       · rung at/below nearNullRank (little/no citation)
//             → UNSUPPORTED-ASSERTION  (polished, quotable, cites nothing —
//                                        the highest-value catch)
//       · rung above nearNullRank (a source IS cited, just too weak)
//             → OVERCONFIDENT          (cited-but-too-weak)
//
// Both carry the same explanation object: { tierAsserted, rungReached, ceiling }.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {import('./types.js').Tier} Tier */
/** @typedef {import('./types.js').Rung} Rung */
/** @typedef {import('./types.js').ToleranceCurve} ToleranceCurve */
/** @typedef {import('./types.js').FlagType} FlagType */
/** @typedef {import('./types.js').Explanation} Explanation */

/**
 * @param {{ tier:Tier, rung:Rung }} claim
 * @param {ToleranceCurve} tolerance
 * @returns {{ flag:FlagType, explanation:Explanation } | null}
 */
export function detectMismatch(claim, tolerance) {
  const rank = claim.rung.rank
  const ceiling =
    tolerance.ceilings[rank] ??
    tolerance.ceilings[tolerance.ceilings.length - 1]

  if (claim.tier.weight <= ceiling) return null

  /** @type {Explanation} */
  const explanation = {
    tierAsserted: claim.tier,
    rungReached: claim.rung,
    ceiling,
  }

  const flag =
    rank <= (tolerance.nearNullRank ?? 0)
      ? 'unsupported-assertion'
      : 'overconfident'

  return { flag, explanation }
}
