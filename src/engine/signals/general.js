// General-web document-level signals.
import { wordRe } from './util.js'
import { YMYL_TERMS } from '../lexicons/ymyl.js'

/** @typedef {import('../types.js').Signal} Signal */

const PRESCRIPTIVE = /\b(you should|you must|you need to|never|always|do not|don't|avoid|make sure to|be sure to)\b/i

// 13. posture-gate — experiential writing with ZERO authority markers makes no
//     expert claims, so there is no evidence obligation. A first-class verdict
//     (analyze.js zeroes flags and uses the gate verdict), not an empty state.
function postureGate(doc, claims, citations, posture) {
  if (posture !== 'experiential') return null
  const hasPrescriptive = PRESCRIPTIVE.test(doc)
  const hasYmyl = YMYL_TERMS.some((t) => wordRe(t).test(doc))
  const hasCitations = citations.length > 0
  if (hasPrescriptive || hasYmyl || hasCitations) return null
  return {
    id: 'posture-gate',
    severity: 'note',
    gate: true,
    summary: 'Experiential writing with no authority markers — it makes no expert claims, so there is no evidence obligation to assess.',
    evidence: [],
  }
}

export const signals = {
  'posture-gate': postureGate,
}
