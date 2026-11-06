// ─────────────────────────────────────────────────────────────────────────────
// autodetect(text, options) → rubric id
//
// A wrapper over routeDocument (rubrics/route.js): the genre roles decide, and
// a hybrid returns its standard's id. It only chooses which pluggable config
// gets handed to analyze() — the engine special-cases nothing.
// ─────────────────────────────────────────────────────────────────────────────

import { routeDocument } from './route.js'

/** @returns {string} a rubric id */
export function autodetect(text = '', options = {}) {
  return routeDocument(text, options).rubric
}
