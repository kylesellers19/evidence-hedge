// ─────────────────────────────────────────────────────────────────────────────
// profileDocument(text, { sourceUrl }) → { provenance, design, genre, references }
//
// Who is speaking, what study stands behind it, and which genres the document
// mixes — computed once per document, identical under every rubric. Routing
// (rubrics/route.js) starts from it, the causal-overreach flag and the scoring
// discounts read it, and the results page shows it as "Document profile" and
// "How it was judged".
// ─────────────────────────────────────────────────────────────────────────────

import { segmentDocument } from '../measure/segment.js'
import { profileProvenance } from './provenance.js'
import { profileDesign } from './design.js'
import { profileGenre } from './genre.js'
import { publisherNames } from '../attribution.js'

const URL_RE = /https?:\/\/[^\s)]+/g

/**
 * @param {string} text
 * @param {{ sourceUrl?: string }} [options]
 */
export function profileDocument(text, { sourceUrl = '' } = {}) {
  const { body, references } = segmentDocument(text || '')
  const claimUrls = (body.match(URL_RE) || [])
  const provenance = profileProvenance(body, { sourceUrl, references: references.map((t) => ({ text: t })), claimUrls })
  const publisher = publisherNames(provenance, body)
  const design = profileDesign(body, { provenance: provenance.kind, references: references.length, publisher })
  const genre = profileGenre(body, { sourceUrl, provenance, design })
  return { provenance: { ...provenance, publisher }, design, genre, referenceCount: references.length }
}
