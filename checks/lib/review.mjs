// ─────────────────────────────────────────────────────────────────────────────
// Fixture review (change set 1, Part C): rows for Kyle to label, and the
// scores computed from his labels.
//
// checks/data/review/<fixture>.csv — every claim flag, plus a seeded random
// sample of unflagged units (extracted or not) so misses can be counted:
//   row_id, kind (flag | sample), flag_type, unit_id, page, section, extracted,
//   sentence, evidence_spans, explanation,
//   verdict      flag rows: tp | fp      sample rows: ok | miss
//   missed_flag  sample rows marked miss: the flag type that should have fired
//   root_cause   flag rows marked fp: why
//   is_claim     yes | no — is the sentence a claim at all (non-claim leakage)
//   notes
// checks/data/review/<fixture>-signals.csv — one row per document-signal span,
//   with the units that contain it.
// checks/data/review/<fixture>.meta.json — population counts and the seed.
// Kyle labels a copy at checks/data/review/labeled/<fixture>.csv; the export
// never writes there.
//
// Non-claim leakage = share of extracted claims that are not claims. Flagged
// claims are all reviewed; unflagged claims are estimated from the sample's
// extracted rows, weighted to their population (stratified estimate).
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { DATA } from './fixtures.mjs'
import { mulberry32 } from './metrics.mjs'

export const REVIEW_DIR = join(DATA, 'review')
export const LABELED_DIR = join(REVIEW_DIR, 'labeled')
export const SAMPLE_SIZE = 50        // PROVISIONAL — not ratified (handoff value)
export const SAMPLE_SEED = 20261107  // PROVISIONAL — not ratified (date approved)

export const COLUMNS = ['row_id', 'kind', 'flag_type', 'unit_id', 'page', 'section', 'extracted', 'sentence',
  'evidence_spans', 'explanation', 'verdict', 'missed_flag', 'root_cause', 'is_claim', 'notes']

const key = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

/** Seed per fixture: independent of fixture order. */
export const sampleSeed = (fixture) => parseInt(createHash('sha256').update(`${fixture}:${SAMPLE_SEED}`).digest('hex').slice(0, 8), 16)

export function reviewRows(fixture, units, engine) {
  const byId = new Map(engine.map((r) => [r.unit_id, r]))
  const rows = []
  const unflagged = []
  for (const u of units) {
    const e = byId.get(u.id)
    const c = e.claim
    const flags = []
    if (c?.flag) flags.push({
      type: c.flag,
      spans: { boosters: c.certainty.boosters, hedges: c.certainty.hedges, citations: c.citations.map((x) => x.raw) },
      explanation: c.explanation,
    })
    if (c?.overreach) flags.push({
      type: 'causal-overreach',
      spans: { register_cues: c.register_cues.map((x) => x.root), design_evidence: c.overreach.explanation.designEvidence },
      explanation: { distance: c.overreach.distance, ...c.overreach.explanation },
    })
    for (const f of flags) rows.push({ kind: 'flag', flag_type: f.type, unit: u, extracted: true, spans: f.spans, explanation: f.explanation })
    if (!flags.length) unflagged.push({ u, e })
  }
  const rand = mulberry32(sampleSeed(fixture))
  const sample = unflagged.map((x) => [rand(), x]).sort((a, b) => a[0] - b[0]).slice(0, SAMPLE_SIZE).map(([, x]) => x)
  const order = new Map(units.map((u, i) => [u.id, i]))
  sample.sort((a, b) => order.get(a.u.id) - order.get(b.u.id))
  for (const { u, e } of sample) {
    rows.push({
      kind: 'sample', flag_type: '', unit: u, extracted: e.extracted, spans: null,
      explanation: e.extracted ? { tier: e.claim.tier, register: e.claim.register, rung: e.claim.rung, function: e.claim.function } : { drop_rule: e.drop_rule },
    })
  }
  const table = rows.map((r, i) => ({
    row_id: `${fixture}:${r.kind}:${i}`,
    kind: r.kind, flag_type: r.flag_type, unit_id: r.unit.id, page: r.unit.page ?? '', section: r.unit.section ?? '',
    extracted: r.extracted ? 'yes' : 'no', sentence: r.unit.text,
    evidence_spans: r.spans ? JSON.stringify(r.spans) : '', explanation: JSON.stringify(r.explanation),
    verdict: '', missed_flag: '', root_cause: '', is_claim: '', notes: '',
  }))
  const flaggedUnits = new Set(rows.filter((r) => r.kind === 'flag').map((r) => r.unit.id))
  const meta = {
    fixture,
    units: units.length,
    claims: engine.filter((r) => r.extracted).length,
    flagRows: rows.filter((r) => r.kind === 'flag').length,
    flagRowsByType: rows.filter((r) => r.kind === 'flag').reduce((m, r) => ({ ...m, [r.flag_type]: (m[r.flag_type] || 0) + 1 }), {}),
    flaggedUnits: flaggedUnits.size,
    unflaggedUnits: unflagged.length,
    unflaggedExtracted: unflagged.filter((x) => x.e.extracted).length,
    sample: sample.length,
    sampleExtracted: sample.filter((x) => x.e.extracted).length,
    sampleSeed: sampleSeed(fixture),
  }
  return { table, meta }
}

export function signalRows(fixture, doc, units) {
  const keyed = units.map((u) => [u.id, key(u.text)])
  const rows = []
  for (const s of doc.signals) {
    s.evidence.forEach((span, i) => {
      const k = key(span)
      const hits = k ? keyed.filter(([, uk]) => uk.includes(k) || k.includes(uk)).map(([id]) => id) : []
      rows.push({ fixture, signal_id: s.id, severity: s.severity, span_index: i, span, unit_ids: hits.join(';'), summary: s.summary })
    })
  }
  return rows
}

// ── CSV ──────────────────────────────────────────────────────────────────────
const cell = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
export const toCsv = (rows, columns) => [columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\n') + '\n'

export function parseCsv(text) {
  const records = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); records.push(row); row = []; field = ''
    } else field += ch
  }
  if (field || row.length) { row.push(field); records.push(row) }
  const [head, ...body] = records.filter((r) => r.some((x) => x !== ''))
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])))
}

// ── Scores from Kyle's labels ───────────────────────────────────────────────
const lc = (s) => String(s || '').toLowerCase()

/** @returns {null | object} null when no labeled file exists */
export function scoreReview(fixture) {
  const path = join(LABELED_DIR, `${fixture}.csv`)
  const metaPath = join(REVIEW_DIR, `${fixture}.meta.json`)
  if (!existsSync(path) || !existsSync(metaPath)) return null
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  const rows = parseCsv(readFileSync(path, 'utf8'))
  const flags = rows.filter((r) => r.kind === 'flag')
  const sample = rows.filter((r) => r.kind === 'sample')

  const precision = {}
  for (const type of [...new Set(flags.map((r) => r.flag_type))].sort()) {
    const of = flags.filter((r) => r.flag_type === type)
    const tp = of.filter((r) => lc(r.verdict) === 'tp').length
    const fp = of.filter((r) => lc(r.verdict) === 'fp').length
    precision[type] = { rows: of.length, labeled: tp + fp, tp, fp, precision: tp + fp ? +(tp / (tp + fp)).toFixed(3) : null }
  }
  const rootCauses = {}
  for (const r of flags) if (lc(r.verdict) === 'fp') { const k = r.root_cause || '(none given)'; rootCauses[k] = (rootCauses[k] || 0) + 1 }

  const judged = sample.filter((r) => ['ok', 'miss'].includes(lc(r.verdict)))
  const misses = judged.filter((r) => lc(r.verdict) === 'miss')
  const missRate = judged.length ? misses.length / judged.length : null
  const missedFlags = {}
  for (const r of misses) { const k = r.missed_flag || '(unspecified)'; missedFlags[k] = (missedFlags[k] || 0) + 1 }

  // Leakage over extracted claims: flagged units (all reviewed) + unflagged
  // extracted units (estimated from the sample).
  const flaggedClaim = new Map()
  for (const r of flags) if (['yes', 'no'].includes(lc(r.is_claim)) && !flaggedClaim.has(r.unit_id)) flaggedClaim.set(r.unit_id, lc(r.is_claim))
  const fLabeled = flaggedClaim.size
  const fNon = [...flaggedClaim.values()].filter((v) => v === 'no').length
  const sExtracted = sample.filter((r) => r.extracted === 'yes' && ['yes', 'no'].includes(lc(r.is_claim)))
  const sNon = sExtracted.filter((r) => lc(r.is_claim) === 'no').length
  let leakage = null
  if (fLabeled && sExtracted.length) {
    const nonClaims = (fNon / fLabeled) * meta.flaggedUnits + (sNon / sExtracted.length) * meta.unflaggedExtracted
    leakage = +(nonClaims / (meta.flaggedUnits + meta.unflaggedExtracted)).toFixed(3)
  }
  return {
    fixture,
    label_tier: 'gold',
    precision,
    falsePositiveRootCauses: rootCauses,
    miss: { sampleRows: sample.length, judged: judged.length, misses: misses.length, missRate: missRate == null ? null : +missRate.toFixed(3),
      estimatedMisses: missRate == null ? null : Math.round(missRate * meta.unflaggedUnits), unflaggedUnits: meta.unflaggedUnits, missedFlags },
    leakage: { value: leakage, flaggedUnits: meta.flaggedUnits, flaggedLabeled: fLabeled, flaggedNonClaims: fNon,
      unflaggedExtracted: meta.unflaggedExtracted, sampleExtractedLabeled: sExtracted.length, sampleNonClaims: sNon },
  }
}
