// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — measureAssertiveness(claim, rubric) → Tier
//
// Claim strength is MEASUREMENT, not judgment: measure/certainty.js reads it
// from Hyland's hedges and boosters, the same for every rubric. This step only
// resolves the measured tier key to the rubric's Tier object (every rubric
// shares the four keys hedged / measured / assertive / absolute).
// ─────────────────────────────────────────────────────────────────────────────

import { measureCertainty } from './measure/certainty.js'

/** @typedef {import('./types.js').Tier} Tier */
/** @typedef {import('./types.js').RubricConfig} RubricConfig */

/**
 * @param {{ text:string }} claim
 * @param {RubricConfig} rubric
 * @param {string} [tierKey]  an already-measured tier key
 * @returns {Tier}
 */
export function measureAssertiveness(claim, rubric, tierKey = measureCertainty(claim.text).tier) {
  return rubric.tiers.find((t) => t.key === tierKey) || rubric.tiers.find((t) => t.key === rubric.defaultTier) || rubric.tiers[0]
}
