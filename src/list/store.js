// ─────────────────────────────────────────────────────────────────────────────
// Where The List lives.
//
// Live: a Supabase table (docs/the-list.sql), read and written over its REST
// API with the project's public anon key. Row-level security lets anyone read
// entries and add one, and nothing else; the key is meant to be public.
// Configured at build time by VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
// (repository variables in CI, .env.local in development).
//
// Not configured: The List is read from public/the-list.json, edited by hand,
// and the add form on the evidence brief is not shown.
// ─────────────────────────────────────────────────────────────────────────────

import { NO_FILTERS, matches, restFilter, median } from './filter.js'

const URL_BASE = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const TABLE = `${URL_BASE}/rest/v1/list_entries`
const COLUMNS = 'id,created_at,company,industry,report_type,report_name,published_on,published_precision,score,engine,source_url,origin,claims,flagged'
// The table before docs/the-list.sql's version 2 block has run.
const COLUMNS_V1 = 'id,created_at,company,industry,report_type,report_name,published_on,score,engine'
export const PAGE_SIZE = 50
// The List's sort keys, as the table's columns.
const COLUMN_OF = { company: 'company', industry: 'industry', reportType: 'report_type', reportName: 'report_name', publishedOn: 'published_on', score: 'score' }

export const LIST_IS_LIVE = Boolean(URL_BASE && KEY)

const headers = () => ({ apikey: KEY, Authorization: `Bearer ${KEY}` })

const fromRow = (r) => ({
  id: r.id,
  addedAt: r.created_at,
  company: r.company,
  industry: r.industry,
  reportType: r.report_type,
  reportName: r.report_name,
  publishedOn: r.published_on,
  publishedPrecision: r.published_precision || 'day',
  score: Number(r.score),
  engine: r.engine,
  sourceUrl: r.source_url || null,
  origin: r.origin || 'reader',
  claims: r.claims ?? null,
  flagged: r.flagged ?? null,
})

// Every entry, newest addition first.
export async function loadList() {
  if (!LIST_IS_LIVE) {
    const res = await fetch(`${import.meta.env.BASE_URL}the-list.json`, { cache: 'no-cache' })
    if (!res.ok) throw new Error(`the-list.json: ${res.status}`)
    const rows = await res.json()
    return rows.slice().sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1))
  }
  const res = await fetch(`${TABLE}?select=${COLUMNS}&order=created_at.desc&limit=5000`, { headers: headers() })
  if (!res.ok) throw new Error(`list_entries: ${res.status}`)
  return (await res.json()).map(fromRow)
}

// One page of entries, sorted and filtered by the table itself, so a visit
// downloads a page, not The List. sorts: [{ key, dir }] (src/list/sort.js);
// filters: the search and filters (src/list/filter.js). Resolves { rows, total }.
export async function loadPage({ sorts = [], filters = NO_FILTERS, offset = 0, limit = PAGE_SIZE } = {}) {
  if (!LIST_IS_LIVE) {
    const all = (await loadList()).filter((r) => matches(r, filters))
    const { sortEntries } = await import('./sort.js')
    const sorted = sortEntries(all, sorts)
    return { rows: sorted.slice(offset, offset + limit), total: sorted.length }
  }
  const order = [...sorts.filter((s) => COLUMN_OF[s.key]).map((s) => `${COLUMN_OF[s.key]}.${s.dir}.nullslast`), 'created_at.desc', 'id.desc'].join(',')
  const ask = (cols, f) => fetch(`${TABLE}?select=${cols}&order=${order}${f}`, {
    headers: { ...headers(), Prefer: 'count=exact', 'Range-Unit': 'items', Range: `${offset}-${offset + limit - 1}` },
  })
  let res = await ask(COLUMNS, restFilter(filters))
  // Until the version 2 columns exist, every entry is a reader's.
  if (res.status === 400) res = filters.show === 'audit' ? null : await ask(COLUMNS_V1, restFilter(filters, { origin: false }))
  if (!res) return { rows: [], total: 0 }
  if (!res.ok && res.status !== 206) throw new Error(`list_entries: ${res.status}`)
  const total = Number((res.headers.get('content-range') || '').split('/')[1])
  const rows = (await res.json()).map(fromRow)
  return { rows, total: Number.isFinite(total) ? total : offset + rows.length }
}

// Every report from one firm, as a count and the median score, whatever the
// filters. Resolves { count, median }.
export async function loadFirm(company) {
  if (!LIST_IS_LIVE) {
    const scores = (await loadList()).filter((r) => r.company === company).map((r) => Number(r.score))
    return { count: scores.length, median: median(scores) }
  }
  const res = await fetch(`${TABLE}?select=score&company=eq.${encodeURIComponent(company)}&limit=5000`, { headers: headers() })
  if (!res.ok) throw new Error(`list_entries: ${res.status}`)
  const scores = (await res.json()).map((r) => Number(r.score))
  return { count: scores.length, median: median(scores) }
}

// Add one entry (src/list/entry.js buildEntry). Resolves { ok: true, entry }
// or { ok: false, reason: 'duplicate' | 'rejected' | 'network' }.
export async function addToList(entry) {
  if (!LIST_IS_LIVE) return { ok: false, reason: 'rejected' }
  let res
  try {
    res = await fetch(TABLE, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        company: entry.company,
        industry: entry.industry,
        report_type: entry.reportType,
        report_name: entry.reportName,
        published_on: entry.publishedOn,
        score: entry.score,
        engine: entry.engine,
        doc_hash: entry.docHash,
      }),
    })
  } catch {
    return { ok: false, reason: 'network' }
  }
  if (res.status === 409) return { ok: false, reason: 'duplicate' }
  if (!res.ok) return { ok: false, reason: 'rejected' }
  const [row] = await res.json()
  return { ok: true, entry: fromRow(row) }
}
