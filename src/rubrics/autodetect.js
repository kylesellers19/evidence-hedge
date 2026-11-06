// ─────────────────────────────────────────────────────────────────────────────
// autodetect(text, options) → rubric id
//
// A wrapper over routeDocument (rubrics/route.js): provenance first, then genre
// markers. It only chooses which pluggable config gets handed to analyze() —
// the engine special-cases nothing.
// ─────────────────────────────────────────────────────────────────────────────

import { routeDocument } from './route.js'

/** @returns {string} a rubric id */
export function autodetect(text = '', options = {}) {
  return routeDocument(text, options).rubric
}
