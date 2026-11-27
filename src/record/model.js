// The Record's reading of record.json: formatting, states and the one sentence.
// Pure functions, so checks/record.test.mjs can hold them without a browser.

export const DATA_URL = 'record/record.json'

export const STATES = {
  passed: 'Checked',
  provisional: 'Provisional',
  pending: 'Pending',
  too_few: 'Too few to estimate',
}

// Shares and rates are stored as 0–1; points as percentage points; scores as-is.
export function fmt(v, unit, { signed = false } = {}) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  if (unit === 'share' || unit === 'rate') {
    const p = v * 100
    const s = Math.abs(p) >= 10 || p === 0 ? p.toFixed(0) : Math.abs(p) >= 1 ? p.toFixed(1) : p.toFixed(1)
    return `${signed && p > 0 ? '+' : ''}${s.replace('-', '−')}%`
  }
  if (unit === 'points') {
    const s = Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1)
    return `${v > 0 ? '+' : ''}${s.replace('-', '−')}`
  }
  if (unit === 'count') return Math.round(v).toLocaleString('en-US')
  const s = Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)
  return `${signed && v > 0 ? '+' : ''}${s.replace('-', '−')}`
}

export function fmtInterval(cell, unit) {
  if (!cell || cell.lo === null || cell.lo === undefined) return ''
  return `${fmt(cell.lo, unit)} to ${fmt(cell.hi, unit)}`
}

export function isShown(cell) {
  return !!cell && (cell.gate === 'passed' || cell.gate === 'provisional') && cell.value !== null && cell.value !== undefined
}

// The scale a row's mark is drawn on: every organization's interval, the median and
// zero for signed measures, padded a little.
export function markDomain(q, key, unit) {
  const vals = []
  for (const o of q.organizations) {
    const c = o.values[key]
    if (isShown(c)) vals.push(c.lo ?? c.value, c.hi ?? c.value, c.value)
  }
  const med = q.field?.[key]?.median
  if (med !== null && med !== undefined) vals.push(med)
  if (unit === 'points' || unit === 'score') vals.push(0)
  if (unit === 'share' || unit === 'rate') vals.push(0)
  if (!vals.length) return [0, 1]
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  if (hi === lo) { hi = lo + (unit === 'share' || unit === 'rate' ? 0.01 : 1) }
  const pad = (hi - lo) * 0.04
  return [unit === 'share' || unit === 'rate' ? Math.max(0, lo - pad) : lo - pad, hi + pad]
}

function pctWords(v) {
  return fmt(v, 'share')
}

// One sentence, from the data. Pending parts are named, never guessed. "Above" or
// "below" the field median only when the 95% interval leaves it out.
export function sentence(q, org) {
  if (!org) return ''
  const v = org.values
  const since = q.build.window[0].slice(0, 4)
  const w = org.window_documents ?? org.documents
  const docs = `${org.label} published ${w} of the ${q.map.window_documents.toLocaleString('en-US')} documents in the map since ${since}`
  const parts = []
  const nf = v.new_share
  if (isShown(nf)) {
    const med = q.field?.new_share?.median
    let rel = ''
    if (med !== null && med !== undefined) {
      rel = nf.lo > med ? 'above' : nf.hi < med ? 'below' : 'near'
      rel = `, ${rel} the field median of ${pctWords(med)},`
    }
    parts.push(`made ${pctWords(nf.value)} of its new findings${rel}`.replace('of its new findings', 'of the map’s new findings'))
  }
  const cited = v.cited_by_later
  if (isShown(cited) && cited.n) {
    parts.push(cited.k === 0
      ? `and no later document by another organization cited it (0 of ${cited.n})`
      : `and was cited by ${cited.k} of ${cited.n} later documents by other organizations`)
  }
  const cov = v.coverage_share
  let tail = ''
  if (!isShown(cov)) tail = '. Its news coverage is not measured yet'
  else parts.push(`and drew ${pctWords(cov.value)} of the coverage found`)
  if (!parts.length) return `${docs}${tail}.`
  const body = parts.join(' ').replace(/,$/, '')
  return `${docs}, ${body}${tail}.`
}

// Labels for the figure: the selected organization and the extremes on each axis.
export function labelled(points, selectedId) {
  const keep = new Set([selectedId])
  if (points.length) {
    const by = (f) => points.reduce((a, b) => (f(b) > f(a) ? b : a))
    keep.add(by((p) => p.x).id)
    keep.add(by((p) => p.y).id)
    keep.add(by((p) => p.y - p.x).id)
    keep.add(by((p) => p.x - p.y).id)
  }
  return keep
}

export function nearest(points, px, py, maxDist = 28) {
  let best = null
  let bd = maxDist * maxDist
  for (const p of points) {
    const d = (p.sx - px) ** 2 + (p.sy - py) ** 2
    if (d <= bd) { bd = d; best = p }
  }
  return best
}

export function orgById(q, id) {
  return q.organizations.find((o) => o.id === id) || null
}

export function defaultOrg(q) {
  // The organization with the most documents, ties by label number: a full row to start on.
  return [...q.organizations].sort((a, b) => (b.window_documents ?? b.documents) - (a.window_documents ?? a.documents) || a.n - b.n)[0]
}
