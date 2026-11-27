// ─────────────────────────────────────────────────────────────────────────────
// How the comparison's numbers and names are written. Every number the page
// or the text shows goes through here, and each statistics row keeps its own
// formatted values (row.fmt), so the check can hold every number in a
// sentence to the rows that sentence cites. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { statsLabels } from '../../components/results/briefTop.js'

const MINUS = '−'
const signed = (s) => s.replace(/^-/, MINUS)
const nonzero = (s) => (/^[−-]0(\.0+)?$/.test(s) ? s.slice(1) : s)

// Rounded by magnitude, half away from zero, so −1.45 and 1.45 print as
// −1.5 and 1.5 wherever the sign is flipped for a sentence.
const round = (v, k) => Math.sign(v) * Math.round(Math.abs(v) * 10 ** k + 1e-9) / 10 ** k
export const points = (v) => nonzero(signed(round(v, 1).toFixed(1)))
export const rate = (v) => {
  if (!Number.isFinite(v)) return v > 0 ? '∞' : `${MINUS}∞`
  const r = round(v, 1)
  return nonzero(signed(Math.abs(r) >= 10 ? String(round(v, 0)) : String(r)))
}
export const times = (v) => (Number.isFinite(v) ? round(v, 1).toFixed(1) : '∞')
export const slope = (v) => nonzero(signed(round(v, 1).toFixed(1)))
export const count = (n) => Number(n).toLocaleString('en-US')
export function pValue(p) {
  if (p == null) return ''
  if (p < 0.001) return '<0.001'
  return p < 0.1 ? p.toFixed(3) : p.toFixed(2)
}

// AP possessives: a name ending in a lowercase s takes the apostrophe alone
// (Jacobs’); an initialism ending in S takes ’s (HKS’s, Arup US’s).
export const possessive = (name) => (/s$/.test(name) ? `${name}’` : `${name}’s`)

// A list joined as Delgam joins one: no serial comma.
export const joinAnd = (xs, word = 'and') => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${word} ${xs[xs.length - 1]}`)

// The flag's label as the brief words it, for n claims.
export function flagLabel(measure, n = 2) {
  return statsLabels({ claims: n, unsupported: n, overconfident: n, overreach: n })[measure][0]
}

// Report types as they read in a sentence.
const TYPE_PLURAL = {
  'Research report': 'research reports',
  'Survey report': 'survey reports',
  'White paper': 'white papers',
  'Industry or market report': 'industry or market reports',
  'Annual or impact report': 'annual or impact reports',
  'Policy brief': 'policy briefs',
  'Academic paper': 'academic papers',
  'Press release': 'press releases',
  'News article': 'news articles',
  'Opinion or commentary': 'opinion or commentary pieces',
  'Blog post': 'blog posts',
  'Marketing material': 'marketing pieces',
  'Sponsored content': 'sponsored pieces',
  Other: 'reports of other types',
}
export const typePlural = (t) => TYPE_PLURAL[t] || t.toLowerCase()

// "On survey reports and white papers", or for many types, how many.
export function typesPhrase(types, { all = false } = {}) {
  if (all) return 'Across all their report types'
  if (types.length <= 3) return `On ${joinAnd(types.map(typePlural))}`
  return `On ${types.length} report types`
}

// A short name for a column head: an acronym in parentheses, or the name
// without the words most firms share; the full name when two would collide.
const GENERIC = /\s+(?:company|construction|group|consultants|global|holdings|contracting|building company|engineering|engineers|inc\.?|llc|north america)$/i
function shorten(name) {
  const acronym = /\(([A-Z][A-Z&]{1,6})\)\s*$/.exec(name)
  if (acronym) return acronym[1]
  let s = name.replace(/\s*\([^)]*\)\s*$/, '')
  for (let i = 0; i < 3 && GENERIC.test(s); i++) s = s.replace(GENERIC, '')
  return s || name
}
export function shortNames(names) {
  const short = names.map(shorten)
  return names.map((n, i) => (short.filter((s) => s === short[i]).length > 1 ? n : short[i]))
}

// Each row's numbers, written: the signed values, and the same oriented to
// the direction a sentence names (a gap of 1.1 lower, interval 0.4 to 1.9).
export function formatRow(row) {
  const f = { nA: row.n[0] != null ? count(row.n[0]) : null, nB: row.n[1] != null ? count(row.n[1]) : null }
  const has = row.estimate != null && Number.isFinite(row.estimate)
  const ci = row.lo != null && row.hi != null
  const orient = (fn, up) => {
    if (!ci) return [null, null]
    return up ? [fn(row.lo), fn(row.hi)] : [fn(-row.hi), fn(-row.lo)]
  }
  if (row.measure === 'score' && (row.kind === 'pair' || row.kind === 'pair-type')) {
    if (has) {
      const up = row.estimate >= 0
      Object.assign(f, { estimate: points(row.estimate), size: points(Math.abs(row.estimate)), dir: up ? 'higher' : 'lower' })
      ;[f.lo, f.hi] = orient(points, up)
      if (ci) { f.signedLo = points(row.lo); f.signedHi = points(row.hi) }
      // An interval across no difference, as "0.7 lower to 0.3 higher".
      if (ci && row.lo < 0 && row.hi > 0 && points(row.lo) !== '0.0' && points(row.hi) !== '0.0') { f.crossLo = points(-row.lo); f.crossHi = points(row.hi) }
    }
  } else if (row.kind === 'pair' || row.kind === 'pair-type') {
    Object.assign(f, { rateA: row.rateA != null ? rate(row.rateA) : null, rateB: row.rateB != null ? rate(row.rateB) : null })
    if (has) {
      const up = row.estimate >= 0
      f.gap = rate(Math.abs(row.diff))
      if (row.zero) {
        Object.assign(f, { estimate: rate(row.estimate), size: rate(Math.abs(row.estimate)), more: up ? 'A' : 'B' })
        ;[f.lo, f.hi] = orient(rate, up)
        if (ci) { f.signedLo = rate(row.lo); f.signedHi = rate(row.hi) }
      } else {
        const t = (v) => times(Math.exp(v))
        Object.assign(f, { estimate: t(row.estimate), size: times(Math.exp(Math.abs(row.estimate))), more: up ? 'A' : 'B' })
        ;[f.lo, f.hi] = orient(t, up)
        if (ci) { f.signedLo = t(row.lo); f.signedHi = t(row.hi) }
      }
    }
  } else if (row.kind === 'trend' || row.kind === 'trend-gap') {
    if (row.firstYear != null) f.firstYear = String(row.firstYear)
    if (row.lastYear != null) f.lastYear = String(row.lastYear)
    if (has) {
      const up = row.estimate >= 0
      Object.assign(f, { estimate: slope(row.estimate), size: slope(Math.abs(row.estimate)), dir: up ? 'risen' : 'fallen' })
      ;[f.lo, f.hi] = orient(slope, up)
      if (ci) { f.signedLo = slope(row.lo); f.signedHi = slope(row.hi) }
      if (ci && row.lo < 0 && row.hi > 0 && slope(row.lo) !== '0.0' && slope(row.hi) !== '0.0') { f.crossLo = slope(-row.lo); f.crossHi = slope(row.hi) }
    }
  }
  f.pAdj = pValue(row.pAdj)
  return f
}
