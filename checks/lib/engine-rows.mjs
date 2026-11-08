// ─────────────────────────────────────────────────────────────────────────────
// The engine's output per sentence unit, tagged with the engine commit.
//
// engineRows(run, commit) walks the units in order and matches each claim
// analyze() returned (claims are a subsequence of the units: same splitter,
// same body). A unit with no claim is `extracted: false` with the rule that
// dropped it, in extractClaims' own order: minimum length, hard drop
// (boilerplate, byline, nav chrome), apparatus rule (measure/segment.js), then
// below the extraction sensitivity. Its claim fields are undetermined.
//
// `measure` is the measurement layer run directly on every unit's text
// (causal register and certainty tier, rubric-invariant). The app shows these
// only for extracted claims; they are exported so a published model and the
// engine can be compared on identical units.
// ─────────────────────────────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process'
import { ROOT } from './corpus.mjs'
import { isDropped, classifyNonClaim } from '../../src/engine/nonClaimFilter.js'
import { nonClaimRule } from '../../src/engine/measure/segment.js'
import { causalRegister } from '../../src/engine/measure/causalRegister.js'
import { measureCertainty } from '../../src/engine/measure/certainty.js'
import { REGISTER_STRENGTH } from './mapping.mjs'

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()

/**
 * The engine's identity: the last commit that touched src/ (a commit that only
 * adds checks leaves it unchanged), suffixed -dirty when src/ has uncommitted
 * changes.
 */
export function engineCommit() {
  const last = git('log', '-1', '--format=%h', '--', 'src')
  const dirty = git('status', '--porcelain', '--', 'src').length > 0
  return dirty ? `${last}-dirty` : last
}

export function dropReason(s, extraction, rubricId) {
  if (s.length < extraction.minClaimLength) return { rule: 'min-length' }
  if (isDropped(s)) return { rule: classifyNonClaim(s, rubricId).rule }
  const rule = nonClaimRule(s)
  if (rule) return { rule }
  const demote = classifyNonClaim(s, rubricId)
  return { rule: 'below-sensitivity', ...(demote.action === 'demote' ? { demotedBy: demote.rule } : {}) }
}

const rungOf = (r) => (r ? { key: r.key, rank: r.rank } : null)

function explanationOf(e) {
  if (!e) return null
  return { tierAsserted: { key: e.tierAsserted.key, weight: e.tierAsserted.weight }, rungReached: rungOf(e.rungReached), ceiling: e.ceiling, posture: e.posture }
}

export function measureUnit(text) {
  const reg = causalRegister(text)
  return { register: reg.register, causal_strength: REGISTER_STRENGTH[reg.register], register_cues: reg.cues.map((c) => c.root), tier: measureCertainty(text).tier }
}

// Attribution per unit (change set 3): analysis.attribution.sentences covers
// every body sentence, in the order the units are built from.
export function unitAttribution(run) {
  const sentences = run.analysis.attribution?.sentences || []
  if (sentences.length !== run.units.length) throw new Error(`attribution drift on ${run.fixture.id}: ${sentences.length} attributed sentences vs ${run.units.length} units`)
  return sentences
}

export function engineRows(run, commit) {
  const { units, analysis, rubric } = run
  const rubricId = rubric.base || rubric.id
  const claims = analysis.claims
  const attribution = unitAttribution(run)
  let ci = 0
  const rows = units.map((u, ui) => {
    const base = { unit_id: u.id, fixture: u.fixture, engine_commit: commit, label_tier: 'predicted', attribution: attribution[ui] }
    const c = claims[ci]
    if (!c || c.text !== u.text) {
      const drop = dropReason(u.text, rubric.extraction, rubricId)
      return { ...base, extracted: false, drop_rule: drop.rule, ...(drop.demotedBy ? { demoted_by: drop.demotedBy } : {}), claim: null, undetermined: `not extracted (${drop.rule})`, measure: measureUnit(u.text) }
    }
    ci++
    return {
      ...base,
      extracted: true,
      claim: {
        claim_id: c.id,
        section: c.section,
        tier: c.tier.key,
        certainty: { hedges: c.certainty.hedges, boosters: c.certainty.boosters, attitude: c.certainty.attitude },
        register: c.register.register,
        causal_strength: REGISTER_STRENGTH[c.register.register],
        register_cues: c.register.cues,
        function: c.function,
        recommendation: c.recommendation.strength,
        citations: c.citations,
        rung: rungOf(c.rung),
        cited_rung: rungOf(c.citedRung),
        in_document: c.inDocument,
        disclosed: c.disclosed,
        flag: c.flag,
        explanation: explanationOf(c.explanation),
        overreach: c.overreach ? { distance: c.overreach.distance, explanation: c.overreach.explanation } : null,
        evidence: c.evidence,
      },
      measure: measureUnit(u.text),
    }
  })
  if (ci !== claims.length) {
    throw new Error(`unit drift on ${run.fixture.id}: claim ${ci} ("${claims[ci].text.slice(0, 60)}…") is not a unit — the copied splitter no longer matches extractClaims`)
  }
  return rows
}

/** Document-level output: routing, profile, counts, score, signals. */
export function docSummary(run, commit) {
  const { analysis: a, route, loaded } = run
  return {
    fixture: run.fixture.id,
    engine_commit: commit,
    label_tier: 'predicted',
    via: loaded.via,
    source_url: loaded.sourceUrl,
    route: {
      standard: route.rubric,
      rubric: run.rubric.id,
      posture: route.posture,
      confidence: route.confidence,
      genres: route.judgment.genres,
      scenarios: (route.judgment.scenarios || []).map((s) => s.id),
      reasons: route.reasons,
    },
    profile: {
      provenance: a.profile.provenance.kind,
      design: a.profile.design.design,
      design_inherited: !!a.profile.design.inherited,
    },
    summary: { totalClaims: a.summary.totalClaims, strongClaims: a.summary.strongClaims, flagCounts: a.summary.flagCounts },
    score: a.documentScore.score,
    band: a.documentScore.band,
    references: a.references.length,
    signals: a.signals.map((s) => ({ id: s.id, severity: s.severity, summary: s.summary, evidence: s.evidence || [] })),
  }
}
