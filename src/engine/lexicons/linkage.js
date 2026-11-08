// ─────────────────────────────────────────────────────────────────────────────
// Evidence-linkage cues (engine/linkEvidence.js, engine/references.js).
// PROVISIONAL — not ratified.
// ─────────────────────────────────────────────────────────────────────────────

// Ingestion does not label caption blocks, so a caption is a span beginning
// "Source:" (a chart note or a standalone line); it covers the claims in its
// own paragraph and up to CAPTION_REACH paragraphs before it, stopping at a
// heading or the previous caption.
export const SOURCE_LINE = /\bSources?:\s*([^\n]{3,200}?)(?=\.\s|\.$|\s+(?:Note|Notes|Chart|Figure|Table)\b|$)/g
export const CAPTION_REACH = 4 // PROVISIONAL — not ratified (paragraphs before a Source line)

// A claim that points at a figure ("see Figure 3", "Exhibit 2").
export const FIGURE_REF = /\b(?:Figure|Fig\.|Exhibit|Chart|Table)\s+(\d+[A-Za-z]?)\b/

// A caption source that names the document's own study: it names the publisher,
// or names a survey / analysis / study / poll without another organization.
export const OWN_SOURCE_NOUN = /\b(?:survey|analysis|study|poll|data|research|panel|interviews?|listening)\b/i

// Endnotes: a heading line, then numbered lines.
export const NOTES_HEADING = /^(?:End\s?notes|Notes|Footnotes)\s*$/i
export const NOTE_LINE = /^(\d{1,3})[.)]?\s+(.{6,})$/
// A footnote anchor: digits glued to the end of a word or closing punctuation.
export const FOOTNOTE_ANCHOR = /(?<=[a-z)\]”"’.,;:%])(\d{1,3})(?=\s|$)/g

// Reference entries.
export const REF_NUMBER = /^\s*\[?(\d{1,3})[\].)]?\s+/
export const REF_YEAR = /\(((?:19|20)\d{2})[a-z]?\)|\b((?:19|20)\d{2})[a-z]?\b/
// "(Allen et al. 2016)", "(Allen & Ma, 2016; Satish et al. 2012)", "Satish et al. (2012)":
// each surname-year pair.
export const AUTHOR_YEAR_PAIR = /([A-Z][\p{L}'’-]+)(?:\s+(?:et\s+al\.?|and|&)(?:\s+[A-Z][\p{L}'’-]+)?)?,?\s*\(?((?:19|20)\d{2})[a-z]?\)?/gu
