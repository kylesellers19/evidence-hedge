// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — extractClaims(text, extraction) → Claim[]
//
// Splits prose into candidate sentences, detects rubric-agnostic citation tokens
// (a `[1]` is a `[1]` regardless of document type — RANKING those tokens into an
// evidence grade is the ladder's job, in gradeEvidence), and keeps only lines
// assertive/declarative enough to clear the shared extraction sensitivity.
// Reference entries, affiliations, correspondence, dates, licence lines and
// contributor blocks are dropped (measure/segment.js); `onDrop` receives each.
// ─────────────────────────────────────────────────────────────────────────────

import { isDropped, demotionPenalty, FINITE_VERB as PROBE_VERB } from './nonClaimFilter.js'
import { nonClaimRule, sectionOpenedBy } from './measure/segment.js'
import { escapeRe } from './signals/util.js'

/** @typedef {import('./types.js').ExtractionConfig} ExtractionConfig */
/** @typedef {import('./types.js').Citation} Citation */

// Sentence splitter — breaks on .!? followed by whitespace + a capital/quote,
// while leaving common abbreviations intact. A short paragraph that neither
// ends a sentence nor leads into the next (a heading, a label, a cover line)
// also ends at its paragraph break, so it never runs into the sentence below
// it; a next paragraph that starts in lower case still continues it.
const ABBREV = /\b(?:e\.g|i\.e|vs|etc|al|Dr|Mr|Mrs|Ms|Inc|Ltd|Corp|Fig|No|pp|cf)\.$/i
export const HEADING_MAX_WORDS = 12 // PROVISIONAL — not ratified
const ENDS_OR_LEADS_ON = /[.!?:;,]["'”’)]?$/

export function splitSentences(text) {
  const paras = text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const blocks = []
  let open = []
  paras.forEach((p, i) => {
    open.push(p)
    const next = paras[i + 1]
    if (next && !/^\p{Ll}/u.test(next) && !ENDS_OR_LEADS_ON.test(p) && p.split(' ').length <= HEADING_MAX_WORDS) {
      blocks.push(open.join(' '))
      open = []
    }
  })
  if (open.length) blocks.push(open.join(' '))
  return blocks.flatMap(splitBlock)
}

function splitBlock(text) {
  const rough = text
    // A superscript marker may follow the stop ("jobs.¹ The …").
    .split(/(?<=[.!?](?:[⁰¹²³⁴⁵⁶⁷⁸⁹]+(?:[,–-][⁰¹²³⁴⁵⁶⁷⁸⁹]+)*)?)\s+(?=["'“(]?[A-Z0-9])/)
  // Re-join fragments that split on a known abbreviation.
  const out = []
  for (const frag of rough) {
    if (out.length && ABBREV.test(out[out.length - 1])) {
      out[out.length - 1] += ' ' + frag
    } else {
      out.push(frag)
    }
  }
  return out.map(s => s.trim()).filter(Boolean)
}

// Rubric-agnostic citation detectors. Order matters only for labelling.
const CITATION_PATTERNS = [
  { type: 'doi',         re: /\b(?:doi:\s*)?10\.\d{4,}\/\S+|doi\.org\/\S+/gi },
  { type: 'url',         re: /https?:\/\/[^\s)]+/gi },
  // "[3]", "[3, 5]", "[3-10]", and as some PDFs set them, "[ 73 ]", "[ 3 – 10 ]".
  { type: 'numeric',     re: /\[\s*\d+(?:\s*[-–—,]\s*\d+)*\s*\]/g },
  // "(Allen 2016)", "(Allen et al. 2016)", "(Allen & Ma, 2016; Satish et al. 2012)"
  { type: 'author-year', re: /\([A-Z][\p{L}.'’-]+(?:\s+(?:et al\.?|and|&)(?:\s+[A-Z][\p{L}.'’-]+)?)?,?\s*(?:19|20)\d{2}[a-z]?(?:[;,][^()]{0,120})?\)/gu },
  { type: 'year',        re: /\((?:19|20)\d{2}[a-z]?\)/g },
  // Attribution phrases that signal a cited source even without a formal ref.
  { type: 'phrase',      re: /\b(?:according to|cited in|as reported by|per the|source:|published in|data from|drawn from|based on (?:a|the|our)|et al\.?)\b[^.;]*/gi },
]

/** @returns {Citation[]} */
function detectCitations(sentence) {
  /** @type {Citation[]} */
  const found = []
  for (const { type, re } of CITATION_PATTERNS) {
    const matches = sentence.match(re)
    if (matches) for (const raw of matches) found.push({ type, raw: raw.trim() })
  }
  return found
}

// A line is "claim-like" if it reads as a declarative assertion rather than a
// question, heading, or fragment. Score is 0–1 and compared to sensitivity.
const FINITE_VERB = /\b(?:is|are|was|were|will|would|can|cannot|can't|does|do|did|has|have|had|shows?|proves?|demonstrates?|means?|results?|leads?|causes?|remains?|represents?|makes?|drives?|delivers?|ensures?|confirms?|suggests?|indicates?|reflects?)\b/i

// A label: no closing punctuation and no finite verb on either list. Once
// headings stop running into the sentence below them they stand alone, and so
// do chart labels, table rows and titles; none of them asserts anything.
// Journalism keeps its headlines, as it does for title-case headings.
// PROVISIONAL — not ratified.
export function isLabel(sentence) {
  const t = sentence.trim()
  return !/[.!?]["'”’)]?$/.test(t) && !FINITE_VERB.test(t) && !PROBE_VERB.test(t)
}

// A heading fused to the sentence it heads ("ADVANCED INDUSTRIES Within the
// team, …", "Market Overview The economy grew …"): the claim is the sentence.
// Two or more words in capitals, or a short run of capitalized words before a
// sentence's opening word, are the heading. A headline that stands alone is
// untouched (journalism weighs it as a claim); one fused to a sentence is an
// extraction defect under every standard. PROVISIONAL — not ratified.
const CAPS_HEADING = /^(?:[A-Z0-9][A-Z0-9&'’.,:/+–-]*\s+){2,}(?=[A-Z][a-z])/
const OPENER = '(?:The|A|An|In|On|At|Our|This|These|Those|We|It|Its|As|For|With|While|When|Over|After|Since|Despite|Although|According|By|From|Many|Most|Some|Today|Recent|Across|During|Each|Every|One|Two|Three)'
const TITLE_HEADING = new RegExp(`^(?:[A-Z][\\p{L}'’&-]*\\s+){2,5}(?=${OPENER}\\s)`, 'u')
export function stripHeadingPrefix(s) {
  let t = s.replace(CAPS_HEADING, '')
  const m = t.match(TITLE_HEADING)
  if (m && !/[.,;:]/.test(m[0])) t = t.slice(m[0].length)
  return t.length >= 20 && t !== s ? t : s
}

// The publisher describing itself ("About Arup …", "AECOM is a global
// infrastructure firm …"): the boilerplate block at a report's end, not part
// of its argument. PROVISIONAL — not ratified.
const SELF_NOUN = /\b(?:firm|company|consultancy|consultants?|provider|practice|contractor|builder|organi[sz]ation|leader|group|partnership|collective|business|agency|enterprise|network|studio|corporation|manufacturer|developer)s?\b/i
export function isSelfDescription(s, publisher = []) {
  const t = s.trim()
  return publisher.some((name) => {
    if (!name || name.length < 3) return false
    const n = escapeRe(name)
    if (new RegExp(`^about\\s+${n}\\b`, 'i').test(t)) return true
    return new RegExp(`^${n}(?:\\s*\\([^)]*\\))?,?\\s+(?:is|are|has been)\\s+(?:a|an|the|one of)\\b`, 'i').test(t) && SELF_NOUN.test(t.slice(0, 220))
  })
}

function claimLikelihood(sentence) {
  let score = 0.35
  const words = sentence.split(/\s+/).length
  if (FINITE_VERB.test(sentence)) score += 0.30
  if (/[.!]$/.test(sentence)) score += 0.10
  if (/\b\d/.test(sentence)) score += 0.10          // numbers read as factual
  if (words >= 6 && words <= 60) score += 0.15
  if (/\?$/.test(sentence)) score -= 0.6            // questions aren't claims
  if (/^[A-Z][A-Z\s]{4,}$/.test(sentence)) score -= 0.5 // ALL-CAPS heading
  if (words < 4) score -= 0.4
  return Math.max(0, Math.min(1, score))
}

/**
 * @param {string} text
 * @param {ExtractionConfig} extraction
 * @param {{ rubricId?: string, onDrop?: (sentence:string, rule:string) => void, publisher?: string[] }} [options]
 *   rubricId gates the journalism heading exemption; onDrop sees apparatus drops;
 *   publisher names the document's publisher, whose self-description is boilerplate
 * @returns {Array<{ id:number, text:string, citations:Citation[], section:string|null }>}
 */
export function extractClaims(text, extraction, options = {}) {
  const { rubricId, onDrop, publisher = [] } = options
  const sentences = splitSentences(text || '')
  const claims = []
  let id = 0
  let section = null
  for (const whole of sentences) {
    // Track the IMRaD section a claim sits in (headings are often too short to be claims).
    section = sectionOpenedBy(whole) || section
    const sentence = stripHeadingPrefix(whole)
    if (sentence.length < extraction.minClaimLength) continue
    if (isSelfDescription(sentence, publisher)) continue
    // Non-claim filter — DROP hard exclusions, then DEMOTE via the likelihood.
    if (isDropped(sentence)) continue
    const rule = nonClaimRule(sentence)
    if (rule) { if (onDrop) onDrop(sentence, rule); continue }
    if (rubricId !== 'journalism' && isLabel(sentence)) continue
    const likelihood = claimLikelihood(sentence) - demotionPenalty(sentence, rubricId)
    if (likelihood < extraction.sensitivity) continue
    claims.push({ id: id++, text: sentence, citations: detectCitations(sentence), section })
  }
  return claims
}
