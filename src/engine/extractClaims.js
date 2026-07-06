// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — extractClaims(text, extraction) → Claim[]
//
// Splits prose into candidate sentences, detects rubric-agnostic citation tokens
// (a `[1]` is a `[1]` regardless of document type — RANKING those tokens into an
// evidence grade is the ladder's job, in gradeEvidence), and keeps only lines
// assertive/declarative enough to clear the rubric's extraction sensitivity.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {import('./types.js').ExtractionConfig} ExtractionConfig */
/** @typedef {import('./types.js').Citation} Citation */

// Sentence splitter — breaks on .!? followed by whitespace + a capital/quote,
// while leaving common abbreviations intact.
const ABBREV = /\b(?:e\.g|i\.e|vs|etc|al|Dr|Mr|Mrs|Ms|Inc|Ltd|Corp|Fig|No|pp|cf)\.$/i

function splitSentences(text) {
  const rough = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=["'“(]?[A-Z0-9])/)
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
  { type: 'numeric',     re: /\[\d+(?:\s*[-,]\s*\d+)*\]/g },
  { type: 'author-year', re: /\([A-Z][A-Za-z.'-]+(?:\s+(?:et al\.?|and|&)\s+[A-Z][A-Za-z.'-]+)?,?\s*\d{4}[a-z]?\)/g },
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
 * @returns {Array<{ id:number, text:string, citations:Citation[] }>}
 */
export function extractClaims(text, extraction) {
  const sentences = splitSentences(text || '')
  const claims = []
  let id = 0
  for (const sentence of sentences) {
    if (sentence.length < extraction.minClaimLength) continue
    if (claimLikelihood(sentence) < extraction.sensitivity) continue
    claims.push({ id: id++, text: sentence, citations: detectCitations(sentence) })
  }
  return claims
}
