// ─────────────────────────────────────────────────────────────────────────────
// Rubric registry — the ONLY place that knows the four configs exist.
//
// A flat id → config map. The entry screen calls listRubrics() to render cards;
// selection resolves a config via getRubric(id); analyze(doc, rubric) injects it
// into the engine. A fifth document type later = import it + add one line here.
// No engine code changes, ever.
// ─────────────────────────────────────────────────────────────────────────────

import { research } from './research.config.js'
import { corporate } from './corporate.config.js'
import { journalism } from './journalism.config.js'
import { general } from './general.config.js'

// Re-exported here so the entry flow imports detection + registry from one place.
export { autodetect } from './autodetect.js'

/** @type {Record<string, import('../engine/types.js').RubricConfig>} */
export const RUBRICS = {
  research,
  corporate,
  journalism,
  general,
}

// Display order on the entry screen (anchors first).
export const RUBRIC_ORDER = ['research', 'corporate', 'journalism', 'general']

/** @returns {import('../engine/types.js').RubricConfig[]} */
export function listRubrics() {
  return RUBRIC_ORDER.map(id => RUBRICS[id])
}

/** @returns {import('../engine/types.js').RubricConfig | undefined} */
export function getRubric(id) {
  return RUBRICS[id]
}
