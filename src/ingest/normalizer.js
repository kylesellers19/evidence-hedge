// ─────────────────────────────────────────────────────────────────────────────
// Post-extraction text normalizer (input plumbing — pre-Stage-1).
//
// Shared by PDF extraction, DOCX extraction, AND pasted text (paste of PDF text
// is the known artifact source), so there is one code path and no divergence.
// It:
//   a. rejoins end-of-line hyphenation (word-\nword → wordword), guarded by a
//      lexicon so true hyphenated compounds ("evidence-based") keep their hyphen;
//   b. strips repeated per-page headers/footers — any short line whose normalized
//      text recurs on ≥ HEADER_FOOTER_PAGE_FRACTION of pages (PROVISIONAL);
//   c. strips bare page numbers / page-number pairs ("02 03", "12", "Page 4 of
//      30") as standalone lines, leading/trailing tokens, or fused mid-sentence;
//   d. collapses soft line breaks inside paragraphs, preserving true paragraph
//      breaks (blank-line heuristic);
//   e. un-splices a URL that a margin column wedged into the middle of a word
//      ("princihttp://www.neuro-architecture.com/ ples" → "principles http://…").
// Pure functions, independently testable. No DOM, no async.
// ─────────────────────────────────────────────────────────────────────────────

import { HYPHENATED_COMPOUNDS } from './hyphenatedCompounds.js'

// PROVISIONAL — recurrence threshold for header/footer detection. Surface for
// ratification: a line is treated as a running header/footer if it appears on at
// least this fraction of pages.
export const HEADER_FOOTER_PAGE_FRACTION = 0.4
const HEADER_FOOTER_MAX_LEN = 160 // a running header can carry a title, an author and a page number
const MIN_PAGES_FOR_HF = 3       // need enough pages for the fraction to be meaningful
// A line in a page's top or bottom few lines is where running headers and
// footers sit; there a smaller share of pages is enough, since body text does
// not repeat word for word at a page's edge (alternating left and right
// headers, section headers that change every few pages). PROVISIONAL.
export const EDGE_LINES = 3
export const EDGE_PAGE_FRACTION = 0.15
const EDGE_MIN_PAGES = 3

// ── (a) hyphenation rejoin ───────────────────────────────────────────────────
export function rejoinHyphenation(text) {
  return text.replace(/(\w+)-\n[ \t]*(\w+)/g, (_m, a, b) => {
    const compound = `${a}-${b}`.toLowerCase()
    // Keep the hyphen for known compounds or proper compounds (Uppercase 2nd part).
    if (HYPHENATED_COMPOUNDS.has(compound) || /^[A-Z]/.test(b)) return `${a}-${b}`
    return `${a}${b}`
  })
}

// ── (c) page-number artifacts ────────────────────────────────────────────────
const PAGE_LINE = /^\s*(?:\d{1,3}|\d{1,3}(?:\s+\d{1,3})+|page\s+\d+(?:\s+of\s+\d+)?|\d{1,3}\s*\/\s*\d{1,3})\s*$/i
// Fused mid-sentence page numbers: "…word.02 03Word" → "…word. Word". Only
// zero-padded singles ("02") or multi-number runs ("02 03") to avoid eating real
// numbers like "…founded.3 people…".
const FUSED_PAGE = /([.!?])\s*(?:0\d{1,2}|\d{1,3}(?:\s+\d{1,3})+)\s*(?=["'“(]?[A-Z])/g
const LEAD_PAGE = /^\s*0\d{1,2}\s+(?=\S)/
const TRAIL_PAGE = /\s+0\d{1,2}\s*$/

function stripPageLines(lines) {
  return lines
    .filter((l) => !PAGE_LINE.test(l))
    .map((l) => l.replace(LEAD_PAGE, '').replace(TRAIL_PAGE, ''))
}

export function stripFusedPageNumbers(text) {
  return text.replace(FUSED_PAGE, '$1 ')
}

// ── (b) repeated header/footer strip across pages ────────────────────────────
// Page numbers, arabic or roman, do not make a header line differ from page to page.
const hfNorm = (s) => s.trim().toLowerCase().replace(/\d+/g, '#').replace(/\b[ivxlc]{1,6}\b(?=\s*(?:$|of\b|\||[-–—]))/g, '#').replace(/\s+/g, ' ')

export function stripHeadersFooters(pages) {
  if (!Array.isArray(pages) || pages.length < MIN_PAGES_FOR_HF) return pages
  const linesPerPage = pages.map((p) => p.split('\n'))
  const presence = new Map()
  const atEdge = new Map()
  for (const lines of linesPerPage) {
    const seen = new Set()
    const seenEdge = new Set()
    const filled = lines.map((l, i) => [l.trim(), i]).filter(([t]) => t)
    const edge = new Set([...filled.slice(0, EDGE_LINES), ...filled.slice(-EDGE_LINES)].map(([, i]) => i))
    for (const [t, i] of filled) {
      if (t.length > HEADER_FOOTER_MAX_LEN) continue
      const k = hfNorm(t)
      if (!seen.has(k)) { seen.add(k); presence.set(k, (presence.get(k) || 0) + 1) }
      if (edge.has(i) && !seenEdge.has(k)) { seenEdge.add(k); atEdge.set(k, (atEdge.get(k) || 0) + 1) }
    }
  }
  const threshold = HEADER_FOOTER_PAGE_FRACTION * pages.length
  const edgeThreshold = Math.max(EDGE_MIN_PAGES, EDGE_PAGE_FRACTION * pages.length)
  const repeated = new Set([...presence].filter(([, n]) => n >= threshold).map(([k]) => k))
  for (const [k, n] of atEdge) if (n >= edgeThreshold) repeated.add(k)
  return linesPerPage.map((lines) =>
    lines.filter((l) => {
      const t = l.trim()
      return !(t && t.length <= HEADER_FOOTER_MAX_LEN && repeated.has(hfNorm(t)))
    }).join('\n')
  )
}

// ── (d) collapse soft breaks, preserve paragraphs ────────────────────────────
export function collapseSoftBreaks(text) {
  return text
    .split(/\n[ \t]*\n+/) // blank line = true paragraph break
    .map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean).join(' '))
    .filter(Boolean)
    .join('\n\n')
}

// ── (e) mid-word URL splice ──────────────────────────────────────────────────
// Letters never legitimately abut "http": "envihttps://x.org/ ronment" means a
// margin URL was read into the gap of a broken word. Rejoin the word with the
// first following token that continues it — a lowercase fragment within the
// next two tokens, or (for a capitalized stem, e.g. "Neuro" + "Image") the very
// next capitalized token — and move the URL after it.
const URL_SPLICE = /([A-Za-z][A-Za-z-]*?)(https?:\/\/\S+)((?:\s+\S+){1,2})/g

export function unspliceUrls(text) {
  return text.replace(URL_SPLICE, (whole, stem, url, tail) => {
    const parts = tail.match(/\s+\S+/g) // each token with its own leading whitespace
    const tokens = parts.map((p) => p.trim())
    let k = tokens.findIndex((t) => /^[a-z]/.test(t) && !/^https?:/.test(t))
    if (k < 0 && /^[A-Z]/.test(stem) && /^[A-Z][a-z]/.test(tokens[0])) k = 0
    if (k < 0) return `${stem} ${url}${tail}`
    const rest = parts.filter((_, i) => i !== k).join('')
    return `${stem}${tokens[k]} ${url}${rest}`
  })
}

// ── core single-blob normalizer (paste, txt/md, and post page-join) ──────────
export function normalizeText(text) {
  if (!text) return ''
  let t = text.replace(/\r\n?/g, '\n')
  t = rejoinHyphenation(t)
  t = stripPageLines(t.split('\n')).join('\n')
  t = collapseSoftBreaks(t)
  t = stripFusedPageNumbers(t) // fused numbers surface after lines are joined
  t = unspliceUrls(t)
  t = t.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  return t
}

// ── document normalizer: pages[] (PDF) or string / { text } (DOCX, paste) ────
export function normalizeDocument(input) {
  if (Array.isArray(input)) {
    return normalizeText(stripHeadersFooters(input).join('\n\n'))
  }
  const text = typeof input === 'string' ? input : input?.text || ''
  return normalizeText(text)
}
