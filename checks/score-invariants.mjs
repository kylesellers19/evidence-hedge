// ─────────────────────────────────────────────────────────────────────────────
// scoreDocument invariants (Part A):
//   (a) determinism  — two runs on the same input produce identical scores;
//   (b) monotonicity — adding one more critical-severity condition never RAISES
//                      the score (a flag-severity document signal is added, so the
//                      claim-count denominator is unaffected → strictly ≤);
//   (c) frozen baseline — the baseline regression string's score is computed and
//       frozen into checks/baseline-output.json alongside the frozen flags.
//
// Write-if-absent for the score: the first run stamps { score, band } into the
// baseline file; later runs compare. The existing flag assertions are untouched.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { analyze } from '../src/engine/analyze.js'
import { scoreDocument } from '../src/engine/scoreDocument.js'
import { getRubric } from '../src/rubrics/index.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'baseline-output.json')

const FIXTURE =
  'Our platform is the #1 best-in-class solution and is unmatched in the industry. ' +
  'Our internal data proves customers always see world-class results. ' +
  'An independent survey by Gartner found adoption grew year over year.'

let ok = true
const log = (label, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`) }

const rubric = getRubric('corporate')

// ── (a) determinism ──────────────────────────────────────────────────────────
const a1 = analyze(FIXTURE, rubric, 'research-like')
const a2 = analyze(FIXTURE, rubric, 'research-like')
const s1 = scoreDocument({ claims: a1.claims, signals: a1.signals, posture: a1.posture, rubric })
const s2 = scoreDocument({ claims: a2.claims, signals: a2.signals, posture: a2.posture, rubric })
log('(a) determinism — identical score across two runs',
  JSON.stringify(s1) === JSON.stringify(s2), `score=${s1.score} band=${s1.band}`)
log('(a) determinism — analyze attaches same documentScore',
  JSON.stringify(a1.documentScore) === JSON.stringify(a2.documentScore))

// ── (b) monotonicity ─────────────────────────────────────────────────────────
const base = scoreDocument({ claims: a1.claims, signals: a1.signals, posture: a1.posture, rubric })
const worseFlag = scoreDocument({
  claims: a1.claims,
  signals: [...a1.signals, { id: 'synthetic-critical', severity: 'flag', summary: 'x', evidence: [] }],
  posture: a1.posture, rubric,
})
const worseNote = scoreDocument({
  claims: a1.claims,
  signals: [...a1.signals, { id: 'synthetic-note', severity: 'note', summary: 'x', evidence: [] }],
  posture: a1.posture, rubric,
})
log('(b) monotonicity — adding a flag signal never raises score',
  worseFlag.score <= base.score, `${base.score} → ${worseFlag.score}`)
log('(b) monotonicity — adding a note signal never raises score',
  worseNote.score <= base.score, `${base.score} → ${worseNote.score}`)

// posture-gate special case must read as 'carried', not low.
const gateDoc = 'In my experience, mornings are the hardest. When I started journaling I felt calmer, and for me that small habit changed the day.'
const gate = analyze(gateDoc, getRubric('general'), 'experiential').documentScore
log("posture-gate scores 'carried' (not low), with its own summary",
  gate.band === 'carried' && /no expert claims/.test(gate.summary), `score=${gate.score} band=${gate.band}`)

// ── (c) frozen baseline score ────────────────────────────────────────────────
const baselineScore = a1.documentScore
const parsed = JSON.parse(readFileSync(OUT, 'utf8'))
const data = Array.isArray(parsed) ? { flags: parsed } : parsed

if (data.score === undefined) {
  data.score = baselineScore.score
  data.band = baselineScore.band
  writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n')
  log('(c) froze baseline score into baseline-output.json', true, `score=${data.score} band=${data.band}`)
} else {
  const match = data.score === baselineScore.score && data.band === baselineScore.band
  log('(c) baseline score reproduces frozen value', match,
    `frozen=${data.score}/${data.band} now=${baselineScore.score}/${baselineScore.band}`)
}

if (!ok) { console.error('\nscore invariants failed.'); process.exit(1) }
console.log('\nAll score invariants passed.')
process.exit(0)
