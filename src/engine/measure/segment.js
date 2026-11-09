// ─────────────────────────────────────────────────────────────────────────────
// Document segmentation — what is apparatus, not argument.
//
// segmentDocument(text) → { body, references, cut }
//   Everything after a References / Bibliography / Works Cited heading is the
//   reference list. The heading counts only past REFERENCE_MIN_POSITION of the
//   text, not followed by prose ("References to workers include…") or a page
//   range (a table of contents), and only if the next stretch reads as
//   references. A document with more than one list (a journal issue, a report
//   in chapters) loses each list but the last only up to where prose resumes,
//   and its earlier lists count wherever they fall. The lists are split into
//   entries for analysis.references.
//
// nonClaimRule(sentence) → rule name | null
//   Sentence-level drops anywhere in the body: reference entries, affiliations,
//   correspondence/emails, received/accepted dates, licence and copyright
//   lines, contributor and disclosure blocks.
//
// Rubric-invariant. No linking of references to claims (Stage 4 unchanged).
// ─────────────────────────────────────────────────────────────────────────────

import { REFERENCE_HEADINGS, REFERENCE_CUES, FRONT_MATTER } from '../lexicons/front-matter.js'
import { escapeRe } from '../signals/util.js'
import { FINITE_VERB } from '../nonClaimFilter.js'

export const REFERENCE_MIN_POSITION = 0.4 // PROVISIONAL — not ratified
export const REFERENCE_CUE_MIN = 3        // PROVISIONAL — not ratified (cue types for an entry)
const LOOKAHEAD = 1500

const compile = (list) => list.map((src) => new RegExp(src, 'iu'))
const CUES = Object.fromEntries(Object.entries(REFERENCE_CUES).map(([k, v]) => [k, compile(v)]))
// Author lists are case-sensitive (capitalized surnames + initials).
CUES.authorList = REFERENCE_CUES.authorList.map((src) => new RegExp(src, 'u'))
const CASE_FREE = new Set(['correspondence', 'license', 'contributors', 'dates', 'chartNote'])
const FRONT = Object.entries(FRONT_MATTER).map(([rule, list]) => [rule, CASE_FREE.has(rule) ? compile(list) : list.map((s) => new RegExp(s, 'u'))])
const HEADING_RE = new RegExp(`\\b(?:${REFERENCE_HEADINGS.map(escapeRe).join('|')})\\b`, 'g')
const PROSE_AFTER = /^\s*(?:to|of|for|in|on|and|from|are|is|were|was|that|which|cited|section|below|above|list)\b/i
// A table-of-contents line: the heading followed on the same line by a page or range.
// ("References 94-117"), not the first numbered entry ("References 1. Kellert, S.").
const TOC_AFTER = /^[ \t]*\d{1,3}(?:\s*[-–]\s*\d{1,3})?(?!\d)(?!\.\s+[A-Z][\p{L}'’-]+,)/u

/** Which reference cues a span shows. */
export function referenceCues(s) {
  return Object.entries(CUES).filter(([, res]) => res.some((re) => re.test(s))).map(([k]) => k)
}

export function isReferenceEntry(s) {
  const cues = referenceCues(s)
  if (cues.length >= REFERENCE_CUE_MIN) return true
  return cues.length >= 2 && (cues.includes('authorList') || cues.includes('journalCite'))
}

// A list number stays with its entry: "1. Kellert, S. R." is not split after "1.".
function splitEntries(text) {
  return text
    .split(/\n\n+|(?<=\.)\s+(?=\d{1,3}\.\s+[A-Z][\p{L}'’-]+,)|(?<=\.)(?<!(?:^|\s)\d{1,3}\.)\s+(?=[A-Z][\p{L}'’-]+,\s(?:[A-Z]\.\s?)+)|(?<=\])\s+(?=\.?[A-Z0-9(])/u)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 8)
}

// A heading opens a reference list: not followed by prose or a page range,
// and the next stretch reads as references.
function opensList(t, m) {
  const after = t.slice(m.index + m[0].length, m.index + m[0].length + LOOKAHEAD)
  if (PROSE_AFTER.test(after) || TOC_AFTER.test(after)) return false
  return splitEntries(after).slice(0, 6).filter(isReferenceEntry).length >= 2
}

// Where prose resumes after a list, before the next list's heading: the start
// of the first run of PROSE_RUN_MIN characters of paragraphs that are neither
// reference entries nor numbered like one ("[3] …", "3. …"). PROVISIONAL — not ratified.
export const PROSE_RUN_MIN = 1000
const NUMBERED = /^\s*(?:\[\d{1,3}\]|\d{1,3}\.)\s/
function proseResumes(t, from, limit) {
  const breaks = /\n\n+/g
  breaks.lastIndex = from
  let start = from
  let runStart = -1
  let run = 0
  while (start < limit) {
    const m = breaks.exec(t)
    const end = m && m.index < limit ? m.index : limit
    const para = t.slice(start, end)
    if (isReferenceEntry(para.replace(/\s+/g, ' ')) || NUMBERED.test(para)) {
      runStart = -1
      run = 0
    } else {
      if (runStart < 0) runStart = start
      run += para.trim().length
      if (run >= PROSE_RUN_MIN) return runStart
    }
    if (end === limit) break
    start = m.index + m[0].length
  }
  return limit
}

export function segmentDocument(text) {
  const t = text || ''
  const heads = [...t.matchAll(HEADING_RE)].filter((m) => opensList(t, m))
  const first = heads.findIndex((m) => m.index >= t.length * REFERENCE_MIN_POSITION)
  if (first < 0) return { body: t, references: [], cut: -1 }
  // One list runs to the end. With more, each but the last ends where prose resumes.
  const lists = heads.length > 1 ? heads : [heads[first]]
  const spans = []
  for (const [i, m] of lists.entries()) {
    if (spans.length && m.index < spans[spans.length - 1].end) continue
    const next = lists[i + 1]
    spans.push({ start: m.index, from: m.index + m[0].length, end: next ? proseResumes(t, m.index + m[0].length, next.index) : t.length })
  }
  const body = []
  const references = []
  let at = 0
  for (const s of spans) {
    body.push(t.slice(at, s.start))
    references.push(...splitEntries(t.slice(s.from, s.end)))
    at = s.end
  }
  body.push(t.slice(at))
  return { body: body.filter((b) => b.trim()).join('\n\n'), references, cut: spans[0].start }
}

// An affiliation or postal address split mid-line by the sentence splitter:
// an institution phrase, a list of commas, and no finite verb.
const INSTITUTION = /\b(?:Department|School|Program(?:me)?|Institute|Center|Centre|Laboratory|University|College|Division|Faculty)\s+(?:of|for)\b|\bUniversity\b/
function isAffiliationFragment(s) {
  return INSTITUTION.test(s) && (s.match(/,/g) || []).length >= 2 && !FINITE_VERB.test(s)
}

// ── Sections (IMRaD and report equivalents) ─────────────────────────────────
// A heading may stand alone or lead the next sentence in reader/PDF text
// ("Results Green Building and Cognitive Function The TVOC levels were …").
// PROVISIONAL — not ratified.
const SECTION_HEADINGS = [
  ['method', /^(?:\d+(?:\.\d+)*\.?\s+)?(?:Materials\s+and\s+Methods|Methods?|Methodology|Study\s+(?:Design|Population|Setting|Participants)|Participants|Procedures?|Statistical\s+Analys[ie]s|Data\s+(?:and\s+Methods|Collection|Analysis)|Measures|Environmental\s+Monitoring|Cognitive\s+Function\s+Assessment|How\s+we\s+did\s+this|About\s+(?:this|the)\s+(?:survey|report|data|study)|Terminology|Acknowledg(?:e)?ments?)\b/],
  ['result', /^(?:\d+(?:\.\d+)*\.?\s+)?(?:Results?|Findings|Key\s+findings)\b/],
  ['discussion', /^(?:\d+(?:\.\d+)*\.?\s+)?(?:Discussion|Conclusions?|Implications|Strengths\s+and\s+Limitations|Limitations|Interpretation)\b/],
  ['introduction', /^(?:\d+(?:\.\d+)*\.?\s+)?(?:Introduction|Background|Literature\s+Review|Related\s+Work)\b/],
]
// "Results:" in a structured abstract is a label, not a section.
const ABSTRACT_LABEL = /^(?:Background|Objectives?|Methods?|Results?|Conclusions?|Discussion)\s*:/

/** @returns {'method'|'result'|'discussion'|'introduction'|null} the section a sentence opens */
// A heading ends the line, takes a colon, or runs straight into a capitalized
// title or sentence ("Results Satisfaction with …") — never into a lowercase
// verb ("Results indicate that …", "Participants spent …" are sentences).
const AFTER_HEADING = /^(?:\s*$|\s*:|\s+(?:&|and)\s+[A-Z]|\s+[A-Z(“"])/

export function sectionOpenedBy(s) {
  const t = s.trim()
  if (ABSTRACT_LABEL.test(t)) return null
  for (const [section, re] of SECTION_HEADINGS) {
    const m = t.match(re)
    if (m && AFTER_HEADING.test(t.slice(m[0].length))) return section
  }
  return null
}

// A footnote or endnote outside a recognized list (at a page's foot, set in a
// small font and moved below the page's text): a note number, then a source:
// a quoted title, a link or locator, or an author and a year. PROVISIONAL — not ratified.
const NOTE_LEAD = /^\s*(?:\d{1,3}|[⁰¹²³⁴⁵⁶⁷⁸⁹]{1,3})[.)]?\s+(?=[“"‘A-Z])/u
const NOTE_TITLE = /[“"‘][^”"’]{10,}[”"’]/
const NOTE_LOCATOR = /https?:\/\/|www\.|\bdoi\b|\b(?:retrieved|accessed|available at|online at)\b|\bpp?\.\s*\d/i
const NOTE_AUTHOR = /^\s*(?:\d{1,3}|[⁰¹²³⁴⁵⁶⁷⁸⁹]{1,3})[.)]?\s+[A-Z][\p{L}'’-]+(?:\s+[A-Z][\p{L}'’.-]+){0,3},\s[^.]{0,200}\b(?:19|20)\d{2}\b/u
// …or a run of comma-separated parts ending on its date ("18 Form S-1, Uber
// Technologies, Inc., Securities and Exchange Commission, 2019.").
const NOTE_PARTS = /^[^.]*,[^,]+,.*\b(?:19|20)\d{2}[a-z]?[.)]?\s*$/
export function isNoteEntry(s) {
  return NOTE_LEAD.test(s) && (NOTE_TITLE.test(s) || NOTE_LOCATOR.test(s) || ((NOTE_AUTHOR.test(s) || NOTE_PARTS.test(s)) && !FINITE_VERB.test(s)))
}

/** @returns {string|null} the rule that drops this sentence, or null */
export function nonClaimRule(s) {
  if (isReferenceEntry(s) || isNoteEntry(s)) return 'reference-entry'
  for (const [rule, res] of FRONT) if (res.some((re) => re.test(s))) return rule
  if (isAffiliationFragment(s)) return 'affiliation'
  return null
}
