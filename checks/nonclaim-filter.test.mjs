// ─────────────────────────────────────────────────────────────────────────────
// Non-claim filter checks (Step 2). Each rule independently tested via the
// exported predicates, plus the required false-exclusion guards.
// ─────────────────────────────────────────────────────────────────────────────

import { isDropped, demotionPenalty, classifyNonClaim } from '../src/engine/nonClaimFilter.js'

let ok = true
const log = (label, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`) }

// ── Positive: correctly DROPPED ──────────────────────────────────────────────
log('drop boilerplate', isDropped('Past performance is not indicative of future results.'))
log('drop forward-looking', isDropped('This document contains forward-looking statements'))
log('drop byline', isDropped('By Jane Doe'))
log('drop dateline', isDropped('March 3, 2024'))
log('drop reading-time meta', isDropped('5 min read'))
log('drop nav CTA', isDropped('Contact us'))
log('drop nav item', isDropped('Learn more'))

// ── Positive: correctly DEMOTED (penalty > 0) ────────────────────────────────
log('demote title-case heading (corporate)', demotionPenalty('Building The Future Of Enterprise Software', 'corporate') > 0)
log('demote figure caption', demotionPenalty('Figure 1: Revenue over time', 'corporate') > 0)

// ── False-exclusion guards (must NOT be excluded) ────────────────────────────
log('GUARD: news headline survives under journalism',
  demotionPenalty('Apple Reports Record Quarterly Revenue', 'journalism') === 0 && !isDropped('Apple Reports Record Quarterly Revenue'),
  JSON.stringify(classifyNonClaim('Apple Reports Record Quarterly Revenue', 'journalism')))
log('GUARD: "Never mix bleach and ammonia" survives the nav rule',
  !isDropped('Never mix bleach and ammonia'),
  JSON.stringify(classifyNonClaim('Never mix bleach and ammonia', 'general')))
log('GUARD: quantified mission pledge untouched',
  !isDropped('Our mission is to cut emissions 50% by 2030.') && demotionPenalty('Our mission is to cut emissions 50% by 2030.', 'corporate') === 0,
  JSON.stringify(classifyNonClaim('Our mission is to cut emissions 50% by 2030.', 'corporate')))

// ── Sanity: real claims from the known-good string are untouched ──────────────
for (const claim of [
  'Our platform is the #1 best-in-class solution and is unmatched in the industry.',
  'Our internal data proves customers always see world-class results.',
  'An independent survey by Gartner found adoption grew year over year.',
]) {
  log('known-good claim untouched: ' + claim.slice(0, 32) + '…',
    !isDropped(claim) && demotionPenalty(claim, 'corporate') === 0)
}

// A short imperative advice line that IS chrome-shaped but guarded by YMYL.
log('GUARD: short YMYL advice not dropped as nav', !isDropped('Avoid alcohol'))

if (!ok) { console.error('\nnon-claim filter checks failed.'); process.exit(1) }
console.log('\nAll non-claim filter checks passed.')
process.exit(0)
