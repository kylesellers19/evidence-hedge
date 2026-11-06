// ─────────────────────────────────────────────────────────────────────────────
// routeDocument(text, { sourceUrl }) → { rubric, judgment, posture, confidence, profile, reasons }
//
// Routing reads the document's genre roles (engine/profile/genre.js): who is
// speaking, what form the text takes, whose stake stands behind it, and what
// study it rests on. One genre routes to that rubric; a mix routes to the
// hybrid judgment (rubrics/hybrids.js), and `rubric` is its standard — the
// rubric whose evidence ladder the claims are held to. Nothing fills a role →
// general. The posture is classifyPosture's read for the judgment, so the
// branch screen and the route agree. autodetect(text) is a wrapper over this.
// ─────────────────────────────────────────────────────────────────────────────

import { profileDocument } from '../engine/profile/index.js'
import { classifyPosture } from '../engine/classifyPosture.js'
import { judgmentFor, GENRE_LABELS } from './hybrids.js'

const ROLE_NOUN = { speaker: 'speaker', form: 'form', stake: 'stake', evidence: 'evidence' }

/**
 * @param {string} text
 * @param {{ sourceUrl?: string }} [options]
 */
export function routeDocument(text = '', { sourceUrl = '' } = {}) {
  const profile = profileDocument(text, { sourceUrl })
  const { roles, components } = profile.genre
  const judgment = judgmentFor(roles, components)
  const reasons = Object.entries(roles)
    .filter(([, r]) => r)
    .map(([role, r]) => `${ROLE_NOUN[role]} ${r.kind} → ${r.genre}`)
  if (!components.length) reasons.push('no role filled → general')
  reasons.push(judgment.hybrid
    ? `${judgment.genres.map((g) => GENRE_LABELS[g]).join(' × ')} → ${judgment.scenarios.map((s) => s.id).join(' + ')}, held to ${judgment.standard}`
    : `single genre → ${judgment.standard}`)

  const { posture, confidence } = classifyPosture(text, judgment.rubric)
  return { rubric: judgment.standard, judgment, posture, confidence, profile, reasons }
}
