// ─────────────────────────────────────────────────────────────────────────────
// Sentence units — the app's own segmentation, with stable ids (change set 1).
//
// splitSentences is the engine's own (src/engine/extractClaims.js). It was a
// copy while the engine was frozen (change set 1); the copy had already fallen
// behind on superscript markers when paragraph-aware splitting came in, so the
// units now import it. checks/benchmark-guards.test.mjs fails if extractClaims
// ever returns a claim that is not, in order, one of these units.
//
// A unit is one sentence of the body analyze() reads (the text before the
// reference list, measure/segment.js), in document order:
//   { id, fixture, page, index, hash, text, section, pageReason?, pageBasis? }
//   id       `${fixture}:p${page ?? 0}:${index}:${hash}`
//   page     1-based page the sentence starts on; null when the source has no
//            pages (HTML) or the sentence was not found on any page (pageReason).
//            pageBasis says when a later window, not the start, placed it.
//   index    position among the units on that page (page 0 = no page)
//   hash     first 12 hex of sha256(text)
//   section  the IMRaD section extractClaims tracks (sectionOpenedBy)
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto'
import { segmentDocument, sectionOpenedBy } from '../../src/engine/measure/segment.js'
import { pageLocator } from '../../src/engine/pages.js'
import { splitSentences } from '../../src/engine/extractClaims.js'

export { splitSentences }

export const HASH_CHARS = 12      // PROVISIONAL — not ratified
// The page locator lives in src/engine/pages.js, where the results page uses it too.
export { PAGE_PREFIX, PAGE_PREFIX_MIN } from '../../src/engine/pages.js'

export const textHash = (s) => createHash('sha256').update(s).digest('hex').slice(0, HASH_CHARS)

/**
 * @param {string} fixture  fixture id
 * @param {string} text     the document text analyze() receives
 * @param {string[]|null} pages  per-page text from the PDF, or null (no pages)
 */
export function buildUnits(fixture, text, pages) {
  const { body } = segmentDocument(text)
  const locate = pages ? pageLocator(pages) : null
  const perPage = new Map()
  const units = []
  let section = null
  for (const sentence of splitSentences(body || '')) {
    section = sectionOpenedBy(sentence) || section
    const where = locate ? locate(sentence) : { page: null, reason: 'source has no pages' }
    const p = where.page ?? 0
    const index = perPage.get(p) ?? 0
    perPage.set(p, index + 1)
    const hash = textHash(sentence)
    units.push({
      id: `${fixture}:p${p}:${index}:${hash}`,
      fixture, page: where.page, index, hash, text: sentence, section,
      ...(where.reason ? { pageReason: where.reason } : {}),
      ...(where.basis ? { pageBasis: where.basis } : {}),
    })
  }
  return units
}
