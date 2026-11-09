// ─────────────────────────────────────────────────────────────────────────────
// buildEvidenceMap(result, rubric) → what each claim stands on, as one figure.
//
// Read-only, after every judgment (like claim records): it reads the claims'
// links (Stage 4, linkEvidence.js), attribution (attribution.js), rung, tier,
// flags and causal overreach exactly as analyze() left them, and changes none
// of them. analyze() never imports this file, so no flag, signal or score can
// move because of it. The results page and checks/lib/brief.mjs both call it.
//
// Every claim lands in exactly one ground: the strongest thing it leans on,
// in GROUND_KINDS order. The figure reads left to right, From → Via → To:
// one row per source (a named source that carries two or more claims gets a
// row of its own; the rest are gathered by kind), the citation mechanism it
// reaches the claim by, and the claims placed by how sure each sentence sounds.
// A row's rule runs as far as its source can carry a claim (its reach: the
// rubric's ceiling at that rung), so a claim past the end of its rule is a
// claim the engine flagged. The rule's style is the grade of the link
// (after Delgam's decisions map: solid, dashed, dotted, none):
//
//   linked    solid    resolved to a reference entry, a URL or DOI, a note, a
//                      "Source:" caption in its own paragraph, or its own study
//                      through a results section
//   loose     dashed   a marker with no matching entry, a quoted speaker, a
//                      token found nearby but not routed (proximity), a figure,
//                      an own result read from the sentence alone, the study a
//                      derivative document reports, the publisher itself, a
//                      source type named with no link
//   presumed  dotted   an appeal to research the document does not name
//   none      —        no source at all
//
// Each claim's judgment comes from the engine, never from here:
//   outruns   a flag (unsupported-assertion or overconfident)
//   overreach causal-overreach only: more cause than the design licenses
//   within    no flag
//   gated     the posture gate cleared every flag (no evidence obligation)
//
// Labels and the grade assignments are PROVISIONAL — not ratified.
// ─────────────────────────────────────────────────────────────────────────────

/** Ground kinds, strongest link first; the figure's rows follow this order. */
export const GROUND_KINDS = [
  { kind: 'reference', grade: 'linked', label: 'Its reference list', note: 'resolved to an entry' },
  { kind: 'link', grade: 'linked', label: 'Links, DOIs and notes', note: 'URL, DOI, note or source line' },
  { kind: 'own', grade: 'linked', label: 'Its own study', note: 'results section or own source line' },
  { kind: 'own-implied', grade: 'loose', label: 'Its own results, not linked', note: 'read as its own result' },
  { kind: 'described-study', grade: 'loose', label: 'The study it reports', note: 'another’s study, not linked' },
  { kind: 'speaker', grade: 'loose', label: 'Quoted speakers', note: 'the person quoted' },
  { kind: 'unresolved', grade: 'loose', label: 'Citations with no entry', note: 'no entry matches the marker' },
  { kind: 'proximity', grade: 'loose', label: 'Nearby, not attached', note: 'in the sentence, not routed to it' },
  { kind: 'publisher', grade: 'loose', label: 'The publisher itself', note: 'its own site or earlier work' },
  { kind: 'keyword', grade: 'loose', label: 'Source type named', note: 'names a kind of source, no link' },
  { kind: 'unnamed', grade: 'presumed', label: 'Research it doesn’t name', note: '“studies show”, nothing to check' },
  { kind: 'none', grade: 'none', label: 'Nothing on file', note: 'no link, no named source' },
]
const KIND = Object.fromEntries(GROUND_KINDS.map((g, i) => [g.kind, { ...g, order: i }]))

export const GRADE_LABELS = {
  linked: 'Linked',
  loose: 'Attributed, not linked',
  presumed: 'Presumed',
  none: 'Nothing on file',
}

const REGISTER_LABELS = {
  none: 'no causal',
  correlational: 'associational',
  'conditional-causal': 'hedged causal',
  'direct-causal': 'direct causal',
}
const BASIS_LABELS = {
  marker: 'Citation marker',
  footnote: 'Footnote',
  caption: 'Source line or figure',
  hyperlink: 'Link or DOI',
  'section-scope': 'Results section',
  proximity: 'Found nearby',
  speaker: 'Quoted speaker',
}
const NAMED_STUDY_CUES = new Set(['named-source', 'study-by', 'published-in', 'according-to', 'definite-study'])
export const DESIGN_LABELS = {
  rct: 'randomized trial',
  'controlled-experiment': 'controlled experiment',
  'quasi-experimental': 'quasi-experimental',
  'cohort-longitudinal': 'cohort',
  'repeated-cross-sectional': 'repeated cross-sectional',
  'cross-sectional': 'cross-sectional',
  'pre-post-uncontrolled': 'uncontrolled before-and-after',
  'case-qualitative': 'case or qualitative',
  modeling: 'modeling',
  'systematic-review': 'systematic review',
  'narrative-review': 'narrative review',
  'none-reported': 'no reported',
}
const designLabel = (d) => DESIGN_LABELS[d] || String(d).replace(/-/g, ' ')
const withArticle = (w) => `${/^[aeiou]/i.test(w) ? 'an' : 'a'} ${w}`
const clip = (s, n) => {
  const t = String(s || '').replace(/^[^\p{L}\p{N}“"(\[]+/u, '')
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t
}

function hostPath(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return clip(u.host.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname), 70)
  } catch {
    return clip(url, 70)
  }
}

// The one link that decides a claim's ground: the first match in this order.
const LINK_ORDER = [
  (l) => l.basis === 'marker' && l.target.kind === 'reference' && l.confidence === 'high',
  (l) => l.basis === 'hyperlink' || l.basis === 'footnote' || (l.basis === 'caption' && l.target.kind === 'source' && l.confidence === 'high'),
  (l) => (l.basis === 'section-scope' || l.basis === 'caption') && l.target.kind === 'own-study',
  (l) => l.basis === 'marker' && l.target.kind === 'reference',
  (l) => l.basis === 'caption' && l.target.kind === 'source',
  (l) => l.basis === 'caption' && l.target.kind === 'figure',
  (l) => l.basis === 'speaker',
  (l) => l.basis === 'marker',
  (l) => l.basis === 'proximity',
]
function primaryLink(links) {
  for (const test of LINK_ORDER) {
    const hit = links.find(test)
    if (hit) return hit
  }
  return links[0] || null
}

const ownUrl = (claim, link) => claim.citations.some((t) => t.type === 'url-own' && t.raw.slice(0, 120) === link.anchor)

// ── One claim's ground ───────────────────────────────────────────────────────
function groundOf(claim, ctx) {
  const links = claim.evidence?.links || []
  const link = primaryLink(links)
  const attr = claim.attribution || { label: 'undetermined', cues: [] }
  const cues = attr.cues || []

  if (link) {
    const t = link.target
    if (link.basis === 'marker' && t.kind === 'reference') {
      return {
        kind: link.confidence === 'high' ? 'reference' : 'unresolved',
        targetId: `ref:${t.index}`,
        targetLabel: clip(t.text, 110),
        targetSpan: t.text,
        link,
        ...(link.confidence === 'low' ? { gradeOverride: 'loose', reason: 'matches more than one entry' } : {}),
      }
    }
    if (link.basis === 'hyperlink') {
      const url = t.url || link.anchor
      if (ownUrl(claim, link)) return { kind: 'publisher', targetId: 'publisher', targetLabel: ctx.publisherName, link }
      return { kind: 'link', targetId: `url:${url}`, targetLabel: hostPath(url), targetSpan: url, link }
    }
    if (link.basis === 'footnote') return { kind: 'link', targetId: `note:${t.number}`, targetLabel: `Note ${t.number}: ${clip(t.text, 90)}`, targetSpan: t.text, link }
    if (t.kind === 'own-study') {
      return {
        kind: link.confidence === 'high' ? 'own' : 'own-implied',
        targetId: 'own-study',
        targetLabel: ctx.ownStudyLabel,
        link,
      }
    }
    if (link.basis === 'caption' && t.kind === 'source') {
      return { kind: link.confidence === 'high' ? 'link' : 'proximity', targetId: `caption:${t.text}`, targetLabel: clip(t.text, 100), targetSpan: t.text, link, ...(link.confidence === 'low' ? { reason: 'a source line a few paragraphs on' } : {}) }
    }
    if (t.kind === 'figure') return { kind: 'own-implied', targetId: `figure:${t.label}`, targetLabel: `${t.label} in the document`, link }
    if (link.basis === 'speaker') return { kind: 'speaker', targetId: `speaker:${t.name || '?'}`, targetLabel: t.name ? t.name : 'An unnamed speaker', link }
    if (link.basis === 'marker') return { kind: 'unresolved', targetId: `marker:${link.anchor}`, targetLabel: `${link.anchor}${t.reason ? ` (${t.reason})` : ''}`, link }
    if (link.basis === 'proximity') return { kind: 'proximity', targetId: `near:${link.anchor}`, targetLabel: clip(link.anchor, 80), targetSpan: link.anchor, link }
  }

  // No link: what the engine read from the sentence alone.
  if (claim.inDocument) return { kind: 'own-implied', targetId: 'own-study', targetLabel: ctx.ownStudyLabel, link: null }
  if (ctx.inherited && (attr.label === 'cited-other' || attr.label === 'own-current') && cues.some((c) => NAMED_STUDY_CUES.has(c.cue))) {
    return { kind: 'described-study', targetId: 'described-study', targetLabel: ctx.describedLabel, link: null }
  }
  if (attr.label === 'own-prior') return { kind: 'publisher', targetId: 'publisher', targetLabel: ctx.publisherName, link: null }
  if (claim.rung.rank > 0) return { kind: 'keyword', targetId: `rung:${claim.rung.key}`, targetLabel: claim.rung.label, link: null }
  if (cues.some((c) => c.cue === 'unnamed-source')) {
    const cue = cues.find((c) => c.cue === 'unnamed-source')
    return { kind: 'unnamed', targetId: 'unnamed', targetLabel: 'Research it doesn’t name', targetSpan: cue.span, link: null }
  }
  return { kind: 'none', targetId: 'none', targetLabel: 'Nothing on file', link: null }
}

// ── One claim's judgment, read from the engine ───────────────────────────────
function judgmentOf(claim, gated) {
  if (gated) return 'gated'
  if (claim.flag) return 'outruns'
  if (claim.overreach) return 'overreach'
  return 'within'
}

function ceilingFor(rubric, posture, rank) {
  const table = rubric.tolerance.ceilings[posture] ?? rubric.tolerance.ceilings.default
  return table[rank] ?? table[table.length - 1]
}

// The one-line caption a claim carries in the panel (after Delgam's captions).
function captionOf(c, tiers) {
  const tierName = (w) => (tiers.find((t) => t.weight === w)?.label || `tier ${w}`).toLowerCase()
  const asserted = c.tier.label.toLowerCase()
  if (c.judgment === 'gated') return 'Experiential writing: no evidence obligation.'
  if (c.flag === 'unsupported-assertion') return `Stated as ${asserted} with nothing on file to carry it.`
  if (c.flag === 'overconfident') return `${c.rung.label} carries up to ${tierName(c.ceiling)}; this is stated as ${asserted}.`
  if (c.overreach) {
    const ex = c.overreach.explanation
    return `Its causal language (${REGISTER_LABELS[ex.causalRegister]}) goes past what ${ex.design === 'none-reported' ? 'no reported design' : `${withArticle(designLabel(ex.design))} design`} licenses (${REGISTER_LABELS[ex.designCeiling.maxRegister]}).`
  }
  if (c.rung.rank === 0) return c.disclosed ? 'No source, and stated tentatively enough to stand.' : `No source, but stated softly enough (${asserted}) to stand.`
  return `${c.rung.label} carries a ${asserted} statement.`
}

/**
 * @param {import('./types.js').AnalysisResult & { claims: any[] }} result
 * @param {import('./types.js').RubricConfig} rubric   the rubric analyze() ran under
 */
export function buildEvidenceMap(result, rubric) {
  const claims0 = result.claims || []
  const posture = result.posture
  const gated = (result.signals || []).some((s) => s.gate)
  const design = result.profile?.design || { design: 'none-reported', inherited: false }
  const publisher = result.profile?.provenance?.publisher || []
  const tiers = [...rubric.tiers].sort((a, b) => a.weight - b.weight)
  const ctx = {
    publisherName: publisher[0] || 'The publisher',
    inherited: !!design.inherited,
    ownStudyLabel: design.design && design.design !== 'none-reported' && !design.inherited
      ? `Its own study (${designLabel(design.design)})`
      : 'Its own data or figures',
    describedLabel: design.design && design.design !== 'none-reported'
      ? `The study it reports (${designLabel(design.design)})`
      : 'The study it reports',
  }

  const claims = claims0.map((c, index) => {
    const g = groundOf(c, ctx)
    const kind = KIND[g.kind]
    const ceiling = ceilingFor(rubric, posture, c.rung.rank)
    const out = {
      index,
      id: c.id ?? index,
      text: c.text,
      tier: { key: c.tier.key, label: c.tier.label, weight: c.tier.weight },
      rung: { key: c.rung.key, label: c.rung.label, rank: c.rung.rank },
      ceiling,
      flag: gated ? null : c.flag,
      overreach: gated ? null : c.overreach,
      disclosed: !!c.disclosed,
      method: c.function === 'method',
      register: c.register?.register || 'none',
      attribution: { label: c.attribution?.label || 'undetermined', confidence: c.attribution?.confidence || 'low', cue: c.attribution?.cues?.[0] || null, reason: c.attribution?.reason || null },
      kind: g.kind,
      grade: g.gradeOverride || kind.grade,
      targetId: g.targetId,
      targetLabel: g.targetLabel,
      targetSpan: g.targetSpan || null,
      groundReason: g.reason || null,
      link: g.link ? { basis: g.link.basis, basisLabel: BASIS_LABELS[g.link.basis] || g.link.basis, anchor: g.link.anchor, confidence: g.link.confidence } : null,
      linkCount: (c.evidence?.links || []).length,
      evidenceStatus: c.evidence?.status || 'unlinked',
      evidenceReason: c.evidence?.reason || null,
    }
    out.judgment = judgmentOf(out, gated)
    out.caption = captionOf(out, tiers)
    out.via = viaOf(out, c)
    return out
  })

  // Grounds: one per kind that holds a claim (the census and the checks).
  const grounds = GROUND_KINDS
    .map((k) => {
      const members = claims.filter((c) => c.kind === k.kind)
      return {
        kind: k.kind, label: k.label, note: k.note, grade: k.grade,
        claims: members.map((c) => c.index),
        outruns: members.filter((c) => c.judgment === 'outruns').length,
        overreach: members.filter((c) => c.judgment === 'overreach').length,
        targets: new Set(members.map((c) => c.targetId)).size,
      }
    })
    .filter((g) => g.claims.length)

  const rows = rowsOf(claims, ctx, tiers)
  // Census (after Delgam's "Of the 95 findings we draw on, 26 …").
  const n = claims.length
  const count = (pred) => claims.filter(pred).length
  const census = {
    claims: n,
    linked: count((c) => c.grade === 'linked'),
    ownImplied: count((c) => c.kind === 'own-implied'),
    loose: count((c) => c.grade === 'loose' && c.kind !== 'own-implied'),
    presumed: count((c) => c.grade === 'presumed'),
    none: count((c) => c.grade === 'none'),
    outruns: count((c) => c.judgment === 'outruns'),
    overreach: count((c) => c.judgment === 'overreach'),
    gated,
  }
  census.sentence = censusSentence(census)

  // The panel opens on the strongest claim that outruns its ground, else the
  // strongest causal overreach, else the strongest claim.
  const rankOf = (c) => (c.judgment === 'outruns' ? 2 : c.judgment === 'overreach' ? 1 : 0)
  const lead = [...claims].sort((a, b) => rankOf(b) - rankOf(a) || b.tier.weight - a.tier.weight || a.index - b.index)[0]

  return {
    claims,
    grounds,
    rows,
    dek: dekOf(claims, rows, tiers),
    census,
    tiers: tiers.map((t) => ({ key: t.key, label: t.label, weight: t.weight })),
    lead: lead ? lead.index : null,
  }
}


// ── Rows: the figure's From → Via → To lines ─────────────────────────────────

// Kinds whose target is one named source; a target carrying two or more claims
// gets a row of its own, at most SPECIFIC_ROWS per kind. PROVISIONAL.
const SPECIFIC_KINDS = new Set(['reference', 'link', 'own', 'own-implied', 'described-study', 'speaker', 'publisher'])
export const SPECIFIC_ROWS = 8 // PROVISIONAL — not ratified
const ROW_NOUN = {
  reference: ['other reference', 'other references'],
  link: ['other link or note', 'other links and notes'],
  own: ['other part of its own study', 'other parts of its own study'],
  'own-implied': ['other figure or table', 'other figures and tables'],
  'described-study': ['other study it reports', 'other studies it reports'],
  speaker: ['other speaker', 'other speakers'],
  publisher: ['other page of its own', 'other pages of its own'],
}

// "Zeitzer, J. M., Dijk, D., … (2000). Sensitivity of …" → name, year, title.
function citeName(text) {
  const t = String(text || '').replace(/^\s*(?:\[?\d+[\].)]?\s*)/, '').replace(/^[^\p{L}]+/u, '')
  const surname = t.match(/^([\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+)?)(?=,|\s+[\p{Lu}]{1,3}[ ,.]|\s+et\s+al|\.)/u)
  const year = t.match(/\((\d{4})[a-z]?\)|\b((?:19|20)\d{2})[a-z]?\b/)
  if (!surname || !year) return null
  const authors = t.slice(0, year.index)
  const more = /et\s+al|,\s*[\p{Lu}][\p{L}'’-]+,\s*[\p{Lu}]|&|\band\b/u.test(authors.slice(surname[0].length))
  const after = t.slice(year.index + year[0].length).replace(/^[\s).,:]+/, '')
  const title = after.split(/(?<=[a-z0-9?])\.\s/)[0]
  return { name: `${surname[1]}${more ? ' et al.' : ''}, ${year[1] || year[2]}`, title: clip(title, 64) }
}

// A marker as it reads in the text: "[12]", "(USGBC 2014)", "Persily (2015)".
function markerText(anchor) {
  const a = String(anchor || '').trim().replace(/\s+/g, ' ')
  if (/^\[.*\]$/.test(a)) return a
  const bare = a.replace(/^[(\s]+|[)\s]+$/g, '')
  const year = bare.match(/((?:19|20)\d{2}[a-z]?)$/)
  if (!year || !/\p{L}/u.test(bare)) return clip(a, 18)
  const narrative = /\p{L}[^()]*\((?:19|20)\d{2}[a-z]?\)$/u.test(a)
  const typed = narrative ? a : `(${bare})`
  if (typed.length <= 18) return typed
  const surname = bare.match(/^[\p{L}'’-]+/u)?.[0] || ''
  const short = narrative ? `${surname} (${year[1]})` : `(${surname} ${year[1]})`
  return short.length <= 18 ? short : `(${year[1]})`
}
// The same marker as a source name: "Persily, 2015", "Zeitzer et al., 2000".
function markerName(anchor) {
  const m = String(anchor || '').replace(/\s+/g, ' ').match(/^\(?\s*([\p{L}][^()\d]*?)[\s,(]+((?:19|20)\d{2}[a-z]?)\)?\s*\)?$/u)
  return m ? `${m[1].replace(/[,\s]+$/, '')}, ${m[2]}` : null
}

function viaOf(c, claim) {
  const cue = (name) => claim.attribution?.cues?.find((x) => x.cue === name)?.span
  switch (c.kind) {
    case 'reference': return { mark: markerText(c.link.anchor), word: 'cited' }
    case 'unresolved': return { mark: markerText(c.link?.anchor || '[?]'), word: 'no entry' }
    case 'link': return c.link?.basis === 'footnote' ? { mark: '†', word: 'note' } : c.link?.basis === 'caption' ? { mark: 'Source:', word: 'line' } : { mark: 'url', word: 'link' }
    case 'own': return c.link?.basis === 'section-scope' ? { mark: '§', word: 'results' } : { mark: 'Source:', word: 'line' }
    case 'own-implied': return c.link ? { mark: clip(c.link.anchor, 22), word: 'points to' } : { mark: '¶', word: 'read as its own' }
    case 'described-study': return { mark: clip(cue('according-to') || cue('named-source') || cue('study-by') || cue('published-in') || cue('definite-study') || 'the study', 22), word: '', quoted: true }
    case 'speaker': return { mark: '“ ”', word: 'said' }
    case 'proximity': return { mark: '≈', word: 'nearby' }
    case 'publisher': return { mark: '↺', word: 'its own' }
    case 'keyword': return { mark: '—', word: 'named' }
    case 'unnamed': return { mark: clip(cue('unnamed-source') || 'studies show', 22), word: '', quoted: true }
    default: return null
  }
}

function rowsOf(claims, ctx, tiers) {
  const tierLabel = (w) => (tiers.find((t) => t.weight === w)?.label || '').toLowerCase()
  const byKind = new Map()
  for (const c of claims) {
    if (!byKind.has(c.kind)) byKind.set(c.kind, [])
    byKind.get(c.kind).push(c)
  }
  const rows = []
  const push = (key, kind, members, label, sub, span, via, group = key) => {
    const rung = members[0].rung
    const ceiling = members[0].ceiling
    const beyond = members.filter((c) => c.tier.weight > ceiling)
    rows.push({
      id: key, group, continued: rows.length > 0 && rows[rows.length - 1].group === group,
      kind, grade: KIND[kind].grade, label, sub, span: span || null,
      via: via === undefined ? members[0].via : via,
      rung: { key: rung.key, label: rung.label, rank: rung.rank },
      ceiling, reach: tierLabel(ceiling),
      claims: members.map((c) => c.index).sort((a, b) => a - b),
      outruns: members.filter((c) => c.judgment === 'outruns').length,
      overreach: members.filter((c) => c.judgment === 'overreach').length,
      beyond: beyond.length,
      methods: beyond.filter((c) => c.method).length,
      farthest: Math.max(...members.map((c) => c.tier.weight)),
    })
  }
  for (const k of GROUND_KINDS) {
    const members = byKind.get(k.kind)
    if (!members) continue
    const byTarget = new Map()
    for (const c of members) {
      const key = `${c.targetId}|${c.rung.rank}`
      if (!byTarget.has(key)) byTarget.set(key, [])
      byTarget.get(key).push(c)
    }
    // A named source with two or more claims gets its own row(s), one per rung.
    const perTarget = new Map()
    for (const c of members) {
      if (!perTarget.has(c.targetId)) perTarget.set(c.targetId, [])
      perTarget.get(c.targetId).push(c)
    }
    const chosen = SPECIFIC_KINDS.has(k.kind)
      ? [...perTarget.entries()].filter(([, m]) => m.length > 1).sort((a, b) => b[1].length - a[1].length).slice(0, SPECIFIC_ROWS).map(([t]) => t)
      : []
    const specific = chosen.flatMap((t) => [...byTarget.entries()].filter(([key]) => key.startsWith(`${t}|`)).sort((a, b) => b[1][0].rung.rank - a[1][0].rung.rank))
    const taken = new Set(specific.map(([key]) => key))
    for (const [key, m] of specific) {
      const c = m[0]
      const group = c.targetId
      if (k.kind === 'reference') {
        const marker = markerText(c.link.anchor)
        const fromMarker = markerName(c.link.anchor)
        const cite = fromMarker ? null : citeName(c.targetSpan)
        const entry = Number(String(c.targetId).split(':')[1]) + 1
        push(key, k.kind, m, fromMarker || (cite ? cite.name : clip(c.targetSpan, 40)), `entry ${entry} of its references`, c.targetSpan, { mark: marker, word: 'cited' }, group)
      } else if (k.kind === 'own-implied' && c.targetId === 'own-study') {
        push(key, k.kind, m, c.targetLabel, 'read as its own result; nothing cited', null, { mark: '¶', word: 'read as its own' }, group)
      } else if (k.kind === 'own-implied') {
        push(key, k.kind, m, c.targetLabel.replace(/ in the document$/, ''), 'a figure or table in the document', null, { mark: 'see', word: '' }, group)
      } else if (k.kind === 'link') {
        push(key, k.kind, m, c.targetLabel, 'linked in the text', c.targetSpan, undefined, undefined, group)
      } else if (k.kind === 'own') {
        push(key, k.kind, m, c.targetLabel, 'reported in its results', null, undefined, undefined, group)
      } else if (k.kind === 'described-study') {
        push(key, k.kind, m, c.targetLabel, 'named in the text, not linked', null, undefined, undefined, group)
      } else if (k.kind === 'speaker') {
        push(key, k.kind, m, c.targetLabel, 'quoted in the text', null, undefined, undefined, group)
      } else {
        push(key, k.kind, m, c.targetLabel, 'the publisher itself', null, undefined, undefined, group)
      }
    }
    // Everything else of this kind, gathered by rung (one reach per row).
    const rest = new Map()
    for (const [key, m] of byTarget) {
      if (taken.has(key)) continue
      const r = m[0].rung.rank
      if (!rest.has(r)) rest.set(r, [])
      rest.get(r).push(...m)
    }
    for (const [rank, m] of [...rest.entries()].sort((a, b) => b[0] - a[0])) {
      const n = new Set(m.map((c) => c.targetId)).size
      const split = rest.size > 1 ? `; graded ${m[0].rung.label.toLowerCase()}` : ''
      const g = gatheredLabel(k.kind, n, m.length, specific.length > 0, ctx)
      push(`${k.kind}|rest|${rank}`, k.kind, m, g.label, split ? split.slice(2) : g.sub, null, g.via, `${k.kind}|rest`)
    }
  }
  // A source split by grade: each of its lines says which grade it carries.
  for (const r of rows) {
    const lines = rows.filter((x) => x.group === r.group)
    if (lines.length < 2) continue
    const graded = `graded ${r.rung.label.toLowerCase()}`
    r.sub = r.continued ? graded : r.sub.includes('graded') ? r.sub : `${r.sub}; ${graded}`
  }
  return rows
}

function gatheredLabel(kind, targets, count, others, ctx) {
  const noun = ROW_NOUN[kind]
  const claimsWord = count === 1 ? 'one claim' : `${count} claims`
  switch (kind) {
    case 'reference': return { label: `${targets} ${others ? (targets === 1 ? noun[0] : noun[1]) : targets === 1 ? 'reference' : 'references'}`, sub: targets === count ? 'in its reference list, one claim each' : `in its reference list, ${claimsWord}`, via: { mark: '[n]', word: 'cited' } }
    case 'unresolved': return { label: 'Citations that match no entry', sub: `${targets} ${targets === 1 ? 'marker' : 'markers'}, nothing in its list to resolve them`, via: { mark: '[?]', word: 'no entry' } }
    case 'proximity': return { label: 'Citations found nearby', sub: 'in the sentence, not attached to the claim', via: { mark: '≈', word: 'nearby' } }
    case 'keyword': return { label: 'A kind of source, named', sub: '“an independent survey”, “analysts”: no citation', via: { mark: '—', word: 'named' } }
    case 'unnamed': return { label: 'Research it doesn’t name', sub: '“studies show” and the like', via: { mark: '“studies show”', word: '', quoted: true } }
    case 'none': return { label: 'No source', sub: 'no citation, link, quote or named source', via: null }
    case 'own-implied': return { label: others ? `${targets} ${targets === 1 ? noun[0] : noun[1]}` : ctx.ownStudyLabel, sub: others ? claimsWord : 'read as its own result; nothing cited', via: { mark: '¶', word: 'read as its own' } }
    default: return { label: others ? `${targets} ${targets === 1 ? noun[0] : noun[1]}` : GROUND_KINDS.find((g) => g.kind === kind).label, sub: claimsWord, via: undefined }
  }
}

// The figure's dek: the one finding a reader should leave with.
function dekOf(claims, rows, tiers) {
  const n = claims.length
  if (!n) return 'No claims to map.'
  const tierLabel = (w) => (tiers.find((t) => t.weight === w)?.label || '').toLowerCase()
  const outruns = claims.filter((c) => c.judgment === 'outruns').length
  const none = rows.find((r) => r.kind === 'none')
  if (claims.every((c) => c.judgment === 'gated')) return 'Written from experience, so no claim here owes a source.'
  if (none && none.outruns / n >= 0.2) {
    const all = none.outruns === none.claims.length
    const methods = none.methods ? ` ${none.methods} more ${none.methods === 1 ? 'describes' : 'describe'} its methods, which the engine does not judge.` : ''
    return `${none.claims.length} of ${n} claims cite nothing, and ${all ? 'every one of them is' : `${none.outruns} of them ${none.outruns === 1 ? 'is' : 'are'}`} stated more firmly than no source can carry.${methods}`
  }
  const top = rows.filter((r) => r.kind !== 'none').sort((a, b) => b.claims.length - a.claims.length)[0]
  if (top && top.claims.length / n >= 0.3) {
    return `${top.label} carries ${top.claims.length} of ${n} claims${top.outruns ? `; ${top.outruns} ${top.outruns === 1 ? 'is' : 'are'} stated past what it can carry (${top.reach})` : ', each within what it can carry'}.`
  }
  if (!outruns) return `Every one of ${n} claims stays within what its source can carry.`
  return `${outruns} of ${n} claims are stated more firmly than their sources can carry.`
}

/** One claim's chain as a sentence (after museum provenance lines). */
export function provenanceOf(c, rows, standardLabel, tiers) {
  const tierLabel = (w) => (tiers.find((t) => t.weight === w)?.label || '').toLowerCase()
  const row = rows.find((r) => r.claims.includes(c.index))
  const parts = [`Stated as ${c.tier.label.toLowerCase()}`]
  if (c.kind === 'none') parts.push('citing nothing')
  else if (c.link) parts.push(`by way of ${c.link.basisLabel.toLowerCase()} ${c.link.anchor && c.link.anchor.length < 40 ? `“${c.link.anchor}”` : ''}`.trim())
  else parts.push('with no citation')
  if (c.kind !== 'none') parts.push(`to ${row ? row.label : c.targetLabel}`)
  const head = parts.join(', ') + '.'
  const std = (standardLabel || '').toLowerCase()
  const reach = c.kind === 'none'
    ? `With no source, the ${std} standard allows up to ${tierLabel(c.ceiling)}`
    : `${c.rung.label} carries up to ${tierLabel(c.ceiling)} under the ${std} standard`
  const steps = c.tier.weight - c.ceiling
  let gap
  if (c.judgment === 'gated') gap = ', but this is experiential writing, which owes no source.'
  else if (steps <= 0) gap = ', so the claim is within reach.'
  else if (c.method) gap = `; this is a method statement, which the engine does not judge.`
  else if (!c.flag) gap = `; it is ${steps} ${steps === 1 ? 'step' : 'steps'} past that, but hedged, so not flagged.`
  else gap = `, so the claim is stated ${steps} ${steps === 1 ? 'step' : 'steps'} past its reach.`
  let causal = ''
  if (c.overreach) {
    const ex = c.overreach.explanation
    causal = ` Its causal wording (${REGISTER_LABELS[ex.causalRegister]}) also goes past what ${ex.design === 'none-reported' ? 'an unreported design' : withArticle(designLabel(ex.design)) + ' design'} licenses (${REGISTER_LABELS[ex.designCeiling.maxRegister]}).`
  }
  return `${head} ${reach}${gap}${causal}`
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

export function censusSentence(c) {
  if (!c.claims) return 'No claims to map.'
  const parts = []
  if (c.linked) parts.push(`${c.linked} ${c.linked === 1 ? 'is' : 'are'} linked to a source`)
  if (c.ownImplied) parts.push(`${c.ownImplied} ${c.ownImplied === 1 ? 'reports' : 'report'} the document’s own results without pointing to them`)
  if (c.loose) parts.push(`${c.loose} ${c.loose === 1 ? 'names' : 'name'} a source without linking it`)
  if (c.presumed) parts.push(`${c.presumed} ${c.presumed === 1 ? 'appeals' : 'appeal'} to research it doesn’t name`)
  if (c.none) parts.push(`${c.none} ${c.none === 1 ? 'has' : 'have'} nothing on file`)
  const lead = `Of ${plural(c.claims, 'claim', 'claims')}, ${joinParts(parts)}.`
  if (c.gated) return `${lead} As experiential writing, none carries an evidence obligation.`
  if (!c.outruns && !c.overreach) return `${lead} None outruns what it stands on.`
  const parts2 = []
  if (c.outruns) parts2.push(`${c.outruns} ${c.outruns === 1 ? 'outruns what it stands' : 'outrun what they stand'} on`)
  if (c.overreach) parts2.push(`${c.outruns ? `${c.overreach} more` : c.overreach} ${c.overreach === 1 ? 'claims' : 'claim'} more cause than the design licenses`)
  return `${lead} ${parts2.join('; ')}.`
}

function joinParts(p) {
  if (p.length <= 1) return p[0] || 'none is mapped'
  return p.length === 2 ? `${p[0]} and ${p[1]}` : p.slice(0, -1).join(', ') + ', and ' + p[p.length - 1]
}
