// ─────────────────────────────────────────────────────────────────────────────
// Adds, for every document whose detected posture is more lenient than its
// standard's strictest, the claims flagged at the strictest posture: the ones
// the score counts (scoreDocument judges every claim there). Written into the
// review details (checks/data/audit/details-<tag>/<key>.json) as strictPicked,
// so a reviewer sees what drove the score, not only what the brief flags.
//
//   node --max-old-space-size=6144 scripts/audit-strict.mjs --tag run1
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../checks/lib/corpus.mjs'
import { listDocuments, siteRun, textOf } from './audit-corpus.mjs'
import { analyze } from '../src/engine/analyze.js'

const i = process.argv.indexOf('--tag')
const TAG = i < 0 ? 'run1' : process.argv[i + 1]
const OUT = join(ROOT, 'checks', 'data', 'audit')
const rows = new Map(readFileSync(join(OUT, `ledger-${TAG}.jsonl`), 'utf8').trim().split('\n').map((l) => { const r = JSON.parse(l); return [r.id, r] }))
let n = 0
for (const doc of listDocuments()) {
  const r = rows.get(doc.id)
  if (!r || r.status !== 'ok' || !r.breakdown || r.breakdown.gate || r.breakdown.unscored) continue
  const shown = r.flags['unsupported-assertion'] + r.flags.overconfident
  if (r.flaggedAtStandard === shown) continue
  const { text } = await textOf(doc)
  const sourceUrl = doc.mode === 'link' ? doc.url : ''
  const { rubric } = siteRun(text, sourceUrl)
  const strict = analyze(text, rubric, rubric.strictestPosture, { sourceUrl })
  const p = join(OUT, `details-${TAG}`, `${r.key}.json`)
  const d = JSON.parse(readFileSync(p, 'utf8'))
  d.strictPosture = rubric.strictestPosture
  d.strictPicked = strict.claims.map((c, k) => ({ c, k })).filter(({ c }) => c.flag).map(({ c, k }) => ({ i: k, text: c.text, tier: c.tier.key, rung: c.rung.key, flag: c.flag, fn: c.function }))
  writeFileSync(p, JSON.stringify(d))
  n++
}
console.log(`strict claims added for ${n} documents`)
