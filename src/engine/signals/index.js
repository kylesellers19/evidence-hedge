// ─────────────────────────────────────────────────────────────────────────────
// Document-signal registry — name → function.
//
// Document signals are architecturally distinct from per-claim flags: they feed
// the verdict and render in their own results section; they never attach to a
// sentence. Each rubric's `documentSignals` array lists the names it runs;
// analyze.js executes them after the per-claim stages.
//
// Signal function signature (documented): (doc, claims, citations, posture).
// A 5th `ctx = { rubric }` is passed for the few signals that need rubric
// internals (ladder/tiers/nullSeverity); signals that don't need it ignore it.
// ─────────────────────────────────────────────────────────────────────────────

import { signals as research } from './research.js'
import { signals as corporate } from './corporate.js'
import { signals as journalism } from './journalism.js'
import { signals as general } from './general.js'

/** @type {Record<string, Function>} */
export const SIGNAL_REGISTRY = {
  ...research,
  ...corporate,
  ...journalism,
  ...general,
}

/** Names that exist in the registry (used by the validator's resolution check). */
export const SIGNAL_NAMES = Object.keys(SIGNAL_REGISTRY)

/**
 * Run the signals a rubric declares, in order, dropping nulls.
 * @returns {import('../types.js').Signal[]}
 */
export function runSignals(doc, claims, citations, posture, rubric) {
  const names = rubric.documentSignals || []
  const out = []
  for (const name of names) {
    const fn = SIGNAL_REGISTRY[name]
    if (!fn) continue
    const sig = fn(doc, claims, citations, posture, { rubric })
    if (sig) out.push(sig)
  }
  return out
}
