// ─────────────────────────────────────────────────────────────────────────────
// node checks/fixture-review.mjs — change set 1, Part C: write the review rows.
//
// Reads the Part A export for this engine commit (run checks/export-units.mjs
// first) and writes, per fixture, into the gitignored checks/data/review/:
//   <fixture>.csv  <fixture>-signals.csv  <fixture>.meta.json
// Label a copy at checks/data/review/labeled/<fixture>.csv, then run
// node checks/fixture-review-score.mjs. Column meanings: checks/lib/review.mjs.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { DATA, FIXTURES } from './lib/fixtures.mjs'
import { engineCommit } from './lib/engine-rows.mjs'
import { REVIEW_DIR, COLUMNS, reviewRows, signalRows, toCsv } from './lib/review.mjs'

const readJsonl = (p) => readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const commit = engineCommit()
mkdirSync(join(REVIEW_DIR, 'labeled'), { recursive: true })

for (const f of FIXTURES) {
  const unitsPath = join(DATA, 'units', `${f.id}.jsonl`)
  const enginePath = join(DATA, 'engine', commit, `${f.id}.jsonl`)
  if (!existsSync(unitsPath) || !existsSync(enginePath)) { console.log(`SKIP ${f.id} — no Part A export for ${commit}; run node checks/export-units.mjs`); continue }
  const units = readJsonl(unitsPath)
  const engine = readJsonl(enginePath)
  const doc = JSON.parse(readFileSync(join(DATA, 'engine', commit, `${f.id}.doc.json`), 'utf8'))
  const { table, meta } = reviewRows(f.id, units, engine)
  const signals = signalRows(f.id, doc, units)
  writeFileSync(join(REVIEW_DIR, `${f.id}.csv`), toCsv(table, COLUMNS))
  writeFileSync(join(REVIEW_DIR, `${f.id}-signals.csv`), toCsv(signals, ['fixture', 'signal_id', 'severity', 'span_index', 'span', 'unit_ids', 'summary']))
  writeFileSync(join(REVIEW_DIR, `${f.id}.meta.json`), JSON.stringify({ engine_commit: commit, ...meta }, null, 2) + '\n')
  console.log(`${f.label} ${f.id}: ${meta.flagRows} flag rows ${JSON.stringify(meta.flagRowsByType)}, ` +
    `${meta.sample} sampled of ${meta.unflaggedUnits} unflagged (${meta.sampleExtracted} extracted), ${signals.length} signal spans`)
}
