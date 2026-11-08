// ─────────────────────────────────────────────────────────────────────────────
// compareClaims(source, restatement) and compareChain([original, conclusion,
// restatement]) — change set 5, Part C.
//
// Reports each dimension separately and lists what it could not resolve. It
// issues no verdict and no overall score.
//
//   causal_strength_change   restatement − source, 0–3 scale (both resolved)
//   certainty_change         restatement − source, tier rank
//   scope_broadening         scope markers present in the restatement, absent
//                            from the source
//   outcome_substitution     set when both outcomes are coded and differ
//   new_causal_agent         set when both exposures are coded and differ
//   population_shift         set when both populations are coded and differ
//   attribution_shift        set when both attributions are determined and differ
//   evidence_trail           the links on each side
// A dimension that cannot be computed is { status: 'unresolved', reason }.
// ─────────────────────────────────────────────────────────────────────────────

import { SCOPE_MARKERS } from './claimRecord.js'

const unresolved = (reason) => ({ status: 'unresolved', reason })
const isResolved = (f) => f && f.status === 'resolved'

function difference(field, a, b, read = (f) => f.value) {
  if (!isResolved(a[field]) || !isResolved(b[field])) {
    return unresolved(`${field} unresolved on the ${!isResolved(a[field]) ? 'source' : 'restatement'} side`)
  }
  return { status: 'resolved', value: read(b[field]) - read(a[field]), from: a[field].value, to: b[field].value }
}

function shift(field, a, b, name) {
  if (!isResolved(a[field]) || !isResolved(b[field])) {
    return unresolved(`${field} not ${a[field]?.reason?.startsWith('not coded') || b[field]?.reason?.startsWith('not coded') ? 'coded' : 'resolved'} on ${!isResolved(a[field]) && !isResolved(b[field]) ? 'either side' : !isResolved(a[field]) ? 'the source side' : 'the restatement side'}`)
  }
  const same = JSON.stringify(a[field].value) === JSON.stringify(b[field].value)
  return { status: 'resolved', value: !same, ...(same ? {} : { [name]: { from: a[field].value, to: b[field].value } }) }
}

/**
 * @param {import('./types.js').ClaimRecord} source
 * @param {import('./types.js').ClaimRecord} restatement
 */
export function compareClaims(source, restatement) {
  const broadened = []
  const unknownMarkers = []
  for (const m of SCOPE_MARKERS) {
    if (!isResolved(source[m]) || !isResolved(restatement[m])) { unknownMarkers.push(m); continue }
    if (restatement[m].value && !source[m].value) broadened.push(m)
  }
  const out = {
    causal_strength_change: difference('causal_strength', source, restatement),
    certainty_change: difference('certainty', source, restatement, (f) => f.rank),
    scope_broadening: unknownMarkers.length === SCOPE_MARKERS.length ? unresolved('scope markers unresolved') : { status: 'resolved', value: broadened, ...(unknownMarkers.length ? { unresolvedMarkers: unknownMarkers } : {}) },
    outcome_substitution: shift('outcome', source, restatement, 'outcome'),
    new_causal_agent: shift('exposure', source, restatement, 'exposure'),
    population_shift: shift('population', source, restatement, 'population'),
    attribution_shift: shift('attribution', source, restatement, 'attribution'),
    evidence_trail: {
      status: 'resolved',
      source: Array.isArray(source.evidence?.value) ? source.evidence.value : [],
      restatement: Array.isArray(restatement.evidence?.value) ? restatement.evidence.value : [],
    },
  }
  out.unresolved = Object.entries(out).filter(([, v]) => v.status === 'unresolved').map(([k, v]) => ({ dimension: k, reason: v.reason }))
  return out
}

/**
 * Each adjacent comparison in a chain, plus the end-to-end one. A chain must
 * be a real chain of documents (an original finding, its academic conclusion or
 * press release, a commercial restatement); this function never assembles one.
 * @param {import('./types.js').ClaimRecord[]} chain
 */
export function compareChain(chain) {
  if (!Array.isArray(chain) || chain.length < 2) throw new Error('compareChain needs at least two records')
  const steps = []
  for (let i = 0; i + 1 < chain.length; i++) steps.push({ from: i, to: i + 1, comparison: compareClaims(chain[i], chain[i + 1]) })
  return { steps, endToEnd: { from: 0, to: chain.length - 1, comparison: compareClaims(chain[0], chain[chain.length - 1]) } }
}
