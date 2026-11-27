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
import { rowOf, fromRow, countsFileMap, withFileCounts } from './entry.js'

// The three flag counts (docs/the-list.sql version 3): how many of an entry's
// claims state something as fact and cite nothing, cite a source but say more
// than it shows, and claim more cause than the study shows.
const FLAG_COLUMNS = 'unsupported,overconfident,overreach'

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

// Whether the table has the version 3 columns, asked once a visit. The add
// form sends the flag counts only when it does; until the SQL runs, it behaves
// as before. The compare tool doesn't wait for it (loadCompareRows).
let hasCounts = null
export function hasFlagCounts() {
  if (hasCounts) return hasCounts
  if (!LIST_IS_LIVE) {
    hasCounts = loadList().then((rows) => rows.length > 0 && rows.every((r) => r.unsupported != null), () => false)
  } else {
    // One row, every column: asking for columns the table lacks would answer
    // 400, which the browser reports as an error on every visit until then.
    hasCounts = fetch(`${TABLE}?select=*&limit=1`, { headers: headers() })
      .then(async (res) => {
        if (!res.ok) throw new Error(`list_entries: ${res.status}`)
        const [row] = await res.json()
        return Boolean(row) && FLAG_COLUMNS.split(',').every((c) => c in row)
      })
      .catch((e) => { hasCounts = null; throw e })
  }
  return hasCounts
}

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

// Every entry the compare tool can weigh, with the columns it needs, paged as
// the table pages (at most 1,000 rows an answer) and checked against the
// table's own count. Resolves { rows } or { unavailable: true } when the table
// has no flag counts yet.
export const COMPARE_COLUMNS = `id,company,report_type,report_name,published_on,published_precision,score,engine,origin,claims,flagged,${FLAG_COLUMNS},source_url`
// The same, for a table without the version 3 columns.
const COMPARE_COLUMNS_V2 = COMPARE_COLUMNS.replace(`,${FLAG_COLUMNS}`, '')
const COMPARE_PAGE = 1000

// The audit's flag counts as a file the site ships (public/list-flag-counts.json,
// from the ledgers behind each score; scripts/list-counts-file.mjs), so the
// compare tool works before the table has the counts. Entries without counts
// take them from it when their build, score, claims and flagged still match.
let countsFile = null
function loadCountsFile() {
  if (!countsFile) {
    countsFile = fetch(`${import.meta.env.BASE_URL}list-flag-counts.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then(countsFileMap, () => new Map())
  }
  return countsFile
}

// Every entry the compare tool reads, with its flag counts: the table's own
// once it has them, else the file's. Resolves { rows } or, when neither has
// counts, { unavailable: true }.
export async function loadCompareRows() {
  const [table, file] = await Promise.all([hasFlagCounts().catch(() => false), loadCountsFile()])
  if (!table && file.size === 0) return { unavailable: true }
  if (!LIST_IS_LIVE) return { rows: withFileCounts(await loadList(), file) }
  const rows = []
  for (let offset = 0; ; offset += COMPARE_PAGE) {
    const res = await fetch(`${TABLE}?select=${table ? COMPARE_COLUMNS : COMPARE_COLUMNS_V2}&order=id.asc`, {
      headers: { ...headers(), Prefer: 'count=exact', 'Range-Unit': 'items', Range: `${offset}-${offset + COMPARE_PAGE - 1}` },
    })
    if (!res.ok && res.status !== 206) throw new Error(`list_entries: ${res.status}`)
    const total = Number((res.headers.get('content-range') || '').split('/')[1])
    const page = await res.json()
    rows.push(...page.map(fromRow))
    if (page.length < COMPARE_PAGE || rows.length >= total) {
      if (Number.isFinite(total) && rows.length !== total) throw new Error(`list_entries: ${rows.length} of ${total} rows`)
      return { rows: withFileCounts(rows, file) }
    }
  }
}

// Add one entry (src/list/entry.js buildEntry). Resolves { ok: true, entry }
// or { ok: false, reason: 'duplicate' | 'rejected' | 'network' }. The claim and
// flag counts go only to a table with the version 3 columns.
export async function addToList(entry) {
  if (!LIST_IS_LIVE) return { ok: false, reason: 'rejected' }
  let res
  try {
    const counts = await hasFlagCounts().catch(() => false)
    res = await fetch(TABLE, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(rowOf(entry, { counts })),
    })
  } catch {
    return { ok: false, reason: 'network' }
  }
  if (res.status === 409) return { ok: false, reason: 'duplicate' }
  if (!res.ok) return { ok: false, reason: 'rejected' }
  const [row] = await res.json()
  return { ok: true, entry: fromRow(row) }
}
