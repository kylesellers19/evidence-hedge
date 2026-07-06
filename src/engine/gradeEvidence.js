// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — gradeEvidence(claim, ladder) → Rung
//
// Ranks a claim's detected citations + evidence keywords into a grade on the
// rubric's ladder. The ladder owns what counts as each grade (rung.match);
// the engine just walks rungs top → bottom and returns the first that hits.
// No match above the floor → the bottom rung (rank 0, "unsourced" / near-null),
// which is what makes an assertive-but-uncited line surface downstream as an
// unsupported-assertion rather than an overconfident one.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {import('./types.js').Rung} Rung */
/** @typedef {import('./types.js').Citation} Citation */

const wordRe = (term) =>
  new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')

/**
 * @param {{ text:string, citations:Citation[] }} claim
 * @param {Rung[]} ladder              ordered low → high rank
 * @returns {Rung}
 */
export function gradeEvidence(claim, ladder) {
  const types = new Set(claim.citations.map(c => c.type))
  const byRankDesc = [...ladder].sort((a, b) => b.rank - a.rank)

  for (const rung of byRankDesc) {
    const m = rung.match
    if (!m) continue
    const typeHit = m.types && m.types.some(t => types.has(t))
    const kwHit = m.keywords && m.keywords.some(k => wordRe(k).test(claim.text))
    if (typeHit || kwHit) return rung
  }

  // Floor: lowest-rank rung == unsourced / near-null.
  return [...ladder].sort((a, b) => a.rank - b.rank)[0]
}
