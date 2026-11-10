// ─────────────────────────────────────────────────────────────────────────────
// Finding reports on The List: a search, four filters and a firm.
//
// The search matches firm and report names a word at a time. Every word has to
// appear in one or the other, ignoring case, so "perkins and will" finds
// Perkins&Will. Words are runs of letters and digits, and "and" is dropped, so
// nothing a reader types can reach the table's query as anything but a word.
// The filters narrow by industry, report type, the score's band (the Method
// page's bands, src/engine/scoreDocument.js) and who added the entry. A firm is
// one company's exact name, set from that name in the table.
//
// Every choice lives in the page's address, so a search can be shared and Back
// undoes it: q, firm, industry, type, score, show and sort. Pure: imported by
// the page, the store and checks/list.test.mjs.
// ─────────────────────────────────────────────────────────────────────────────

import { INDUSTRIES, REPORT_TYPES, MAX_SORTS, fieldByKey } from './fields.js'
import { BAND_THRESHOLDS } from '../engine/scoreDocument.js'

export const NO_FILTERS = { q: '', firm: '', industry: '', type: '', score: '', show: '' }

export const ORIGINS = [
  ['', 'All reports'],
  ['reader', 'Added by readers'],
  ['audit', 'From our corpus audit'],
]

// The bands a brief names, highest first, each from its threshold up to the
// next one's: a 2.5 shows as a 3 and is weak, as on the brief.
const BAND_WORDS = { strong: 'Strong', carried: 'Carried', mixed: 'Mixed', weak: 'Weak', failing: 'Failing' }
export const SCORE_BANDS = BAND_THRESHOLDS.map((t, i) => {
  const max = i ? BAND_THRESHOLDS[i - 1].min : null
  const lo = Math.ceil(t.min)
  const hi = max === null ? 10 : Math.ceil(max) - 1
  return { key: t.band, label: `${BAND_WORDS[t.band] || t.band} (${lo} to ${hi})`, min: t.min, max }
})
const bandByKey = Object.fromEntries(SCORE_BANDS.map((b) => [b.key, b]))

// A vocabulary value as it reads in the address: "Research report" is
// research-report.
export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const bySlug = (list) => Object.fromEntries(list.map((v) => [slug(v), v]))
const INDUSTRY_OF = bySlug(INDUSTRIES)
const TYPE_OF = bySlug(REPORT_TYPES)

export function searchWords(q) {
  const words = String(q ?? '').normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}]+/u)
  return [...new Set(words.filter((w) => w && w !== 'and'))].slice(0, 8)
}

export const isFiltered = (f) => Object.keys(NO_FILTERS).some((k) => (k === 'q' ? searchWords(f.q).length > 0 : Boolean(f[k])))

// Whether an entry is one the filters keep. The static List filters with this;
// the live one asks the table the same question (restFilter).
export function matches(entry, f) {
  const words = searchWords(f.q)
  if (words.length) {
    const names = `${entry.company ?? ''}\n${entry.reportName ?? ''}`.toLowerCase()
    if (!words.every((w) => names.includes(w))) return false
  }
  if (f.firm && entry.company !== f.firm) return false
  if (f.industry && entry.industry !== f.industry) return false
  if (f.type && entry.reportType !== f.type) return false
  const band = bandByKey[f.score]
  if (band && !(entry.score >= band.min && (band.max === null || entry.score < band.max))) return false
  if (f.show && (entry.origin || 'reader') !== f.show) return false
  return true
}

// The same filters as a query on the table (PostgREST), each part beginning
// with "&". origin: false leaves the origin out, for a table without one yet.
export function restFilter(f, { origin = true } = {}) {
  const parts = []
  const words = searchWords(f.q)
  if (words.length) {
    const tree = words.map((w) => `or(company.ilike.*${w}*,report_name.ilike.*${w}*)`).join(',')
    parts.push(`and=${encodeURIComponent(`(${tree})`)}`)
  }
  const eq = (column, value) => `${column}=eq.${encodeURIComponent(value)}`
  if (f.firm) parts.push(eq('company', f.firm))
  if (f.industry) parts.push(eq('industry', f.industry))
  if (f.type) parts.push(eq('report_type', f.type))
  const band = bandByKey[f.score]
  if (band) {
    parts.push(`score=gte.${band.min}`)
    if (band.max !== null) parts.push(`score=lt.${band.max}`)
  }
  if (origin && f.show) parts.push(eq('origin', f.show))
  return parts.map((p) => `&${p}`).join('')
}

// ── the address ──────────────────────────────────────────────────────────────

const OWN = ['q', 'firm', 'industry', 'type', 'score', 'show', 'sort']

// The filters and sort an address asks for. Anything it names that The List
// does not have is ignored.
export function readParams(params) {
  const get = (k) => (params.get(k) || '').trim()
  const filters = {
    q: params.get('q') || '',
    firm: get('firm').slice(0, 120),
    industry: INDUSTRY_OF[get('industry')] || '',
    type: TYPE_OF[get('type')] || '',
    score: bandByKey[get('score')] ? get('score') : '',
    show: ORIGINS.some(([v]) => v && v === get('show')) ? get('show') : '',
  }
  const sorts = []
  for (const part of get('sort').split(',')) {
    const [key, dir] = part.split('.')
    if (fieldByKey[key] && (dir === 'asc' || dir === 'desc') && !sorts.some((s) => s.key === key)) sorts.push({ key, dir })
  }
  return { filters, sorts: sorts.slice(0, MAX_SORTS) }
}

// An address for these filters and this sort, keeping whatever else it held.
export function writeParams(params, { filters, sorts }) {
  const next = new URLSearchParams(params)
  for (const k of OWN) next.delete(k)
  if (searchWords(filters.q).length) next.set('q', filters.q)
  if (filters.firm) next.set('firm', filters.firm)
  if (filters.industry) next.set('industry', slug(filters.industry))
  if (filters.type) next.set('type', slug(filters.type))
  if (filters.score) next.set('score', filters.score)
  if (filters.show) next.set('show', filters.show)
  if (sorts.length) next.set('sort', sorts.map((s) => `${s.key}.${s.dir}`).join(','))
  return next
}

export function median(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!v.length) return null
  const mid = v.length >> 1
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}
