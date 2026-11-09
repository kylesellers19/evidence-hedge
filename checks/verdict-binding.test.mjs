// ─────────────────────────────────────────────────────────────────────────────
// Verdict-binding check. The headline must bind every number to the population
// it describes. It carries two: the claims with any flag (each counted once)
// and all claims, so "N of M" is always a subset over its whole. The per-flag
// counts and the strong count are labeled in the stats row under it, never in
// the headline. Guards against the earlier bugs: document-wide flag counts
// bound to the strong subpopulation ("2 of them strongly stated; of these, 99
// rest on…"), and overlapping flag counts that could not add up to "flagged".
// ─────────────────────────────────────────────────────────────────────────────

import { buildVerdict } from '../src/engine/analyze.js'

const rubric = { documentNoun: 'report' }
let ok = true
const log = (label, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`) }
const words = (s) => s.trim().split(/\s+/).length
const numbers = (s) => (s.match(/\d+/g) || []).map(Number)

// Case 1 — some flagged: "F of N claims say…", the only two numbers.
{
  const s = buildVerdict({ rubric, totalClaims: 10, strongClaims: 2, flaggedClaims: 4 })
  console.log('  case1:', s)
  log('c1 "4 of 10 claims say more than their evidence shows."', s === '4 of 10 claims say more than their evidence shows.')
  log('c1 numbers are the flagged count and the total, nothing else', JSON.stringify(numbers(s)) === '[4,10]')
  log('c1 no strong count in the headline', !/strong/.test(s))
}

// Case 2 — singular agreement.
{
  const s = buildVerdict({ rubric, totalClaims: 12, strongClaims: 0, flaggedClaims: 1 })
  console.log('  case2:', s)
  log('c2 singular verb "1 of 12 claims says"', s === '1 of 12 claims says more than its evidence shows.')
  const one = buildVerdict({ rubric, totalClaims: 1, strongClaims: 1, flaggedClaims: 1 })
  log('c2 one claim, flagged', one === 'Its one claim says more than its evidence shows.', one)
  const oneClean = buildVerdict({ rubric, totalClaims: 1, strongClaims: 0, flaggedClaims: 0 })
  log('c2 one claim, clean', oneClean === 'Its one claim stays within what its evidence shows.', oneClean)
}

// Case 3 — no flags, and every claim flagged.
{
  const s = buildVerdict({ rubric, totalClaims: 5, strongClaims: 3, flaggedClaims: 0 })
  console.log('  case3:', s)
  log('c3 clean document', s === 'All 5 claims stay within what their evidence shows.')
  const all = buildVerdict({ rubric, totalClaims: 7, strongClaims: 0, flaggedClaims: 7 })
  log('c3 every claim flagged', all === 'All 7 claims say more than their evidence shows.', all)
}

// Case 4 — zero claims.
{
  const s = buildVerdict({ rubric, totalClaims: 0, strongClaims: 0, flaggedClaims: 0 })
  console.log('  case4:', s)
  log('c4 zero-claim sentence names the document', s === 'We found no claims in this report to weigh.')
}

// Every branch: one sentence, 15 words or fewer (Delgam STYLE.md rule 10).
{
  const all = [[10, 4], [12, 1], [1, 1], [1, 0], [5, 0], [7, 7], [0, 0], [1234, 987]].map(([n, f]) => buildVerdict({ rubric, totalClaims: n, strongClaims: 0, flaggedClaims: f }))
  log('every branch is one sentence of 15 words or fewer', all.every((s) => words(s) <= 15 && (s.match(/[.!?]/g) || []).length === 1), all.map(words).join(' '))
}

if (!ok) { console.error('\nverdict-binding checks failed.'); process.exit(1) }
console.log('\nAll verdict-binding checks passed.')
process.exit(0)
