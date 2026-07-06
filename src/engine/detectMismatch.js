// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — detectMismatch(claim, tolerance, posture) → { flag, explanation } | null
//
// Same machinery, two flags — now posture-aware:
//
//   table   = tolerance.ceilings[posture] ?? tolerance.ceilings.default
//   ceiling = table[rungReached.rank]
//             ── the strongest tier this evidence grade is ALLOWED to assert,
//                under the active posture.
//
//   asserted tier weight <= ceiling   → within tolerance, no flag.
//   asserted tier weight  > ceiling   → over-assertion. Which kind?
//       · rung is the null/unsourced floor (rank 0)
//             → UNSUPPORTED-ASSERTION  (polished, quotable, cites nothing)
//       · rung above the floor (a source IS cited, just too weak)
//             → OVERCONFIDENT          (cited-but-too-weak)
//
//   The flag selection uses RUNG-RANK-ZERO semantics. This is exactly the old
//   `rank <= (nearNullRank ?? 0)` branch with nearNullRank === 0 everywhere, so
//   baseline flags are identical; nearNullRank is gone, its severity role now
//   belongs to tolerance.nullSeverity (consumed by the document signals).
//
//   Every flag's explanation carries the active posture.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {import('./types.js').Tier} Tier */
/** @typedef {import('./types.js').Rung} Rung */
/** @typedef {import('./types.js').ToleranceConfig} ToleranceConfig */
/** @typedef {import('./types.js').FlagType} FlagType */
/** @typedef {import('./types.js').Explanation} Explanation */

/**
 * @param {{ tier:Tier, rung:Rung }} claim
 * @param {ToleranceConfig} tolerance
 * @param {string} posture
 * @returns {{ flag:FlagType, explanation:Explanation } | null}
 */
export function detectMismatch(claim, tolerance, posture) {
  const rank = claim.rung.rank
  const table = tolerance.ceilings[posture] ?? tolerance.ceilings.default
  const ceiling = table[rank] ?? table[table.length - 1]

  if (claim.tier.weight <= ceiling) return null

  /** @type {Explanation} */
  const explanation = {
    tierAsserted: claim.tier,
    rungReached: claim.rung,
    ceiling,
    posture,
  }

  const flag = rank === 0 ? 'unsupported-assertion' : 'overconfident'

  return { flag, explanation }
}
