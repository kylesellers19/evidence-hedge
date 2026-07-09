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
//      breaks (blank-line heuristic).
// Pure functions, independently testable. No DOM, no async.
// ─────────────────────────────────────────────────────────────────────────────

import { HYPHENATED_COMPOUNDS } from './hyphenatedCompounds.js'

// PROVISIONAL — recurrence threshold for header/footer detection. Surface for
// ratification: a line is treated as a running header/footer if it appears on at
// least this fraction of pages.
export const HEADER_FOOTER_PAGE_FRACTION = 0.4
const HEADER_FOOTER_MAX_LEN = 70 // "short line" cap for header/footer candidates
const MIN_PAGES_FOR_HF = 3       // need enough pages for the fraction to be meaningful

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
const hfNorm = (s) => s.trim().toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ')

export function stripHeadersFooters(pages) {
  if (!Array.isArray(pages) || pages.length < MIN_PAGES_FOR_HF) return pages
  const linesPerPage = pages.map((p) => p.split('\n'))
  const presence = new Map()
  for (const lines of linesPerPage) {
    const seen = new Set()
    for (const l of lines) {
      const t = l.trim()
      if (!t || t.length > HEADER_FOOTER_MAX_LEN) continue
      const k = hfNorm(t)
      if (!seen.has(k)) { seen.add(k); presence.set(k, (presence.get(k) || 0) + 1) }
    }
  }
  const threshold = HEADER_FOOTER_PAGE_FRACTION * pages.length
  const repeated = new Set([...presence].filter(([, n]) => n >= threshold).map(([k]) => k))
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

// ── core single-blob normalizer (paste, txt/md, and post page-join) ──────────
export function normalizeText(text) {
  if (!text) return ''
  let t = text.replace(/\r\n?/g, '\n')
  t = rejoinHyphenation(t)
  t = stripPageLines(t.split('\n')).join('\n')
  t = collapseSoftBreaks(t)
  t = stripFusedPageNumbers(t) // fused numbers surface after lines are joined
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
