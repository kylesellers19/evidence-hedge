// ─────────────────────────────────────────────────────────────────────────────
// Stage 4 — linkEvidence: explicit links from each claim to the evidence it
// leans on (change set 4). Replaces same-sentence proximity as the only way a
// claim meets its evidence; every link records how it was made.
//
//   marker         numbered [12] and author-year (Smith, 2020) / Smith et al.
//                  (2020) citations, resolved to reference entries; a marker no
//                  entry matches is an unresolved-marker link
//   footnote       a footnote number resolved to its note
//   caption        a "Source:" span (ingestion labels no captions) covering the
//                  claims of its block, or a figure the claim points at
//   hyperlink      a URL or DOI in the sentence
//   section-scope  an own-current claim in a results / key-findings section
//                  inherits the document's own study (design detection)
//   proximity      a same-sentence token the claim's attribution does not route
//                  through; kept and labeled so reliance on it can be measured
//   speaker        a quoted claim links to its speaker
//
// Routing by attribution: cited-other and own-prior link through markers,
// footnotes and hyperlinks; own-current through section scope and captions
// (markers too when it builds on prior work); quoted to the speaker;
// unattributed through captions and footnotes; undetermined through any.
//
// Each claim gets evidence { status: linked | unlinked | undetermined, links,
// tried, reason? }. A claim with no link says so (unlinked) instead of reading
// as unsourced; links pointing at both the document's own study and another
// source are undetermined, with the reason. Grading (gradeEvidence) reads
// `citations` (the token behind each marker, hyperlink, external caption,
// footnote and proximity link, as the same-sentence detector typed it) and
// `ownStudy` (an own-study link lifts the claim to the rubric's in-document
// rung, as an own-result claim already is). The target a marker resolves to is
// recorded, not graded: grading by target is a ladder change (change set 6).
// Rubric-invariant.
// ─────────────────────────────────────────────────────────────────────────────

import { parseReferences, resolveMarker } from './references.js'
import { SOURCE_LINE, CAPTION_REACH, FIGURE_REF, OWN_SOURCE_NOUN, NOTES_HEADING, NOTE_LINE, FOOTNOTE_ANCHOR, SUPERSCRIPT_MARKER, fromSuperscript } from './lexicons/linkage.js'
import { NAMED_ORG } from './lexicons/attribution.js'
import { escapeRe } from './signals/util.js'

/** @typedef {import('./types.js').Evidence} Evidence */

export const LINK_BASES = ['marker', 'footnote', 'caption', 'hyperlink', 'section-scope', 'proximity', 'speaker']
const ROUTES = {
  'cited-other': ['marker', 'footnote', 'hyperlink'],
  'own-prior': ['marker', 'footnote', 'hyperlink'],
  'own-current': ['section-scope', 'caption'],
  quoted: ['speaker'],
  unattributed: ['caption', 'footnote'],
  undetermined: ['marker', 'footnote', 'caption', 'hyperlink', 'section-scope', 'speaker'],
}
const TOKEN_BASIS = { numeric: 'marker', 'author-year': 'marker', url: 'hyperlink', 'url-own': 'hyperlink', doi: 'hyperlink' }
const NO_OWN_STUDY = new Set(['none-reported', 'narrative-review'])
const ORG = new RegExp(NAMED_ORG)
const NARRATIVE_CITE = /[A-Z][\p{L}'’-]+(?:\s+(?:et\s+al\.?|and|&)(?:\s+[A-Z][\p{L}'’-]+)?)?\s+\((?:19|20)\d{2}[a-z]?\)/gu

// ── Document-level evidence: captions, notes, figures ────────────────────────

// Matched line by line, so a standalone "Source: Post-World Cup Survey" line
// ends at its line break.
function captionsOf(layout, publisher, hasOwnStudy) {
  const out = []
  for (const line of layout.lines) {
    for (const m of line.text.matchAll(SOURCE_LINE)) {
      const text = m[1].trim()
      const offset = line.start + m.index
      const org = text.match(ORG)
      const namesPublisher = publisher.some((n) => new RegExp(`\\b${escapeRe(n)}`, 'i').test(text))
      const own = namesPublisher || (hasOwnStudy && OWN_SOURCE_NOUN.test(text) && !(org && !namesPublisher))
      out.push({ offset, paragraph: layout.paragraphAt(offset), text: `Source: ${text}`.slice(0, 160), own })
    }
  }
  return out
}

function notesOf(layout) {
  const notes = new Map()
  let inNotes = false
  for (const l of layout.lines) {
    if (NOTES_HEADING.test(l.text)) { inNotes = true; continue }
    if (!inNotes) continue
    const m = l.text.match(NOTE_LINE)
    if (m && !notes.has(Number(m[1]))) notes.set(Number(m[1]), m[2].slice(0, 200))
  }
  return notes
}

// The token type the same-sentence detector would give a note's text.
function noteCitation(text) {
  if (/\b10\.\d{4,}\//.test(text)) return { type: 'doi', raw: text }
  if (/https?:\/\//.test(text)) return { type: 'url', raw: text }
  if (/\b(?:19|20)\d{2}\b/.test(text) && /[A-Z][\p{L}'’-]+/u.test(text)) return { type: 'author-year', raw: text }
  return { type: 'phrase', raw: text }
}

// ── Claims ───────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   claims: { text: string, citations: {type:string, raw:string}[] }[],
 *   attribution: import('./types.js').Attribution[],
 *   where: { paragraph: ?number, section: ?string, offset: ?number }[],
 *   layout: ReturnType<typeof import('./attribution.js').documentLayout>,
 *   references: string[],
 *   design: { design: string, evidence: { span: string }[] },
 *   publisher: string[],
 * }} input
 * @returns {(Evidence & { citations: {type:string, raw:string}[], ownStudy: boolean })[]}
 */
export function linkEvidence({ claims, attribution, where, layout, references, design, publisher = [] }) {
  const entries = parseReferences(references || [])
  const hasOwnStudy = !!design && !NO_OWN_STUDY.has(design.design)
  const ownStudy = hasOwnStudy ? { kind: 'own-study', design: design.design, evidence: (design.evidence[0]?.span || '').slice(0, 160) } : null
  const captions = captionsOf(layout, publisher, hasOwnStudy)
  const notes = notesOf(layout)
  const numbered = entries.some((e) => e.number != null)

  return claims.map((c, i) => {
    const a = attribution[i]
    const w = where[i] || {}
    const routed = new Set(a.label === 'own-current' && a.buildsOn ? [...ROUTES['own-current'], 'marker', 'hyperlink'] : ROUTES[a.label] || ROUTES.undetermined)
    const links = []
    const citations = []
    let ownStudyLink = false
    const markerLinks = (t) => {
      for (const r of resolveMarker(t, entries)) {
        links.push(r.entry
          ? { basis: 'marker', anchor: r.cite, target: { kind: 'reference', index: r.entry.index, text: r.entry.text.slice(0, 160), ...(r.entry.doi ? { doi: r.entry.doi } : {}) }, confidence: r.ambiguous ? 'low' : 'high' }
          : { basis: 'marker', anchor: r.cite, target: { kind: 'unresolved-marker' }, confidence: 'low' })
      }
    }

    // Same-sentence tokens: markers and hyperlinks when routed, else proximity.
    // A bare "(2020)" the detector typed as a year is a narrative author-year
    // marker when a name stands before it ("Satish et al. (2012)"); an "et al."
    // phrase inside such a marker is part of it, not a second link.
    const narrative = [...c.text.matchAll(NARRATIVE_CITE)].map((m) => m[0])
    const hasMarker = narrative.length > 0 || c.citations.some((t) => t.type === 'author-year' || t.type === 'numeric')
    for (const t0 of c.citations) {
      if (t0.type === 'phrase' && /^et\s+al\b/i.test(t0.raw) && hasMarker) { citations.push(t0); continue }
      const named = t0.type === 'year' ? narrative.find((n) => n.endsWith(t0.raw)) : null
      const t = named ? { type: 'author-year', raw: named } : t0
      const basis = TOKEN_BASIS[t.type]
      if (basis === 'marker' && routed.has('marker') && entries.length) {
        markerLinks(t)
        citations.push(t0)
      } else if (basis && routed.has(basis)) {
        links.push({ basis, anchor: t.raw.slice(0, 120), target: basis === 'marker' ? { kind: 'unresolved-marker', reason: 'no reference list' } : { kind: 'url', url: t.raw.slice(0, 200) }, confidence: basis === 'marker' ? 'low' : 'high' })
        citations.push(t0)
      } else {
        links.push({ basis: 'proximity', anchor: t0.raw.slice(0, 120), target: { kind: 'same-sentence', type: t0.type }, confidence: 'low' })
        citations.push(t0)
      }
    }

    // Superscript markers (PDF ingest keeps them inline): citation markers
    // against a numbered reference list, else footnote anchors below.
    const superscripts = [...c.text.matchAll(SUPERSCRIPT_MARKER)].map((m) => m[0])
    if (superscripts.length && numbered && routed.has('marker')) {
      for (const raw of superscripts) {
        const t = { type: 'numeric', raw: `[${fromSuperscript(raw)}]` }
        markerLinks(t)
        citations.push(t)
      }
    }

    // Footnotes
    if (routed.has('footnote') && notes.size) {
      const anchors = [...c.text.matchAll(FOOTNOTE_ANCHOR)].map((m) => [m[0], Number(m[1])])
      if (!numbered) for (const raw of superscripts) for (const n of fromSuperscript(raw).split(/[,–-]/)) anchors.push([raw, Number(n)])
      for (const [anchor, n] of anchors) {
        const note = notes.get(n)
        if (!note) continue
        links.push({ basis: 'footnote', anchor, target: { kind: 'note', number: n, text: note }, confidence: 'high' })
        citations.push(noteCitation(note))
      }
    }

    // Captions: the nearest following "Source:" in reach, or one in the same paragraph.
    if (routed.has('caption') && w.offset != null) {
      const cap = captions.find((k) =>
        (k.paragraph === w.paragraph) ||
        (k.offset > w.offset && k.paragraph - w.paragraph <= CAPTION_REACH &&
          !captions.some((o) => o.offset > w.offset && o.offset < k.offset) &&
          !layout.headings.some((h) => h.start > w.offset && h.start < k.offset)))
      if (cap) {
        const confidence = cap.paragraph === w.paragraph ? 'high' : 'low'
        if (cap.own && ownStudy) { links.push({ basis: 'caption', anchor: cap.text, target: ownStudy, confidence }); ownStudyLink = true }
        else { links.push({ basis: 'caption', anchor: cap.text, target: { kind: 'source', text: cap.text }, confidence }); citations.push({ type: 'phrase', raw: cap.text }) }
      }
      const fig = c.text.match(FIGURE_REF)
      if (fig && new RegExp(`\\b${escapeRe(fig[0])}\\b`).test(layout.norm.replace(c.text, ''))) {
        links.push({ basis: 'caption', anchor: fig[0], target: { kind: 'figure', label: fig[0] }, confidence: 'low' })
      }
    }

    // Section scope
    if (routed.has('section-scope') && ownStudy && a.label === 'own-current' && w.section === 'results') {
      links.push({ basis: 'section-scope', anchor: 'results / key findings section', target: ownStudy, confidence: a.confidence })
      ownStudyLink = true
    }

    // Speaker
    if (routed.has('speaker') && a.label === 'quoted') {
      links.push({ basis: 'speaker', anchor: a.speaker || 'unnamed speaker', target: { kind: 'speaker', name: a.speaker || null }, confidence: a.speaker ? 'high' : 'low' })
    }

    const external = links.some((l) => ['marker', 'hyperlink', 'footnote'].includes(l.basis) || (l.basis === 'caption' && l.target.kind === 'source'))
    let status = links.length ? 'linked' : 'unlinked'
    let reason
    if (!links.length) reason = `no ${[...routed].join(', ')} link and no same-sentence citation`
    else if (ownStudyLink && external && !a.buildsOn) { status = 'undetermined'; reason = "links point at both the document's own study and another source" }
    return { status, links, tried: [...routed], ...(reason ? { reason } : {}), citations, ownStudy: ownStudyLink }
  })
}
