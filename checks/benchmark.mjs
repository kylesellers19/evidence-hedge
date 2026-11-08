// ─────────────────────────────────────────────────────────────────────────────
// node checks/benchmark.mjs — change set 1, Parts B and D: benchmark the frozen
// engine against published human labels and the fixtures.
//
// Corpus checks (published human labels, foundations bundle v2):
//   yu2019_pubmed     causal register vs. Yu 2019 causal strength — confusion
//                     matrix, per-class precision and recall; reported on the
//                     rows the lexicon was tuned on, held out, never seen, and
//                     the bundle's test split (checks/lib/yu-partition.mjs)
//   yu2020_eureka     the same, on press-release prose
//   pei2021           assertiveness tier vs. certainty 1–6 — Spearman's rho
//   wright2021_pairs  press release vs. abstract strength gap — agreement with
//                     same / exaggerates / downplays
//   cessc_ssc         causal sentence detection — precision and recall
//   spiced            paraphrase consistency — skipped until downloaded and its
//                     fields inspected
// Fixture checks: claim and flag counts per fixture, and the Part C scores once
// Kyle's labels exist (checks/fixture-review-score.mjs).
// Published models (checks/data/predictions/) are scored side by side with the
// engine on identical rows, after dropping every row a model trained on.
//
// Every metric names its source, split, row count and label tier; the run fails
// if one does not. Writes checks/reports/benchmark-<engine commit>.json and .md
// (numbers only; --report-dir <dir> writes them elsewhere) and, when the bundle
// is present, the engine's output per row to
// checks/data/engine/<commit>/<source>.jsonl. Mappings: checks/lib/mapping.mjs.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/corpus.mjs'
import { DATA, FIXTURES, runFixture } from './lib/fixtures.mjs'
import { engineCommit } from './lib/engine-rows.mjs'
import { loadBundle, field, fieldOr, SchemaError, FIELDS } from './lib/bundle.mjs'
import { yuEnginePartition, yuUpstreamCodes, textKey } from './lib/yu-partition.mjs'
import { loadPredictions, usablePredictions } from './lib/predictions.mjs'
import { scoreReview } from './lib/review.mjs'
import { multiclass, binary, spearman } from './lib/metrics.mjs'
import { REGISTER_STRENGTH, STRENGTH_REGISTER, YU_UPSTREAM_CLASS, TIER_RANK, CAUSAL_POSITIVE, CAUSAL_POSITIVE_WIDE, PAIR_LABELS, pairLabel } from './lib/mapping.mjs'
import { causalRegister, REGISTERS } from '../src/engine/measure/causalRegister.js'
import { measureCertainty } from '../src/engine/measure/certainty.js'

const commit = engineCommit()
const PRED = JSON.parse(readFileSync(join(ROOT, 'checks', 'benchmark-predictions.json'), 'utf8'))
const ENGINE = `engine@${commit}`

const metrics = []   // every number in the report, with its provenance
const checks = {}    // per check: status and detail
const record = (m) => { metrics.push(m); return m }

function compare(pred, actual) {
  if (!pred || pred.value === undefined) return {}
  if (actual == null) return { predicted: pred, match: null }
  const match = pred.exact ? actual === pred.value : actual >= pred.range[0] && actual <= pred.range[1]
  return { predicted: pred, match }
}

// ── Engine measurement on a sentence (rubric-invariant) ─────────────────────
const memo = new Map()
function measure(text) {
  if (!memo.has(text)) {
    const reg = causalRegister(text)
    memo.set(text, { register: reg.register, causal_strength: REGISTER_STRENGTH[reg.register], register_cues: reg.cues.map((c) => c.root), tier: measureCertainty(text).tier })
  }
  return memo.get(text)
}

// ── Fixtures ────────────────────────────────────────────────────────────────
const fixtureResults = {}
for (const f of FIXTURES) {
  const run = await runFixture(f)
  if (run.status !== 'ok') { checks[`fixture:${f.id}`] = { status: 'skip', reason: run.reason }; continue }
  const a = run.analysis
  const fc = a.summary.flagCounts
  const P = PRED.fixtures[f.id] || {}
  const base = { check: 'fixture-counts', source: f.id, split: 'fixture', label_tier: 'predicted', system: ENGINE }
  const flagRows = fc['unsupported-assertion'] + fc.overconfident + fc['causal-overreach']
  const values = {
    claims: [a.summary.totalClaims, run.units.length],
    'unsupported-assertion': [fc['unsupported-assertion'], a.summary.totalClaims],
    overconfident: [fc.overconfident, a.summary.totalClaims],
    'causal-overreach': [fc['causal-overreach'], a.summary.totalClaims],
    flagRows: [flagRows, a.summary.totalClaims],
    unsupportedShare: [+(fc['unsupported-assertion'] / a.summary.totalClaims).toFixed(3), a.summary.totalClaims],
  }
  for (const [metric, [value, rows]] of Object.entries(values)) record({ ...base, metric, value, rows, ...compare(P[metric], value) })
  const review = scoreReview(f.id)
  if (review) {
    for (const [type, p] of Object.entries(review.precision)) record({ check: 'fixture-review', source: f.id, split: 'fixture', label_tier: 'gold', system: ENGINE, metric: `precision:${type}`, value: p.precision, rows: p.labeled })
    record({ check: 'fixture-review', source: f.id, split: 'fixture-sample', label_tier: 'gold', system: ENGINE, metric: 'missRate', value: review.miss.missRate, rows: review.miss.judged })
    record({ check: 'fixture-review', source: f.id, split: 'fixture', label_tier: 'gold', system: ENGINE, metric: 'nonClaimLeakage', value: review.leakage.value,
      rows: review.leakage.flaggedLabeled + review.leakage.sampleExtractedLabeled, ...compare(P.nonClaimLeakage, review.leakage.value) })
  } else if (P.nonClaimLeakage) {
    record({ check: 'fixture-review', source: f.id, split: 'fixture', label_tier: 'gold', system: ENGINE, metric: 'nonClaimLeakage', value: null, rows: 0,
      ...compare(P.nonClaimLeakage, null), pending: `labels: checks/data/review/labeled/${f.id}.csv` })
  }
  fixtureResults[f.id] = {
    route: { standard: run.route.rubric, rubric: run.rubric.id, posture: run.route.posture, genres: run.route.judgment.genres },
    units: run.units.length, unitsOnPage: run.units.filter((u) => u.page != null).length, claims: a.summary.totalClaims,
    flagCounts: fc, score: a.documentScore.score, signals: a.signals.map((s) => s.id),
  }
  checks[`fixture:${f.id}`] = { status: 'ok', reviewed: !!review }
}

// ── Corpus checks ───────────────────────────────────────────────────────────
const CORPUS = ['yu2019_pubmed', 'yu2020_eureka', 'pei2021', 'wright2021_pairs', 'cessc_ssc']
const bundle = loadBundle()
const predictions = loadPredictions()
const preds = predictions.status === 'ok' ? predictions.tools : new Map()

const bySource = (s) => bundle.rows.filter((r) => r[FIELDS.source] === s)
const splitOf = (r) => r[FIELDS.split]
const idOf = (r) => r[FIELDS.id]

function writeEngineRows(source, rows) {
  const dir = join(DATA, 'engine', commit)
  mkdirSync(dir, { recursive: true })
  const lines = rows.map((r) => JSON.stringify({ row_id: idOf(r), source, split: splitOf(r), engine_commit: commit, label_tier: 'predicted', ...r._engine }))
  writeFileSync(join(dir, `${source}.jsonl`), lines.join('\n') + '\n')
}

// Side by side: each published model and the engine on the rows that model may be scored on.
function sideBySide(check, source, rows, score, metricName, toolValue) {
  const targets = new Map(rows.map((r) => [idOf(r), { source, split: splitOf(r) }]))
  for (const [tool, list] of preds) {
    const { kept, dropped } = usablePredictions(list, targets)
    if (!kept.size) continue
    const shared = rows.filter((r) => kept.has(idOf(r)))
    const tier = [...kept.values()][0].tier || 'predicted'
    const base = { check, source, split: 'model-eligible', rows: shared.length, label_tier: 'published-human', droppedTrainedOn: dropped }
    record({ ...base, metric: metricName, system: tool, system_tier: tier, value: score(shared, (r) => toolValue(kept.get(idOf(r)))) })
    record({ ...base, metric: metricName, system: ENGINE, system_tier: 'predicted', value: score(shared, null) })
  }
}

// Yu's bundle encoding: decide from the rows whose codes differ between the
// upstream numbering and ordinal strength (upstream 1 and 3).
function yuEncoding(rows) {
  const up = yuUpstreamCodes()
  if (!up) return { encoding: 'unverified', reason: 'fixtures/cache/yu2019/pubmed_causal_language_use.csv absent' }
  let joined = 0, telling = 0, asUpstream = 0, asOrdinal = 0
  for (const r of rows) {
    const u = up.get(textKey(field(r, 'text')))
    if (u == null) continue
    joined++
    if (u !== 1 && u !== 3) continue
    telling++
    const code = Number(field(r, 'yuStrength'))
    if (code === u) asUpstream++
    if (code === REGISTER_STRENGTH[YU_UPSTREAM_CLASS[u]]) asOrdinal++
  }
  const detail = { joined, telling, asUpstream, asOrdinal }
  if (telling && asUpstream === telling) return { encoding: 'upstream', ...detail }
  if (telling && asOrdinal === telling) return { encoding: 'ordinal', ...detail }
  return { encoding: 'unknown', ...detail }
}
const decodeYu = (code, encoding) => (encoding === 'upstream' ? YU_UPSTREAM_CLASS : STRENGTH_REGISTER)[Number(code)]

function causalCheck(source, rows, encoding, partitionOf) {
  for (const r of rows) {
    const gold = decodeYu(field(r, 'yuStrength'), encoding)
    if (!REGISTERS.includes(gold)) throw new SchemaError(`${FIELDS.yuStrength} (value ${field(r, 'yuStrength')})`, r)
    r._gold = gold
    r._engine = measure(field(r, 'text'))
  }
  const score = (set, alt) => multiclass(set.map((r) => ({ gold: r._gold, pred: alt ? alt(r) : r._engine.register })), REGISTERS)
  const groups = { all: rows, 'bundle-test': rows.filter((r) => splitOf(r) === 'test') }
  if (partitionOf) for (const p of ['engine-tuning', 'engine-held-out', 'never-seen']) groups[p] = rows.filter((r) => partitionOf(field(r, 'text')) === p)
  const P = PRED.corpus[source] || {}
  for (const [split, set] of Object.entries(groups)) {
    if (!set.length) continue
    const m = score(set)
    const base = { check: 'causal-register', source, split, rows: set.length, label_tier: 'published-human', system: ENGINE }
    record({ ...base, metric: 'rows', value: set.length, ...compare(P[split]?.rows, set.length) })
    record({ ...base, metric: 'macroF1', value: m.macroF1, ...compare(P[split]?.macroF1, m.macroF1) })
    record({ ...base, metric: 'accuracy', value: m.accuracy, ...compare(P[split]?.accuracy, m.accuracy) })
    record({ ...base, metric: 'perClass', value: m.perClass })
    record({ ...base, metric: 'confusion', value: m.confusion })
    const order = P[split]?.perClassF1Order
    if (order) {
      const actual = [...REGISTERS].sort((x, y) => m.perClass[y].f1 - m.perClass[x].f1)
      record({ ...base, metric: 'perClassF1Order', value: actual, predicted: { value: order }, match: actual.join() === order.join() })
    }
  }
  sideBySide('causal-register', source, rows, (set, alt) => score(set, alt).macroF1, 'macroF1', (p) => p.labels?.causal_register)
  writeEngineRows(source, rows)
}

const CORPUS_CHECKS = {
  yu2019_pubmed() {
    const rows = bySource('yu2019_pubmed')
    const enc = yuEncoding(rows)
    if (enc.encoding === 'unverified' || enc.encoding === 'unknown') return { status: 'stopped', reason: `Yu label encoding ${enc.encoding}`, encoding: enc }
    const part = yuEnginePartition()
    if (part.status !== 'ok') return { status: 'stopped', reason: `engine tuning partition: ${part.reason}`, encoding: enc }
    causalCheck('yu2019_pubmed', rows, enc.encoding, part.partitionOf)
    return { status: 'ok', encoding: enc }
  },
  yu2020_eureka() {
    const yu19 = yuEncoding(bySource('yu2019_pubmed'))
    if (!['upstream', 'ordinal'].includes(yu19.encoding)) return { status: 'stopped', reason: `Yu label encoding ${yu19.encoding}` }
    causalCheck('yu2020_eureka', bySource('yu2020_eureka'), yu19.encoding, null)
    return { status: 'ok', encoding: { encoding: yu19.encoding, basis: 'assumed the same as yu2019_pubmed in the bundle (no upstream file on disk to verify)' } }
  },
  pei2021() {
    const all = bySource('pei2021')
    const rows = all.filter((r) => fieldOr(r, 'certainty') != null)
    if (all.length && !rows.length) field(all[0], 'certainty')
    for (const r of rows) r._engine = measure(field(r, 'text'))
    const rho = (set, alt) => spearman(set.map((r) => (alt ? alt(r) : TIER_RANK[r._engine.tier])), set.map((r) => Number(field(r, 'certainty'))))
    const P = PRED.corpus.pei2021.all
    for (const [split, set] of Object.entries({ all: rows, 'bundle-test': rows.filter((r) => splitOf(r) === 'test') })) {
      if (!set.length) continue
      const base = { check: 'certainty', source: 'pei2021', split, rows: set.length, label_tier: 'published-human', system: ENGINE }
      const measured = +(set.filter((r) => r._engine.tier === 'measured').length / set.length).toFixed(3)
      const tiers = Object.fromEntries(Object.keys(TIER_RANK).map((t) => [t, set.filter((r) => r._engine.tier === t).length]))
      record({ ...base, metric: 'rows', value: set.length, ...(split === 'all' ? compare(P.rows, set.length) : {}) })
      record({ ...base, metric: 'spearman', value: rho(set), ...(split === 'all' ? compare(P.spearman, rho(set)) : {}) })
      record({ ...base, metric: 'measuredShare', value: measured, ...(split === 'all' ? compare(P.measuredShare, measured) : {}) })
      record({ ...base, metric: 'tierCounts', value: tiers })
    }
    sideBySide('certainty', 'pei2021', rows, rho, 'spearman', (p) => Number(p.labels?.certainty))
    writeEngineRows('pei2021', rows)
    return { status: 'ok', rowsWithoutCertainty: all.length - rows.length }
  },
  wright2021_pairs() {
    const rows = bySource('wright2021_pairs')
    for (const r of rows) {
      const gold = String(field(r, 'exaggeration')).toLowerCase()
      if (!PAIR_LABELS.includes(gold)) throw new SchemaError(`${FIELDS.exaggeration} (value ${gold})`, r)
      const press = measure(field(r, 'pressText')), abstract = measure(field(r, 'abstractText'))
      r._gold = gold
      r._engine = { press, abstract, pair: pairLabel(press.causal_strength, abstract.causal_strength).label }
    }
    const P = PRED.corpus.wright2021_pairs.all
    for (const [split, set] of Object.entries({ all: rows, 'bundle-test': rows.filter((r) => splitOf(r) === 'test') })) {
      if (!set.length) continue
      const m = multiclass(set.map((r) => ({ gold: r._gold, pred: r._engine.pair })), PAIR_LABELS)
      const side = (k, f) => +(set.filter((r) => r._engine[k].causal_strength === Number(field(r, f))).length / set.length).toFixed(3)
      const base = { check: 'restatement-gap', source: 'wright2021_pairs', split, rows: set.length, label_tier: 'published-human', system: ENGINE }
      const all = split === 'all'
      record({ ...base, metric: 'rows', value: set.length, ...(all ? compare(P.rows, set.length) : {}) })
      record({ ...base, metric: 'agreement', value: m.accuracy, ...(all ? compare(P.agreement, m.accuracy) : {}) })
      record({ ...base, metric: 'macroF1', value: m.macroF1, ...(all ? compare(P.macroF1, m.macroF1) : {}) })
      record({ ...base, metric: 'abstractStrengthAccuracy', value: side('abstract', 'abstractStrength'), ...(all ? compare(P.abstractStrengthAccuracy, side('abstract', 'abstractStrength')) : {}) })
      record({ ...base, metric: 'pressStrengthAccuracy', value: side('press', 'pressStrength'), ...(all ? compare(P.pressStrengthAccuracy, side('press', 'pressStrength')) : {}) })
      record({ ...base, metric: 'confusion', value: m.confusion })
    }
    writeEngineRows('wright2021_pairs', rows)
    return { status: 'ok', strengthEncoding: 'assumed ordinal 0–3 (none, correlational, conditional causal, direct causal); unverified' }
  },
  cessc_ssc() {
    const rows = bySource('cessc_ssc')
    const yes = (v) => v === true || v === 1 || /^(?:1|yes|true|causal)$/i.test(String(v))
    for (const r of rows) { r._gold = yes(field(r, 'causal')); r._engine = measure(field(r, 'text')) }
    const P = PRED.corpus.cessc_ssc.all
    for (const [split, set] of Object.entries({ all: rows, 'bundle-test': rows.filter((r) => splitOf(r) === 'test') })) {
      if (!set.length) continue
      const all = split === 'all'
      const m = binary(set.map((r) => ({ gold: r._gold, pred: CAUSAL_POSITIVE.has(r._engine.register) })))
      const wide = binary(set.map((r) => ({ gold: r._gold, pred: CAUSAL_POSITIVE_WIDE.has(r._engine.register) })))
      const base = { check: 'causal-sentence', source: 'cessc_ssc', split, rows: set.length, label_tier: 'published-human', system: ENGINE }
      record({ ...base, metric: 'rows', value: set.length, ...(all ? compare(P.rows, set.length) : {}) })
      record({ ...base, metric: 'precision', value: m.precision, ...(all ? compare(P.precision, m.precision) : {}) })
      record({ ...base, metric: 'recall', value: m.recall, ...(all ? compare(P.recall, m.recall) : {}) })
      record({ ...base, metric: 'counts', value: { tp: m.tp, fp: m.fp, fn: m.fn, tn: m.tn } })
      record({ ...base, metric: 'precision (wide: + correlational)', value: wide.precision })
      record({ ...base, metric: 'recall (wide: + correlational)', value: wide.recall })
    }
    sideBySide('causal-sentence', 'cessc_ssc', rows, (set, alt) => binary(set.map((r) => ({ gold: r._gold, pred: alt ? !!alt(r) : CAUSAL_POSITIVE.has(r._engine.register) }))).f1, 'f1', (p) => p.labels?.causal)
    writeEngineRows('cessc_ssc', rows)
    return { status: 'ok' }
  },
}

for (const source of CORPUS) {
  if (bundle.status !== 'ok') { checks[source] = { status: 'skip', reason: bundle.reason }; continue }
  if (!bySource(source).length) { checks[source] = { status: 'skip', reason: `no ${source} rows in the bundle` }; continue }
  try {
    checks[source] = CORPUS_CHECKS[source]()
  } catch (e) {
    if (!(e instanceof SchemaError)) throw e
    checks[source] = { status: 'stopped', reason: `schema mismatch: ${e.message}` }
  }
}

// SPICED: report what is on disk; the loader waits until its fields are inspected.
const SPICED = join(DATA, 'spiced')
if (!existsSync(SPICED)) checks.spiced = { status: 'skip', reason: 'copenlu/spiced not downloaded (expected at checks/data/spiced/)' }
else {
  const files = readdirSync(SPICED)
  const first = files.find((f) => f.endsWith('.jsonl') || f.endsWith('.json'))
  let fields = null
  if (first) { const t = readFileSync(join(SPICED, first), 'utf8'); try { fields = Object.keys(JSON.parse(t.split('\n')[0])) } catch { fields = null } }
  checks.spiced = { status: 'skip', reason: 'fields reported; loader not written until Kyle reviews them', files, fields }
}

// ── Self-check: every metric names its source, split, row count, label tier ──
const unlabeled = metrics.filter((m) => !m.source || !m.split || typeof m.rows !== 'number' || !m.label_tier)
const report = {
  engine_commit: commit,
  baseline: PRED.baseline,
  generated: new Date().toLocaleDateString('en-CA'),
  inputs: {
    bundle: bundle.status === 'ok' ? { path: 'checks/data/foundations-v2/unified_eval.jsonl', rows: bundle.rows.length, labelConflictsSkipped: bundle.conflicts } : { status: 'skip', reason: bundle.reason },
    predictions: predictions.status === 'ok' ? { files: predictions.files, tools: [...preds.keys()] } : { status: 'skip', reason: predictions.reason },
  },
  checks,
  fixtures: fixtureResults,
  metrics,
  selfCheck: { metrics: metrics.length, unlabeled: unlabeled.length },
}
const dirArg = process.argv.indexOf('--report-dir')
const reports = dirArg > 0 ? process.argv[dirArg + 1] : join(ROOT, 'checks', 'reports')
mkdirSync(reports, { recursive: true })
writeFileSync(join(reports, `benchmark-${commit}.json`), JSON.stringify(report, null, 2) + '\n')
writeFileSync(join(reports, `benchmark-${commit}.md`), markdown(report))

const compared = metrics.filter((m) => m.predicted)
console.log(`engine ${commit}: ${metrics.length} metrics, ${compared.filter((m) => m.match === true).length} match, ` +
  `${compared.filter((m) => m.match === false).length} mismatch, ${compared.filter((m) => m.match === null).length} pending`)
for (const m of compared.filter((x) => x.match === false)) console.log(`MISMATCH ${m.source} ${m.split} ${m.metric}: predicted ${fmtPred(m.predicted)}, actual ${m.value}`)
for (const [k, c] of Object.entries(checks)) if (c.status !== 'ok') console.log(`${c.status.toUpperCase()} ${k} — ${c.reason}`)
const written = join(reports, `benchmark-${commit}`)
console.log(`→ ${written.startsWith(ROOT) ? written.slice(ROOT.length + 1) : written}.json, .md`)
if (unlabeled.length) { console.error(`FAIL ${unlabeled.length} metrics lack source/split/rows/label tier`); process.exit(1) }

// ── Markdown summary ────────────────────────────────────────────────────────
function fmtPred(p) { return p.exact ? `${p.value} (exact)` : p.range ? `${p.value} [${p.range[0]}–${p.range[1]}]` : JSON.stringify(p.value) }
function fmt(v) { return v == null ? '—' : typeof v === 'object' ? '`' + JSON.stringify(v) + '`' : String(v) }
function markdown(r) {
  const L = []
  L.push(`# Benchmark — engine ${r.engine_commit}`, '')
  L.push(`Generated ${r.generated} by \`node checks/benchmark.mjs\`. Baseline ${r.baseline}. Predictions approved ${PRED.approved} (\`checks/benchmark-predictions.json\`).`, '')
  L.push('## Predicted vs. actual', '')
  L.push('| Check | Source | Split | Rows | Label tier | Metric | Predicted | Actual | Match |', '|---|---|---|---|---|---|---|---|---|')
  for (const m of r.metrics.filter((x) => x.predicted)) {
    L.push(`| ${m.check} | ${m.source} | ${m.split} | ${m.rows} | ${m.label_tier} | ${m.metric} | ${fmtPred(m.predicted)} | ${fmt(m.value)} | ${m.match === true ? 'yes' : m.match === false ? '**no**' : 'pending'} |`)
  }
  L.push('', '## Checks not run', '')
  const notRun = Object.entries(r.checks).filter(([, c]) => c.status !== 'ok')
  if (!notRun.length) L.push('None.')
  for (const [k, c] of notRun) L.push(`- **${k}**: ${c.status} — ${c.reason}`)
  L.push('', '## Fixtures', '')
  L.push('| Fixture | Standard | Rubric | Posture | Units (on a page) | Claims | Unsupported | Overconfident | Causal overreach | Score | Signals |', '|---|---|---|---|---|---|---|---|---|---|---|')
  for (const [id, f] of Object.entries(r.fixtures)) {
    L.push(`| ${id} | ${f.route.standard} | ${f.route.rubric} | ${f.route.posture} | ${f.units} (${f.unitsOnPage}) | ${f.claims} | ${f.flagCounts['unsupported-assertion']} | ${f.flagCounts.overconfident} | ${f.flagCounts['causal-overreach']} | ${f.score} | ${f.signals.join(', ')} |`)
  }
  L.push('', '## All metrics', '')
  L.push('| Check | Source | Split | Rows | Label tier | System | Metric | Value |', '|---|---|---|---|---|---|---|---|')
  for (const m of r.metrics.filter((x) => !['confusion', 'perClass'].includes(x.metric))) L.push(`| ${m.check} | ${m.source} | ${m.split} | ${m.rows} | ${m.label_tier} | ${m.system} | ${m.metric} | ${fmt(m.value)} |`)
  L.push('', `Self-check: ${r.selfCheck.metrics} metrics, ${r.selfCheck.unlabeled} without source, split, rows and label tier.`, '')
  return L.join('\n')
}
