// ─────────────────────────────────────────────────────────────────────────────
// node scripts/claim-function-sample.mjs — write checks/claim-function-sample.csv:
// 5 claims per available corpus document (seeded, spread across the document),
// with the predicted function, register, recommendation strength and tier, and
// an empty gold_function column for hand labeling. Short excerpts only.
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadCorpus, loadDocText } from '../checks/lib/corpus.mjs'
import { analyze } from '../src/engine/analyze.js'
import { getRubric } from '../src/rubrics/index.js'
import { validateText } from '../src/ingest/validateText.js'

const PER_DOC = 5
const csv = (v) => `"${String(v).replace(/"/g, '""')}"`
const rows = [['doc_id', 'claim_id', 'predicted_function', 'causal_register', 'recommendation', 'certainty', 'text', 'gold_function'].join(',')]
for (const doc of loadCorpus()) {
  const loaded = await loadDocText(doc)
  if (loaded.status !== 'ok' || !validateText(loaded.text).ok) { console.log(`SKIP ${doc.id}`); continue }
  const { claims } = analyze(loaded.text, getRubric('research'))
  // Evenly spaced picks: deterministic, and they span front, middle and end.
  const picks = claims.length <= PER_DOC ? claims : Array.from({ length: PER_DOC }, (_, i) => claims[Math.floor(((i + 0.5) * claims.length) / PER_DOC)])
  for (const c of picks) {
    rows.push([doc.id, c.id, c.function, c.register.register, c.recommendation.strength, c.tier.key, csv(c.text.slice(0, 400)), ''].join(','))
  }
}
writeFileSync(join(ROOT, 'checks', 'claim-function-sample.csv'), rows.join('\n') + '\n')
console.log(`wrote checks/claim-function-sample.csv (${rows.length - 1} rows)`)
