// ─────────────────────────────────────────────────────────────────────────────
// Document segmentation — what is apparatus, not argument.
//
// segmentDocument(text) → { body, references, cut }
//   Everything after a References / Bibliography / Works Cited heading is the
//   reference list. The heading counts only past REFERENCE_MIN_POSITION of the
//   text, not followed by prose ("References to workers include…") or a page
//   range (a table of contents), and only if the next stretch reads as
//   references. The list is split into entries for analysis.references.
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

export function segmentDocument(text) {
  const t = text || ''
  for (const m of t.matchAll(HEADING_RE)) {
    if (m.index < t.length * REFERENCE_MIN_POSITION) continue
    const after = t.slice(m.index + m[0].length, m.index + m[0].length + LOOKAHEAD)
    if (PROSE_AFTER.test(after) || TOC_AFTER.test(after)) continue
    const entries = splitEntries(after).slice(0, 6)
    if (entries.filter(isReferenceEntry).length < 2) continue
    return { body: t.slice(0, m.index), references: splitEntries(t.slice(m.index + m[0].length)), cut: m.index }
  }
  return { body: t, references: [], cut: -1 }
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

/** @returns {string|null} the rule that drops this sentence, or null */
export function nonClaimRule(s) {
  if (isReferenceEntry(s)) return 'reference-entry'
  for (const [rule, res] of FRONT) if (res.some((re) => re.test(s))) return rule
  if (isAffiliationFragment(s)) return 'affiliation'
  return null
}
