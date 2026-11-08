// ─────────────────────────────────────────────────────────────────────────────
// Reference-list parsing and marker resolution (change set 4, Part B).
//
// parseReferences(texts) → entries with their number (numbered lists), first
// author and year (author-year lists), DOI and URL.
// resolveMarker(anchor, entries) → for each citation inside a marker ("[3, 5]",
// "(Allen et al. 2016; Satish et al. 2012)", "Satish et al. (2012)"): the entry
// it points to, or none — a marker with no matching entry is an
// unresolved-marker link, never a silent miss. Rubric-invariant.
// ─────────────────────────────────────────────────────────────────────────────

import { REF_NUMBER, REF_YEAR, AUTHOR_YEAR_PAIR } from './lexicons/linkage.js'

/**
 * @typedef {Object} ReferenceEntry
 * @property {number}  index        position in the document's reference list
 * @property {string}  text
 * @property {?number} number       for numbered lists
 * @property {?string} firstAuthor  surname (or the organization) for author-year lists
 * @property {?string} year
 * @property {?string} doi
 * @property {?string} url
 */

/** @param {string[]} texts @returns {ReferenceEntry[]} */
export function parseReferences(texts) {
  return texts.map((raw, index) => {
    const text = String(raw).replace(/\s+/g, ' ').trim()
    const num = text.match(REF_NUMBER)
    const rest = num ? text.slice(num[0].length) : text
    const author = rest.match(/^([A-Z][\p{L}'’-]+(?:\s+[A-Z][\p{L}'’-]+){0,5}?)(?=,|\.\s|\s+\(|\s+et\s+al|\s+and\s|\s+&)/u)
    const year = rest.slice(0, 240).match(REF_YEAR)
    return {
      index,
      text: text.slice(0, 240),
      number: num ? Number(num[1]) : null,
      firstAuthor: author ? author[1] : null,
      year: year ? (year[1] || year[2]) : null,
      doi: (text.match(/\b10\.\d{4,}\/[^\s,;]+/) || [null])[0]?.replace(/[.)]+$/, '') || null,
      url: (text.match(/https?:\/\/[^\s)]+/) || [null])[0],
    }
  })
}

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * @param {{ type: string, raw: string }} anchor   a numeric or author-year token
 * @param {ReferenceEntry[]} entries
 * @returns {{ cite: string, entry: ?ReferenceEntry, ambiguous: boolean }[]}
 */
export function resolveMarker(anchor, entries) {
  if (anchor.type === 'numeric') {
    const nums = []
    for (const part of anchor.raw.replace(/[[\]]/g, '').split(',')) {
      const range = part.match(/(\d+)\s*[-–]\s*(\d+)/)
      if (range) { for (let n = Number(range[1]); n <= Number(range[2]) && nums.length < 50; n++) nums.push(n) }
      else if (/\d/.test(part)) nums.push(Number(part.trim()))
    }
    return nums.map((n) => {
      const hits = entries.filter((e) => e.number === n)
      return { cite: `[${n}]`, entry: hits[0] || null, ambiguous: hits.length > 1 }
    })
  }
  const out = []
  for (const m of anchor.raw.matchAll(AUTHOR_YEAR_PAIR)) {
    const [cite, surname, year] = m
    const s = norm(surname)
    const hits = entries.filter((e) => e.year === year && (
      (e.firstAuthor && norm(e.firstAuthor).split(/\s+/).some((w) => w === s)) ||
      new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(norm(e.text.slice(0, 100)))))
    out.push({ cite: cite.trim(), entry: hits[0] || null, ambiguous: hits.length > 1 })
  }
  return out
}
