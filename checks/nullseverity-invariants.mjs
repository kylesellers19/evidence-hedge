// ─────────────────────────────────────────────────────────────────────────────
// nullSeverity invariants — table-driven test across rubric × posture × tier ×
// disclosed (verification #5). Plain Node, no harness. (Also enforced inside
// validate-rubrics.mjs; this is the standalone table for the checklist.)
//
// Invariants:
//   1. disclosed severity ≤ undisclosed severity at every tier;
//   2. undisclosed absence at the highest tier is always 'critical';
//   3. general/experiential returns 'none' for low tiers (0, 1);
//   4. corporate/marketing returns 'none' | 'note' except at the top tier.
// ─────────────────────────────────────────────────────────────────────────────

import { listRubrics } from '../src/rubrics/index.js'
import { severityRank, SEVERITY } from '../src/engine/nullSeverity.js'

const rows = []
const errors = []

for (const r of listRubrics()) {
  const ns = r.tolerance.nullSeverity
  const tiers = r.tiers.length
  const top = tiers - 1
  for (const p of r.postures) {
    for (let t = 0; t < tiers; t++) {
      const u = ns(t, p, false)
      const d = ns(t, p, true)
      rows.push({ rubric: r.id, posture: p, tier: t, undisclosed: u, disclosed: d })

      if (!SEVERITY.includes(u) || !SEVERITY.includes(d))
        errors.push(`${r.id}/${p} tier ${t}: non-severity value (u=${u}, d=${d})`)
      if (severityRank(d) > severityRank(u))
        errors.push(`${r.id}/${p} tier ${t}: disclosed(${d}) > undisclosed(${u})  [inv 1]`)
      if (t === top && u !== 'critical')
        errors.push(`${r.id}/${p} top tier: undisclosed "${u}" ≠ 'critical'  [inv 2]`)
      if (r.id === 'general' && p === 'experiential' && t <= 1 && u !== 'none')
        errors.push(`${r.id}/${p} tier ${t}: undisclosed "${u}" ≠ 'none'  [inv 3]`)
      if (r.id === 'corporate' && p === 'marketing' && t < top && !(u === 'none' || u === 'note'))
        errors.push(`${r.id}/${p} tier ${t}: undisclosed "${u}" ∉ {none,note}  [inv 4]`)
    }
  }
}

if (errors.length) {
  console.error(`✗ nullSeverity invariants FAILED (${errors.length}):`)
  for (const e of errors) console.error('  · ' + e)
  process.exit(1)
}
console.log(`✓ nullSeverity invariants hold across ${rows.length} (rubric × posture × tier) cells.`)
process.exit(0)
