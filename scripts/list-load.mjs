// ─────────────────────────────────────────────────────────────────────────────
// The corpus audit's entries for The List, as SQL to run once in the Supabase
// SQL editor (after docs/the-list.sql's version 2 block).
//
//   node scripts/list-load.mjs --tag run9
//
// One entry per AEC report the site scores as an upload: the firm, its segment
// as an industry, a report type read from the title, the title, the date as the
// firm published it (a month or a year when that is all it gives), the score,
// the engine build, the report's link, its claim counts, and a SHA-256 of the
// text as the engine read it (the same fingerprint the add form sends, so a
// reader who uploads the same PDF is told it is already listed). Never the
// text. Writes to the gitignored checks/data/list/.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { ROOT } from '../checks/lib/corpus.mjs'
import { listDocuments, textOf } from './audit-corpus.mjs'
import { INDUSTRIES, REPORT_TYPES } from '../src/list/fields.js'

const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? dflt : process.argv[i + 1] }
const TAG = arg('tag', 'run9')
const OUT = join(ROOT, 'checks', 'data', 'list')
const AEC = join(ROOT, 'checks', 'data', 'aec')

// The firm's segment in the collection, as The List's industry.
const INDUSTRY_OF = {
  Architecture: 'Professional services and consulting',
  Design: 'Professional services and consulting',
  Engineering: 'Professional services and consulting',
  Construction: 'Industrials',
  'Construction data': 'Industrials',
  'AEC technology': 'Information technology',
}

// A report type from the title (and the link), first match wins.
const TYPE_RULES = [
  [/\bwhite\s?-?paper\b/i, 'White paper'],
  [/\bsurvey\b/i, 'Survey report'],
  [/\bcost\s+index\b|\bmarket\s+(?:conditions|report|update|outlook|analysis|intelligence|insights?|trends?)\b|\boutlook\b|\bforecast\b|\bescalation\b|\bpulse\b|\blook\s?-?ahead\b|\bconstruction\s+(?:starts|economics|economy|costs?)\b|\bquarterly\b|\bq[1-4]\s?-?20\d\d\b|\blead\s+times?\b|\bsupply\s+chain\b|\beconomic\b/i, 'Industry or market report'],
  [/\bannual\s+report\b|\bimpact\s+report\b|\bsustainability\s+report\b|\besg\s+report\b|\bresponsibility\s+report\b|\byear\s+in\s+review\b/i, 'Annual or impact report'],
  [/\bjournal\b|\bresearch\b|\bstudy\b|\breport\b|\bfindings\b|\banalysis\b/i, 'Research report'],
]
// With no cue in the title, what the engine read the document as.
const TYPE_OF_POSTURE = {
  'research-like': 'Research report', standard: 'Research report', 'thought-leadership': 'Opinion or commentary',
  marketing: 'Marketing material', 'press-release': 'Press release', news: 'News article', opinion: 'Opinion or commentary',
  sponsored: 'Sponsored content',
}
function reportType(title, url, posture) {
  let hay = `${title} `
  try { hay += decodeURIComponent(url || '') } catch { hay += url || '' }
  for (const [re, type] of TYPE_RULES) if (re.test(hay)) return type
  return TYPE_OF_POSTURE[posture] || 'Other'
}

// A manifest title that is a file name reads as words (scripts/method-scale.mjs).
function cleanTitle(t = '') {
  let s = t.replace(/\s*\([^)]*[_-][^)]*\)\s*$/, '')
  if (!/\s/.test(s)) s = s.replace(/[-_]+/g, ' ')
  // Underscores are a file name's spaces; a trailing page count is not the title.
  s = s.replace(/_+/g, ' ').replace(/\s+\d+\s+pages?$/i, '').replace(/\s+/g, ' ').trim()
  return (s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 300)
}

// "2019" → a year; "2023-11" → a month; anything else unknown.
function published(p) {
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(String(p || ''))
  const year = new Date().getUTCFullYear()
  if (!m || Number(m[1]) < 1900 || Number(m[1]) > year) return { on: null, precision: 'unknown' }
  return m[2] ? { on: `${m[1]}-${m[2]}-01`, precision: 'month' } : { on: `${m[1]}-01-01`, precision: 'year' }
}

const sq = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)

const segmentOf = new Map()
for (const f of readdirSync(AEC).filter((f) => /^manifest-.*\.json$/.test(f))) {
  const j = JSON.parse(readFileSync(join(AEC, f), 'utf8'))
  for (const x of Array.isArray(j) ? j : j.items || []) segmentOf.set(`aec:${x.file.replace(/\.pdf$/i, '')}`, x.segment)
}

const ledger = readFileSync(join(ROOT, 'checks', 'data', 'audit', `ledger-${TAG}.jsonl`), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
const docs = new Map(listDocuments().filter((d) => d.mode === 'upload').map((d) => [d.id, d]))
const rows = []
const seen = new Set()
const skipped = { notAec: 0, unscored: 0, noUrl: 0, duplicateText: 0 }
for (const r of ledger) {
  if (!r.id.startsWith('aec:') || !(r.mode === 'upload' || !r.mode)) { skipped.notAec++; continue }
  if (r.status !== 'ok' || r.score == null) { skipped.unscored++; continue }
  if (!r.url) { skipped.noUrl++; continue }
  const t = await textOf(docs.get(r.id))
  const hash = createHash('sha256').update(String(t.text), 'utf8').digest('hex')
  if (seen.has(hash)) { skipped.duplicateText++; continue }
  seen.add(hash)
  const when = published(r.published)
  const title = cleanTitle(r.title)
  const row = {
    company: String(r.firm).slice(0, 120),
    industry: INDUSTRY_OF[segmentOf.get(r.id)] || 'Other',
    report_type: reportType(title, r.url, r.posture),
    report_name: title,
    published_on: when.on,
    published_precision: when.precision,
    score: Math.round(r.score * 10) / 10,
    engine: r.engine,
    doc_hash: hash,
    source_url: r.url,
    origin: 'audit',
    claims: r.rendered?.stats?.claims ?? r.claims,
    flagged: r.rendered?.stats?.flagged ?? null,
  }
  if (!INDUSTRIES.includes(row.industry) || !REPORT_TYPES.includes(row.report_type)) throw new Error(`vocabulary: ${r.id}`)
  rows.push(row)
}

const COLS = ['company', 'industry', 'report_type', 'report_name', 'published_on', 'published_precision', 'score', 'engine', 'doc_hash', 'source_url', 'origin', 'claims', 'flagged']
// An entry already listed by the audit takes the new score and counts; a
// reader's own entry for the same report is left as it is.
const UPDATED = ['industry', 'report_type', 'report_name', 'published_on', 'published_precision', 'score', 'engine', 'source_url', 'claims', 'flagged']
const statement = (chunk) => `insert into public.list_entries (${COLS.join(', ')}) values\n` +
  chunk.map((x) => `  (${COLS.map((c) => (typeof x[c] === 'number' ? String(x[c]) : sq(x[c]))).join(', ')})`).join(',\n') +
  `\non conflict (doc_hash) do update set ${UPDATED.map((c) => `${c} = excluded.${c}`).join(', ')}\n  where list_entries.origin = 'audit';\n`
// Audit entries for reports that no longer get a score leave The List.
const prune = `delete from public.list_entries where origin = 'audit' and doc_hash not in (\n${rows.map((x) => `  ${sq(x.doc_hash)}`).join(',\n')}\n);\n`
mkdirSync(OUT, { recursive: true })
const head = `-- The corpus audit's entries for The List: ${rows.length} reports, engine ${rows[0]?.engine}.\n-- Run after docs/the-list.sql (version 2). Safe to run again: the audit's entries take these\n-- scores, readers' own entries are untouched, and audit entries no longer scored are removed.\n\n`
writeFileSync(join(OUT, 'list-load-all.sql'), head + prune + '\n' + Array.from({ length: Math.ceil(rows.length / 250) }, (_, i) => statement(rows.slice(i * 250, (i + 1) * 250))).join('\n'))
const tally = (k) => Object.entries(rows.reduce((m, x) => ({ ...m, [x[k]]: (m[x[k]] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])
console.log(`${rows.length} entries → checks/data/list/list-load-all.sql`, JSON.stringify(skipped))
console.log('industry', JSON.stringify(tally('industry')))
console.log('report type', JSON.stringify(tally('report_type')))
console.log('date', JSON.stringify(tally('published_precision')))
