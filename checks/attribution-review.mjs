// ─────────────────────────────────────────────────────────────────────────────
// node checks/attribution-review.mjs — change set 3, Part D.
//
// Writes a seeded random sample of 100 extracted claims across Fixtures A–C
// for Kyle to label blind (the engine's label is NOT in the labeling file):
//   checks/data/review/attribution-sample.csv       row_id, unit_id, fixture,
//     page, section, before (the previous sentence, for context), sentence,
//     gold_label, builds_on, notes
//   checks/data/review/attribution-sample.key.json  the engine's labels
// Kyle labels a copy at checks/data/review/labeled/attribution-sample.csv with
// one of: own-current own-prior cited-other quoted unattributed undetermined.
// When that file exists, this script scores it: confusion matrix, accuracy per
// label, undetermined rate → checks/reports/attribution-<engine commit>.json
// (numbers only).
// The UnScientify disagreement list (research repo, Part E) is reviewed
// separately, so this sample stays unbiased.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/corpus.mjs'
import { FIXTURES, runFixture } from './lib/fixtures.mjs'
import { engineCommit, unitAttribution } from './lib/engine-rows.mjs'
import { REVIEW_DIR, LABELED_DIR, toCsv, parseCsv } from './lib/review.mjs'
import { mulberry32, multiclass } from './lib/metrics.mjs'
import { ATTRIBUTION_LABELS } from '../src/engine/attribution.js'

export const ATTRIBUTION_SAMPLE = 100       // PROVISIONAL — not ratified (handoff value)
export const ATTRIBUTION_SEED = 20261108    // PROVISIONAL — not ratified (date the sample was drawn)
const COLUMNS = ['row_id', 'unit_id', 'fixture', 'page', 'section', 'before', 'sentence', 'gold_label', 'builds_on', 'notes']

const commit = engineCommit()
const pool = []
for (const f of FIXTURES) {
  const run = await runFixture(f)
  if (run.status !== 'ok') { console.log(`SKIP ${f.id} — ${run.reason}`); continue }
  const att = unitAttribution(run)
  const claimText = new Set(run.analysis.claims.map((c) => c.text))
  run.units.forEach((u, i) => {
    if (!claimText.has(u.text)) return
    pool.push({ u, before: i > 0 ? run.units[i - 1].text : '', engine: att[i] })
  })
}

// Seeded Fisher–Yates over the pool in unit order, first N.
const rand = mulberry32(ATTRIBUTION_SEED)
const order = pool.map((_, i) => i)
for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]] }
const sample = order.slice(0, ATTRIBUTION_SAMPLE).sort((a, b) => a - b).map((i) => pool[i])

mkdirSync(LABELED_DIR, { recursive: true })
const rows = sample.map(({ u, before }, k) => ({
  row_id: `att-${String(k + 1).padStart(3, '0')}`, unit_id: u.id, fixture: u.fixture, page: u.page ?? '', section: u.section ?? '',
  before, sentence: u.text, gold_label: '', builds_on: '', notes: '',
}))
writeFileSync(join(REVIEW_DIR, 'attribution-sample.csv'), toCsv(rows, COLUMNS))
const key = Object.fromEntries(sample.map(({ u, engine }, k) => [rows[k].row_id, { unit_id: u.id, label: engine.label, confidence: engine.confidence, cues: engine.cues.map((c) => c.cue), reason: engine.reason || null }]))
writeFileSync(join(REVIEW_DIR, 'attribution-sample.key.json'), JSON.stringify({ engine_commit: commit, seed: ATTRIBUTION_SEED, pool: pool.length, rows: key }, null, 2) + '\n')
const byLabel = {}
for (const { engine } of sample) byLabel[engine.label] = (byLabel[engine.label] || 0) + 1
console.log(`attribution sample: ${rows.length} of ${pool.length} claims (seed ${ATTRIBUTION_SEED}) → checks/data/review/attribution-sample.csv; engine labels in the sample ${JSON.stringify(byLabel)}`)

// Score, when labeled.
const labeledPath = join(LABELED_DIR, 'attribution-sample.csv')
const report = { engine_commit: commit, label_tier: 'gold', source: 'fixtures A–C (attribution sample)', split: 'fixture-sample', seed: ATTRIBUTION_SEED, pool: pool.length }
if (!existsSync(labeledPath)) {
  report.status = 'pending'
  report.reason = 'no labeled file at checks/data/review/labeled/attribution-sample.csv'
  console.log('PENDING attribution sample — not labeled yet')
} else {
  const labeled = parseCsv(readFileSync(labeledPath, 'utf8')).filter((r) => ATTRIBUTION_LABELS.includes(String(r.gold_label).trim().toLowerCase()))
  const pairs = labeled.map((r) => ({ gold: r.gold_label.trim().toLowerCase(), pred: key[r.row_id]?.label })).filter((p) => p.pred)
  const m = multiclass(pairs, ATTRIBUTION_LABELS)
  const kept = pairs.filter((p) => p.pred !== 'undetermined')
  report.status = 'ok'
  report.rows = pairs.length
  report.confusion = m.confusion
  report.perLabel = m.perClass
  report.accuracy = m.accuracy
  report.macroF1 = m.macroF1
  report.undeterminedRate = pairs.length ? +(pairs.filter((p) => p.pred === 'undetermined').length / pairs.length).toFixed(3) : null
  report.accuracyWhenDetermined = kept.length ? +(kept.filter((p) => p.pred === p.gold).length / kept.length).toFixed(3) : null
  console.log(`attribution: ${pairs.length} labeled, accuracy ${m.accuracy}, macro-F1 ${m.macroF1}, undetermined ${report.undeterminedRate}`)
}
mkdirSync(join(ROOT, 'checks', 'reports'), { recursive: true })
writeFileSync(join(ROOT, 'checks', 'reports', `attribution-${commit}.json`), JSON.stringify(report, null, 2) + '\n')
