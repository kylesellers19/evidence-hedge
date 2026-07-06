// ─────────────────────────────────────────────────────────────────────────────
// Rubric contract validator — the JS-world replacement for "the build fails".
//
// There is no compiler, so this script IS the enforcement: it imports the
// registry and asserts every config satisfies the RubricConfig contract, exiting
// non-zero with a named failure on any violation. Also table-tests the
// nullSeverity invariants for every rubric × posture × tier.
//
// Run: npm run check:rubrics
// ─────────────────────────────────────────────────────────────────────────────

import { listRubrics } from '../src/rubrics/index.js'
import { severityRank, SEVERITY } from '../src/engine/nullSeverity.js'
import { SIGNAL_REGISTRY } from '../src/engine/signals/index.js'

const errors = []
const fail = (rubricId, msg) => errors.push(`[${rubricId}] ${msg}`)

const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v)
const isStringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string')

for (const r of listRubrics()) {
  const id = r?.id || '(no id)'

  // ── Identity ──────────────────────────────────────────────────────────────
  for (const f of ['id', 'label', 'description', 'documentNoun', 'defaultTier', 'defaultPosture']) {
    if (!isNonEmptyString(r[f])) fail(id, `field "${f}" must be a non-empty string`)
  }
  if ('stub' in r && typeof r.stub !== 'boolean') fail(id, `"stub" must be boolean when present`)

  // ── Ladder ────────────────────────────────────────────────────────────────
  if (!Array.isArray(r.ladder) || r.ladder.length === 0) {
    fail(id, `"ladder" must be a non-empty array`)
  } else {
    r.ladder.forEach((rung, i) => {
      if (!isNonEmptyString(rung.key)) fail(id, `ladder[${i}].key missing`)
      if (!isNonEmptyString(rung.label)) fail(id, `ladder[${i}].label missing`)
      if (!isNumber(rung.rank)) fail(id, `ladder[${i}].rank must be a number`)
    })
  }
  const ladderLen = Array.isArray(r.ladder) ? r.ladder.length : 0

  // ── Tiers ─────────────────────────────────────────────────────────────────
  if (!Array.isArray(r.tiers) || r.tiers.length === 0) {
    fail(id, `"tiers" must be a non-empty array`)
  } else {
    r.tiers.forEach((t, i) => {
      if (!isNonEmptyString(t.key)) fail(id, `tiers[${i}].key missing`)
      if (!isNumber(t.weight)) fail(id, `tiers[${i}].weight must be a number`)
      if (!isStringArray(t.cues)) fail(id, `tiers[${i}].cues must be a string[]`)
    })
    if (isNonEmptyString(r.defaultTier) && !r.tiers.some((t) => t.key === r.defaultTier)) {
      fail(id, `defaultTier "${r.defaultTier}" does not match any tier.key`)
    }
  }
  const tierCount = Array.isArray(r.tiers) ? r.tiers.length : 0

  // ── Extraction ────────────────────────────────────────────────────────────
  const ex = r.extraction
  if (!ex || typeof ex !== 'object') {
    fail(id, `"extraction" must be an object`)
  } else {
    if (!isNumber(ex.sensitivity)) fail(id, `extraction.sensitivity must be a number`)
    if (!isNumber(ex.minClaimLength)) fail(id, `extraction.minClaimLength must be a number`)
    if (!ex.assertivenessCues || !isStringArray(ex.assertivenessCues.boosters) || !isStringArray(ex.assertivenessCues.hedges)) {
      fail(id, `extraction.assertivenessCues must have string[] boosters + hedges`)
    }
  }

  // ── Postures ──────────────────────────────────────────────────────────────
  if (!isStringArray(r.postures) || r.postures.length === 0) {
    fail(id, `"postures" must be a non-empty string[]`)
  } else if (isNonEmptyString(r.defaultPosture) && !r.postures.includes(r.defaultPosture)) {
    fail(id, `defaultPosture "${r.defaultPosture}" not in postures [${r.postures.join(', ')}]`)
  }
  const postures = Array.isArray(r.postures) ? r.postures : []

  // ── Tolerance: ceilings (posture-keyed, rank-indexed) ─────────────────────
  const tol = r.tolerance
  if (!tol || typeof tol !== 'object') {
    fail(id, `"tolerance" must be an object`)
  } else {
    const ceilings = tol.ceilings
    if (!ceilings || typeof ceilings !== 'object' || Array.isArray(ceilings)) {
      fail(id, `tolerance.ceilings must be an object keyed by posture`)
    } else {
      if (!Array.isArray(ceilings.default)) {
        fail(id, `tolerance.ceilings.default is REQUIRED and must be an array`)
      }
      // Every declared posture must have an explicit ceiling table.
      for (const p of postures) {
        if (!Array.isArray(ceilings[p])) {
          fail(id, `tolerance.ceilings["${p}"] missing (every declared posture needs a table)`)
        }
      }
      // Every ceiling table must be rank-length and numeric; keys must be known.
      for (const [key, table] of Object.entries(ceilings)) {
        if (key !== 'default' && !postures.includes(key)) {
          fail(id, `tolerance.ceilings has key "${key}" that is not a declared posture`)
        }
        if (!Array.isArray(table)) { fail(id, `tolerance.ceilings["${key}"] must be an array`); continue }
        if (table.length !== ladderLen) {
          fail(id, `tolerance.ceilings["${key}"] length ${table.length} ≠ ladder length ${ladderLen}`)
        }
        if (!table.every(isNumber)) fail(id, `tolerance.ceilings["${key}"] must be all numbers`)
      }
    }

    // ── Tolerance: nullSeverity (function) + INVARIANTS ─────────────────────
    if (typeof tol.nullSeverity !== 'function') {
      fail(id, `tolerance.nullSeverity must be a function`)
    } else if (tierCount > 0) {
      const ns = tol.nullSeverity
      const topTier = tierCount - 1
      for (const p of postures) {
        for (let t = 0; t < tierCount; t++) {
          const u = ns(t, p, false) // undisclosed
          const d = ns(t, p, true)  // disclosed
          if (!SEVERITY.includes(u) || !SEVERITY.includes(d)) {
            fail(id, `nullSeverity(${t}, "${p}") returned a non-severity value`)
            continue
          }
          // Invariant 1: disclosed ≤ undisclosed at every tier.
          if (severityRank(d) > severityRank(u)) {
            fail(id, `nullSeverity invariant: disclosed(${d}) > undisclosed(${u}) at tier ${t}, posture "${p}"`)
          }
          // Invariant 2: undisclosed absence at the highest tier is 'critical'.
          if (t === topTier && u !== 'critical') {
            fail(id, `nullSeverity invariant: top-tier undisclosed must be 'critical', got "${u}" for posture "${p}"`)
          }
          // Invariant 3: general/experiential returns 'none' for low tiers (0,1).
          if (id === 'general' && p === 'experiential' && t <= 1 && u !== 'none') {
            fail(id, `nullSeverity invariant: general/experiential low tier ${t} must be 'none', got "${u}"`)
          }
          // Invariant 4: corporate/marketing is 'none'|'note' except at the top tier.
          if (id === 'corporate' && p === 'marketing' && t < topTier && !(u === 'none' || u === 'note')) {
            fail(id, `nullSeverity invariant: corporate/marketing tier ${t} must be 'none'|'note', got "${u}"`)
          }
        }
      }
    }
  }

  // ── documentSignals (each must resolve to a registered signal) ────────────
  if (!isStringArray(r.documentSignals)) {
    fail(id, `"documentSignals" must be a string[]`)
  } else {
    for (const name of r.documentSignals) {
      if (!(name in SIGNAL_REGISTRY)) fail(id, `documentSignals["${name}"] is not a registered signal`)
    }
  }

  // ── Provenance ────────────────────────────────────────────────────────────
  if (!Array.isArray(r.provenance) || r.provenance.length === 0) {
    fail(id, `"provenance" must be a non-empty array`)
  } else {
    r.provenance.forEach((p, i) => {
      for (const f of ['criterion', 'standard', 'citation']) {
        if (!isNonEmptyString(p[f])) fail(id, `provenance[${i}].${f} must be a non-empty string`)
      }
      if (typeof p.url !== 'string') fail(id, `provenance[${i}].url must be a string (may be '')`)
    })
  }
}

if (errors.length) {
  console.error(`✗ Rubric contract validation FAILED (${errors.length} error${errors.length === 1 ? '' : 's'}):`)
  for (const e of errors) console.error('  · ' + e)
  process.exit(1)
}
console.log('✓ Rubric contract valid — all four configs satisfy the contract and nullSeverity invariants.')
process.exit(0)
