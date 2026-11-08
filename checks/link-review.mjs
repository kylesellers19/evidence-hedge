// ─────────────────────────────────────────────────────────────────────────────
// node checks/link-review.mjs — change set 4: Kyle hand-checks 50 sampled links.
//
// Writes a seeded random sample of 50 evidence links across Fixtures A–C:
//   checks/data/review/link-sample.csv   row_id, unit_id, fixture, page, sentence,
//     basis, anchor, target, confidence, correct (yes | no), notes
// Kyle fills `correct` in a copy at checks/data/review/labeled/link-sample.csv;
// when it exists this script reports link precision, overall and per basis →
// checks/reports/link-review-<engine commit>.json (numbers only).
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/corpus.mjs'
import { FIXTURES, runFixture } from './lib/fixtures.mjs'
import { engineCommit } from './lib/engine-rows.mjs'
import { REVIEW_DIR, LABELED_DIR, toCsv, parseCsv } from './lib/review.mjs'
import { mulberry32 } from './lib/metrics.mjs'

export const LINK_SAMPLE = 50          // PROVISIONAL — not ratified (handoff value)
export const LINK_SEED = 20261108      // PROVISIONAL — not ratified (date the sample was drawn)
const COLUMNS = ['row_id', 'unit_id', 'fixture', 'page', 'sentence', 'basis', 'anchor', 'target', 'confidence', 'correct', 'notes']

const targetText = (t) => ({
  reference: () => `reference #${t.index + 1}: ${t.text}`, 'unresolved-marker': () => `no matching reference entry${t.reason ? ` (${t.reason})` : ''}`,
  note: () => `note ${t.number}: ${t.text}`, 'own-study': () => `the document's own study (${t.design}): ${t.evidence}`, source: () => t.text,
  figure: () => t.label, url: () => t.url, 'same-sentence': () => `same-sentence ${t.type} token`, speaker: () => `speaker: ${t.name || 'unnamed'}`,
}[t.kind] || (() => t.kind))()

const commit = engineCommit()
const pool = []
for (const f of FIXTURES) {
  const run = await runFixture(f)
  if (run.status !== 'ok') { console.log(`SKIP ${f.id} — ${run.reason}`); continue }
  let ci = 0
  for (const u of run.units) {
    const c = run.analysis.claims[ci]
    if (!c || c.text !== u.text) continue
    ci++
    for (const l of c.evidence.links) pool.push({ u, l })
  }
}
const rand = mulberry32(LINK_SEED)
const order = pool.map((_, i) => i)
for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]] }
const sample = order.slice(0, LINK_SAMPLE).sort((a, b) => a - b).map((i) => pool[i])
const rows = sample.map(({ u, l }, k) => ({
  row_id: `link-${String(k + 1).padStart(3, '0')}`, unit_id: u.id, fixture: u.fixture, page: u.page ?? '', sentence: u.text,
  basis: l.basis, anchor: l.anchor, target: targetText(l.target), confidence: l.confidence, correct: '', notes: '',
}))
mkdirSync(LABELED_DIR, { recursive: true })
writeFileSync(join(REVIEW_DIR, 'link-sample.csv'), toCsv(rows, COLUMNS))
const byBasis = {}
for (const r of rows) byBasis[r.basis] = (byBasis[r.basis] || 0) + 1
console.log(`link sample: ${rows.length} of ${pool.length} links (seed ${LINK_SEED}) → checks/data/review/link-sample.csv ${JSON.stringify(byBasis)}`)

const report = { engine_commit: commit, label_tier: 'gold', source: 'fixtures A–C (link sample)', split: 'fixture-sample', seed: LINK_SEED, pool: pool.length, sampleByBasis: byBasis }
const labeledPath = join(LABELED_DIR, 'link-sample.csv')
if (!existsSync(labeledPath)) {
  report.status = 'pending'
  report.reason = 'no labeled file at checks/data/review/labeled/link-sample.csv'
  console.log('PENDING link sample — not labeled yet')
} else {
  const judged = parseCsv(readFileSync(labeledPath, 'utf8')).filter((r) => ['yes', 'no'].includes(String(r.correct).trim().toLowerCase()))
  const ok = (r) => r.correct.trim().toLowerCase() === 'yes'
  report.status = 'ok'
  report.rows = judged.length
  report.precision = judged.length ? +(judged.filter(ok).length / judged.length).toFixed(3) : null
  report.perBasis = {}
  for (const b of new Set(judged.map((r) => r.basis))) {
    const set = judged.filter((r) => r.basis === b)
    report.perBasis[b] = { rows: set.length, precision: +(set.filter(ok).length / set.length).toFixed(3) }
  }
  console.log(`link precision ${report.precision} on ${judged.length} judged links`)
}
mkdirSync(join(ROOT, 'checks', 'reports'), { recursive: true })
writeFileSync(join(ROOT, 'checks', 'reports', `link-review-${commit}.json`), JSON.stringify(report, null, 2) + '\n')
