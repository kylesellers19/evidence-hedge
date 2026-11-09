// ─────────────────────────────────────────────────────────────────────────────
// The evidence brief as data: every value src/pages/ResultsPage.jsx and its
// components put on the page, derived the same way, for a run from
// checks/lib/fixtures.mjs (detected genres, nothing adjusted by the user).
//
// Text quoted from the document (role and profile spans, signal evidence,
// pattern examples) is replaced by { sha, chars }: sha is the first 12 hex of
// sha256(text), as unit ids use. A fixture's text is not public domain and
// the repo is public, so a target records which lines the brief quotes
// without republishing them. A span the document does not contain verbatim
// (the reporting-gaps items) is the engine's own text and stays readable.
// ─────────────────────────────────────────────────────────────────────────────

import { getRubric } from '../../src/rubrics/index.js'
import { signalTitle } from '../../src/engine/signals/titles.js'
import { PATTERN_META } from '../../src/engine/patterns.js'
import { GENRE_LABELS, PROVENANCE_LABELS, roleText } from '../../src/components/genre/labels.js'
import { textHash } from './units.mjs'
import { buildEvidenceMap, provenanceOf, noteOf, ATTRIBUTION_LABELS } from '../../src/engine/evidenceMap.js'

// Copied from src/components/results/DocumentProfile.jsx (not exported there).
const REGISTER_LABELS = {
  none: 'no causal',
  correlational: 'associational',
  'conditional-causal': 'hedged causal',
  'direct-causal': 'direct causal',
}
const humanize = (s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')

const ROLES = ['speaker', 'form', 'stake', 'evidence']
const ORIGINS = ['research', 'corporate', 'journalism', 'general', 'hybrid', 'shared']
const ORIGIN_LABEL = { ...GENRE_LABELS, hybrid: 'This mix', shared: 'Every genre' }

function signalTag(s) {
  if (s.positive) return `${s.positiveLabel || 'Disclosed'} ✓`
  return s.severity === 'flag' ? 'Flag' : 'Note'
}

function provenanceHeading(scope) {
  if (scope === 'hybrid') return 'Frameworks for this mix'
  if (scope === 'shared') return 'Shared measurement standards'
  return `${GENRE_LABELS[scope]} standards`
}

/** The brief's values for one run, with quoted text left as plain strings. */
export function briefOf(run) {
  const { analysis: result, rubric } = run
  const standard = getRubric(rubric.base || rubric.id)
  const { summary, patterns, signals, profile } = result
  const h = rubric.hybrid

  const ua = summary.flagCounts['unsupported-assertion']
  const oc = summary.flagCounts.overconfident
  const total = summary.distribution.reduce((n, d) => n + d.count, 0) || 1
  const self = profile.provenance.selfCitation
  const refs = result.references?.length || 0
  const scoped = (rubric.provenance || []).some((p) => p.scope)

  return {
    header: {
      judgedAs: rubric.label,
      heldTo: h ? standard.label : null,
      posture: result.posture || null,
      draft: !!rubric.stub,
      genreNote: result.documentScore?.genreNote || null,
    },
    verdict: summary.verdict,
    counts: { claimsWeighed: summary.totalClaims, readAsStrong: summary.strongClaims, flagged: ua + oc },
    evidenceMap: evidenceMapOf(result, rubric),
    howJudged: profile.genre ? {
      reading: 'detected automatically',
      genres: h ? h.genres.map((g) => GENRE_LABELS[g]) : [standard.label],
      scenario: h ? h.scenarios.map((s) => s.name).join(' · ') : standard.description,
      heldTo: `The ${standard.label.toLowerCase()} evidence standard.`,
      why: h ? h.why : `One genre fills every role, so the ${standard.label.toLowerCase()} rubric applies as written.`,
      ladder: [...standard.ladder].sort((a, b) => a.rank - b.rank).map((r) => r.label),
      auditedFor: {
        standard: `${standard.label} audits (${standard.documentSignals.length})`,
        added: ORIGINS
          .map((o) => ({ from: ORIGIN_LABEL[o], audits: (h?.audits || []).filter((a) => a.from === o).map((a) => signalTitle(a.id)) }))
          .filter((g) => g.audits.length),
      },
      roles: Object.fromEntries(ROLES.map((role) => {
        const r = profile.genre.roles[role]
        return [role, r
          ? { genre: GENRE_LABELS[r.genre], text: roleText(role, r), evidence: (r.evidence || []).slice(0, 1).map((e) => ({ signal: e.signal && !e.signal.startsWith('text:') ? e.signal : null, span: e.span })) }
          : { genre: null, text: roleText(role, r), evidence: [] }]
      })),
    } : null,
    profile: {
      provenance: PROVENANCE_LABELS[profile.provenance.kind] || humanize(profile.provenance.kind),
      provenanceSpans: profile.provenance.evidence.slice(0, 2).map((e) => e.span),
      studyDesign: `${humanize(profile.design.design)}${profile.design.inherited ? ' — inherited from the study it describes' : ''}`,
      studyDesignSpans: profile.design.evidence.slice(0, 1).map((e) => e.span),
      designCeiling: `Licenses up to ${REGISTER_LABELS[profile.design.ceiling.maxRegister]} language and ${profile.design.ceiling.maxRecommendation} advice.`,
      causalityDisclaimed: profile.design.selfDisclaimsCausality ? profile.design.disclaimerEvidence.slice(0, 1) : null,
      selfCitation: self.pool > 0 ? { percent: Math.round(self.share * 100), matched: self.matched, pool: self.pool } : null,
      referencesSetAside: refs > 0 ? refs : null,
    },
    signals: (signals || []).map((s) => ({ id: s.id, title: signalTitle(s.id), tag: signalTag(s), summary: s.summary, evidence: s.evidence || [] })),
    patterns: patterns.map((p) => ({ key: p.key, name: p.name, count: p.count, description: p.description, examples: p.examples })),
    distribution: [...summary.distribution]
      .sort((a, b) => b.rung.rank - a.rung.rank)
      .map(({ rung, count }) => ({ rung: rung.label, count, percent: Math.round((count / total) * 100) })),
    distributionNote: `How this document's claims spread across the ${standard.label.toLowerCase()} ladder, strongest evidence to unsourced.`,
    rubricProvenance: {
      heading: `Rubric provenance — ${rubric.label}`,
      groups: (scoped
        ? [...new Set(rubric.provenance.map((p) => p.scope))].map((scope) => ({ scope, entries: rubric.provenance.filter((p) => p.scope === scope) }))
        : [{ scope: null, entries: rubric.provenance || [] }]
      ).map((g) => ({
        heading: g.scope ? provenanceHeading(g.scope) : null,
        entries: g.entries.map((p) => ({
          criterion: p.criterion,
          citation: p.citation,
          ...(p.scope === 'hybrid' ? { measuredBy: p.measures?.length ? p.measures.map((id) => PATTERN_META[id]?.name || signalTitle(id)) : 'cited only' } : {}),
          url: p.url || null,
        })),
      })),
    },
  }
}

// The evidence map as the page shows it (src/components/results/EvidenceMap.jsx):
// the dek, every From → Via → To row and the claim the panel opens on. Text
// that comes from the document is recorded whole (a reference entry, the
// claim), never as a clipped label, so redact() can hash it.
function evidenceMapOf(result, rubric) {
  const map = buildEvidenceMap(result, rubric)
  if (!map.claims.length) return null
  const standard = getRubric(rubric.base || rubric.id)
  const lead = map.claims[map.lead]
  const tierLabel = (w) => map.tiers.find((t) => t.weight === w)?.label || null
  return {
    dek: map.dek,
    rows: map.rows.map((r) => ({
      from: r.continued ? '″' : (r.span || r.label),
      sub: r.sub,
      via: r.via ? r.via.mark : null,
      grade: r.grade,
      claims: r.claims.length,
      reaches: r.reach,
      pastIt: r.outruns,
      overreach: r.overreach,
    })),
    panel: {
      claim: lead.index + 1,
      text: lead.text,
      provenance: provenanceOf(lead, map.rows, standard.label, map.tiers),
      statedAs: lead.tier.label,
      sourceReaches: tierLabel(lead.ceiling),
      pastItsReach: Math.max(0, lead.tier.weight - lead.ceiling),
      whoseFinding: ATTRIBUTION_LABELS[lead.attribution.label] || lead.attribution.label,
      entry: lead.kind === 'reference' ? lead.targetSpan : null,
      note: noteOf(lead),
    },
  }
}

const QUOTED = [
  (b) => (b.howJudged ? Object.values(b.howJudged.roles).flatMap((r) => r.evidence) : []).map((e) => [e, 'span']),
  (b) => [[b.profile, 'provenanceSpans'], [b.profile, 'studyDesignSpans']],
  (b) => b.signals.map((s) => [s, 'evidence']),
  (b) => b.patterns.map((p) => [p, 'examples']),
  (b) => (b.evidenceMap
    ? [[b.evidenceMap.panel, 'text'], [b.evidenceMap.panel, 'entry'], ...b.evidenceMap.rows.map((r) => [r, 'from'])]
    : []),
]

/**
 * Replace text the document contains verbatim with { sha, chars }.
 * @param {object} brief  from briefOf (not modified)
 * @param {string} text   the fixture text analyze() read
 */
export function redact(brief, text) {
  const flat = text.replace(/\s+/g, ' ')
  const hide = (s) => (typeof s === 'string' && (text.includes(s) || flat.includes(s.replace(/\s+/g, ' '))) ? { sha: textHash(s), chars: s.length } : s)
  const out = structuredClone(brief)
  for (const pick of QUOTED) {
    for (const [obj, key] of pick(out)) {
      obj[key] = Array.isArray(obj[key]) ? obj[key].map(hide) : hide(obj[key])
    }
  }
  return out
}

/** Paths where two values differ, as 'a.b[2].c: expected → actual'. */
export function diff(expected, actual, path = '') {
  if (JSON.stringify(expected) === JSON.stringify(actual)) return []
  const bothObjects = expected && actual && typeof expected === 'object' && typeof actual === 'object' && Array.isArray(expected) === Array.isArray(actual)
  if (!bothObjects) return [`${path || '(root)'}: ${JSON.stringify(expected)} → ${JSON.stringify(actual)}`]
  const keys = Array.isArray(expected)
    ? [...Array(Math.max(expected.length, actual.length)).keys()]
    : [...new Set([...Object.keys(expected), ...Object.keys(actual)])]
  return keys.flatMap((k) => diff(expected[k], actual[k], Array.isArray(expected) ? `${path}[${k}]` : path ? `${path}.${k}` : k))
}
