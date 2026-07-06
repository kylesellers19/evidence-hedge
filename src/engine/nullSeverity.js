// ─────────────────────────────────────────────────────────────────────────────
// nullSeverity — how serious is an ABSENCE of evidence, given the asserted tier,
// the active posture, and whether the absence is disclosed (honest hedging).
//
// Replaces the old scalar `nearNullRank`. Each rubric's `tolerance.nullSeverity`
// is a function `(tierIndex, posture, disclosed) => 'none'|'note'|'flag'|'critical'`.
//
// Built here from an explicit per-posture table (no arithmetic offsets on the
// UNDISCLOSED severities — those are stated outright, same spirit as the ceiling
// tables). The single derived rule is that DISCLOSING an absence lowers its
// severity by one step (min 'none'), which guarantees the contract invariant
// "disclosed ≤ undisclosed at every tier" by construction.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'none'|'note'|'flag'|'critical'} NullSeverity */

export const SEVERITY = /** @type {NullSeverity[]} */ (['none', 'note', 'flag', 'critical'])

/** @param {NullSeverity} s */
export const severityRank = (s) => {
  const i = SEVERITY.indexOf(s)
  return i < 0 ? 0 : i
}

/** One step toward 'none'. @param {NullSeverity} s */
export const downgrade = (s) => SEVERITY[Math.max(0, severityRank(s) - 1)]

/**
 * Build a nullSeverity function from an undisclosed-severity table.
 * @param {Object.<string, NullSeverity[]>} tableByPosture
 *   key 'default' REQUIRED; posture keys override wholesale. Each row is indexed
 *   by tier index (low → high); the top-tier entry MUST be 'critical'.
 * @returns {(tierIndex:number, posture:string, disclosed?:boolean) => NullSeverity}
 */
export function makeNullSeverity(tableByPosture) {
  const fn = (tierIndex, posture, disclosed = false) => {
    const row = tableByPosture[posture] || tableByPosture.default
    const idx = Math.min(Math.max(tierIndex, 0), row.length - 1)
    let sev = row[idx]
    if (!SEVERITY.includes(sev)) sev = 'none'
    return disclosed ? downgrade(sev) : sev
  }
  // Expose the source table so the validator can introspect posture coverage.
  fn.__table = tableByPosture
  return fn
}
