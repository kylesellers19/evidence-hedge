// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — measureAssertiveness(claim, rubric) → Tier
//
// Reads claim-strength off the rubric's tier bands. Tiers are scanned highest
// weight first; the first whose cues appear in the text wins. Global booster /
// hedge lexicons (from extraction.assertivenessCues) nudge borderline lines:
// a booster with no hedge promotes; a hedge with no booster demotes. The verbs
// live here; the bands and lexicons are entirely the rubric's.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {import('./types.js').Tier} Tier */
/** @typedef {import('./types.js').RubricConfig} RubricConfig */

const wordRe = (term) =>
  new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')

function anyCue(text, cues) {
  return cues.some(c => wordRe(c).test(text))
}

/**
 * @param {{ text:string }} claim
 * @param {RubricConfig} rubric
 * @returns {Tier}
 */
export function measureAssertiveness(claim, rubric) {
  const { tiers, defaultTier, extraction } = rubric
  const text = claim.text
  const byWeightDesc = [...tiers].sort((a, b) => b.weight - a.weight)

  // 1. Direct cue match — strongest matching band wins.
  let matched = byWeightDesc.find(t => anyCue(text, t.cues))

  // 2. Fall back to the rubric's default band when nothing matches.
  if (!matched) {
    matched = tiers.find(t => t.key === defaultTier) || tiers[0]
  }

  // 3. Booster / hedge nudge for borderline lines.
  const { boosters, hedges } = extraction.assertivenessCues
  const hasBooster = anyCue(text, boosters)
  const hasHedge = anyCue(text, hedges)
  const sorted = [...tiers].sort((a, b) => a.weight - b.weight)
  const idx = sorted.findIndex(t => t.key === matched.key)

  if (hasBooster && !hasHedge && idx < sorted.length - 1) return sorted[idx + 1]
  if (hasHedge && !hasBooster && idx > 0) return sorted[idx - 1]
  return matched
}
