// ─────────────────────────────────────────────────────────────────────────────
// Corpus audit — every available corpus document through routing, then all four
// rubrics, each under the posture classifyPosture picks for that rubric.
// Writes checks/corpus-audit-output.json (numbers only; no document text, D4).
//
//   node checks/corpus-audit.mjs            audit + compare to the frozen before
//   node checks/corpus-audit.mjs --before   also freeze checks/corpus-audit-before.json
//
// The before-snapshot (pre-measurement-validity engine) is the reference for the
// report's before/after matrix and rubric spread.
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadCorpus, loadDocText } from './lib/corpus.mjs'
import { autodetect, getRubric, RUBRIC_ORDER } from '../src/rubrics/index.js'
import { classifyPosture } from '../src/engine/classifyPosture.js'
import { analyze } from '../src/engine/analyze.js'

const OUT = join(ROOT, 'checks', 'corpus-audit-output.json')
const BEFORE = join(ROOT, 'checks', 'corpus-audit-before.json')
const FREEZE = process.argv.includes('--before')

// Optional modules that later builds add; absent in the before-snapshot.
const optional = async (path, name) => { try { return (await import(path))[name] } catch { return null } }
const validateText = await optional('../src/ingest/validateText.js', 'validateText')
const routeDocument = await optional('../src/engine/profile/route.js', 'routeDocument')

const out = { engine: process.env.ENGINE_VERSION || 'working-tree', docs: {} }
for (const doc of loadCorpus()) {
  const loaded = await loadDocText(doc)
  if (loaded.status !== 'ok') { console.log(`SKIP ${doc.id} — ${loaded.reason}`); continue }
  const text = loaded.text
  const row = { gold: doc.gold, words: text.trim().split(/\s+/).length }
  if (validateText) {
    const v = validateText(text, { path: loaded.via === 'reader' ? 'link' : 'paste' })
    row.validation = v.ok ? 'ok' : v.reason
    if (!v.ok) { out.docs[doc.id] = row; console.log(`${doc.id}: ${v.reason} — not analyzed`); continue }
  }
  if (routeDocument) {
    const route = routeDocument(text)
    row.route = { rubric: route.rubric, posture: route.posture, provenance: route.profile.provenance.kind, design: route.profile.design.design }
  } else {
    row.route = { rubric: autodetect(text) }
  }
  row.rubrics = {}
  for (const id of RUBRIC_ORDER) {
    const rubric = getRubric(id)
    const { posture } = classifyPosture(text, rubric)
    const a = analyze(text, rubric, posture)
    const fc = a.summary.flagCounts
    row.rubrics[id] = {
      posture,
      score: a.documentScore.score,
      claims: a.summary.totalClaims,
      strong: a.summary.strongClaims,
      unsupported: fc['unsupported-assertion'],
      overconfident: fc.overconfident,
      ...(fc['causal-overreach'] !== undefined ? { causalOverreach: fc['causal-overreach'] } : {}),
      gate: a.signals.some((s) => s.gate),
      signals: a.signals.map((s) => s.id),
    }
  }
  const scores = Object.values(row.rubrics).map((r) => r.score)
  row.spread = Math.round((Math.max(...scores) - Math.min(...scores)) * 10) / 10
  out.docs[doc.id] = row
  const r = row.rubrics
  console.log(`${doc.id.padEnd(22)} route=${row.route.rubric.padEnd(10)} ` +
    RUBRIC_ORDER.map((id) => `${id.slice(0, 4)}(${r[id].posture}) ${r[id].score}/${r[id].claims}c`).join('  ') + `  spread ${row.spread}`)
}

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
if (FREEZE) { writeFileSync(BEFORE, JSON.stringify(out, null, 2) + '\n'); console.log('\nFROZE checks/corpus-audit-before.json') }
console.log('\nwrote checks/corpus-audit-output.json')
