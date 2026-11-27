// ─────────────────────────────────────────────────────────────────────────────
// What a comparison is made of: which entries count, which engine build, the
// firms and report types on offer, the suggestions, and the address that holds
// a selection. Pure: imported by the page, the worker and the checks.
//
// Like with like. A comparison uses one engine build: the build that scored
// most of the chosen firm's reports. Other firms come in with their reports
// from that build only. The corpus audit's entries count by default; readers'
// entries only when the reader asks, and only those the same build scored.
// ─────────────────────────────────────────────────────────────────────────────

import { REPORT_TYPES } from '../fields.js'
import { slug, searchWords } from '../filter.js'
import { FLAG_ORDER } from '../../engine/patterns.js'
import { COMPARE_CONSTANTS as K } from './constants.js'
import { FLAG_COLUMN, hashString } from './stats.js'

// The three flag columns, in the brief's order.
export const MEASURES = FLAG_ORDER.map((f) => FLAG_COLUMN[f])

const count = (v) => Number.isInteger(v) && v >= 0
// An entry the tool can weigh: a score, a build, claims and all three counts.
export const usable = (r) => Number.isFinite(r.score) && Boolean(r.engine) && Number.isInteger(r.claims) && r.claims > 0 &&
  count(r.flagged) && count(r.unsupported) && count(r.overconfident) && count(r.overreach)

// The publication year, when the report gives one (a month or a day has a year too).
export const yearOf = (r) => (r.publishedPrecision !== 'unknown' && /^\d{4}-/.test(r.publishedOn || '') ? Number(r.publishedOn.slice(0, 4)) : null)

// City editions. A quarterly report issued for several cities ("Construction
// Cost Index: Chicago Q1 2021", "The Look Ahead Q1 2022: Atlanta") is one
// report in many near copies; counting each as a report would treat copies as
// independent draws. An edition is one firm's reports with the same series
// (the title before its first colon, without the quarter) and the same
// quarter; it counts once, as its median-scoring copy (ties to the lower id),
// a real entry, not an average. EDITIONS_COUNT_ONCE switches it off.
const QUARTER = /\b(?:Q([1-4])\s*(\d{4})|([1-4])(?:st|nd|rd|th)\s+Quarter\s+(\d{4}))\b/i
export function editionKey(r) {
  const m = QUARTER.exec(r.reportName || '')
  if (!m) return null
  const stem = r.reportName.split(':')[0].replace(QUARTER, '').replace(/\s+/g, ' ').trim().toLowerCase()
  return `${r.company}|${stem}|Q${m[1] || m[3]} ${m[2] || m[4]}`
}
export function countEditionsOnce(rows) {
  if (!K.EDITIONS_COUNT_ONCE) return rows.map((r) => ({ ...r, copies: 1 }))
  const groups = new Map()
  const out = []
  for (const r of rows) {
    const k = editionKey(r)
    if (!k) { out.push({ ...r, copies: 1 }); continue }
    if (!groups.has(k)) { groups.set(k, []); out.push(k) }
    groups.get(k).push(r)
  }
  return out.map((x) => {
    if (typeof x !== 'string') return x
    const copies = groups.get(x).slice().sort((a, b) => a.score - b.score || a.id - b.id)
    return { ...copies[Math.floor((copies.length - 1) / 2)], copies: copies.length }
  })
}

// The entries a reader's choice lets in.
export const poolOf = (rows, { readers = false } = {}) =>
  rows.filter((r) => usable(r) && (r.origin === 'audit' || (readers && r.origin === 'reader')))

const tally = (xs, key) => { const m = new Map(); for (const x of xs) m.set(key(x), (m.get(key(x)) || 0) + 1); return m }

// The build for a comparison led by this firm: the one that scored most of its
// reports; ties go to the build with more entries, then the earlier name.
export function buildOf(pool, firm) {
  const mine = tally(pool.filter((r) => r.company === firm), (r) => r.engine)
  if (!mine.size) return null
  const all = tally(pool, (r) => r.engine)
  return [...mine.entries()].sort((a, b) => b[1] - a[1] || all.get(b[0]) - all.get(a[0]) || (a[0] < b[0] ? -1 : 1))[0][0]
}

// Every firm with an entry, each with its count at its own build, largest first.
export function firmIndex(pool) {
  const names = [...new Set(pool.map((r) => r.company))]
  return names.map((name) => {
    const build = buildOf(pool, name)
    return { name, build, count: pool.filter((r) => r.company === name && r.engine === build).length }
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'en'))
}

// The firms with reports from one build, with their counts there.
export function firmsAt(pool, build) {
  const m = tally(pool.filter((r) => r.engine === build), (r) => r.company)
  return [...m.entries()].map(([name, n]) => ({ name, build, count: n })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'en'))
}

// A firm name matches a search when every word the reader typed is in it.
export function matchesFirm(name, q) {
  const words = searchWords(q)
  if (!words.length) return true
  const hay = name.toLowerCase()
  return words.every((w) => hay.includes(w))
}

// The firms whose mix of report types is closest to this firm's (cosine
// similarity of report-type counts), among firms with enough reports.
export function suggestionsFor(pool, build, firm, { exclude = [] } = {}) {
  const at = pool.filter((r) => r.engine === build)
  const vec = (name) => REPORT_TYPES.map((t) => at.filter((r) => r.company === name && r.reportType === t).length)
  const mine = vec(firm)
  const norm = (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0))
  return firmsAt(pool, build)
    .filter((f) => f.name !== firm && !exclude.includes(f.name) && f.count >= K.SUGGEST_MIN_REPORTS)
    .map((f) => { const v = vec(f.name); return { ...f, similarity: v.reduce((s, x, i) => s + x * mine[i], 0) / (norm(v) * norm(mine)) } })
    .filter((f) => f.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity || b.count - a.count || a.name.localeCompare(b.name, 'en'))
    .slice(0, K.SUGGESTIONS)
}

// The report types any chosen firm has at the build, each with every chosen
// firm's count, in The List's order.
export function typesOffered(pool, build, firms) {
  const at = pool.filter((r) => r.engine === build && firms.includes(r.company))
  return REPORT_TYPES.map((type) => ({ type, slug: slug(type), counts: firms.map((f) => at.filter((r) => r.company === f && r.reportType === type).length) }))
    .filter((t) => t.counts.some((n) => n > 0))
}

// The types ticked at first: where the chosen firm and at least one other each
// have a report; with none, every type the chosen firm has.
export function precheck(offered) {
  const both = offered.filter((t) => t.counts[0] > 0 && t.counts.slice(1).some((n) => n > 0))
  return (both.length ? both : offered.filter((t) => t.counts[0] > 0)).map((t) => t.type)
}

// ── the address ──────────────────────────────────────────────────────────────
//
// /list/compare?firm=HKS&vs=Gensler&vs=Arup&types=survey-report,white-paper&readers=1
// Repeated vs, since firm names can hold commas. The types are written when
// the reader presses Compare, so an address with types opens on the results.
const TYPE_OF = Object.fromEntries(REPORT_TYPES.map((t) => [slug(t), t]))
const name = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 120)

export function readSelection(params) {
  const firm = name(params.get('firm'))
  const vs = []
  for (const v of params.getAll('vs').map(name)) if (v && v !== firm && !vs.includes(v) && vs.length < K.MAX_OTHERS) vs.push(v)
  const raw = params.get('types')
  const types = raw == null ? null : [...new Set(raw.split(',').map((s) => TYPE_OF[s.trim()]).filter(Boolean))]
  return { firm, vs, types: types && types.length ? REPORT_TYPES.filter((t) => types.includes(t)) : null, readers: params.get('readers') === '1' }
}

export function writeSelection({ firm, vs = [], types = null, readers = false }) {
  const p = new URLSearchParams()
  if (firm) p.set('firm', firm)
  for (const v of vs) p.append('vs', v)
  if (types && types.length) p.set('types', REPORT_TYPES.filter((t) => types.includes(t)).map(slug).join(','))
  if (readers) p.set('readers', '1')
  return p
}

// ── one comparison's data ────────────────────────────────────────────────────
//
// Everything the statistics and the page need for a selection: the build, each
// chosen firm's reports in the chosen types, what was left out and why, every
// firm's reports at the build in those types (the context column), and the
// seed key: the selection, normalized, and the data's fingerprint (rows, the
// highest id, the build).
export function selectionData(rows, sel) {
  const pool = poolOf(rows, sel)
  const build = buildOf(pool, sel.firm)
  const firms = [sel.firm, ...sel.vs]
  const types = sel.types || []
  const inTypes = (r) => types.includes(r.reportType)
  const report = (r) => ({ id: r.id, firm: r.company, type: r.reportType, score: r.score, year: yearOf(r), claims: r.claims, flagged: r.flagged,
    unsupported: r.unsupported, overconfident: r.overconfident, overreach: r.overreach })
  const chosenRows = rows.filter((r) => firms.includes(r.company) && inTypes(r))
  const left = {
    auditOtherBuild: chosenRows.filter((r) => r.origin === 'audit' && usable(r) && r.engine !== build).length,
    readersOtherBuild: sel.readers ? chosenRows.filter((r) => r.origin === 'reader' && usable(r) && r.engine !== build).length : 0,
    readersNoCounts: sel.readers ? chosenRows.filter((r) => r.origin === 'reader' && !usable(r)).length : 0,
    readersAll: chosenRows.filter((r) => r.origin === 'reader').length,
  }
  const at = countEditionsOnce(pool.filter((r) => r.engine === build && inTypes(r)))
  // Firms whose city editions count once: their entries, and what they count as.
  const editions = firms.map((f) => {
    const mine = at.filter((r) => r.company === f)
    const entries = mine.reduce((s, r) => s + r.copies, 0)
    return { firm: f, entries, counted: mine.length }
  }).filter((e) => e.entries > e.counted)
  const fingerprint = `${rows.length}|${rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0)}|${build}`
  const seedKey = `${sel.firm}|${sel.vs.join('|')}|${types.map(slug).sort().join(',')}|${sel.readers ? 1 : 0}|${fingerprint}`
  return {
    build,
    types,
    firms: firms.map((f) => ({ name: f, reports: at.filter((r) => r.company === f).map(report) })),
    context: at.map(report),
    editions,
    left,
    readerCount: at.filter((r) => r.origin === 'reader').length,
    fingerprint,
    seedKey,
    seed: hashString(seedKey),
  }
}
