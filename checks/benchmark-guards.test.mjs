// ─────────────────────────────────────────────────────────────────────────────
// node checks/benchmark-guards.test.mjs — the copies and mappings the benchmark
// rests on (change set 1).
//
//   1. Units: on every corpus document that loads, and on Fixture C, the claims
//      analyze() returns are, in order, a subsequence of the units built by the
//      copied splitter (checks/lib/units.mjs). Fails the moment the copy and
//      extractClaims drift apart.
//   2. Yu partition: the copy of the tuning split (checks/lib/yu-partition.mjs)
//      reproduces checks/causal-register-eval.json — sizes and both confusion
//      matrices, exactly.
//   3. Mappings cover the engine's labels exactly (checks/lib/mapping.mjs).
//   4. trained_on coverage follows its grammar (checks/lib/predictions.mjs).
//   5. Review CSVs round-trip through the parser (when Part C has been exported).
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadCorpus, loadDocText } from './lib/corpus.mjs'
import { FIXTURES, runFixture } from './lib/fixtures.mjs'
import { buildUnits } from './lib/units.mjs'
import { yuEnginePartition } from './lib/yu-partition.mjs'
import { multiclass } from './lib/metrics.mjs'
import { REGISTER_STRENGTH, YU_UPSTREAM_CLASS, TIER_RANK } from './lib/mapping.mjs'
import { covers } from './lib/predictions.mjs'
import { REVIEW_DIR, COLUMNS, parseCsv, toCsv } from './lib/review.mjs'
import { routeDocument } from '../src/rubrics/route.js'
import { analyze } from '../src/engine/analyze.js'
import { causalRegister, REGISTERS } from '../src/engine/measure/causalRegister.js'
import { TIERS } from '../src/engine/measure/certainty.js'

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS ✅' : 'FAIL ❌'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) failed++
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// 1. Units vs. extractClaims
function subsequence(claims, units) {
  let i = 0
  for (const u of units) if (i < claims.length && claims[i].text === u.text) i++
  return i === claims.length ? null : claims[i].text
}
for (const doc of loadCorpus()) {
  const loaded = await loadDocText(doc)
  if (loaded.status !== 'ok') { console.log(`SKIP ${doc.id} — ${loaded.reason}`); continue }
  const route = routeDocument(loaded.text, { sourceUrl: doc.url || '' })
  const a = analyze(loaded.text, route.judgment.rubric, route.posture, { sourceUrl: doc.url || '' })
  const stray = subsequence(a.claims, buildUnits(doc.id, loaded.text, null))
  check(`units cover every claim, in order [${doc.id}]`, stray === null, stray ? `not a unit: "${stray.slice(0, 80)}"` : `${a.claims.length} claims`)
}
const c = await runFixture(FIXTURES.find((f) => f.label === 'C'))
if (c.status !== 'ok') console.log(`SKIP fixture C — ${c.reason}`)
else {
  const stray = subsequence(c.analysis.claims, c.units)
  check('units cover every claim, in order [fixture C]', stray === null, stray ? `not a unit: "${stray.slice(0, 80)}"` : `${c.analysis.claims.length} claims`)
}

// 2. Yu partition reproduces the recorded evaluation
const part = yuEnginePartition()
if (part.status !== 'ok') console.log(`SKIP yu partition — ${part.reason}`)
else {
  const recorded = JSON.parse(readFileSync(join(ROOT, 'checks', 'causal-register-eval.json'), 'utf8'))
  for (const [name, set] of [['development', part.development], ['heldOut', part.heldOut]]) {
    const m = multiclass(set.map((r) => ({ gold: r.gold, pred: causalRegister(r.text).register })), REGISTERS)
    check(`yu partition ${name} reproduces causal-register-eval.json`, m.n === recorded[name].n && same(m.confusion, recorded[name].confusion),
      `n=${m.n} (recorded ${recorded[name].n}), macro-F1 ${m.macroF1} (recorded ${recorded[name].macroF1})`)
  }
}

// 3. Mappings
check('REGISTER_STRENGTH covers the engine registers, ranked 0–3', same(Object.keys(REGISTER_STRENGTH), REGISTERS) && same(Object.values(REGISTER_STRENGTH), [0, 1, 2, 3]))
check('YU_UPSTREAM_CLASS is a permutation of the registers', same(Object.values(YU_UPSTREAM_CLASS).sort(), [...REGISTERS].sort()))
check('TIER_RANK covers the shared tiers in weight order', same(Object.entries(TIER_RANK).map(([k, v]) => [k, v]), TIERS.map((t) => [t.key, t.weight])))

// 4. trained_on grammar
const t = { source: 'yu2019_pubmed', split: 'test' }
check('trained_on: a bare source covers its rows', covers(['yu2019_pubmed'], t))
check('trained_on: source:split covers only that split', covers(['yu2019_pubmed:test'], t) && !covers(['yu2019_pubmed:train'], t))
check('trained_on: out-of-fold covers nothing', !covers(['yu2019_pubmed:out-of-fold'], t))
check('trained_on: UniCausal covers cessc_general', covers(['UniCausal'], { source: 'cessc_general', split: 'train' }))
check('trained_on: UniCausal does not cover cessc_ssc', !covers(['UniCausal'], { source: 'cessc_ssc', split: 'test' }))
const pub = { source: 'pei2021', split: 'train', originalSplit: 'test', originalSplitAspect: 'train' }
check('trained_on: original-<split> follows the published split, not the regrouped one', covers(['pei2021:original-test'], pub) && !covers(['pei2021:original-train'], pub))
check('trained_on: original-aspect-<split> follows the aspect files\' split', covers(['pei2021:original-aspect-train'], pub) && !covers(['pei2021:original-aspect-test'], pub))
check('trained_on: an unknown published split counts as covered', covers(['pei2021:original-train'], { source: 'pei2021', split: 'test', originalSplit: null }))

// 5. Review CSV round trip
for (const f of FIXTURES) {
  const p = join(REVIEW_DIR, `${f.id}.csv`)
  if (!existsSync(p)) continue
  const text = readFileSync(p, 'utf8')
  check(`review CSV round-trips [${f.id}]`, toCsv(parseCsv(text), COLUMNS) === text)
}

if (failed) { console.error(`\n${failed} benchmark guard(s) failed.`); process.exit(1) }
console.log('\nBenchmark guards passed.')
