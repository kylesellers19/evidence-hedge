// ─────────────────────────────────────────────────────────────────────────────
// node checks/claim-record.test.mjs — change set 5: claim records and comparison.
//
//   1. Flags and scores on the known-good string and Fixtures A–C are identical
//      to change set 4's (checks/reports/links-513f33d.json): records are
//      read-only on the analysis.
//   2. Every record carries every field, each with a status, a label tier when
//      resolved and a reason when unresolved; the six human-coded fields stay
//      unresolved until coded.
//   3. The records' causal-strength mapping equals change set 1's
//      (checks/lib/mapping.mjs), both PROVISIONAL.
//   4. compareClaims reports every dimension separately, lists what it could
//      not resolve and issues no verdict or score; compareChain gives each
//      adjacent step plus end to end. Exercised on a real published pair
//      (Wright & Augenstein, from the bundle; skipped when absent).
//   5. Reports fill rates and unresolved counts per field against
//      checks/cs5-predictions.json into checks/reports/records-<commit>.json;
//      a mismatch is reported, not failed.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/corpus.mjs'
import { FIXTURES, runFixture } from './lib/fixtures.mjs'
import { engineCommit } from './lib/engine-rows.mjs'
import { REGISTER_STRENGTH } from './lib/mapping.mjs'
import { loadBundle, field } from './lib/bundle.mjs'
import { analyze } from '../src/engine/analyze.js'
import { getRubric } from '../src/rubrics/index.js'
import { RECORD_FIELDS, CODED_FIELDS, SCOPE_MARKERS, CAUSAL_STRENGTH, recordFromSentence } from '../src/engine/claimRecord.js'
import { compareClaims, compareChain } from '../src/engine/compareClaims.js'

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS ✅' : 'FAIL ❌'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) failed++
}

// 3
check('record causal strength uses change set 1 mapping', JSON.stringify(CAUSAL_STRENGTH) === JSON.stringify(REGISTER_STRENGTH))

// 1, 2, 5
const BEFORE = JSON.parse(readFileSync(join(ROOT, 'checks', 'reports', 'links-513f33d.json'), 'utf8')).fixtures
const PRED = JSON.parse(readFileSync(join(ROOT, 'checks', 'cs5-predictions.json'), 'utf8')).predictions
const inRange = (v, r) => (Array.isArray(r) ? v >= r[0] && v <= r[1] : v === r)
const commit = engineCommit()
const report = { engine_commit: commit, label_tier: 'predicted', source: 'fixtures A–C', split: 'fixture', fixtures: {}, mismatches: [] }

function wellFormed(id, records) {
  const bad = records.filter((r) => RECORD_FIELDS.some((f) => {
    const v = r[f]
    if (!v || !['resolved', 'unresolved'].includes(v.status)) return true
    if (v.status === 'resolved' && !v.tier) return true
    if (v.status === 'unresolved' && !v.reason) return true
    return CODED_FIELDS.includes(f) && v.status !== 'unresolved'
  }))
  check(`every record carries every field [${id}]`, bad.length === 0, bad.length ? `${bad.length} malformed` : `${records.length} records`)
}

for (const f of FIXTURES) {
  const run = await runFixture(f)
  if (run.status !== 'ok') { console.log(`SKIP ${f.id} — ${run.reason}`); continue }
  const a = run.analysis
  const was = BEFORE[f.id]
  check(`flags and score unchanged [${f.id}]`, JSON.stringify(a.summary.flagCounts) === JSON.stringify(was.flags) && a.documentScore.score === was.score,
    `${JSON.stringify(a.summary.flagCounts)} ${a.documentScore.score}`)
  wellFormed(f.id, a.records)
  const n = a.records.length
  const counted = (fieldName) => a.records.filter((r) => r[fieldName].status === 'resolved' && (!SCOPE_MARKERS.includes(fieldName) || r[fieldName].value === true)).length
  const fill = Object.fromEntries(RECORD_FIELDS.map((k) => [k, +(counted(k) / n).toFixed(3)]))
  const unresolved = Object.fromEntries(RECORD_FIELDS.map((k) => [k, a.records.filter((r) => r[k].status === 'unresolved').length]))
  const genre = {}
  for (const r of a.records) genre[r.genre.value] = (genre[r.genre.value] || 0) + 1
  report.fixtures[f.id] = { rows: n, fill, unresolved, genre }
  for (const [k, v] of Object.entries(fill)) {
    const want = PRED.fillRates[f.id]?.[k]
    if (want != null && !inRange(v, want)) report.mismatches.push(`${f.id} ${k}: predicted ${JSON.stringify(want)}, actual ${v}`)
  }
  const top = Object.entries(genre).sort((x, y) => y[1] - x[1])[0][0]
  if (PRED.genre[f.id] !== top) report.mismatches.push(`${f.id} genre: predicted ${PRED.genre[f.id]}, actual ${top}`)
}
{
  const KNOWN_GOOD = readFileSync(join(ROOT, 'checks', 'regression-baseline.mjs'), 'utf8')
    .match(/export const FIXTURE =([\s\S]*?)\n\n/)[1].match(/'([^']*)'/g).map((s) => s.slice(1, -1)).join('')
  const a = analyze(KNOWN_GOOD, getRubric('corporate'), 'research-like')
  check('known-good string keeps 1 unsupported-assertion + 1 overconfident', JSON.stringify(a.claims.filter((c) => c.flag).map((c) => c.flag).sort()) === JSON.stringify(['overconfident', 'unsupported-assertion']))
  wellFormed('known-good', a.records)
}

// 4 — a real published pair
const b = loadBundle({ source: 'wright2021_pairs' })
if (b.status !== 'ok') console.log(`SKIP comparison on a real pair — ${b.reason}`)
else {
  const pair = b.rows.find((r) => r.original_split === 'test')
  const src = recordFromSentence(field(pair, 'abstractText'), { genre: 'academic conclusion' })
  const res = recordFromSentence(field(pair, 'pressText'), { genre: 'press release' })
  const cmp = compareClaims(src, res)
  const dims = ['causal_strength_change', 'certainty_change', 'scope_broadening', 'outcome_substitution', 'new_causal_agent', 'population_shift', 'attribution_shift', 'evidence_trail']
  check('compareClaims reports every dimension', dims.every((d) => cmp[d] && ['resolved', 'unresolved'].includes(cmp[d].status)), Object.keys(cmp).join(', '))
  check('compareClaims issues no verdict or score', !('verdict' in cmp) && !('score' in cmp) && !('overall' in cmp))
  check('coded dimensions stay unresolved until coded', ['outcome_substitution', 'new_causal_agent', 'population_shift'].every((d) => cmp[d].status === 'unresolved') && cmp.unresolved.length >= 3,
    cmp.unresolved.map((u) => u.dimension).join(', '))
  check('causal strength change is the restatement minus the source', cmp.causal_strength_change.value === res.causal_strength.value - src.causal_strength.value)
  const chain = compareChain([src, res, res])
  check('compareChain gives each adjacent step and end to end', chain.steps.length === 2 && chain.endToEnd.from === 0 && chain.endToEnd.to === 2)
}

mkdirSync(join(ROOT, 'checks', 'reports'), { recursive: true })
writeFileSync(join(ROOT, 'checks', 'reports', `records-${commit}.json`), JSON.stringify(report, null, 2) + '\n')
console.log(`\nfill rates vs predictions: ${report.mismatches.length} mismatch(es)${report.mismatches.length ? '\n  ' + report.mismatches.join('\n  ') : ''}`)
console.log(`→ checks/reports/records-${commit}.json`)

if (failed) { console.error(`\n${failed} claim-record check(s) failed.`); process.exit(1) }
console.log('\nClaim-record checks passed.')
