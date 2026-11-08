// ─────────────────────────────────────────────────────────────────────────────
// node checks/gold-records.mjs — change set 5, Part F: Kyle's POTATO-coded claim
// records (tier gold), against the engine's records on the same units.
//
// Reads checks/data/gold/claim-records.jsonl (the research repo's
// annotation/potato_to_records.py output, copied here) and, per field, reports
// agreement between gold and the engine's predicted value on units both have:
// causal strength (0–3), attribution, the three scope markers; certainty by
// rank correlation (gold is Pei & Jurgens' 1–6, the engine's four tiers). An
// adjudicated record wins over a coder's. Pending until the file exists.
// Writes checks/reports/gold-records-<engine commit>.json (numbers only).
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/corpus.mjs'
import { DATA, FIXTURES, runFixture } from './lib/fixtures.mjs'
import { engineCommit } from './lib/engine-rows.mjs'
import { spearman } from './lib/metrics.mjs'
import { buildClaimRecord, SCOPE_MARKERS } from '../src/engine/claimRecord.js'

const commit = engineCommit()
const path = join(DATA, 'gold', 'claim-records.jsonl')
const report = { engine_commit: commit, label_tier: 'gold vs predicted', source: 'POTATO claim-record coding', split: 'coded items' }
if (!existsSync(path)) {
  report.status = 'pending'
  report.reason = 'no checks/data/gold/claim-records.jsonl (Kyle codes items in POTATO; the research repo converts the export)'
  console.log(`PENDING gold records — ${report.reason}`)
} else {
  const rows = readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const gold = new Map()
  for (const r of rows) if (!gold.has(r.unit_id) || r.coder === 'adjudicated') gold.set(r.unit_id, r)
  const engine = new Map()
  for (const f of FIXTURES) {
    const run = await runFixture(f)
    if (run.status !== 'ok') continue
    let ci = 0
    for (const u of run.units) {
      const c = run.analysis.claims[ci]
      if (!c || c.text !== u.text) continue
      ci++
      if (gold.has(u.id)) engine.set(u.id, buildClaimRecord(c, { profile: run.analysis.profile, design: run.analysis.profile.design }))
    }
  }
  const shared = [...gold.keys()].filter((id) => engine.has(id))
  const agreeOn = (field) => {
    const both = shared.filter((id) => gold.get(id)[field]?.status === 'resolved' && engine.get(id)[field]?.status === 'resolved')
    return { rows: both.length, agreement: both.length ? +(both.filter((id) => gold.get(id)[field].value === engine.get(id)[field].value).length / both.length).toFixed(3) : null }
  }
  report.status = 'ok'
  report.rows = rows.length
  report.units = gold.size
  report.sharedWithEngine = shared.length
  report.fields = { causal_strength: agreeOn('causal_strength'), attribution: agreeOn('attribution'), ...Object.fromEntries(SCOPE_MARKERS.map((m) => [m, agreeOn(m)])) }
  const cert = shared.filter((id) => gold.get(id).certainty?.status === 'resolved')
  report.fields.certainty = { rows: cert.length, spearman: cert.length > 2 ? spearman(cert.map((id) => engine.get(id).certainty.rank), cert.map((id) => gold.get(id).certainty.value)) : null }
  console.log(`gold records: ${gold.size} units, ${shared.length} shared with the engine; ${JSON.stringify(report.fields)}`)
}
mkdirSync(join(ROOT, 'checks', 'reports'), { recursive: true })
writeFileSync(join(ROOT, 'checks', 'reports', `gold-records-${commit}.json`), JSON.stringify(report, null, 2) + '\n')
