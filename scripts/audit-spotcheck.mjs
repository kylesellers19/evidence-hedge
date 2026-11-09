// ─────────────────────────────────────────────────────────────────────────────
// Spot-check views for the one-by-one review (Part 2): a seeded 10% sample of
// reviewers' verdicts, each shown with the claim lines its evidence cites, so a
// second reader can confirm or overturn it.
//
//   node scripts/audit-spotcheck.mjs --tag run1 --sample        print the sample's ids
//   node scripts/audit-spotcheck.mjs --tag run1 --show <id,id>  print compact views
//
// Reads gitignored data only and prints to the terminal; the second reader's
// findings go to checks/data/audit/spotcheck-<tag>.jsonl.
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { ROOT } from '../checks/lib/corpus.mjs'

const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? dflt : process.argv[i + 1] }
const TAG = arg('tag', 'run1')
const A = join(ROOT, 'checks', 'data', 'audit')
const rows = new Map(readFileSync(join(A, `ledger-${TAG}.jsonl`), 'utf8').trim().split('\n').map((l) => { const r = JSON.parse(l); return [r.id, r] }))
const reviews = []
for (const f of readdirSync(join(A, `reviews-${TAG}`)).filter((f) => f.endsWith('.jsonl')).sort()) {
  for (const l of readFileSync(join(A, `reviews-${TAG}`, f), 'utf8').split('\n').filter(Boolean)) {
    try { reviews.push({ ...JSON.parse(l), chunk: f.replace('.jsonl', '') }) } catch {}
  }
}

// Seeded: a verdict is in the sample when the first byte of sha256("spot:" + id)
// is below 26 (about 10%). Stable as more chunks finish.
const inSample = (id) => createHash('sha256').update(`spot:${id}`).digest()[0] < 26

if (process.argv.includes('--sample')) {
  const s = reviews.filter((v) => inSample(v.id))
  console.log(`${s.length} of ${reviews.length} verdicts in the sample`)
  console.log(s.map((v) => v.id).join(','))
}

const show = arg('show', null)
const brief = process.argv.includes('--brief')
if (show) {
  for (const id of show.split(',')) {
    const v = reviews.find((x) => x.id === id)
    const r = rows.get(id)
    if (!v || !r) { console.log(`?? ${id}`); continue }
    // A document the site refused (no text layer, not English) has no details.
    const dp = join(A, `details-${TAG}`, `${r.key}.json`)
    if (!existsSync(dp)) { console.log(`\n=== ${id} [${v.chunk}] ${r.url || ''}\nrefused: ${r.status} · VERDICT ${v.verdict}${v.fair ? ` · fair: ${v.fair}` : ''}`); continue }
    const d = JSON.parse(readFileSync(dp, 'utf8'))
    const byIdx = new Map([...(d.strictPicked || []).map((p) => [p.i, { ...p, s: true }]), ...d.picked.map((p) => [p.i, p])])
    console.log(`\n=== ${id} [${v.chunk}] ${r.url || ''}`)
    console.log(`score ${r.score} · ${r.rubric.judgedAs} · ${r.posture} · prov ${r.provenance} · ${r.claims}c ${r.strong}s · U${r.flags['unsupported-assertion']} O${r.flags.overconfident} C${r.flags['causal-overreach']} · refs ${r.references} · ${r.words}w`)
    console.log(`what: ${v.what} · lines read ${v.read?.lines}`)
    if (!brief) console.log(`HEAD: ${d.head.slice(0, 260).replace(/\s+/g, ' ')}`)
    console.log(`VERDICT ${v.verdict}${v.fair ? ` · fair: ${v.fair}` : ''}`)
    for (const c of v.codes || []) {
      console.log(`  ${c.code}: ${c.note} [${c.evidence}]`)
      const idx = [...String(c.evidence || '').matchAll(/#(\d+)/g)].map((m) => Number(m[1])).slice(0, brief ? 1 : 2)
      for (const i of idx) {
        const p = byIdx.get(i)
        if (p) console.log(`     #${i} ${p.flag || ''}${p.overreach ? ' C' + p.overreach : ''} ${p.tier} ${p.fn}${p.s ? ' (strict)' : ''}| ${p.text.replace(/\s+/g, ' ').slice(0, 130)}`)
        else console.log(`     #${i} (not a listed flagged or strong claim)`)
      }
    }
  }
}
