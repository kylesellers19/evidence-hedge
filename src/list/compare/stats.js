// ─────────────────────────────────────────────────────────────────────────────
// The statistics behind Compare firms (docs/compare.md). Pure functions: the
// page's worker, the narration and the checks all call these.
//
// The report is the unit. Claims are nested in reports, so every interval
// resamples reports and every test shuffles reports (or their years); a claim
// is never treated as an independent draw. The chosen firm is compared with
// each other firm, one pair at a time:
//
//   score         Hodges–Lehmann shift (median of every pairwise difference,
//                 chosen minus other); percentile bootstrap within each firm;
//                 permutation of firm names, statistic the Mann–Whitney U
//   score, type   the shift within each report type both firms have, averaged
//                 with weights n₁n₂/(n₁+n₂); bootstrap within firm × type;
//                 permutation within type, statistic van Elteren's
//   each flag     ratio of pooled rates (100 × count ÷ claims); cluster
//                 bootstrap over reports; permutation of firm names,
//                 statistic |log ratio|. With a zero count, the difference
//                 per 100 claims instead.
//   flag, type    Mantel–Haenszel rate ratio over types, claims as the
//                 denominator (rate difference with a zero count)
//   trend         Theil–Sen slope on publication year; bootstrap over the
//                 firm's dated reports; years shuffled among its reports,
//                 statistic Mann–Kendall's |S|
//   trend gap     chosen firm's slope minus the other's; the two firms'
//                 bootstraps paired draw by draw; firm names shuffled among
//                 their dated reports, years kept, statistic |slope gap|
//
// Holm's adjustment runs within each family (score, score by type, flags,
// flags by type, trends, trend gaps). A result "differs" only when its
// adjusted p is under ALPHA, its interval leaves out no difference, each firm
// has the minimum in the data its test uses, and the estimate clears the
// smallest difference worth stating (src/list/compare/constants.js).
//
// Random numbers come from a seeded generator, keyed by the selection, the
// data and the row, so the same address gives the same numbers on every load.
// ─────────────────────────────────────────────────────────────────────────────

import { COMPARE_CONSTANTS as K } from './constants.js'

// The three flags, as the List's columns, in the brief's order
// (src/engine/patterns.js FLAG_ORDER).
export const FLAG_COLUMN = { 'unsupported-assertion': 'unsupported', overconfident: 'overconfident', 'causal-overreach': 'overreach' }

// ── random numbers ───────────────────────────────────────────────────────────

// cyrb53, folded to 32 bits.
export function hashString(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h1 ^ h2) >>> 0
}

// mulberry32: a uniform draw in [0, 1).
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (rand, n) => Math.floor(rand() * n)

// ── small tools ──────────────────────────────────────────────────────────────

export function median(values) {
  const v = Float64Array.from(values).sort()
  const n = v.length
  if (!n) return null
  return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2
}

// Linear interpolation between order statistics (numpy's default).
export function quantile(sorted, p) {
  const n = sorted.length
  if (!n) return null
  const h = (n - 1) * p
  const lo = Math.floor(h)
  const hi = Math.min(lo + 1, n - 1)
  const a = sorted[lo], b = sorted[hi]
  if (a === b) return a
  return a + (h - lo) * (b - a)
}

export function percentileInterval(draws, confidence = K.CONFIDENCE) {
  const v = Float64Array.from(draws.filter((d) => !Number.isNaN(d))).sort()
  if (v.length < 2) return [null, null]
  const tail = (1 - confidence) / 2
  return [quantile(v, tail), quantile(v, 1 - tail)]
}

// Holm–Bonferroni. ps holds a p for each test run (null for a test not run);
// the adjusted values come back in the same places.
export function holm(ps) {
  const idx = ps.map((p, i) => [p, i]).filter(([p]) => p != null).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const m = idx.length
  const out = ps.map(() => null)
  let running = 0
  idx.forEach(([p, i], k) => {
    running = Math.max(running, Math.min(1, (m - k) * p))
    out[i] = running
  })
  return out
}

const choose = (n, k) => {
  if (k < 0 || k > n) return 0
  k = Math.min(k, n - k)
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return Math.round(r)
}
const factorial = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r }

// Every k-subset of 0..n-1, as index arrays, in order.
function forEachCombination(n, k, fn) {
  const c = Array.from({ length: k }, (_, i) => i)
  for (;;) {
    fn(c)
    let i = k - 1
    while (i >= 0 && c[i] === n - k + i) i--
    if (i < 0) return
    c[i]++
    for (let j = i + 1; j < k; j++) c[j] = c[j - 1] + 1
  }
}

// A statistic as extreme as the observed one: at least it, less rounding.
const atLeast = (stat, obs) => stat >= obs - 1e-9 * Math.max(1, Math.abs(obs))

// ── tests that shuffle firm names ────────────────────────────────────────────
//
// strata: [{ items: [...], nA }], each stratum's first nA items the chosen
// firm's. agg(stratumIndex, items, indices, nA) sums a subset; stat(aggs)
// turns one aggregate per stratum into the test statistic (larger is more
// extreme). With no more arrangements than PERMUTATION_DRAWS, every one is
// counted; otherwise this call samples `draws` of them (one slice of the
// test). Returns { observed, hits, n, exact, arrangements }; combineTest
// turns the slices into a p.
export function labelTest(strata, agg, stat, { draws = K.PERMUTATION_DRAWS, rand }) {
  const observed = stat(strata.map((s, si) => agg(si, s.items, s.items.map((_, i) => i), s.nA)))
  let total = 1
  for (const s of strata) total *= choose(s.items.length, s.nA)
  if (total <= K.PERMUTATION_DRAWS) {
    // Each stratum's possible aggregates, then every combination of them.
    const lists = strata.map((s, si) => {
      const out = []
      forEachCombination(s.items.length, s.nA, (c) => out.push(agg(si, s.items, c, s.nA)))
      return out
    })
    let hits = 0
    const at = lists.map(() => 0)
    for (let n = 0; n < total; n++) {
      if (atLeast(stat(lists.map((l, i) => l[at[i]])), observed)) hits++
      for (let i = lists.length - 1; i >= 0; i--) { at[i]++; if (at[i] < lists[i].length) break; at[i] = 0 }
    }
    return { observed, hits, n: total, exact: true, arrangements: total }
  }
  const idx = strata.map((s) => s.items.map((_, i) => i))
  let hits = 0
  for (let d = 0; d < draws; d++) {
    const aggs = strata.map((s, si) => {
      const ix = idx[si]
      const n = ix.length
      for (let i = 0; i < s.nA; i++) { const j = i + pick(rand, n - i); const t = ix[i]; ix[i] = ix[j]; ix[j] = t }
      return agg(si, s.items, ix, s.nA)
    })
    if (atLeast(stat(aggs), observed)) hits++
  }
  return { observed, hits, n: draws, exact: false, arrangements: total }
}

// One test's slices as a p: the share of arrangements at least as extreme
// when every one was counted, else (b + 1) / (m + 1) over the m sampled.
export function combineTest(parts) {
  const first = parts[0]
  const hits = parts.reduce((s, x) => s + x.hits, 0)
  const n = parts.reduce((s, x) => s + x.n, 0)
  return { observed: first.observed, p: first.exact ? hits / n : (hits + 1) / (n + 1), exact: first.exact, arrangements: first.arrangements, draws: n }
}

// ── score: Hodges–Lehmann shift and rank tests ───────────────────────────────
//
// Scores are stored to one decimal, so they are counted in tenths on a grid
// of 0 to 100 and pairwise differences come from the two histograms.
const tenths = (s) => Math.round(s * 10)

function histOf(values, weights = null) {
  const h = new Float64Array(101)
  values.forEach((v, i) => { h[tenths(v)] += weights ? weights[i] : 1 })
  return h
}

// Median of every difference a − b, in points, from count histograms.
function shiftFromHists(ha, hb) {
  const nzA = [], nzB = []
  let na = 0, nb = 0
  for (let i = 0; i <= 100; i++) { if (ha[i]) { nzA.push(i); na += ha[i] } if (hb[i]) { nzB.push(i); nb += hb[i] } }
  if (!na || !nb) return null
  const d = new Float64Array(201)
  for (const i of nzA) { const wa = ha[i]; for (const j of nzB) d[i - j + 100] += wa * hb[j] }
  const total = na * nb
  const lo = Math.floor((total - 1) / 2), hi = Math.floor(total / 2)
  let acc = 0, vLo = null
  for (let k = 0; k < 201; k++) {
    if (!d[k]) continue
    const next = acc + d[k]
    if (vLo === null && lo < next) vLo = k
    if (hi < next) return ((vLo + k) / 2 - 100) / 10
    acc = next
  }
  return null
}

export const hlShift = (a, b) => shiftFromHists(histOf(a), histOf(b))

// The shift within each stratum both firms have, weighted n₁n₂/(n₁+n₂).
export function hlStratified(strata) {
  let num = 0, den = 0
  for (const { a, b } of strata) {
    if (!a.length || !b.length) continue
    const w = (a.length * b.length) / (a.length + b.length)
    num += w * hlShift(a, b)
    den += w
  }
  return den ? num / den : null
}

// Midranks of a pooled sample.
function midranks(values) {
  const order = values.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0])
  const r = new Float64Array(values.length)
  for (let i = 0; i < order.length;) {
    let j = i
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++
    const rank = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) r[order[k][1]] = rank
    i = j + 1
  }
  return r
}

// van Elteren's statistic: Σ (R − n₁(N+1)/2) / (N+1) over strata, R the chosen
// firm's rank sum. With one stratum it is the Mann–Whitney U, centered and scaled.
export function rankTest(strata, { rand, draws }) {
  const prepared = strata.filter((s) => s.a.length && s.b.length).map((s) => {
    const values = [...s.a, ...s.b]
    return { items: Array.from(midranks(values)), nA: s.a.length }
  })
  if (!prepared.length) return null
  const agg = (si, items, ix, nA) => {
    let r = 0
    for (let i = 0; i < nA; i++) r += items[ix[i]]
    const N = items.length
    return (r - (nA * (N + 1)) / 2) / (N + 1)
  }
  const stat = (aggs) => Math.abs(aggs.reduce((x, y) => x + y, 0))
  return labelTest(prepared, agg, stat, { rand, draws })
}

// Percentile bootstrap of the (stratified) shift, resampling reports within
// each firm (and type).
export function shiftBootstrap(strata, { rand, draws = K.BOOTSTRAP_DRAWS }) {
  const used = strata.filter((s) => s.a.length && s.b.length)
  const out = new Float64Array(draws)
  const resample = (xs) => { const h = new Float64Array(101); for (let i = 0; i < xs.length; i++) h[tenths(xs[pick(rand, xs.length)])]++; return h }
  for (let d = 0; d < draws; d++) {
    let num = 0, den = 0
    for (const { a, b } of used) {
      const w = (a.length * b.length) / (a.length + b.length)
      num += w * shiftFromHists(resample(a), resample(b))
      den += w
    }
    out[d] = num / den
  }
  return out
}

// ── flags: pooled rates ──────────────────────────────────────────────────────
//
// A report is { k, c }: how many of its claims have the flag, of how many.
export const pooledRate = (reports) => {
  let k = 0, c = 0
  for (const r of reports) { k += r.k; c += r.c }
  return c ? (100 * k) / c : null
}
export const reportRate = (reports) => (reports.length ? reports.reduce((s, r) => s + (100 * r.k) / r.c, 0) / reports.length : null)

// Mantel–Haenszel rate ratio over strata, and the rate difference per 100
// claims with weights T₁T₀/T (Rothman and Greenland). Each stratum gives the
// two firms' counts and claims.
export function mantelHaenszel(cells) {
  let num = 0, den = 0, wsum = 0, dsum = 0
  for (const { kA, cA, kB, cB } of cells) {
    if (!cA || !cB) continue
    const T = cA + cB
    num += (kA * cB) / T
    den += (kB * cA) / T
    const w = (cA * cB) / T
    wsum += w
    dsum += w * (kA / cA - kB / cB)
  }
  return { ratio: den ? num / den : num ? Infinity : NaN, num, den, diff: wsum ? (100 * dsum) / wsum : null }
}

const sumOf = (rs, ix, from, to) => {
  let k = 0, c = 0
  for (let i = from; i < to; i++) { const r = rs[ix[i]]; k += r.k; c += r.c }
  return [k, c]
}

// cells: [{ a: reports, b: reports }] (one cell for the unstratified ratio).
// zero: compare differences per 100 claims, for a flag one firm never has.
export function flagTest(cells, { zero, rand, draws }) {
  const prepared = cells.filter((s) => s.a.length && s.b.length).map((s) => ({ items: [...s.a, ...s.b], nA: s.a.length }))
  if (!prepared.length) return null
  const totals = prepared.map((s) => sumOf(s.items, s.items.map((_, i) => i), 0, s.items.length))
  const agg = (si, items, ix, nA) => {
    const [kA, cA] = sumOf(items, ix, 0, nA)
    const [K0, C0] = totals[si]
    return { kA, cA, kB: K0 - kA, cB: C0 - cA }
  }
  const stat = (aggs) => {
    const mh = mantelHaenszel(aggs)
    if (zero) return Math.abs(mh.diff)
    if (Number.isNaN(mh.ratio)) return 0 // neither firm has the flag: no difference
    return Math.abs(Math.log(mh.ratio))
  }
  return labelTest(prepared, agg, stat, { rand, draws })
}

// Cluster bootstrap of the ratio (or, with zero, the difference), resampling
// reports within each firm and cell.
export function flagBootstrap(cells, { zero, rand, draws = K.BOOTSTRAP_DRAWS }) {
  const used = cells.filter((s) => s.a.length && s.b.length)
  const out = new Float64Array(draws)
  const resample = (rs) => { let k = 0, c = 0; for (let i = 0; i < rs.length; i++) { const r = rs[pick(rand, rs.length)]; k += r.k; c += r.c } return [k, c] }
  for (let d = 0; d < draws; d++) {
    const aggs = used.map(({ a, b }) => { const [kA, cA] = resample(a); const [kB, cB] = resample(b); return { kA, cA, kB, cB } })
    const mh = mantelHaenszel(aggs)
    out[d] = zero ? mh.diff : Number.isNaN(mh.ratio) ? 0 : Math.log(mh.ratio)
  }
  return out
}

// ── trends: Theil–Sen and Mann–Kendall ───────────────────────────────────────

// Every pair of points in different years, sorted by slope: the slopes, and
// each pair's two points packed in one integer (i << 16 | j).
function sortedPairs(x, y) {
  const n = x.length
  let m = 0
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (x[i] !== x[j]) m++
  const raw = new Float64Array(m), packed = new Int32Array(m)
  let k = 0
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (x[i] === x[j]) continue
    raw[k] = (y[j] - y[i]) / (x[j] - x[i]); packed[k] = (i << 16) | j; k++
  }
  const order = Uint32Array.from({ length: m }, (_, i) => i).sort((a, b) => raw[a] - raw[b] || a - b)
  return { slope: Float64Array.from(order, (o) => raw[o]), pk: Int32Array.from(order, (o) => packed[o]), m }
}

// The Theil–Sen slope (median of pairwise slopes over pairs in different
// years) and, for drawing, scipy's "separate" intercept.
export function theilSen(x, y) {
  const s = []
  for (let i = 0; i < x.length; i++) for (let j = i + 1; j < x.length; j++) if (x[i] !== x[j]) s.push((y[j] - y[i]) / (x[j] - x[i]))
  if (!s.length) return null
  const slope = median(s)
  return { slope, intercept: median(y) - slope * median(x) }
}

// Pairs in different years among weighted points: ((Σw)² − Σ per year (Σw)²) / 2.
function pairWeight(w, yearIndex, perYear) {
  perYear.fill(0)
  let all = 0
  for (let i = 0; i < w.length; i++) { perYear[yearIndex[i]] += w[i]; all += w[i] }
  let sq = 0
  for (let t = 0; t < perYear.length; t++) sq += perYear[t] * perYear[t]
  return (all * all - sq) / 2
}

function yearIndexOf(x) {
  const ys = [...new Set(x)].sort((a, b) => a - b)
  const at = new Map(ys.map((v, i) => [v, i]))
  return { index: Int32Array.from(x, (v) => at.get(v)), years: ys.length }
}

// Weighted median of the sorted pair slopes, each pair weighted w(i)·w(j)
// (integer weights), over a total weight from pairWeight.
function weightedPairMedian({ slope, pk, m }, w, total) {
  if (total <= 0) return NaN
  const lo = Math.floor((total - 1) / 2), hi = Math.floor(total / 2)
  let acc = 0, vLo = NaN
  for (let k = 0; k < m; k++) {
    const p = pk[k]
    const wk = w[p >>> 16] * w[p & 0xffff]
    if (wk === 0) continue
    acc += wk
    if (vLo !== vLo && lo < acc) vLo = slope[k]
    if (hi < acc) return (vLo + slope[k]) / 2
  }
  return NaN
}

// Bootstrap of the Theil–Sen slope over the firm's dated reports. A draw that
// lands every report in one year has no slope and is left out (NaN).
export function slopeBootstrap(x, y, { rand, draws = K.BOOTSTRAP_DRAWS }) {
  const pairs = sortedPairs(x, y)
  const { index, years } = yearIndexOf(x)
  const n = x.length
  const w = new Int32Array(n)
  const perYear = new Float64Array(years)
  const out = new Float64Array(draws)
  for (let d = 0; d < draws; d++) {
    w.fill(0)
    for (let i = 0; i < n; i++) w[pick(rand, n)]++
    out[d] = weightedPairMedian(pairs, w, pairWeight(w, index, perYear))
  }
  return out
}

// Both firms' Theil–Sen slopes under one labeling (label 1: the chosen firm),
// from one walk along the pooled pair slopes.
function labeledSlopes({ slope, pk, m }, L, totalA, totalB) {
  if (totalA <= 0 || totalB <= 0) return [NaN, NaN]
  const loA = Math.floor((totalA - 1) / 2), hiA = Math.floor(totalA / 2)
  const loB = Math.floor((totalB - 1) / 2), hiB = Math.floor(totalB / 2)
  let cA = 0, cB = 0, a1 = NaN, a2 = NaN, b1 = NaN, b2 = NaN
  for (let k = 0; k < m; k++) {
    const p = pk[k]
    const u = L[p >>> 16]
    if (u !== L[p & 0xffff]) continue
    if (u === 1) {
      if (cA === loA) a1 = slope[k]
      if (cA === hiA) { a2 = slope[k]; if (b2 === b2) break }
      cA++
    } else {
      if (cB === loB) b1 = slope[k]
      if (cB === hiB) { b2 = slope[k]; if (a2 === a2) break }
      cB++
    }
  }
  return [(a1 + a2) / 2, (b1 + b2) / 2]
}

// Mann–Kendall's S: Σ over pairs of sign(x gap) × sign(y gap).
export function kendallS(x, y) {
  let s = 0
  for (let i = 0; i < x.length; i++) for (let j = i + 1; j < x.length; j++) s += Math.sign(x[j] - x[i]) * Math.sign(y[j] - y[i])
  return s
}

// Shuffles the years among a firm's reports; statistic |S|. S is counted in
// one pass over the reports in order of y, with a Fenwick tree over years.
export function trendTest(x, y, { rand, draws = K.PERMUTATION_DRAWS }) {
  const n = x.length
  const observed = Math.abs(kendallS(x, y))
  const { index, years } = yearIndexOf(x)
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => y[a] - y[b] || a - b)
  const groups = []
  for (let i = 0; i < n;) { let j = i; while (j + 1 < n && y[order[j + 1]] === y[order[i]]) j++; groups.push(order.slice(i, j + 1)); i = j + 1 }
  const tree = new Int32Array(years + 1)
  const S = (yr) => {
    tree.fill(0)
    let s = 0, seen = 0
    for (const g of groups) {
      for (const i of g) {
        let less = 0
        for (let t = yr[i]; t > 0; t -= t & -t) less += tree[t]
        let upto = 0
        for (let t = yr[i] + 1; t > 0; t -= t & -t) upto += tree[t]
        s += less - (seen - upto)
      }
      for (const i of g) { for (let t = yr[i] + 1; t <= years; t += t & -t) tree[t]++; seen++ }
    }
    return s
  }
  const yr = Int32Array.from(index)
  if (factorial(n) <= K.PERMUTATION_DRAWS) {
    // Every ordering of the years (Heap's algorithm).
    let hits = 0, total = 0
    const c = new Int32Array(n)
    const visit = () => { total++; if (atLeast(Math.abs(S(yr)), observed)) hits++ }
    visit()
    for (let i = 1; i < n;) {
      if (c[i] < i) {
        const j = i % 2 ? c[i] : 0
        const t = yr[j]; yr[j] = yr[i]; yr[i] = t
        visit()
        c[i]++; i = 1
      } else { c[i] = 0; i++ }
    }
    return { observed, hits, n: total, exact: true, arrangements: total }
  }
  let hits = 0
  for (let d = 0; d < draws; d++) {
    for (let i = n - 1; i > 0; i--) { const j = pick(rand, i + 1); const t = yr[i]; yr[i] = yr[j]; yr[j] = t }
    if (atLeast(Math.abs(S(yr)), observed)) hits++
  }
  return { observed, hits, n: draws, exact: false, arrangements: factorial(n) }
}

// Shuffles firm names among the two firms' dated reports, keeping each
// report's year and value; statistic |slope gap|. Both slopes come from one
// walk along the pooled reports' pair slopes.
export function trendGapTest(a, b, { rand, draws = K.PERMUTATION_DRAWS }) {
  const x = [...a.x, ...b.x], y = [...a.y, ...b.y]
  const nA = a.x.length, N = x.length
  const pairs = sortedPairs(x, y)
  const { index, years } = yearIndexOf(x)
  const L = new Uint8Array(N)
  const perA = new Int32Array(years), perB = new Int32Array(years)
  const gap = () => {
    perA.fill(0); perB.fill(0)
    for (let i = 0; i < N; i++) (L[i] ? perA : perB)[index[i]]++
    let sA = 0, sB = 0
    for (let t = 0; t < years; t++) { sA += perA[t] * perA[t]; sB += perB[t] * perB[t] }
    const [tA, tB] = labeledSlopes(pairs, L, (nA * nA - sA) / 2, ((N - nA) * (N - nA) - sB) / 2)
    return Math.abs(tA - tB)
  }
  const label = (ix) => { L.fill(0); for (let i = 0; i < nA; i++) L[ix[i]] = 1 }
  const all = Array.from({ length: N }, (_, i) => i)
  label(all)
  const observed = gap()
  const total = choose(N, nA)
  const extreme = (g) => g === g && atLeast(g, observed)
  if (total <= K.PERMUTATION_DRAWS) {
    let hits = 0
    forEachCombination(N, nA, (c) => { label(c); if (extreme(gap())) hits++ })
    return { observed, hits, n: total, exact: true, arrangements: total }
  }
  let hits = 0
  const ix = all.slice()
  for (let d = 0; d < draws; d++) {
    for (let i = 0; i < nA; i++) { const j = i + pick(rand, N - i); const t = ix[i]; ix[i] = ix[j]; ix[j] = t }
    label(ix)
    if (extreme(gap())) hits++
  }
  return { observed, hits, n: draws, exact: false, arrangements: total }
}

// ── one comparison ───────────────────────────────────────────────────────────
//
// input: {
//   seedKey: the selection and the data's fingerprint (data.js),
//   firms: [{ name, reports: [{ type, score, year, claims, unsupported, overconfident, overreach }] }],
//          the chosen firm first,
//   measures: the flag columns in the brief's order,
//   context: every firm's reports at the build in the chosen types,
// }
//
// planTasks(input) lists the work: each test and bootstrap, split into fixed
// slices with their own seeded random streams, so the page can hand them to
// several workers and still get the same numbers as one thread. runTask runs
// one; assemble turns the results into rows, one per estimate, with adjusted
// p and verdict. compareFirms does all three in order. Rows carry numbers;
// format.js words them.

const SLICES = 10 // each sampled test or bootstrap runs as 10 equal slices
const sliceDraws = (total, i) => Math.floor((total * (i + 1)) / SLICES) - Math.floor((total * i) / SLICES)
const flagReports = (reports, m) => reports.map((r) => ({ k: r[m], c: r.claims, type: r.type }))
const scoresOf = (reports) => reports.map((r) => r.score)
const typesOf = (reports) => [...new Set(reports.map((r) => r.type))]
function seriesOf(reports, m) {
  const dated = reports.filter((r) => Number.isInteger(r.year))
  return { x: dated.map((r) => r.year), y: dated.map((r) => (m === 'score' ? r.score : (100 * r[m]) / r.claims)) }
}
const sharedTypes = (a, b) => typesOf(a).filter((t) => b.some((r) => r.type === t))
const scoreStrata = (a, b, types) => types.map((t) => ({ a: scoresOf(a.filter((r) => r.type === t)), b: scoresOf(b.filter((r) => r.type === t)) }))
const flagCells = (a, b, m, types) => {
  const A = flagReports(a, m), B = flagReports(b, m)
  return types ? types.map((t) => ({ a: A.filter((r) => r.type === t), b: B.filter((r) => r.type === t) })) : [{ a: A, b: B }]
}
const countOf = (cells, side) => cells.reduce((s, c) => s + c[side].reduce((t, r) => t + r.k, 0), 0)
const sizeOf = (cells, side) => cells.filter((c) => c.a.length && c.b.length).reduce((s, c) => s + c[side].length, 0)
const trendReady = (x) => x.length >= K.TREND_MIN_REPORTS && new Set(x).size >= K.TREND_MIN_YEARS

// The work for one comparison, as a list of tasks.
export function planTasks(input) {
  const { firms, measures } = input
  const [chosen, ...others] = firms
  const tasks = []
  const add = (id, part, kind, args, exactPossible) => {
    if (exactPossible) tasks.push({ id, part, kind, args, slice: 0, draws: K.PERMUTATION_DRAWS })
    else for (let i = 0; i < SLICES; i++) tasks.push({ id, part, kind, args, slice: i, draws: sliceDraws(part === 'boot' ? K.BOOTSTRAP_DRAWS : K.PERMUTATION_DRAWS, i) })
  }
  const arrangements = (pairsOfSizes) => pairsOfSizes.reduce((t, [n, k]) => t * choose(n, k), 1)
  others.forEach((other, j) => {
    const a = chosen.reports, b = other.reports
    const enough = (x, y) => x >= K.MIN_REPORTS && y >= K.MIN_REPORTS
    if (enough(a.length, b.length)) {
      const strata = [{ a: scoresOf(a), b: scoresOf(b) }]
      add(`score-${j + 1}`, 'perm', 'rank', { strata }, arrangements([[a.length + b.length, a.length]]) <= K.PERMUTATION_DRAWS)
      add(`score-${j + 1}`, 'boot', 'shift', { strata })
    }
    const shared = sharedTypes(a, b)
    const strata = scoreStrata(a, b, shared)
    const nA = strata.reduce((s, x) => s + x.a.length, 0), nB = strata.reduce((s, x) => s + x.b.length, 0)
    if (enough(nA, nB)) {
      add(`scoretype-${j + 1}`, 'perm', 'rank', { strata }, arrangements(strata.map((x) => [x.a.length + x.b.length, x.a.length])) <= K.PERMUTATION_DRAWS)
      add(`scoretype-${j + 1}`, 'boot', 'shift', { strata })
    }
    for (const m of measures) {
      for (const [id, cells] of [[`flag-${m}-${j + 1}`, flagCells(a, b, m, null)], [`flagtype-${m}-${j + 1}`, flagCells(a, b, m, shared)]]) {
        const used = cells.filter((c) => c.a.length && c.b.length)
        const kA = countOf(used, 'a'), kB = countOf(used, 'b')
        if (!enough(sizeOf(used, 'a'), sizeOf(used, 'b')) || (kA === 0 && kB === 0)) continue
        const zero = kA === 0 || kB === 0
        add(id, 'perm', 'flag', { cells: used, zero }, arrangements(used.map((c) => [c.a.length + c.b.length, c.a.length])) <= K.PERMUTATION_DRAWS)
        add(id, 'boot', 'flagboot', { cells: used, zero })
      }
    }
  })
  for (const m of ['score', ...measures]) {
    firms.forEach((firm, i) => {
      const s = seriesOf(firm.reports, m)
      if (!trendReady(s.x)) return
      add(`trend-${m}-${i}`, 'perm', 'trend', s, factorial(s.x.length) <= K.PERMUTATION_DRAWS)
      add(`trend-${m}-${i}`, 'boot', 'slopeboot', s)
    })
    others.forEach((other, j) => {
      const sa = seriesOf(chosen.reports, m), sb = seriesOf(other.reports, m)
      if (!trendReady(sa.x) || !trendReady(sb.x)) return
      add(`trendgap-${m}-${j + 1}`, 'perm', 'gap', { a: sa, b: sb }, choose(sa.x.length + sb.x.length, sa.x.length) <= K.PERMUTATION_DRAWS)
    })
    // The context column's line: every firm on The List, no test.
    const c = seriesOf(input.context || [], m)
    if (new Set(c.x).size >= 2) tasks.push({ id: `context-${m}`, part: 'line', kind: 'line', args: c, slice: 0, draws: 0 })
  }
  return tasks
}

// One task. Its random stream is keyed by the selection, the row, the part
// and the slice, never by which worker runs it.
export function runTask(seedKey, task) {
  const rand = rng(hashString(`${seedKey}|${task.id}|${task.part}|${task.slice}`))
  const { args, draws } = task
  switch (task.kind) {
    case 'rank': return rankTest(args.strata, { rand, draws })
    case 'shift': return shiftBootstrap(args.strata, { rand, draws })
    case 'flag': return flagTest(args.cells, { zero: args.zero, rand, draws })
    case 'flagboot': return flagBootstrap(args.cells, { zero: args.zero, rand, draws })
    case 'trend': return trendTest(args.x, args.y, { rand, draws })
    case 'slopeboot': return slopeBootstrap(args.x, args.y, { rand, draws })
    case 'gap': return trendGapTest(args.a, args.b, { rand, draws })
    case 'line': return theilSen(args.x, args.y)
    default: throw new Error(`unknown task ${task.kind}`)
  }
}

const minSlope = (m) => (m === 'score' ? K.MIN_SCORE_SLOPE : K.MIN_RATE_SLOPE)
function clears(row) {
  if (row.kind === 'trend' || row.kind === 'trend-gap') return Math.abs(row.estimate) >= minSlope(row.measure)
  if (row.measure === 'score') return Math.abs(row.estimate) >= K.MIN_SCORE_SHIFT
  if (row.zero) return Math.abs(row.estimate) >= K.MIN_RATE_GAP
  const ratio = Math.exp(row.estimate)
  return (ratio < K.RATE_RATIO_LOW || ratio > K.RATE_RATIO_HIGH) && Math.abs(row.diff) >= K.MIN_RATE_GAP
}
// "differs" only when every condition holds; a test not run is "few".
function verdictOf(row) {
  if (row.p == null || row.lo == null || row.estimate == null) return 'few'
  const excludes = row.lo > 0 || row.hi < 0
  return row.pAdj < K.ALPHA && excludes && clears(row) && row.agree !== false ? 'differs' : 'apart'
}

// The results of every task, as rows.
export function assemble(input, tasks, results) {
  const { firms, measures } = input
  const [chosen, ...others] = firms
  const byId = {}
  tasks.forEach((t, i) => { ((byId[t.id] ??= {})[t.part] ??= []).push([t.slice, results[i]]) })
  const partOf = (id, part) => (byId[id]?.[part] || []).sort((a, b) => a[0] - b[0]).map(([, r]) => r)
  const test = (id) => { const parts = partOf(id, 'perm'); return parts.length ? combineTest(parts) : null }
  const draws = (id) => { const parts = partOf(id, 'boot'); return parts.length ? Float64Array.from(parts.flatMap((p) => Array.from(p))) : null }
  const withTest = (row, transform = (v) => v) => {
    const t = test(row.id)
    const d = draws(row.id)
    if (t && d) {
      const [lo, hi] = percentileInterval(Array.from(d))
      Object.assign(row, { p: t.p, exact: t.exact, arrangements: t.arrangements, draws: t.draws, lo: transform(lo), hi: transform(hi) })
    }
    return row
  }
  const rows = []
  others.forEach((other, j) => {
    const a = chosen.reports, b = other.reports
    const base = { measure: 'score', firm: chosen.name, other: other.name, otherIndex: j + 1 }
    rows.push(withTest({ ...base, id: `score-${j + 1}`, family: 'score', kind: 'pair', n: [a.length, b.length], estimate: a.length && b.length ? hlShift(scoresOf(a), scoresOf(b)) : null }))
    const shared = sharedTypes(a, b)
    const strata = scoreStrata(a, b, shared)
    rows.push(withTest({ ...base, id: `scoretype-${j + 1}`, family: 'score-type', kind: 'pair-type', types: shared,
      n: [strata.reduce((s, x) => s + x.a.length, 0), strata.reduce((s, x) => s + x.b.length, 0)],
      estimate: strata.length ? hlStratified(strata) : null, mix: typeMix(a, b) }))
  })
  for (const m of measures) {
    others.forEach((other, j) => {
      const a = chosen.reports, b = other.reports
      const base = { measure: m, firm: chosen.name, other: other.name, otherIndex: j + 1 }
      rows.push(flagRow({ ...base, id: `flag-${m}-${j + 1}`, family: 'flag', kind: 'pair' }, flagCells(a, b, m, null), withTest))
      const shared = sharedTypes(a, b)
      rows.push(flagRow({ ...base, id: `flagtype-${m}-${j + 1}`, family: 'flag-type', kind: 'pair-type', types: shared }, flagCells(a, b, m, shared), withTest))
    })
  }
  const context = {}
  for (const m of ['score', ...measures]) {
    firms.forEach((firm, i) => {
      const s = seriesOf(firm.reports, m)
      const ts = new Set(s.x).size >= 2 ? theilSen(s.x, s.y) : null
      rows.push(withTest({ id: `trend-${m}-${i}`, family: 'trend', kind: 'trend', measure: m, firm: firm.name, firmIndex: i,
        n: [s.x.length], years: new Set(s.x).size, firstYear: s.x.length ? Math.min(...s.x) : null, lastYear: s.x.length ? Math.max(...s.x) : null,
        estimate: ts ? ts.slope : null, intercept: ts ? ts.intercept : null, eligible: trendReady(s.x) }))
    })
    others.forEach((other, j) => {
      const rA = rows.find((r) => r.id === `trend-${m}-0`), rB = rows.find((r) => r.id === `trend-${m}-${j + 1}`)
      const row = { id: `trendgap-${m}-${j + 1}`, family: 'trend-gap', kind: 'trend-gap', measure: m, firm: chosen.name, other: other.name, otherIndex: j + 1,
        n: [rA.n[0], rB.n[0]], estimate: rA.estimate != null && rB.estimate != null ? rA.estimate - rB.estimate : null }
      const t = test(row.id)
      const dA = draws(rA.id), dB = draws(rB.id)
      if (t && dA && dB) {
        const [lo, hi] = percentileInterval(Array.from(dA, (v, d) => v - dB[d]))
        Object.assign(row, { p: t.p, exact: t.exact, arrangements: t.arrangements, draws: t.draws, lo, hi })
      }
      rows.push(row)
    })
    const line = partOf(`context-${m}`, 'line')[0]
    context[m] = line || null
  }
  for (const family of ['score', 'score-type', 'flag', 'flag-type', 'trend', 'trend-gap']) {
    const members = rows.filter((r) => r.family === family)
    const adjusted = holm(members.map((r) => (r.p == null ? null : r.p)))
    const size = adjusted.filter((p) => p != null).length
    members.forEach((r, i) => { r.pAdj = adjusted[i]; r.familySize = size })
  }
  for (const r of rows) r.verdict = verdictOf(r)
  return { rows, context }
}

export function compareFirms(input) {
  const tasks = planTasks(input)
  return assemble(input, tasks, tasks.map((t) => runTask(input.seedKey, t)))
}

function flagRow(row, cells, withTest) {
  const used = cells.filter((c) => c.a.length && c.b.length)
  const A = used.flatMap((c) => c.a), B = used.flatMap((c) => c.b)
  row.n = [A.length, B.length]
  row.rateA = pooledRate(A)
  row.rateB = pooledRate(B)
  row.reportRateA = reportRate(A)
  row.reportRateB = reportRate(B)
  if (!used.length) { row.estimate = null; return row }
  const mh = mantelHaenszel(used.map(({ a, b }) => {
    const [kA, cA] = sumOf(a, a.map((_, i) => i), 0, a.length)
    const [kB, cB] = sumOf(b, b.map((_, i) => i), 0, b.length)
    return { kA, cA, kB, cB }
  }))
  const countA = countOf(used, 'a'), countB = countOf(used, 'b')
  row.counts = [countA, countB]
  row.zero = countA === 0 || countB === 0
  row.diff = mh.diff
  row.estimate = row.zero ? mh.diff : Math.log(mh.ratio)
  // The report-weighted lean: the mean of report rates, type by type.
  let num = 0, den = 0
  for (const { a, b } of used) { const w = (a.length * b.length) / (a.length + b.length); num += w * (reportRate(a) - reportRate(b)); den += w }
  row.reportDiff = den ? num / den : null
  const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0)
  row.agree = sign(row.reportDiff) === sign(row.diff)
  if (countA === 0 && countB === 0) {
    // Neither firm's reports have the flag: nothing to tell apart.
    if (A.length >= K.MIN_REPORTS && B.length >= K.MIN_REPORTS) Object.assign(row, { p: 1, exact: true, arrangements: 1, lo: 0, hi: 0, agree: true })
    return row
  }
  return withTest(row)
}

// The report type with the widest gap in share between the two firms, for
// "Gensler publishes more market reports" in the text.
function typeMix(a, b) {
  const types = [...new Set([...a, ...b].map((r) => r.type))]
  const share = (rs, t) => rs.filter((r) => r.type === t).length / rs.length
  let best = null
  for (const t of types) {
    const gap = share(b, t) - share(a, t)
    if (!best || Math.abs(gap) > Math.abs(best.gap)) best = { type: t, gap, shareA: share(a, t), shareB: share(b, t) }
  }
  return best
}
