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

import { extractClaims, splitSentences } from './extractClaims.js'
import { attributeClaims, selfCitationCounter } from './attribution.js'
import { linkEvidence } from './linkEvidence.js'
import { parseReferences } from './references.js'
import { buildClaimRecord } from './claimRecord.js'
import { measureAssertiveness } from './measureAssertiveness.js'
import { measureClaim } from './measure/index.js'
import { segmentDocument } from './measure/segment.js'
import { registerRank } from './measure/causalRegister.js'
import { strengthRank } from './measure/recommendation.js'
import { profileDocument } from './profile/index.js'
import { hostOf } from './profile/provenance.js'
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
// Claim functions checked against the design ceiling (a method statement or a
// background claim about others' work is not this document's causal claim).
const CEILING_FUNCTIONS = new Set(['own-result', 'interpretation', 'recommendation'])

// A URL on the publisher's own site is self-reported evidence, not third-party.
function markOwnSiteUrls(citations, provenance) {
  const host = provenance.publisherHost
  const org = provenance.org.map((t) => t.toLowerCase())
  return citations.map((c) => {
    if (c.type !== 'url') return c
    const h = hostOf(c.raw)
    const own = (host && (h === host || h.endsWith('.' + host) || host.endsWith('.' + h))) || org.some((t) => /^[a-z0-9-]+$/.test(t) && h.split('.').includes(t))
    return own ? { ...c, type: 'url-own' } : c
  })
}

// causal-overreach: the claim's causal register or advice strength above what
// the design licenses. Disclosure-invariant — hedging or a limitations
// paragraph does not suppress it (self-disclaimed-causality is a zero-weight note).
// A quoted, attributed statement is the source's claim, reported — not this
// document's (the echo of an overreaching source is a known gap, not a flag).
const QUOTED = /[“"][^”"]{25,}[”"]/
const ATTRIBUTED = /\b(?:said|says|states|stated|adds|added|notes|noted|observes|explains|writes|wrote|told|according to)\b/i

function overreachOf(m, design, posture, text) {
  if (!CEILING_FUNCTIONS.has(m.function)) return null
  if (QUOTED.test(text) && ATTRIBUTED.test(text)) return null
  const ceiling = design.ceiling
  const registerOver = registerRank(m.register.register) - registerRank(ceiling.maxRegister)
  const adviceOver = strengthRank(m.recommendation.strength) - strengthRank(ceiling.maxRecommendation)
  const distance = Math.max(registerOver, adviceOver)
  if (distance <= 0) return null
  return {
    flag: 'causal-overreach',
    distance,
    explanation: {
      causalRegister: m.register.register,
      recommendation: m.recommendation.strength,
      designCeiling: ceiling,
      design: design.design,
      designEvidence: design.evidence.slice(0, 2).map((e) => e.span),
      posture,
    },
  }
}

/**
 * @param {string} document   raw pasted text
 * @param {RubricConfig} rubric
 * @param {string} [posture]  active posture; defaults to rubric.defaultPosture
 * @returns {AnalysisResult}
 */
export function analyze(document, rubric, posture = rubric.defaultPosture, options = {}) {
  // ── Measurement (rubric-invariant) ────────────────────────────────────────
  // Who is speaking and what study stands behind the text (profile/).
  const profile = profileDocument(document, { sourceUrl: options.sourceUrl || '' })
  // The reference list after its heading, and reference entries anywhere, are
  // apparatus: they go to `references`, never to claims. Markers link to them
  // (linkEvidence).
  const { body, references: listed } = segmentDocument(document)
  const references = listed.map((text) => ({ text, via: 'reference-list' }))
  const raw = extractClaims(body, rubric.extraction, {
    rubricId: rubric.base || rubric.id,
    publisher: profile.provenance.publisher || [],
    onDrop: (text, rule) => { if (rule === 'reference-entry') references.push({ text, via: 'pattern' }) },
  }).map((c0) => ({ ...c0, citations: markOwnSiteUrls(c0.citations, profile.provenance) }))

  // ── Attribution: whose finding each claim reports (rubric-invariant) ──────
  // The label rides on the claim and on its flag explanations; own-prior
  // claims feed the one self-citation counter the profile and the
  // self-citation signal both read.
  const publisher = profile.provenance.publisher || []
  // Superscript markers cite only where the reference list is numbered.
  const superscriptMarkers = parseReferences(references.map((r) => r.text)).some((e) => e.number != null)
  const attribution = attributeClaims(body, raw, splitSentences(body), { publisher, superscriptMarkers })

  // ── Stage 4: link each claim to the evidence it leans on ──────────────────
  const evidence = linkEvidence({
    claims: raw, attribution: attribution.claims, where: attribution.where, layout: attribution.layout,
    references: references.map((r) => r.text), design: profile.design, publisher,
  })

  /** @type {Claim[]} */
  const claims = raw.map((c, i) => {
    const m = measureClaim(c, { design: profile.design.inherited ? 'none-reported' : profile.design.design })
    const { citations: linkedCitations, ownStudy, ...ev } = evidence[i]
    const attr = attribution.claims[i]
    // ── Judgment (the rubric's) ─────────────────────────────────────────────
    // Grading reads the claim's links: the tokens behind them, and an own-study
    // link (caption or section scope) lifting it to the in-document rung as an
    // own result is.
    const tier = measureAssertiveness(c, rubric, m.certainty.tier)
    // Reported speech is the speaker's claim, not the document's: it is graded
    // as attributed, as "according to …" is, so a quote stated no more firmly
    // than an attributed statement may be is not charged as citing nothing.
    // PROVISIONAL — not ratified.
    const spoken = attribution.claims[i]?.label === 'quoted' ? [{ type: 'phrase', raw: `quoted: ${attribution.claims[i].speaker || 'speaker'}` }] : []
    const linked = { text: c.text, citations: [...linkedCitations, ...spoken] }
    const cited = gradeEvidence(linked, rubric.ladder)
    const rung = gradeEvidence(linked, rubric.ladder, { inDocumentRung: m.function === 'own-result' || ownStudy ? rubric.ownResultRung : null })
    // Did the rung come from the document's own evidence rather than a citation?
    const inDocument = rung.key !== cited.key
    // A method statement reports what was done, not a claim — never flagged.
    const mismatch = m.function === 'method' ? null : detectMismatch({ tier, rung }, rubric.tolerance, posture)
    let flag = mismatch ? mismatch.flag : null
    let explanation = mismatch ? { ...mismatch.explanation, attribution: attr, evidence: ev } : null

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

    const overreach = overreachOf(m, profile.design, posture, c.text)
    return {
      ...c, tier, rung, citedRung: cited, inDocument, flag, explanation, disclosed,
      certainty: m.certainty, function: m.function, register: m.register, recommendation: m.recommendation,
      attribution: attr, evidence: ev,
      overreach: overreach ? { ...overreach, explanation: { ...overreach.explanation, attribution: attr, evidence: ev } } : null,
    }
  })
  profile.provenance.selfCitation = selfCitationCounter(profile.provenance, claims, publisher)

  // ── Document-level signals (Part C) ───────────────────────────────────────
  const citations = claims.flatMap(c => c.citations)
  const signals = runSignals(document, claims, citations, posture, rubric, profile)

  // posture-gate: experiential writing with no authority markers makes no
  // expert claims → zero flags, a first-class "no obligation" verdict.
  const gate = signals.find(s => s.gate)
  if (gate) {
    for (const c of claims) { c.flag = null; c.explanation = null; c.overreach = null }
  }

  // ── Layer 2: named patterns with verbatim examples ────────────────────────
  const flaggedAs = (flag) => claims.filter(c => (flag === 'causal-overreach' ? !!c.overreach : c.flag === flag))
  const patterns = FLAG_ORDER.flatMap(flag => {
    const hits = flaggedAs(flag)
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
    'unsupported-assertion': flaggedAs('unsupported-assertion').length,
    overconfident: flaggedAs('overconfident').length,
    'causal-overreach': flaggedAs('causal-overreach').length,
  }
  const strongClaims = claims.filter(c => c.tier.weight >= STRONG_WEIGHT).length

  // ── Layer 1: plain-language verdict ───────────────────────────────────────
  // A claim is flagged when it carries any flag: unsupported, overconfident or
  // causal overreach (one claim can carry two). The headline and the brief's
  // stats row both count claims this way, so their numbers are the same.
  const flaggedClaims = claims.filter(c => c.flag || c.overreach).length
  const verdict = gate
    ? GATE_HEADLINE(rubric.documentNoun || 'document')
    : buildVerdict({ rubric, totalClaims: claims.length, strongClaims, flagCounts, flaggedClaims })

  // ── Overall document score (computed last) ────────────────────────────────
  const documentScore = scoreDocument({ claims, signals, posture, rubric, profile })

  // ── Claim records (change set 5): read-only, after every judgment ─────────
  const records = claims.map((c) => buildClaimRecord(c, { profile, design: profile.design }))

  return {
    claims,
    records,
    references,
    attribution: { sentences: attribution.sentences },
    profile,
    patterns,
    signals,
    posture,
    documentScore,
    summary: {
      verdict,
      totalClaims: claims.length,
      strongClaims,
      flaggedClaims,
      flagCounts,
      distribution,
    },
  }
}

// The headline: one sentence, 15 words or fewer, a non-expert can act on.
//
// Binding rule: EVERY number refers to the population it describes. Both
// numbers are counts of claims over the whole document: flaggedClaims (a claim
// with any flag, counted once however many it carries) of totalClaims. The
// per-flag counts and the strong count go in the stats row under it, where
// each is labeled; the headline never mixes them. Platitudes are a document
// signal with their own section and stay out of the headline.
// PROVISIONAL — not ratified (templates).
export const GATE_HEADLINE = (noun) => `This ${noun} speaks from experience, so no claim in it owes a source.`

export function buildVerdict({ rubric, totalClaims, flaggedClaims }) {
  const noun = rubric.documentNoun || 'document'
  const n = totalClaims
  const f = flaggedClaims
  if (n === 0) return `We found no claims in this ${noun} to weigh.`
  if (f === 0) return n === 1 ? 'Its one claim stays within what its evidence shows.' : `All ${n} claims stay within what their evidence shows.`
  if (f === n) return n === 1 ? 'Its one claim says more than its evidence shows.' : `All ${n} claims say more than their evidence shows.`
  return f === 1 ? `1 of ${n} claims says more than its evidence shows.` : `${f} of ${n} claims say more than their evidence shows.`
}
