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

const URL_BASE = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const TABLE = `${URL_BASE}/rest/v1/list_entries`
const COLUMNS = 'id,created_at,company,industry,report_type,report_name,published_on,score,engine'

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
  score: Number(r.score),
  engine: r.engine,
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
