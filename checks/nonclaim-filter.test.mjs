// ─────────────────────────────────────────────────────────────────────────────
// Non-claim filter checks (Step 2). Each rule independently tested via the
// exported predicates, plus the required false-exclusion guards.
// ─────────────────────────────────────────────────────────────────────────────

import { isDropped, demotionPenalty, classifyNonClaim } from '../src/engine/nonClaimFilter.js'
import { isLabel, extractClaims, splitSentences } from '../src/engine/extractClaims.js'

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
log('drop contents line (dot leaders)', isDropped('Market overview .................................. 12'))

// ── Headings stand apart; labels are not claims ──────────────────────────────
log('a short open paragraph ends at its break',
  JSON.stringify(splitSentences('Key Findings\n\nCosts rose 4% in the quarter.')) === JSON.stringify(['Key Findings', 'Costs rose 4% in the quarter.']))
log('a lower-case next paragraph still continues it',
  splitSentences('Costs for steel and\n\nconcrete rose 4% in the quarter.').length === 1)
log('label: no closing punctuation, no finite verb', isLabel('Safety Management in the Construction Industry 2023'))
log('GUARD: an open headline with a verb is not a label', !isLabel('Market outlook remains positive as demand grows'))
log('GUARD: a closed sentence is never a label', !isLabel('Costs per square foot up 4% in the quarter.'))
log('GUARD: journalism keeps a verbless headline',
  extractClaims('Record Quarter For Apple Services Revenue In 2026', { minClaimLength: 10, sensitivity: 0.3 }, { rubricId: 'journalism' }).length === 1)

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
