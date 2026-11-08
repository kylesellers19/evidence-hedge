// ─────────────────────────────────────────────────────────────────────────────
// node checks/pair-comparison.mjs — change set 5, Part D.
//
// Runs compareClaims on Wright & Augenstein's (2021) press-release vs. abstract
// pairs from the bundle, twice: with the engine's causal strength, and with the
// Yu model's predictions from change set 2 (checks/data/predictions/). The
// causal-strength change gives exaggerates (> 0), downplays (< 0) or same (0);
// agreement with the human label is reported per system. Rows: the source's
// own test split (original_split = test), which neither system trained on; the
// bundle's regrouped test split is reported too. Chains (original → conclusion
// → restatement) wait for Kyle's real chains; none is assembled here.
// Writes checks/reports/pairs-<engine commit>.json (numbers only).
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/corpus.mjs'
import { DATA } from './lib/fixtures.mjs'
import { engineCommit } from './lib/engine-rows.mjs'
import { loadBundle, field } from './lib/bundle.mjs'
import { multiclass } from './lib/metrics.mjs'
import { PAIR_LABELS } from './lib/mapping.mjs'
import { recordFromSentence, CAUSAL_STRENGTH } from '../src/engine/claimRecord.js'
import { compareClaims } from '../src/engine/compareClaims.js'

const commit = engineCommit()
const report = { engine_commit: commit, source: 'wright2021_pairs', label_tier: 'published-human', checks: {} }
const bundle = loadBundle({ source: 'wright2021_pairs' })
if (bundle.status !== 'ok') { console.log(`SKIP pairs — ${bundle.reason}`); process.exit(0) }

const labelOf = (change) => change.status !== 'resolved' ? 'undetermined' : change.value > 0 ? 'exaggerates' : change.value < 0 ? 'downplays' : 'same'
const withStrength = (record, strength) => ({ ...record, causal_strength: { ...record.causal_strength, value: strength, tier: 'predicted', status: strength == null ? 'unresolved' : 'resolved' } })

// The Yu model's predictions on both sides of the pairs, from change set 2.
function yuPredictions() {
  const dir = join(DATA, 'predictions')
  if (!existsSync(dir)) return { status: 'pending', reason: 'no checks/data/predictions/ yet (change set 2)' }
  const yuFiles = readdirSync(dir).filter((f) => /^yu(?:\d{4})?[-_]/i.test(f) && f.endsWith('.jsonl'))
  const file = yuFiles.find((f) => /full|all|pairs|causal/i.test(f)) || yuFiles[0]
  if (!file) return { status: 'pending', reason: 'no Yu prediction file in checks/data/predictions/' }
  const bySide = new Map()
  let tool = null
  for (const line of readFileSync(join(dir, file), 'utf8').split('\n')) {
    if (!line.trim()) continue
    const p = JSON.parse(line)
    tool = tool || `${p.tool}@${p.tool_commit}`
    const id = p.row_id || ''
    const m = id.match(/^(wright2021_pairs:[^:]+):(press|abstract)$/)
    const reg = p.labels?.causal_register
    if (m && reg) bySide.set(`${m[1]}:${m[2]}`, { reg, trained_on: p.trained_on || [] })
    for (const side of ['press', 'abstract']) {
      const r = p.labels?.[`${side}_causal_register`]
      if (id.startsWith('wright2021_pairs:') && r) bySide.set(`${id}:${side}`, { reg: r, trained_on: p.trained_on || [] })
    }
  }
  if (!bySide.size) return { status: 'pending', reason: `${file} has no Wright & Augenstein pair rows` }
  return { status: 'ok', file, tool, bySide }
}

function run(rows, split) {
  const out = {}
  const engine = rows.map((r) => {
    const src = recordFromSentence(field(r, 'abstractText'), { genre: 'academic conclusion' })
    const res = recordFromSentence(field(r, 'pressText'), { genre: 'press release' })
    return { gold: String(field(r, 'exaggeration')).toLowerCase(), pred: labelOf(compareClaims(src, res).causal_strength_change) }
  })
  const m = multiclass(engine.filter((p) => PAIR_LABELS.includes(p.pred)), PAIR_LABELS)
  out.engine = { system: `engine@${commit}`, label_tier: 'predicted', rows: engine.length, accuracy: m.accuracy, macroF1: m.macroF1, perClass: m.perClass, confusion: m.confusion, undetermined: engine.filter((p) => p.pred === 'undetermined').length }

  const yu = yuPredictions()
  if (yu.status !== 'ok') out.yu = { status: yu.status, reason: yu.reason }
  else {
    const scored = []
    let missing = 0, trained = 0
    for (const r of rows) {
      const a = yu.bySide.get(`${r.id}:abstract`), p = yu.bySide.get(`${r.id}:press`)
      if (!a || !p) { missing++; continue }
      if ([...a.trained_on, ...p.trained_on].some((t) => String(t).split(':')[0] === 'wright2021_pairs')) { trained++; continue }
      const src = withStrength(recordFromSentence(field(r, 'abstractText')), CAUSAL_STRENGTH[a.reg])
      const res = withStrength(recordFromSentence(field(r, 'pressText')), CAUSAL_STRENGTH[p.reg])
      scored.push({ gold: String(field(r, 'exaggeration')).toLowerCase(), pred: labelOf(compareClaims(src, res).causal_strength_change) })
    }
    const ym = multiclass(scored.filter((x) => PAIR_LABELS.includes(x.pred)), PAIR_LABELS)
    out.yu = { system: yu.tool, file: yu.file, label_tier: 'predicted', rows: scored.length, missing, droppedTrainedOn: trained, accuracy: ym.accuracy, macroF1: ym.macroF1, perClass: ym.perClass, confusion: ym.confusion }
  }
  console.log(`${split}: ${rows.length} pairs — engine macro-F1 ${out.engine.macroF1}, accuracy ${out.engine.accuracy}; Yu model ${out.yu.macroF1 != null ? `macro-F1 ${out.yu.macroF1}, accuracy ${out.yu.accuracy} on ${out.yu.rows}` : out.yu.reason}`)
  return { split, rows: rows.length, ...out }
}

report.checks.originalTest = run(bundle.rows.filter((r) => r.original_split === 'test'), "Wright & Augenstein's own test split")
report.checks.bundleTest = run(bundle.rows.filter((r) => r.split === 'test'), 'bundle test split (regrouped)')
report.note = "The handoff names 81 test-split pairs; the bundle holds 563 pairs in the source's own test split and 50 in its regrouped test split. Both are reported; neither is 81."
mkdirSync(join(ROOT, 'checks', 'reports'), { recursive: true })
writeFileSync(join(ROOT, 'checks', 'reports', `pairs-${commit}.json`), JSON.stringify(report, null, 2) + '\n')
console.log(`→ checks/reports/pairs-${commit}.json`)
