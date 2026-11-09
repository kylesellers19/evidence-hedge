// ─────────────────────────────────────────────────────────────────────────────
// The labeled junk set: every claim line a reviewer cited as page furniture
// (INGEST) or as not a claim (CLAIM), with its text, from the review verdicts
// and the per-document details. Used to design and measure the ingest and
// claim filters; gitignored output only (checks/data/audit/junk-<tag>.jsonl).
//
//   node scripts/audit-junk.mjs --tag run1
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../checks/lib/corpus.mjs'

const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? dflt : process.argv[i + 1] }
const TAG = arg('tag', 'run1')
const A = join(ROOT, 'checks', 'data', 'audit')
const rows = new Map(readFileSync(join(A, `ledger-${TAG}.jsonl`), 'utf8').trim().split('\n').map((l) => { const r = JSON.parse(l); return [r.id, r] }))
const verdicts = new Map()
for (const f of readdirSync(join(A, `reviews-${TAG}`)).filter((f) => f.endsWith('.jsonl')).sort()) {
  for (const l of readFileSync(join(A, `reviews-${TAG}`, f), 'utf8').split('\n').filter(Boolean)) {
    try { const v = JSON.parse(l); verdicts.set(v.id, v) } catch {}
  }
}

// "#4, #7, #215-#217, #0x5" → [4, 7, 215, 216, 217, 0]
function indices(evidence) {
  const out = new Set()
  for (const m of String(evidence || '').matchAll(/#(\d+)(?:\s*[-–]\s*#?(\d+))?/g)) {
    const a = Number(m[1]); const b = m[2] ? Number(m[2]) : a
    for (let i = a; i <= Math.min(b, a + 60); i++) out.add(i)
  }
  return [...out]
}

const out = []
let docs = 0
for (const [id, v] of verdicts) {
  const r = rows.get(id)
  if (!r || r.status !== 'ok') continue
  const p = join(A, `details-${TAG}`, `${r.key}.json`)
  if (!existsSync(p)) continue
  const d = JSON.parse(readFileSync(p, 'utf8'))
  const byIdx = new Map([...(d.strictPicked || []), ...d.picked].map((c) => [c.i, c]))
  let any = false
  for (const c of v.codes || []) {
    if (c.code !== 'INGEST' && c.code !== 'CLAIM') continue
    for (const i of indices(c.evidence)) {
      const claim = byIdx.get(i)
      if (!claim) continue
      out.push({ id, code: c.code, i, text: claim.text, fn: claim.fn, tier: claim.tier, flag: claim.flag || null, note: c.note })
      any = true
    }
  }
  if (any) docs++
}
writeFileSync(join(A, `junk-${TAG}.jsonl`), out.map((x) => JSON.stringify(x)).join('\n') + '\n')
console.log(`${out.length} junk lines from ${docs} documents → checks/data/audit/junk-${TAG}.jsonl`)
