// ─────────────────────────────────────────────────────────────────────────────
// node checks/benchmark-compare.mjs <old commit> <new commit> — two benchmark
// runs side by side (change sets 3 and 4: "Change set 1's benchmark re-runs,
// old and new side by side").
//
// Reads checks/reports/benchmark-<commit>.json for both engine commits and
// writes checks/reports/benchmark-compare-<old>-<new>.md: every metric with its
// source, split, rows and label tier, the old and new values, and the change;
// then each fixture's route, claims, flags, score and signals. Numbers only.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/corpus.mjs'

const [oldC, newC] = process.argv.slice(2)
if (!oldC || !newC) { console.error('usage: node checks/benchmark-compare.mjs <old commit> <new commit>'); process.exit(2) }
const load = (c) => {
  const p = join(ROOT, 'checks', 'reports', `benchmark-${c}.json`)
  if (!existsSync(p)) { console.error(`missing ${p} — run node checks/benchmark.mjs on engine ${c}`); process.exit(2) }
  return JSON.parse(readFileSync(p, 'utf8'))
}
const A = load(oldC)
const B = load(newC)
const keyOf = (m) => [m.check, m.source, m.split, m.metric, String(m.system || '').replace(/@.*/, '@')].join(' | ')
const fmt = (v) => (v == null ? '—' : typeof v === 'number' ? String(+v.toFixed(4)) : String(v))
const delta = (a, b) => (typeof a === 'number' && typeof b === 'number' ? +(b - a).toFixed(4) : null)

const rows = new Map()
for (const m of A.metrics) rows.set(keyOf(m), { m, a: m.value, b: undefined, rowsA: m.rows, rowsB: undefined })
for (const m of B.metrics) {
  const k = keyOf(m)
  const r = rows.get(k) || { m, a: undefined, rowsA: undefined }
  rows.set(k, { ...r, m, b: m.value, rowsB: m.rows })
}

const L = [`# Benchmark: engine ${oldC} vs ${newC}`, '', `Generated ${new Date().toISOString().slice(0, 10)}. Source, split, rows and label tier come from the new run where both have the metric.`, '',
  '| Check | Source | Split | Rows (old → new) | Tier | Metric | Old | New | Change |', '|---|---|---|---|---|---|---|---|---|']
let changed = 0
for (const { m, a, b, rowsA, rowsB } of rows.values()) {
  const d = delta(a, b)
  const moved = a !== b && !(a == null && b == null)
  if (moved) changed++
  L.push(`| ${m.check} | ${m.source} | ${m.split} | ${fmt(rowsA)} → ${fmt(rowsB)} | ${m.label_tier} | ${m.metric}${m.system && !String(m.system).startsWith('engine') ? ` (${m.system})` : ''} | ${fmt(a)} | ${fmt(b)} | ${moved ? (d != null ? (d > 0 ? '+' : '') + d : 'changed') : ''} |`)
}
L.push('', '## Fixtures', '')
for (const id of new Set([...Object.keys(A.fixtures || {}), ...Object.keys(B.fixtures || {})])) {
  const fa = A.fixtures?.[id] || {}
  const fb = B.fixtures?.[id] || {}
  L.push(`### ${id}`, '', '| Field | Old | New |', '|---|---|---|')
  for (const f of ['claims', 'score']) L.push(`| ${f} | ${fmt(fa[f])} | ${fmt(fb[f])} |`)
  L.push(`| flags | ${JSON.stringify(fa.flagCounts || {})} | ${JSON.stringify(fb.flagCounts || {})} |`)
  L.push(`| route | ${fa.route ? `${fa.route.rubric} · ${fa.route.posture}` : '—'} | ${fb.route ? `${fb.route.rubric} · ${fb.route.posture}` : '—'} |`)
  L.push(`| signals | ${(fa.signals || []).join(', ')} | ${(fb.signals || []).join(', ')} |`, '')
}
const out = join(ROOT, 'checks', 'reports', `benchmark-compare-${oldC}-${newC}.md`)
writeFileSync(out, L.join('\n') + '\n')
console.log(`${rows.size} metrics, ${changed} changed → checks/reports/benchmark-compare-${oldC}-${newC}.md`)
