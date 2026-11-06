// ─────────────────────────────────────────────────────────────────────────────
// Measurement layer — what a sentence SAYS, identical under every rubric.
//
//   measureClaim({ text, citations }) → { certainty, function, register, recommendation }
//
// Measurement (extraction, certainty tier, claim function, causal register,
// recommendation strength) never reads the rubric. Judgment — ladders,
// ceilings, severities, weights, verdict templates — is the rubric's.
// checks/rubric-invariance.mjs enforces the split on the corpus.
// ─────────────────────────────────────────────────────────────────────────────

import { measureCertainty, TIERS, DEFAULT_TIER } from './certainty.js'
import { claimFunction } from './claimFunction.js'
import { causalRegister } from './causalRegister.js'
import { recommendationStrength } from './recommendation.js'
import { HEDGES, BOOSTERS, ABSOLUTES } from '../lexicons/hyland.js'

export { TIERS, DEFAULT_TIER }

// One extraction setting for every rubric. The journalism rubric's exemption of
// title-case headings from demotion (nonClaimFilter.js) is the one listed
// exception: headlines are claims in journalism.
export const SHARED_EXTRACTION = {
  sensitivity: 0.55,   // PROVISIONAL — not ratified
  minClaimLength: 30,  // PROVISIONAL — not ratified
  assertivenessCues: { boosters: [...BOOSTERS, ...ABSOLUTES], hedges: HEDGES },
}

/**
 * @param {{ text: string, citations?: {type:string, raw:string}[] }} claim
 */
export function measureClaim(claim) {
  const certainty = measureCertainty(claim.text)
  const recommendation = recommendationStrength(claim.text)
  const fn = claimFunction(claim.text, { citations: claim.citations, recommendation })
  const register = causalRegister(claim.text)
  return { certainty, function: fn, register, recommendation }
}
