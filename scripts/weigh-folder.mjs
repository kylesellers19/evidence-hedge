// ─────────────────────────────────────────────────────────────────────────────
// Weigh a folder of downloaded PDFs the way the app would, and look for places
// where the engine's output is inconsistent.
//
//   node scripts/weigh-folder.mjs <data-dir>
//
// <data-dir> holds manifest-*.json files (arrays of { file, firm, segment,
// title, published, url }) and the PDFs under <data-dir>/reports/. Each PDF is
// read exactly as an upload is (column-aware pages, then the shared document
// normalizer), routed to its detected genres and posture, and analyzed twice:
//   · link   — sourceUrl = the PDF's URL, as when a person pastes the link
//   · upload — no sourceUrl, as when a person uploads the downloaded file
// and a third time in link mode to confirm the result is deterministic.
//
// Writes <data-dir>/results/results.json (everything, including verbatim
// example lines — keep it out of the public repo), results.csv (one row per
// report) and prints a summary. Downloaded files are data: nothing in them is
// executed, and this script lives outside the download folder.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import { reconstructPage } from '../src/ingest/extractPdf.js'
import { normalizeDocument } from '../src/ingest/normalizer.js'
import { validateText } from '../src/ingest/validateText.js'
import { routeDocument } from '../src/rubrics/route.js'
import { analyze } from '../src/engine/analyze.js'

const dir = resolve(process.argv[2] || '')
if (!process.argv[2] || !existsSync(dir)) {
  console.error('usage: node scripts/weigh-folder.mjs <data-dir>')
  process.exit(2)
}
const outDir = join(dir, 'results')
mkdirSync(outDir, { recursive: true })

const manifest = readdirSync(dir)
  .filter((f) => /^manifest-.*\.json$/.test(f))
  .flatMap((f) => {
    try { return JSON.parse(readFileSync(join(dir, f), 'utf8')) } catch (e) { console.error(`skip ${f}: ${e.message}`); return [] }
  })

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const lib = pdfjs.default || pdfjs

// Extracted text is cached under <data-dir>/text-cache, keyed by the PDF's bytes
// and the ingest code that read it, so a rerun after an engine change skips
// reading the PDFs again. A change to the ingest code makes new keys.
const ingestKey = createHash('sha256')
  .update(['../src/ingest/extractPdf.js', '../src/ingest/normalizer.js'].map((p) => readFileSync(new URL(p, import.meta.url), 'utf8')).join('\0'))
  .digest('hex').slice(0, 12)
const cacheDir = join(dir, 'text-cache')
mkdirSync(cacheDir, { recursive: true })

async function readPdf(path) {
  const bytes = readFileSync(path)
  const cached = join(cacheDir, `${createHash('sha256').update(bytes).digest('hex').slice(0, 24)}-${ingestKey}.json`)
  if (existsSync(cached)) return JSON.parse(readFileSync(cached, 'utf8'))
  const task = lib.getDocument({ data: new Uint8Array(bytes), useWorkerFetch: false, isEvalSupported: false, useSystemFonts: false, verbosity: 0 })
  const pdf = await task.promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    pages.push(reconstructPage((await page.getTextContent()).items))
  }
  const out = { text: normalizeDocument(pages), pages: pdf.numPages }
  await task.destroy()
  writeFileSync(cached, JSON.stringify(out))
  return out
}

const words = (t) => (t.match(/\S+/g) || []).length

function weigh(text, sourceUrl) {
  const route = routeDocument(text, { sourceUrl })
  const r = analyze(text, route.judgment.rubric, route.posture, { sourceUrl })
  const s = r.documentScore
  return {
    judgedAs: route.judgment.rubric.label,
    standard: route.judgment.standard,
    hybrid: route.judgment.hybrid ? route.judgment.scenarios.map((x) => x.id).join('+') : null,
    genres: route.judgment.genres,
    posture: route.posture,
    roles: Object.fromEntries(Object.entries(route.profile.genre.roles).map(([k, v]) => [k, v ? v.kind : null])),
    provenance: r.profile?.provenance?.kind,
    design: r.profile?.design?.design,
    designInherited: !!r.profile?.design?.inherited,
    claims: r.summary.totalClaims,
    strong: r.summary.strongClaims,
    flags: r.summary.flagCounts,
    signals: (r.signals || []).map((g) => `${g.id}:${g.positive ? 'positive' : g.severity}`),
    references: r.references?.length || 0,
    score: s.score,
    band: s.band,
    verdict: s.summary,
    headline: r.summary.verdict,
    breakdown: s.breakdown,
    examples: Object.fromEntries((r.patterns || []).map((p) => [p.key, (p.examples || []).slice(0, 3).map((e) => (typeof e === 'string' ? e : e.text))])),
  }
}

const results = []
for (const [i, m] of manifest.entries()) {
  const path = join(dir, 'reports', m.file)
  const base = { ...m, id: m.file.replace(/\.pdf$/i, '') }
  process.stdout.write(`[${i + 1}/${manifest.length}] ${m.file} … `)
  if (!existsSync(path)) { results.push({ ...base, status: 'missing' }); console.log('missing'); continue }
  const t0 = Date.now()
  try {
    const { text, pages } = await readPdf(path)
    const check = validateText(text, { path: 'file' })
    const n = words(text)
    if (!check.ok || n < 150) {
      // A refusal other than an empty or near-empty text keeps its own reason.
      const status = check.ok || check.reason === 'empty' ? 'no-text' : check.reason
      results.push({ ...base, status, pages, words: n, reason: check.ok ? 'under 150 words: likely scanned or image-only' : check.reason, detail: check.detail })
      console.log(`${status} (${n} words over ${pages} pages)`)
      continue
    }
    const link = weigh(text, m.url || '')
    const upload = weigh(text, '')
    const again = weigh(text, m.url || '')
    results.push({
      ...base,
      status: 'ok',
      bytes: statSync(path).size,
      pages,
      words: n,
      textSha: createHash('sha256').update(text).digest('hex'),
      link,
      upload,
      deterministic: again.score === link.score && JSON.stringify(again.flags) === JSON.stringify(link.flags),
      ms: Date.now() - t0,
    })
    console.log(`${link.score} (${link.judgedAs}${link.hybrid ? ' · ' + link.hybrid : ''}) upload ${upload.score} · ${link.claims} claims · ${Date.now() - t0} ms`)
  } catch (e) {
    results.push({ ...base, status: 'error', reason: String(e?.message || e).slice(0, 200) })
    console.log(`error: ${String(e?.message || e).slice(0, 120)}`)
  }
}

// The commit whose engine produced these scores (as the app's footer names it).
// ENGINE_SHA names it when the engine runs from an extracted tree with no git.
let engine = process.env.ENGINE_SHA || 'unknown'
if (!process.env.ENGINE_SHA) try { engine = execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch {}
writeFileSync(join(outDir, 'results.json'), JSON.stringify({ generated: new Date().toISOString(), engine, count: results.length, results }, null, 1))

const cols = ['segment', 'firm', 'title', 'published', 'status', 'pages', 'words', 'score_link', 'score_upload', 'band', 'judged_as', 'hybrid', 'posture', 'provenance', 'design', 'claims', 'strong', 'unsupported', 'overconfident', 'overreach', 'signals', 'url']
const esc = (v) => (v === null || v === undefined ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
const rows = results.map((r) => {
  const l = r.link || {}
  return [r.segment, r.firm, r.title, r.published, r.status, r.pages, r.words, l.score, r.upload?.score, l.band, l.judgedAs, l.hybrid, l.posture, l.provenance, l.design, l.claims, l.strong,
    l.flags?.['unsupported-assertion'], l.flags?.overconfident, l.flags?.['causal-overreach'], (l.signals || []).join(' '), r.url].map(esc).join(',')
})
writeFileSync(join(outDir, 'results.csv'), [cols.join(','), ...rows].join('\n') + '\n')

const ok = results.filter((r) => r.status === 'ok')
const statuses = [...new Set(results.map((r) => r.status))].filter((s) => s !== 'ok')
console.log(`\n${ok.length} weighed, ${results.length - ok.length} not (${statuses.map((s) => `${results.filter((r) => r.status === s).length} ${s}`).join(', ') || 'none'})`)
console.log(`results: ${join(outDir, 'results.json')}`)
