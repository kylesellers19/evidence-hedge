// ─────────────────────────────────────────────────────────────────────────────
// Routing vs the working gold labels (fixtures/corpus.json): rubric, posture,
// provenance and design, with a confusion matrix for the rubric.
//
//   node checks/routing.test.mjs            check (rubric ≥ ROUTING_MIN of the
//                                           documents available; posture-gate
//                                           silent on vendor survey, trade news
//                                           and the bot wall)
//   node checks/routing.test.mjs --initial  also freeze the pre-tuning matrix
//                                           (checks/routing-confusion-initial.json)
// Writes checks/routing-confusion.json. Missing documents print SKIP <id>.
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadCorpus, loadDocText } from './lib/corpus.mjs'
import { routeDocument } from '../src/rubrics/route.js'
import { analyze } from '../src/engine/analyze.js'
import { getRubric, RUBRIC_ORDER } from '../src/rubrics/index.js'
import { validateText } from '../src/ingest/validateText.js'

export const ROUTING_MIN = 11 / 14 // PROVISIONAL — the plan's "≥ 11 of 14"
let ok = true
const log = (label, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`) }

const rows = []
for (const doc of loadCorpus()) {
  const loaded = await loadDocText(doc)
  if (loaded.status !== 'ok') { console.log(`SKIP ${doc.id} — ${loaded.reason}`); continue }
  const r = routeDocument(loaded.text, { sourceUrl: doc.url || '' })
  rows.push({
    id: doc.id, gold: doc.gold,
    got: { rubric: r.rubric, posture: r.posture, provenance: r.profile.provenance.kind, design: r.profile.design.design },
    reasons: r.reasons,
  })
}

const confusion = Object.fromEntries(RUBRIC_ORDER.map((g) => [g, Object.fromEntries(RUBRIC_ORDER.map((p) => [p, 0]))]))
for (const r of rows) confusion[r.gold.rubric][r.got.rubric]++
const hit = (field) => rows.filter((r) => r.gold[field] === r.got[field]).length
const summary = {
  documents: rows.length,
  rubric: hit('rubric'), posture: rows.filter((r) => r.gold.rubric === r.got.rubric && r.gold.posture === r.got.posture).length,
  provenance: hit('provenance'), design: hit('design'),
  confusion,
  rows: rows.map((r) => ({ id: r.id, gold: r.gold, got: r.got })),
}
writeFileSync(join(ROOT, 'checks', 'routing-confusion.json'), JSON.stringify(summary, null, 2) + '\n')
if (process.argv.includes('--initial')) writeFileSync(join(ROOT, 'checks', 'routing-confusion-initial.json'), JSON.stringify(summary, null, 2) + '\n')

for (const r of rows) {
  const mark = (f) => (r.gold[f] === r.got[f] ? '' : '✗')
  console.log(`${r.id.padEnd(22)} rubric ${r.got.rubric.padEnd(10)}${mark('rubric').padEnd(2)} posture ${String(r.got.posture).padEnd(18)}${(r.gold.rubric === r.got.rubric && r.gold.posture === r.got.posture ? '' : '✗').padEnd(2)} prov ${r.got.provenance.padEnd(22)}${mark('provenance').padEnd(2)} design ${r.got.design.padEnd(24)}${mark('design')}`)
}
console.log('\nrubric confusion (rows gold → cols routed):')
console.log(' '.repeat(12) + RUBRIC_ORDER.map((p) => p.slice(0, 10).padStart(11)).join(''))
for (const g of RUBRIC_ORDER) console.log(g.padEnd(12) + RUBRIC_ORDER.map((p) => String(confusion[g][p]).padStart(11)).join(''))
console.log(`\nrubric ${summary.rubric}/${rows.length} · rubric+posture ${summary.posture}/${rows.length} · provenance ${summary.provenance}/${rows.length} · design ${summary.design}/${rows.length}`)

log(`rubric routed correctly on ≥ ${Math.ceil(ROUTING_MIN * rows.length)} of ${rows.length}`, summary.rubric >= Math.ceil(ROUTING_MIN * rows.length))

// The posture-gate must stay silent on a vendor survey page, trade news and the bot wall.
for (const id of ['gensler-gws-2024', 'bdc-gensler-news-2024', 'bdc-blog-allen', 'gba-news-2015']) {
  const doc = loadCorpus().find((d) => d.id === id)
  const loaded = await loadDocText(doc)
  if (loaded.status !== 'ok') { console.log(`SKIP ${id}`); continue }
  const fired = RUBRIC_ORDER.filter((rid) => {
    const rubric = getRubric(rid)
    return rubric.postures.some((p) => analyze(loaded.text, rubric, p, { sourceUrl: doc.url }).signals.some((s) => s.gate))
  })
  log(`posture-gate silent on ${id} under every rubric and posture`, fired.length === 0, fired.join(','))
}
const BOT_WALL = "Making sure you're not a bot!\n \nLoading...\nPlease wait a moment while we ensure the security of your connection."
log('the bot wall never reaches analyze() (validateText blocks it)', validateText(BOT_WALL, { path: 'link' }).reason === 'blocked')

if (!ok) { console.error('\nrouting checks failed.'); process.exit(1) }
console.log('\nRouting checks passed.')
process.exit(0)
