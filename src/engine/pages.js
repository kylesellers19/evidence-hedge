// ─────────────────────────────────────────────────────────────────────────────
// pageLocator(pages) → (text) → { page, basis?, reason? }
//
// Which PDF page a stretch of the analyzed text starts on. The PDF's pages are
// joined and normalized before analyze() reads them, so page breaks are gone
// from the text; this finds a sentence again in the per-page text by its
// letters and digits, which survive hyphenation, line breaks and header/footer
// stripping. Read-only and for display: the evidence section's "Where they
// are" and the checks' sentence units (checks/lib/units.mjs) both use it.
// Moved from checks/lib/units.mjs unchanged.
// ─────────────────────────────────────────────────────────────────────────────

export const PAGE_PREFIX = 40     // PROVISIONAL — not ratified (key chars matched to place a unit)
export const PAGE_PREFIX_MIN = 20 // PROVISIONAL — not ratified (shorter retry)

// Letters and digits only, lowercased.
const key = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

/** @param {string[]} pages  per-page text from the PDF */
export function pageLocator(pages) {
  const keys = pages.map(key)
  const starts = []
  let at = 0
  for (const k of keys) { starts.push(at); at += k.length }
  const all = keys.join('')
  const pageAt = (i) => {
    let p = 0
    while (p + 1 < starts.length && starts[p + 1] <= i) p++
    return p + 1
  }
  let cursor = 0
  // In order first (repeated lines resolve to the next occurrence), then anywhere.
  const find = (probe) => {
    let i = all.indexOf(probe, cursor)
    if (i < 0) i = all.indexOf(probe)
    if (i >= 0) cursor = i + probe.length
    return i
  }
  return (text) => {
    const k = key(text)
    if (!k) return { page: null, reason: 'no letters or digits' }
    for (const n of [PAGE_PREFIX, PAGE_PREFIX_MIN]) {
      const i = find(k.slice(0, n))
      if (i >= 0) return { page: pageAt(i) }
    }
    // The start differs from the page text (an older extraction, or chart labels
    // the normalizer moved): place the unit by a later window, and say so.
    for (let at = PAGE_PREFIX_MIN; at + PAGE_PREFIX_MIN <= k.length; at += PAGE_PREFIX_MIN) {
      const i = find(k.slice(at, at + PAGE_PREFIX_MIN))
      if (i >= 0) return { page: pageAt(i), basis: `window at key offset ${at}` }
    }
    return { page: null, reason: 'not found on any page' }
  }
}
