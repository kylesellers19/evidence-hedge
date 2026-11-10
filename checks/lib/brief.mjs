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
import { buildEvidenceSection, VERDICTS } from '../../src/engine/evidenceSection.js'
import { briefTop } from '../../src/components/results/briefTop.js'

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

  const total = summary.distribution.reduce((n, d) => n + d.count, 0) || 1
  const self = profile.provenance.selfCitation
  const refs = result.references?.length || 0
  const scoped = (rubric.provenance || []).some((p) => p.scope)

  // The top of the brief, as ResultsPage renders it (src/components/results/briefTop.js).
  const top = briefTop(result, rubric)
  return {
    header: {
      readAs: top.readAs,
      heldTo: top.heldTo,
      draft: !!rubric.stub,
      dek: top.dek,
      score: top.verdictBox.score,
      scoreHref: top.verdictBox.href,
      verdictBox: top.verdictBox.summary,
    },
    verdict: summary.verdict,
    counts: { claimsWeighed: top.stats.claims, readAsStrong: top.stats.strong, flagged: top.stats.flagged, unsupported: top.stats.unsupported, overconfident: top.stats.overconfident, overreach: top.stats.overreach, twoFlags: top.stats.twoFlags },
    countsNotes: { breakdown: top.breakdown, scoreLine: top.scoreLine },
    evidenceSection: evidenceSectionOf(result, rubric, run.loaded?.pages || null),
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

// The evidence section as the page shows it (src/components/results/EvidenceSection.jsx),
// in the four verdicts' own words: the dek, the bar, the claims to check first,
// the pages or parts with the one each opens on, and the rows of sources with
// the examples the open row shows. Quoted claims and their underlined words are
// recorded whole, so redact() can hash them.
const VERDICT_LABEL = Object.fromEntries(VERDICTS.map((v) => [v.key, v.label]))
function evidenceSectionOf(result, rubric, pages) {
  if (!result.claims?.length) return null
  const s = buildEvidenceSection(result, rubric, { pages })
  if (s.gated) return { sentence: s.sentence }
  const claim = (i) => {
    const c = s.claims[i]
    return { claim: i + 1, text: c.text, verdict: VERDICT_LABEL[c.verdict], reason: c.reason, where: s.where.places[c.place].label }
  }
  const place = s.where.places[s.where.opensOn]
  const row = s.sources.rows.find((r) => r.key === s.sources.opensOn)
  return {
    dek: s.dek,
    bar: VERDICTS.map((v) => ({ verdict: v.label, count: s.counts[v.key] })),
    methods: s.methods,
    needChecking: s.needs,
    checkFirst: s.checkFirst.map((i) => ({ ...claim(i), underlined: s.claims[i].underline.map(([a, b]) => s.claims[i].text.slice(a, b)) })),
    where: {
      unit: s.where.unit,
      boxes: s.where.places.map((p) => ({ label: p.label, claims: p.claims.length, needChecking: p.needs })),
      opensOn: { label: place.label, example: place.example != null ? claim(place.example) : null },
    },
    sources: {
      rows: s.sources.rows.map((r) => ({ label: r.label, sub: r.sub, claims: r.claims, backed: r.backed, overstates: r.overstates, fact: r.fact, cautious: r.cautious, needChecking: r.needs })),
      opensOn: row ? { label: row.label, examples: row.examples.map(claim) } : null,
    },
  }
}

const QUOTED = [
  (b) => (b.howJudged ? Object.values(b.howJudged.roles).flatMap((r) => r.evidence) : []).map((e) => [e, 'span']),
  (b) => [[b.profile, 'provenanceSpans'], [b.profile, 'studyDesignSpans']],
  (b) => b.signals.map((s) => [s, 'evidence']),
  (b) => b.patterns.map((p) => [p, 'examples']),
  (b) => {
    const e = b.evidenceSection
    if (!e || e.sentence) return []
    const quoted = [...e.checkFirst, ...(e.where.opensOn.example ? [e.where.opensOn.example] : []), ...(e.sources.opensOn?.examples || [])]
    return [...quoted.map((c) => [c, 'text']), ...e.checkFirst.map((c) => [c, 'underlined'])]
  },
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
