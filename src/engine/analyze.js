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
import { runSignals } from './signals/index.js'
import { isDisclosedAbsence } from './disclosure.js'
import { scoreDocument } from './scoreDocument.js'

/** @typedef {import('./types.js').RubricConfig} RubricConfig */
/** @typedef {import('./types.js').AnalysisResult} AnalysisResult */
/** @typedef {import('./types.js').Claim} Claim */

const STRONG_WEIGHT = 3 // tier weight at/above which a claim reads as "strong"

/**
 * @param {string} document   raw pasted text
 * @param {RubricConfig} rubric
 * @param {string} [posture]  active posture; defaults to rubric.defaultPosture
 * @returns {AnalysisResult}
 */
export function analyze(document, rubric, posture = rubric.defaultPosture) {
  // ── The four steps ────────────────────────────────────────────────────────
  const raw = extractClaims(document, rubric.extraction, { rubricId: rubric.id })
  /** @type {Claim[]} */
  const claims = raw.map(c => {
    const tier = measureAssertiveness(c, rubric)
    const rung = gradeEvidence(c, rubric.ladder)
    const mismatch = detectMismatch({ tier, rung }, rubric.tolerance, posture)
    let flag = mismatch ? mismatch.flag : null
    let explanation = mismatch ? mismatch.explanation : null

    // Disclosed-absence: an openly hedged/stated absence (right-of-reply, "we
    // did not verify", "in my experience") is honest hedging, not a hidden gap.
    // Suppress the unsupported-assertion penalty when the disclosed nullSeverity
    // falls below 'flag'. (Baseline claims disclose nothing → no change.)
    const disclosed = isDisclosedAbsence(c.text, rubric)
    if (flag === 'unsupported-assertion' && disclosed) {
      const tierIndex = rubric.tiers.findIndex(t => t.key === tier.key)
      const sev = rubric.tolerance.nullSeverity(tierIndex, posture, true)
      if (sev === 'none' || sev === 'note') { flag = null; explanation = null }
    }

    return { ...c, tier, rung, flag, explanation, disclosed }
  })

  // ── Document-level signals (Part C) ───────────────────────────────────────
  const citations = claims.flatMap(c => c.citations)
  const signals = runSignals(document, claims, citations, posture, rubric)

  // posture-gate: experiential writing with no authority markers makes no
  // expert claims → zero flags, a first-class "no obligation" verdict.
  const gate = signals.find(s => s.gate)
  if (gate) {
    for (const c of claims) { c.flag = null; c.explanation = null }
  }

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
  let verdict
  if (gate) {
    verdict = `This ${rubric.documentNoun || 'document'} makes no expert claims — there is no evidence obligation to assess.`
  } else {
    verdict = buildVerdict({ rubric, totalClaims: claims.length, strongClaims, flagCounts })
    // Platitude density lowers the earned-confidence budget: name the filler.
    const plat = signals.find(s => s.id === 'platitude-density')
    if (plat) {
      verdict += ` It also leans on ${plat.count} content-free ${plat.count === 1 ? 'platitude' : 'platitudes'}, which carry no checkable claim.`
    }
  }

  // ── Overall document score (computed last) ────────────────────────────────
  const documentScore = scoreDocument({ claims, signals, posture, rubric })

  return {
    claims,
    patterns,
    signals,
    posture,
    documentScore,
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
//
// Binding rule: EVERY number refers to the population it describes. flagCounts
// are document-wide (over all extracted claims), and strongClaims is likewise a
// subset of the whole — so both denominators are `totalClaims`. (Previously the
// flag clauses read "N of them…" where "them" was the strong subpopulation,
// mis-binding a document-wide numerator to the strong-claim denominator.)
export function buildVerdict({ rubric, totalClaims, strongClaims, flagCounts }) {
  const noun = rubric.documentNoun || 'document'
  if (totalClaims === 0) {
    return `No assertive claims were detected in this ${noun}.`
  }

  const unsupported = flagCounts['unsupported-assertion']
  const overconfident = flagCounts.overconfident

  // Lead: total claims, with the strong count as an explicit subset of the total.
  const lead = `This ${noun} makes ${totalClaims} ${plural(totalClaims, 'claim')}, ${strongClaims} of them strongly stated`

  // Flag clauses: counts over ALL claims → "of these" (= the total), not the
  // strong subpopulation.
  const clauses = []
  if (unsupported > 0) {
    clauses.push(`${unsupported} ${unsupported === 1 ? 'rests' : 'rest'} on no cited evidence`)
  }
  if (overconfident > 0) {
    clauses.push(`${overconfident} ${overconfident === 1 ? 'cites' : 'cite'} sources too weak to carry them`)
  }

  if (clauses.length === 0) {
    return `${lead}, each backed by evidence in proportion to its confidence.`
  }
  return `${lead}; of these, ${joinClauses(clauses)}.`
}

const plural = (n, word) => (n === 1 ? word : word + 's')

function joinClauses(clauses) {
  if (clauses.length === 1) return clauses[0]
  return clauses.slice(0, -1).join(', ') + ', and ' + clauses[clauses.length - 1]
}
