// ─────────────────────────────────────────────────────────────────────────────
// A proposed 1-to-10 scale, computed on a corpus run, beside the current score.
//
//   node scripts/score-scale.mjs --tag run7
//
// The proposal: weigh every claim at its standard's strictest setting (as the
// score does now). A claim holds when it carries no flag (unsupported,
// overconfident or causal overreach). The score is ten times the share of
// claims that hold, rounded to a whole number; each whole-document problem
// flagged (not a note) takes one point off, at most two; the floor is 1.
// Fewer than MIN_CLAIMS claims get no score. Reads gitignored data only.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../checks/lib/corpus.mjs'

const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? dflt : process.argv[i + 1] }
const TAG = arg('tag', 'run1')
const MIN_CLAIMS = Number(arg('min', 10))
const DOC_MAX = Number(arg('docmax', 2))
// How a plain statement that cites nothing counts against the score: as a full
// flag (the strictest setting's rule), as half, or not at all (the null-
// severity table's "note").
const PLAIN = arg('plain', 'full')
const PLAIN_WEIGHT = { full: 1, half: 0.5, none: 0 }[PLAIN]
const A = join(ROOT, 'checks', 'data', 'audit')
const rows = readFileSync(join(A, `ledger-${TAG}.jsonl`), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  .filter((r) => r.status === 'ok' && (!r.mode || r.mode === 'upload'))

export function proposed(r, d) {
  if (!r.claims) return { score: null, why: 'no claims' }
  if (r.claims < MIN_CLAIMS) return { score: null, why: 'too few claims' }
  const strict = d.strictPicked ? d.strictPicked.filter((p) => p.flag) : d.picked.filter((p) => p.flag)
  const weight = new Map()
  for (const p of strict) weight.set(p.i, p.flag === 'unsupported-assertion' && p.tier === 'measured' ? PLAIN_WEIGHT : 1)
  for (const p of d.picked.filter((x) => x.overreach)) weight.set(p.i, 1)
  const flagged = new Set([...weight.keys()])
  const hold = 1 - [...weight.values()].reduce((a, b) => a + b, 0) / r.claims
  const docFlags = (r.signals || []).filter((s) => s.endsWith(':flag')).length
  const base = Math.round(10 * hold)
  return { score: Math.max(1, base - Math.min(DOC_MAX, docFlags)), hold, flagged: flagged.size, docFlags, base }
}

const out = []
for (const r of rows) {
  const p = join(A, `details-${TAG}`, `${r.key}.json`)
  if (!existsSync(p)) continue
  out.push({ r, p: proposed(r, JSON.parse(readFileSync(p, 'utf8'))) })
}
const hist = (vals) => { const h = Array(11).fill(0); let none = 0; for (const v of vals) v == null ? none++ : h[Math.max(1, Math.round(v))]++; return { h: h.slice(1), none } }
const cur = hist(out.map((x) => x.r.score))
const pro = hist(out.map((x) => x.p.score))
const fmt = (o) => o.h.map((n) => String(n).padStart(4)).join('') + `   no score ${o.none}`
console.log(`${TAG}: ${out.length} documents; plain uncited statements count ${PLAIN}`)
console.log('score       ' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => String(n).padStart(4)).join(''))
console.log('current     ' + fmt(cur))
console.log('proposed    ' + fmt(pro))
const byStd = {}
for (const x of out) { const k = x.r.rubric?.standard || x.r.rubric?.id || '?'; (byStd[k] ||= []).push(x.p.score) }
for (const [k, v] of Object.entries(byStd)) {
  const s = v.filter((x) => x != null).sort((a, b) => a - b)
  console.log(`  ${k.padEnd(11)} ${String(v.length).padStart(5)} docs, median ${s[Math.floor(s.length / 2)]}, no score ${v.filter((x) => x == null).length}`)
}

// --examples: two documents at each proposed score, with what decided it.
if (process.argv.includes('--examples')) {
  for (let n = 1; n <= 10; n++) {
    const at = out.filter((x) => x.p.score === n)
    for (const x of at.filter((_, i) => i % Math.max(1, Math.floor(at.length / 2)) === 0).slice(0, 2)) {
      console.log(`${n} (was ${Math.round(x.r.score)})  ${x.r.id}  ${x.r.claims} claims, ${x.p.flagged} flagged, holds ${(x.p.hold * 100).toFixed(0)}%, doc problems ${x.p.docFlags}  ${x.r.rubric.judgedAs}`)
    }
  }
}
