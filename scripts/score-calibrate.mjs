// ─────────────────────────────────────────────────────────────────────────────
// How closely each candidate scale matches what reviewers judged fair.
//
//   node scripts/score-calibrate.mjs --tag run7
//
// Target per document: the reviewer's own fair score where the verdict gives a
// number (LOW, HIGH and many others), else the score shown at baseline when
// the reviewer did not call it too low or too high. Candidates: the current
// formula, and the share-that-holds scale with a plain uncited statement
// weighted 1, 0.75, 0.5, 0.25 or 0. Reads gitignored data only.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../checks/lib/corpus.mjs'

const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? dflt : process.argv[i + 1] }
const TAG = arg('tag', 'run7')
const A = join(ROOT, 'checks', 'data', 'audit')
const rd = (t) => readFileSync(join(A, `ledger-${t}.jsonl`), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => r.status === 'ok' && (!r.mode || r.mode === 'upload'))
const base = new Map(rd('run1').map((r) => [r.id, r]))
const rows = rd(TAG)
const verdicts = new Map()
for (const f of readdirSync(join(A, 'reviews-run1')).filter((f) => f.endsWith('.jsonl')).sort()) {
  for (const l of readFileSync(join(A, 'reviews-run1', f), 'utf8').split('\n').filter(Boolean)) { try { const v = JSON.parse(l); verdicts.set(v.id, v) } catch {} }
}
// The reviewer's fair score, as scripts/audit-report.mjs reads it.
const NUM = String.raw`(\d+(?:\.\d+)?)(?!\.?\d)`
const NOT_SCORE = String.raw`(?!\s*(?:%|points?|high|low|lines?|junk|of|claims|flags|words|times|x\b|pages|percent|per cent))`
const PATTERNS = [
  new RegExp(String.raw`(?:about|near|nearer|closer to|roughly|around|perhaps|maybe|at|be|is|sit nearer)\s+${NUM}\s*(?:to|-|–)\s*${NUM}${NOT_SCORE}`, 'gi'),
  new RegExp(String.raw`(?:about|near|nearer|closer to|roughly|around|perhaps|maybe|fairer at|fair at|would be)\s+${NUM}${NOT_SCORE}`, 'gi'),
  new RegExp(String.raw`${NUM}\s*(?:to|-|–)\s*${NUM}\s+on my read`, 'gi'),
  new RegExp(String.raw`${NUM}\s+on my read`, 'gi'),
]
const fairOf = (s) => { for (const re of PATTERNS) for (const m of String(s || '').matchAll(re)) { const a = Number(m[1]); const b = m[2] != null ? Number(m[2]) : a; if (a >= 1 && a <= 10 && b >= 1 && b <= 10) return (a + b) / 2 } return null }
const codes = (v) => (v?.codes || []).map((c) => c.code)

function share(r, d, plain) {
  if (plain === "engine") return r.score
  if (!r.claims || r.claims < 10) return null
  const strict = d.strictPicked ? d.strictPicked.filter((p) => p.flag) : d.picked.filter((p) => p.flag)
  const w = new Map()
  for (const p of strict) w.set(p.i, p.flag === 'unsupported-assertion' && p.tier === 'measured' ? plain : 1)
  for (const p of d.picked.filter((x) => x.overreach)) w.set(p.i, 1)
  const hold = 1 - [...w.values()].reduce((a, b) => a + b, 0) / r.claims
  const docFlags = (r.signals || []).filter((s) => s.endsWith(':flag')).length
  return Math.max(1, Math.round(10 * hold) - Math.min(2, docFlags))
}

const cands = { current: null, engine: 'engine', 'plain 1': 1, 'plain 0.75': 0.75, 'plain 0.5': 0.5, 'plain 0.25': 0.25, 'plain 0': 0 }
const err = Object.fromEntries(Object.keys(cands).map((k) => [k, { n: 0, abs: 0, signed: 0, within1: 0 }]))
let targets = 0
for (const r of rows) {
  const v = verdicts.get(r.id); const b = base.get(r.id)
  if (!v || !b) continue
  const stated = fairOf(v.fair)
  const target = stated ?? (codes(v).includes('LOW') || codes(v).includes('HIGH') ? null : b.score)
  if (target == null) continue
  const p = join(A, `details-${TAG}`, `${r.key}.json`)
  if (!existsSync(p)) continue
  const d = JSON.parse(readFileSync(p, 'utf8'))
  targets++
  for (const [k, plain] of Object.entries(cands)) {
    const s = plain == null ? r.score : share(r, d, plain)
    if (s == null) continue
    const e = s - target
    err[k].n++; err[k].abs += Math.abs(e); err[k].signed += e; if (Math.abs(e) <= 1) err[k].within1++
  }
}
console.log(`${TAG}: ${targets} documents with a reviewer target`)
for (const [k, e] of Object.entries(err)) console.log(`${k.padEnd(12)} mean miss ${(e.abs / e.n).toFixed(2)}  bias ${(e.signed / e.n >= 0 ? '+' : '') + (e.signed / e.n).toFixed(2)}  within 1 point ${((e.within1 / e.n) * 100).toFixed(0)}%  (n ${e.n})`)
