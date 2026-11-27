// ─────────────────────────────────────────────────────────────────────────────
// A snapshot of The List as the compare tool reads it, for the checks:
// checks/targets/compare/list-rows.json, every row with the columns
// src/list/store.js COMPARE_COLUMNS asks for, as the table answers them.
//
//   node scripts/compare-snapshot.mjs
//
// The rows come from the live table (paged, checked against its count). Until
// the table has the version 3 flag counts, each audit row takes its counts from
// the ledger row that gave its score (checks/data/audit, the same rule as
// scripts/list-load.mjs --counts-only, matched here by link, build, score,
// claims and flagged), so the snapshot is what the table holds once the SQL
// runs. List rows are public; the snapshot holds no document text.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { ROOT } from '../checks/lib/corpus.mjs'

const LEDGERS = ['run10', 'run11h', 'run12new', 'run13g', 'run14x']
const COLUMNS = 'id,company,report_type,report_name,published_on,published_precision,score,engine,origin,claims,flagged,source_url'
const COUNTS = ['unsupported', 'overconfident', 'overreach']

function env(name) {
  if (process.env[name]) return process.env[name]
  const local = join(ROOT, '.env.local')
  if (existsSync(local)) {
    const m = new RegExp(`^${name}=(.*)$`, 'm').exec(readFileSync(local, 'utf8'))
    if (m) return m[1].trim()
  }
  return execSync(`gh variable get ${name.replace(/^VITE_/, '')}`, { encoding: 'utf8' }).trim()
}
const URL_BASE = env('VITE_SUPABASE_URL').replace(/\/+$/, '')
const KEY = env('VITE_SUPABASE_ANON_KEY')

async function fetchAll(columns) {
  const out = []
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${URL_BASE}/rest/v1/list_entries?select=${columns}&order=id.asc`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'count=exact', 'Range-Unit': 'items', Range: `${offset}-${offset + 999}` },
    })
    if (res.status === 400) return null
    if (!res.ok && res.status !== 206) throw new Error(`list_entries: ${res.status}`)
    const total = Number((res.headers.get('content-range') || '').split('/')[1])
    const page = await res.json()
    out.push(...page)
    if (page.length < 1000) {
      if (out.length !== total) throw new Error(`${out.length} rows of ${total}`)
      return out
    }
  }
}

let rows = await fetchAll(`${COLUMNS},${COUNTS.join(',')}`)
let source = 'the table'
if (!rows) {
  source = `the table, with counts from ledgers ${LEDGERS.join(', ')}`
  rows = await fetchAll(COLUMNS)
  const byKey = new Map()
  for (const tag of LEDGERS) {
    for (const line of readFileSync(join(ROOT, 'checks', 'data', 'audit', `ledger-${tag}.jsonl`), 'utf8').trim().split('\n')) {
      const r = JSON.parse(line)
      const s = r.rendered?.stats
      if (r.status !== 'ok' || r.score == null || !r.url || !s) continue
      byKey.set([r.url, r.engine, Math.round(r.score * 10) / 10, s.claims, s.flagged].join('|'), s)
    }
  }
  for (const row of rows) {
    if (row.origin !== 'audit') continue
    const s = byKey.get([row.source_url, row.engine, Number(row.score), row.claims, row.flagged].join('|'))
    if (!s) throw new Error(`no ledger row for entry ${row.id}`)
    if (s.unsupported + s.overconfident + s.overreach - s.twoFlags !== s.flagged) throw new Error(`counts don't add up: ${row.id}`)
    Object.assign(row, { unsupported: s.unsupported, overconfident: s.overconfident, overreach: s.overreach })
  }
}
rows = rows.map((r) => ({ ...r, score: Number(r.score) }))
const out = join(ROOT, 'checks', 'targets', 'compare')
mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'list-rows.json'), '[\n' + rows.map((r) => JSON.stringify(r)).join(',\n') + '\n]\n')
console.log(`${rows.length} rows from ${source} → checks/targets/compare/list-rows.json; highest id ${Math.max(...rows.map((r) => r.id))}`)
