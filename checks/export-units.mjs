// ─────────────────────────────────────────────────────────────────────────────
// node checks/export-units.mjs [--out <dir>] — change set 1, Part A.
//
// For each fixture (A CADRE, B Pew report, C Gensler Fandom Effect):
//   <out>/units/<fixture>.jsonl                one row per sentence unit
//   <out>/engine/<commit>/<fixture>.jsonl      the engine's output per unit
//   <out>/engine/<commit>/<fixture>.doc.json   routing, profile, counts, signals
// and across all fixtures:
//   <out>/engine/<commit>/attribution.jsonl    attribution per unit (change set 3)
// <out> defaults to checks/data/ (gitignored: the units carry document text).
// Output is deterministic: two exports of the same commit are byte-identical
// (checks/benchmark-verify.mjs holds this).
// ─────────────────────────────────────────────────────────────────────────────

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA, FIXTURES, runFixture } from './lib/fixtures.mjs'
import { engineCommit, engineRows, docSummary, unitAttribution } from './lib/engine-rows.mjs'

const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null }
const OUT = arg('--out') || DATA
const jsonl = (rows) => rows.map((r) => JSON.stringify(r)).join('\n') + '\n'

const commit = engineCommit()
mkdirSync(join(OUT, 'units'), { recursive: true })
mkdirSync(join(OUT, 'engine', commit), { recursive: true })

const attributionRows = []
for (const f of FIXTURES) {
  const run = await runFixture(f)
  if (run.status !== 'ok') { console.log(`SKIP ${f.id} — ${run.reason}`); continue }
  const claimText = new Set(run.analysis.claims.map((c) => c.text))
  unitAttribution(run).forEach((a, i) => attributionRows.push({
    unit_id: run.units[i].id, fixture: f.id, engine_commit: commit, label_tier: 'predicted', extracted: claimText.has(run.units[i].text), ...a,
  }))
  const units = run.units.map(({ id, fixture, page, index, hash, text, section, pageReason, pageBasis }) =>
    ({ id, fixture, page, index, hash, text, section, ...(pageReason ? { page_reason: pageReason } : {}), ...(pageBasis ? { page_basis: pageBasis } : {}) }))
  writeFileSync(join(OUT, 'units', `${f.id}.jsonl`), jsonl(units))
  writeFileSync(join(OUT, 'engine', commit, `${f.id}.jsonl`), jsonl(engineRows(run, commit)))
  writeFileSync(join(OUT, 'engine', commit, `${f.id}.doc.json`), JSON.stringify(docSummary(run, commit), null, 2) + '\n')
  const located = units.filter((u) => u.page != null).length
  const byWindow = units.filter((u) => u.page_basis).length
  console.log(`${f.label} ${f.id}: ${units.length} units (${located} placed on a page, ${byWindow} of them by a later window), ` +
    `${run.analysis.summary.totalClaims} claims → engine/${commit}/`)
}
writeFileSync(join(OUT, 'engine', commit, 'attribution.jsonl'), jsonl(attributionRows))
console.log(`attribution: ${attributionRows.length} units → engine/${commit}/attribution.jsonl`)
