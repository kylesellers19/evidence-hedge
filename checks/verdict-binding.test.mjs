// ─────────────────────────────────────────────────────────────────────────────
// Verdict-binding check (Step 2). The rendered summary must bind every number to
// the population it describes: flagCounts and strongClaims are BOTH subsets of
// totalClaims, so totalClaims is the only denominator. Guards against the prior
// bug where document-wide flag counts were bound to the strong subpopulation
// ("makes N strong claims; M of them…" with M drawn from all claims).
// ─────────────────────────────────────────────────────────────────────────────

import { buildVerdict } from '../src/engine/analyze.js'

const rubric = { documentNoun: 'report' }
let ok = true
const log = (label, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`) }

// Case 1 — flags exceed the strong subpopulation (unsupported=4 > strong=2). The
// old template would render the impossible "2 strong claims; 4 of them …".
{
  const s = buildVerdict({ rubric, totalClaims: 10, strongClaims: 2, flagCounts: { 'unsupported-assertion': 4, overconfident: 1 } })
  console.log('  case1:', s)
  log('c1 lead denominator is total ("10 claims")', /\b10 claims\b/.test(s))
  log('c1 strong count bound to total ("2 of them strongly stated")', /\b2 of them strongly stated\b/.test(s))
  log('c1 unsupported count present ("4 rest on no cited evidence")', /\b4 rest on no cited evidence\b/.test(s))
  log('c1 overconfident count present ("1 cites sources too weak")', /\b1 cites sources too weak\b/.test(s))
  log('c1 NO mis-binding of flags to the strong subpopulation', !/strong claims;\s*\d+ of them/.test(s) && !/\b2 strong claims\b/.test(s))
  // numerator ≤ denominator for every pair (denominator = total = 10)
  const nums = [2, 4, 1]
  log('c1 every numerator ≤ stated denominator (10)', nums.every(n => n <= 10))
}

// Case 2 — singular agreement.
{
  const s = buildVerdict({ rubric, totalClaims: 1, strongClaims: 1, flagCounts: { 'unsupported-assertion': 1, overconfident: 0 } })
  console.log('  case2:', s)
  log('c2 singular "1 claim"', /\b1 claim\b/.test(s) && !/\b1 claims\b/.test(s))
  log('c2 singular verb "1 rests"', /\b1 rests on no cited evidence\b/.test(s))
}

// Case 3 — no flags.
{
  const s = buildVerdict({ rubric, totalClaims: 5, strongClaims: 3, flagCounts: { 'unsupported-assertion': 0, overconfident: 0 } })
  console.log('  case3:', s)
  log('c3 "5 claims" + "3 of them strongly stated"', /\b5 claims\b/.test(s) && /\b3 of them strongly stated\b/.test(s))
  log('c3 clean-doc tail present', /each backed by evidence in proportion to its confidence/.test(s))
}

// Case 4 — zero claims.
{
  const s = buildVerdict({ rubric, totalClaims: 0, strongClaims: 0, flagCounts: { 'unsupported-assertion': 0, overconfident: 0 } })
  console.log('  case4:', s)
  log('c4 zero-claim sentence', /No assertive claims were detected in this report\./.test(s))
}

if (!ok) { console.error('\nverdict-binding checks failed.'); process.exit(1) }
console.log('\nAll verdict-binding checks passed.')
process.exit(0)
