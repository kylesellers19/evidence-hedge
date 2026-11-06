// ─────────────────────────────────────────────────────────────────────────────
// routeDocument(text, { sourceUrl }) → { rubric, posture, confidence, profile, reasons }
//
// Routing starts from WHO is speaking (profile/provenance.js), then refines
// with genre markers:
//   firm-vendor, academic-press-office            → corporate
//   news-outlet, trade-press                      → journalism
//   peer-reviewed-journal, government, nonprofit  → research
//   individual, unknown                           → general, unless the text
//       carries research structure, a press release, reporting, or a sales page
// The posture is classifyPosture's read for the routed rubric, so the branch
// screen and the route agree. autodetect(text) is a wrapper over this.
// ─────────────────────────────────────────────────────────────────────────────

import { profileDocument } from '../engine/profile/index.js'
import { classifyPosture } from '../engine/classifyPosture.js'
import { research } from './research.config.js'
import { corporate } from './corporate.config.js'
import { journalism } from './journalism.config.js'
import { general } from './general.config.js'

const CONFIGS = { research, corporate, journalism, general }

export const PROVENANCE_RUBRIC = { // PROVISIONAL — not ratified
  'firm-vendor': 'corporate',
  'academic-press-office': 'corporate',
  'news-outlet': 'journalism',
  'trade-press': 'journalism',
  'peer-reviewed-journal': 'research',
  government: 'research',
  'nonprofit-research': 'research',
  individual: 'general',
  unknown: 'general',
}

// Genre markers, each counted once. PROVISIONAL — not ratified.
const GENRE = {
  research: [/\bAbstract\b/, /\bIntroduction\b/, /\b(?:Materials and )?Methods\b/, /\bResults\b/, /\bDiscussion\b/, /\bdoi:?\s*10\.|doi\.org\/10\./i, /\bet al\.?/, /\bp\s*[<=]\s*0?\.\d/],
  press: [/\bfor immediate release\b/i, /\bpress release\b/i, /\bmedia contacts?\b/i, /^\s*###\s*$/m, /\b(?:today )?announced(?: today)?\b/i, /^[A-Z][A-Za-z .]+,\s+[A-Z]{2}\.?\s+[–—-]\s/m],
  journalism: [/\bBy\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/, /\b(?:said|says|told)\b/, /\baccording to\b/i, /[“"][^”"]{20,}[”"]/],
  marketing: [/\b(?:contact us|learn more|get started|sign up|buy now|shop now|request a demo|add to cart)\b/i, /\b(?:our|we)\s+(?:products?|solutions?|platform|services)\b/i],
}
const count = (text, list) => list.filter((re) => re.test(text)).length
export const GENRE_MIN = 3 // PROVISIONAL — not ratified

/**
 * @param {string} text
 * @param {{ sourceUrl?: string }} [options]
 */
export function routeDocument(text = '', { sourceUrl = '' } = {}) {
  const profile = profileDocument(text, { sourceUrl })
  const kind = profile.provenance.kind
  let rubric = PROVENANCE_RUBRIC[kind] || 'general'
  const reasons = [`provenance ${kind} → ${rubric}`]

  if (rubric === 'general') {
    const g = Object.fromEntries(Object.entries(GENRE).map(([k, list]) => [k, count(text, list)]))
    const refine = [['research', 'research'], ['press', 'corporate'], ['journalism', 'journalism'], ['marketing', 'corporate']]
      .find(([k]) => g[k] >= GENRE_MIN)
    if (refine) { rubric = refine[1]; reasons.push(`${refine[0]} markers (${g[refine[0]]}) → ${rubric}`) }
  }

  const { posture, confidence } = classifyPosture(text, CONFIGS[rubric])
  return { rubric, posture, confidence, profile, reasons }
}
