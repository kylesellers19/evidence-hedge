// ─────────────────────────────────────────────────────────────────────────────
// Document-signal registry — name → function.
//
// Document signals are architecturally distinct from per-claim flags: they feed
// the verdict and render in their own results section; they never attach to a
// sentence. Each rubric's `documentSignals` array lists the names it runs;
// analyze.js executes them after the per-claim stages.
//
// Signal function signature (documented): (doc, claims, citations, posture).
// A 5th `ctx = { rubric, profile }` is passed for the signals that need rubric
// internals (ladder/tiers/nullSeverity) or the document profile (provenance,
// design); signals that don't need it ignore it.
// ─────────────────────────────────────────────────────────────────────────────

import { signals as research } from './research.js'
import { signals as corporate } from './corporate.js'
import { signals as journalism } from './journalism.js'
import { signals as general } from './general.js'
import { signals as completeness } from './completeness.js'
import { signals as hybrid } from './hybrid.js'

/** @type {Record<string, Function>} */
export const SIGNAL_REGISTRY = {
  ...research,
  ...corporate,
  ...journalism,
  ...general,
  ...completeness,
  ...hybrid,
}

// Which genre each signal comes from: 'shared' runs under every rubric,
// 'hybrid' only in the hybrid scenarios that list it (rubrics/hybrids.js).
export const SIGNAL_ORIGIN = Object.fromEntries([
  ...Object.keys(research).map((k) => [k, 'research']),
  ...Object.keys(corporate).map((k) => [k, 'corporate']),
  ...Object.keys(journalism).map((k) => [k, 'journalism']),
  ...Object.keys(general).map((k) => [k, 'general']),
  ...Object.keys(completeness).map((k) => [k, 'shared']),
  ...Object.keys(hybrid).map((k) => [k, 'hybrid']),
])

/** Names that exist in the registry (used by the validator's resolution check). */
export const SIGNAL_NAMES = Object.keys(SIGNAL_REGISTRY)

/**
 * Run the signals a rubric declares, in order, dropping nulls.
 * @returns {import('../types.js').Signal[]}
 */
export function runSignals(doc, claims, citations, posture, rubric, profile = null) {
  const names = rubric.documentSignals || []
  const out = []
  for (const name of names) {
    const fn = SIGNAL_REGISTRY[name]
    if (!fn) continue
    const sig = fn(doc, claims, citations, posture, { rubric, profile })
    if (sig) out.push(sig)
  }
  return out
}
