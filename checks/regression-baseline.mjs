// ─────────────────────────────────────────────────────────────────────────────
// Regression baseline — the frozen known-good pipeline output.
//
// The known-good fixture (recovered from the branch/verdict behavior) must
// produce EXACTLY 1 `unsupported-assertion` + 1 `overconfident` under the
// corporate rubric, on the research-like ceiling path ([1,2,2,3,4]).
//
// Modes:
//   (no flag) — if checks/baseline-output.json is absent, COMPUTE + WRITE it
//               (recording the target). Otherwise COMPARE current output to it
//               and exit non-zero on any drift.
//   The comparison is on the core fields only — flag, tierAsserted{key,weight},
//   rungReached{key,rank}, ceiling — so the `posture` field added to explanation
//   objects in Part A is tolerated (present in `actual`, absent in the frozen
//   baseline) without being treated as drift.
//
// The third arg to analyze() is the posture. The pre-Part-A engine ignores it;
// the post-Part-A engine consumes it. 'research-like' == corporate default
// ceilings == the migrated [1,2,2,3,4], so the recorded output is stable across
// the engine rewrite.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { analyze } from '../src/engine/analyze.js'
import { getRubric } from '../src/rubrics/index.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'baseline-output.json')

export const FIXTURE =
  'Our platform is the #1 best-in-class solution and is unmatched in the industry. ' +
  'Our internal data proves customers always see world-class results. ' +
  'An independent survey by Gartner found adoption grew year over year.'

const POSTURE = 'research-like'

function coreRecords(result) {
  return result.claims
    .filter(c => c.flag)
    .map(c => ({
      text: c.text,
      flag: c.flag,
      tierAsserted: { key: c.explanation.tierAsserted.key, weight: c.explanation.tierAsserted.weight },
      rungReached: { key: c.explanation.rungReached.key, rank: c.explanation.rungReached.rank },
      ceiling: c.explanation.ceiling,
    }))
}

const rubric = getRubric('corporate')
const result = analyze(FIXTURE, rubric, POSTURE)
const actual = coreRecords(result)

// Self-check on the fixture's defining property regardless of mode.
const counts = actual.reduce((m, r) => ((m[r.flag] = (m[r.flag] || 0) + 1), m), {})
const definingOk =
  counts['unsupported-assertion'] === 1 && counts['overconfident'] === 1 && actual.length === 2

if (!existsSync(OUT)) {
  if (!definingOk) {
    console.error('REFUSING TO WRITE BASELINE — fixture no longer yields 1 unsupported + 1 overconfident:', counts)
    process.exit(1)
  }
  writeFileSync(OUT, JSON.stringify(actual, null, 2) + '\n')
  console.log('WROTE baseline-output.json (' + actual.length + ' flagged claims):', counts)
  process.exit(0)
}

const expected = JSON.parse(readFileSync(OUT, 'utf8'))
const errors = []
if (expected.length !== actual.length) {
  errors.push(`flag count changed: baseline ${expected.length}, now ${actual.length}`)
}
const n = Math.max(expected.length, actual.length)
for (let i = 0; i < n; i++) {
  const e = expected[i], a = actual[i]
  if (!e || !a) { errors.push(`record ${i} missing (baseline=${!!e}, now=${!!a})`); continue }
  if (e.flag !== a.flag) errors.push(`record ${i} flag: ${e.flag} → ${a.flag}`)
  if (JSON.stringify(e.tierAsserted) !== JSON.stringify(a.tierAsserted))
    errors.push(`record ${i} tierAsserted: ${JSON.stringify(e.tierAsserted)} → ${JSON.stringify(a.tierAsserted)}`)
  if (JSON.stringify(e.rungReached) !== JSON.stringify(a.rungReached))
    errors.push(`record ${i} rungReached: ${JSON.stringify(e.rungReached)} → ${JSON.stringify(a.rungReached)}`)
  if (e.ceiling !== a.ceiling) errors.push(`record ${i} ceiling: ${e.ceiling} → ${a.ceiling}`)
}

if (errors.length) {
  console.error('REGRESSION FAIL — pipeline output drifted from baseline:')
  for (const err of errors) console.error('  · ' + err)
  process.exit(1)
}

// Confirm the new posture field is present post-Part-A (informational).
const hasPosture = result.claims.some(c => c.flag && c.explanation && 'posture' in c.explanation)
console.log(`REGRESSION PASS — ${actual.length} flagged claims match baseline (posture field present: ${hasPosture}).`)
process.exit(0)
