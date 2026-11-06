// General-web document-level signals.
import { wordRe } from './util.js'
import { YMYL_TERMS } from '../lexicons/ymyl.js'
import { classifyPosture } from '../classifyPosture.js'

/** @typedef {import('../types.js').Signal} Signal */

const PRESCRIPTIVE = /\b(you should|you must|you need to|never|always|do not|don't|avoid|make sure to|be sure to)\b/i

// 13. posture-gate — experiential writing with ZERO authority markers makes no
//     expert claims, so there is no evidence obligation. A first-class verdict
//     (analyze.js zeroes flags and uses the gate verdict), not an empty state.
//     It opens only for a confidently experiential, first-person-singular text
//     of real length that no vendor, newsroom or press office published — a
//     survey page, a trade story or a bot wall never qualifies.
export const GATE_MIN_CONFIDENCE = 0.6 // PROVISIONAL — not ratified
export const GATE_MIN_WORDS = 150      // PROVISIONAL — not ratified
const GATE_BLOCKED_PROVENANCE = new Set(['firm-vendor', 'news-outlet', 'trade-press', 'academic-press-office'])
const FIRST_PERSON_SIGNALS = new Set(['anecdote framing', 'first-person narrative', 'first-person-singular density'])

function postureGate(doc, claims, citations, posture, ctx = {}) {
  if (posture !== 'experiential') return null
  const words = doc.trim() ? doc.trim().split(/\s+/).length : 0
  if (words < GATE_MIN_WORDS) return null
  if (GATE_BLOCKED_PROVENANCE.has(ctx.profile?.provenance?.kind)) return null
  const read = classifyPosture(doc, ctx.rubric || { id: 'general', postures: ['experiential', 'authoritative'] })
  if (read.posture !== 'experiential' || read.confidence < GATE_MIN_CONFIDENCE) return null
  if (!read.evidence.some((e) => FIRST_PERSON_SIGNALS.has(e.signal))) return null
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
