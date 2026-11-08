// ─────────────────────────────────────────────────────────────────────────────
// node checks/fixture-review-score.mjs — change set 1, Part C: score Kyle's labels.
//
// Reads checks/data/review/labeled/<fixture>.csv (Kyle's labeled copy of the
// review rows) and prints precision per flag type, false-positive root causes,
// the miss rate on the unflagged sample, and non-claim leakage. Writes counts
// only (no document text) to checks/reports/fixture-review-<commit>.json.
// A fixture with no labeled file is reported as pending.
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/corpus.mjs'
import { FIXTURES } from './lib/fixtures.mjs'
import { engineCommit } from './lib/engine-rows.mjs'
import { scoreReview } from './lib/review.mjs'

const commit = engineCommit()
const out = { engine_commit: commit, label_tier: 'gold', fixtures: {} }
for (const f of FIXTURES) {
  const s = scoreReview(f.id)
  if (!s) { out.fixtures[f.id] = { status: 'pending', reason: `no labeled file at checks/data/review/labeled/${f.id}.csv` }; console.log(`PENDING ${f.id} — not labeled yet`); continue }
  out.fixtures[f.id] = { status: 'ok', ...s }
  console.log(`${f.label} ${f.id}`)
  for (const [type, p] of Object.entries(s.precision)) console.log(`  precision ${type.padEnd(22)} ${p.precision ?? '—'}  (${p.labeled}/${p.rows} labeled)`)
  console.log(`  miss rate ${s.miss.missRate ?? '—'} (${s.miss.misses}/${s.miss.judged}), ≈${s.miss.estimatedMisses ?? '—'} of ${s.miss.unflaggedUnits} unflagged units`)
  console.log(`  non-claim leakage ${s.leakage.value ?? '—'}`)
}
mkdirSync(join(ROOT, 'checks', 'reports'), { recursive: true })
writeFileSync(join(ROOT, 'checks', 'reports', `fixture-review-${commit}.json`), JSON.stringify(out, null, 2) + '\n')
