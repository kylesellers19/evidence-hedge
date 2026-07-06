// ─────────────────────────────────────────────────────────────────────────────
// analyze(document, rubric) → AnalysisResult         ── engine entry point
//
// Orchestrates the four steps, then assembles the one-page brief's three layers:
//   · verdict        — plain-language headline synthesised from the counts
//   · patterns       — named flags + 2–3 verbatim example lines from the doc
//   · distribution   — how claims spread across the rubric's evidence ladder
//
// The rubric is INJECTED. This file imports no rubric by name and contains no
// per-document-type branching — every difference between research, corporate,
// journalism and general comes from the config object passed in.
// ─────────────────────────────────────────────────────────────────────────────

import { extractClaims } from './extractClaims.js'
import { measureAssertiveness } from './measureAssertiveness.js'
import { gradeEvidence } from './gradeEvidence.js'
import { detectMismatch } from './detectMismatch.js'
import { PATTERN_META, FLAG_ORDER } from './patterns.js'

/** @typedef {import('./types.js').RubricConfig} RubricConfig */
/** @typedef {import('./types.js').AnalysisResult} AnalysisResult */
/** @typedef {import('./types.js').Claim} Claim */

const STRONG_WEIGHT = 3 // tier weight at/above which a claim reads as "strong"

/**
 * @param {string} document   raw pasted text
 * @param {RubricConfig} rubric
 * @returns {AnalysisResult}
 */
export function analyze(document, rubric) {
  // ── The four steps ────────────────────────────────────────────────────────
  const raw = extractClaims(document, rubric.extraction)
  /** @type {Claim[]} */
  const claims = raw.map(c => {
    const tier = measureAssertiveness(c, rubric)
    const rung = gradeEvidence(c, rubric.ladder)
    const mismatch = detectMismatch({ tier, rung }, rubric.tolerance)
    return {
      ...c,
      tier,
      rung,
      flag: mismatch ? mismatch.flag : null,
      explanation: mismatch ? mismatch.explanation : null,
    }
  })

  // ── Layer 2: named patterns with verbatim examples ────────────────────────
  const patterns = FLAG_ORDER.flatMap(flag => {
    const hits = claims.filter(c => c.flag === flag)
    if (hits.length === 0) return []
    return [{
      key: flag,
      name: PATTERN_META[flag].name,
      description: PATTERN_META[flag].description,
      count: hits.length,
      examples: hits.slice(0, 3).map(c => c.text),
    }]
  })

  // ── Layer 3: evidence-hierarchy distribution across the ladder ────────────
  const ladderLowToHigh = [...rubric.ladder].sort((a, b) => a.rank - b.rank)
  const distribution = ladderLowToHigh.map(rung => ({
    rung,
    count: claims.filter(c => c.rung.key === rung.key).length,
  }))

  // ── Summary counts ────────────────────────────────────────────────────────
  const flagCounts = {
    'unsupported-assertion': claims.filter(c => c.flag === 'unsupported-assertion').length,
    overconfident: claims.filter(c => c.flag === 'overconfident').length,
  }
  const strongClaims = claims.filter(c => c.tier.weight >= STRONG_WEIGHT).length

  // ── Layer 1: plain-language verdict ───────────────────────────────────────
  const verdict = buildVerdict({
    rubric,
    totalClaims: claims.length,
    strongClaims,
    flagCounts,
  })

  return {
    claims,
    patterns,
    summary: {
      verdict,
      totalClaims: claims.length,
      strongClaims,
      flagCounts,
      distribution,
    },
  }
}

// One or two sentences a non-expert can act on.
function buildVerdict({ rubric, totalClaims, strongClaims, flagCounts }) {
  const noun = rubric.documentNoun || 'document'
  if (totalClaims === 0) {
    return `No assertive claims were detected in this ${noun}.`
  }

  const unsupported = flagCounts['unsupported-assertion']
  const overconfident = flagCounts.overconfident

  const lead = `This ${noun} makes ${strongClaims} strong ${plural(strongClaims, 'claim')}`

  const clauses = []
  if (unsupported > 0) {
    clauses.push(`${unsupported} of them ${unsupported === 1 ? 'rests' : 'rest'} on no cited evidence`)
  }
  if (overconfident > 0) {
    clauses.push(`${overconfident} ${overconfident === 1 ? 'cites' : 'cite'} sources too weak to carry them`)
  }

  if (clauses.length === 0) {
    return `${lead} — each backed by evidence in proportion to its confidence.`
  }
  return `${lead}; ${joinClauses(clauses)}.`
}

const plural = (n, word) => (n === 1 ? word : word + 's')

function joinClauses(clauses) {
  if (clauses.length === 1) return clauses[0]
  return clauses.slice(0, -1).join(', ') + ', and ' + clauses[clauses.length - 1]
}
