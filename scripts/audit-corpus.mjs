// ─────────────────────────────────────────────────────────────────────────────
// Corpus audit: every document through the product, one ledger row each.
//
//   node --max-old-space-size=6144 scripts/audit-corpus.mjs --tag run1 [--shard 1/4] [--only <id>,<id>]
//   node scripts/audit-corpus.mjs --tag run1 --merge
//
// The documents: the AEC corpus (checks/data/aec, every manifest PDF), the gold
// corpus (fixtures/corpus.json), Fixture C and the one academic PDF not already
// in the gold corpus. Each runs the path the site runs:
//
//   upload  a PDF read as extractFileDocument reads it (column-aware pages, the
//           shared normalizer), the upload gate (validateText path 'file'), no
//           link. The primary run for every PDF: a reader can reproduce it on
//           the site by uploading the file.
//   link    reader text (fixtures/cache/<id>.raw.txt through readerBodyToText)
//           with the link as sourceUrl and fetchLink's gate (path 'link').
//   paste   committed text, normalizeText, the paste gate, no link.
//
// then BranchRoute's own gate (validateText), routeDocument, the detected genres
// composed by judgmentFor, classifyPosture on that rubric (RubricBranch), and
// analyze(text, rubric, posture, { sourceUrl }), as App.jsx does on "Run the
// analysis". Each AEC PDF also runs once as a link (its URL as sourceUrl, the
// PDF's own text), which is what the site does when the host lets the browser
// download the file; most hosts don't, and the site then reads Jina's text.
//
// Per document: a second identical run (determinism), and one run under each
// of the four base rubrics with that rubric's own posture (does the claim count
// move with the rubric?).
//
// Writes, all under checks/data/audit/ (gitignored: the repo is public):
//   ledger-<tag>.jsonl           one row per document (strings as rendered)
//   details-<tag>/<key>.json     the first 2,000 characters and every flagged or
//                                strong claim, for the one-by-one review
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, appendFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import { ROOT, loadCorpus, CACHE, COMMITTED } from '../checks/lib/corpus.mjs'
import { reconstructPage } from '../src/ingest/extractPdf.js'
import { normalizeText, normalizeDocument } from '../src/ingest/normalizer.js'
import { readerBodyToText } from '../src/ingest/fetchLink.js'
import { validateText } from '../src/ingest/validateText.js'
import { routeDocument } from '../src/rubrics/route.js'
import { judgmentFor, getRubric, RUBRIC_ORDER } from '../src/rubrics/index.js'
import { classifyPosture } from '../src/engine/classifyPosture.js'
import { analyze } from '../src/engine/analyze.js'
import { renderTop } from '../checks/lib/brief-top.mjs'

const arg = (name, dflt = null) => {
  const i = process.argv.indexOf(`--${name}`)
  return i < 0 ? dflt : process.argv[i + 1]
}
const TAG = arg('tag', 'run')
const OUT = join(ROOT, 'checks', 'data', 'audit')
const AEC = join(ROOT, 'checks', 'data', 'aec')
mkdirSync(OUT, { recursive: true })

let ENGINE = process.env.ENGINE_SHA || 'unknown'
if (!process.env.ENGINE_SHA) try { ENGINE = execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch {}

const sha = (s) => createHash('sha256').update(s).digest('hex')
export const keyOf = (id) => sha(id).slice(0, 16)

// ── the documents ────────────────────────────────────────────────────────────
export function listDocuments() {
  const docs = []
  const manifest = readdirSync(AEC).filter((f) => /^manifest-.*\.json$/.test(f)).sort()
    .flatMap((f) => JSON.parse(readFileSync(join(AEC, f), 'utf8')))
  for (const m of manifest) {
    docs.push({ id: `aec:${m.file.replace(/\.pdf$/i, '')}`, corpus: 'aec', url: m.url || '', title: m.title, firm: m.firm, segment: m.segment, published: m.published, mode: 'upload', pdf: join(AEC, 'reports', m.file), alsoLink: true })
  }
  for (const d of loadCorpus()) {
    const base = { id: `gold:${d.id}`, corpus: 'gold', url: d.url || '', title: d.id, gold: d.gold }
    if (d.source === 'reader') docs.push({ ...base, mode: 'link', readerIds: [join(COMMITTED, `${d.id}.raw.txt`), join(CACHE, `${d.id}.raw.txt`)] })
    else if (d.source === 'committed' && d.path.endsWith('.pdf')) docs.push({ ...base, mode: 'upload', pdf: join(ROOT, d.path) })
    else if (d.source === 'committed') docs.push({ ...base, mode: 'paste', txt: join(ROOT, d.path) })
    else docs.push({ ...base, mode: 'upload', pdf: join(CACHE, `${d.id}.pdf`), txtFallback: [join(COMMITTED, `${d.id}.txt`), join(CACHE, `${d.id}.txt`)] })
  }
  docs.push({ id: 'fixture:fixture-c-gensler-fandom-2026', corpus: 'fixture', url: '', title: 'Fixture C', mode: 'upload', pdf: join(ROOT, 'checks', 'data', 'fixtures', 'fixture-c-gensler-fandom-2026.pdf'), gold: { provenance: 'firm-vendor' } })
  docs.push({ id: 'academic:satish-ehp-2012', corpus: 'academic', url: 'https://ehp.niehs.nih.gov/doi/10.1289/ehp.1104789', title: 'satish-ehp-2012', mode: 'upload', pdf: join(ROOT, 'checks', 'data', 'academic', 'satish-ehp-2012.pdf'), gold: { provenance: 'peer-reviewed-journal' } })
  return docs
}

// ── reading, as the site reads ───────────────────────────────────────────────
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const lib = pdfjs.default || pdfjs
// Same key as scripts/weigh-folder.mjs, so its AEC text cache is reused.
const ingestKey = sha(['../src/ingest/extractPdf.js', '../src/ingest/normalizer.js'].map((p) => readFileSync(new URL(p, import.meta.url), 'utf8')).join('\0')).slice(0, 12)
const cacheDir = join(AEC, 'text-cache')

async function readPdf(path) {
  const bytes = readFileSync(path)
  const cached = join(cacheDir, `${sha(bytes).slice(0, 24)}-${ingestKey}.json`)
  if (existsSync(cached)) return JSON.parse(readFileSync(cached, 'utf8')).text
  const task = lib.getDocument({ data: new Uint8Array(bytes), useWorkerFetch: false, isEvalSupported: false, useSystemFonts: false, verbosity: 0 })
  const pdf = await task.promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) pages.push(reconstructPage((await (await pdf.getPage(i)).getTextContent()).items))
  const text = normalizeDocument(pages)
  await task.destroy()
  writeFileSync(cached, JSON.stringify({ text, pages: pages.length }))
  return text
}

export async function textOf(doc) {
  if (doc.mode === 'upload') {
    if (existsSync(doc.pdf)) return { text: await readPdf(doc.pdf) }
    for (const p of doc.txtFallback || []) if (existsSync(p)) return { text: readFileSync(p, 'utf8'), note: 'supplied text, no PDF' }
    return { missing: true }
  }
  if (doc.mode === 'link') {
    for (const p of doc.readerIds) if (existsSync(p)) return { text: readerBodyToText(readFileSync(p, 'utf8')) }
    return { missing: true }
  }
  if (!existsSync(doc.txt)) return { missing: true }
  return { text: normalizeText(readFileSync(doc.txt, 'utf8').trim()) }
}

// ── the site's gates and pipeline ────────────────────────────────────────────
// Landing page (upload: extractFileDocument's gate, then a non-empty check;
// link: fetchLink's; paste: the paste gate), then BranchRoute's validateText.
function gate(text, mode) {
  if (!text.trim()) return 'empty'
  const first = mode === 'upload' ? validateText(text, { path: 'file' }) : validateText(text, { path: mode })
  if (!first.ok && !(mode === 'upload' && first.reason === 'empty')) return first.reason
  const branch = validateText(text)
  return branch.ok ? null : branch.reason
}

export function siteRun(text, sourceUrl) {
  const route = routeDocument(text, { sourceUrl })
  const { rubric } = judgmentFor(route.profile.genre.roles, route.judgment.genres)
  const cls = classifyPosture(text, rubric)
  const result = analyze(text, rubric, cls.posture, { sourceUrl })
  return { route, rubric, cls, result }
}

// Everything Part 7 holds fixed, as one hash: per claim its tier, rung, flag and
// overreach distance, plus the score, rubric and posture.
export function engineSig({ rubric, cls, result }) {
  return sha(JSON.stringify({
    rubric: rubric.id, posture: cls.posture, score: result.documentScore.score,
    claims: result.claims.map((c) => [sha(c.text).slice(0, 10), c.tier.key, c.rung.key, c.flag, c.overreach ? c.overreach.distance : 0]),
    signals: (result.signals || []).map((s) => `${s.id}:${s.positive ? 'positive' : s.severity}`),
  })).slice(0, 24)
}

const compact = ({ rubric, cls, result }) => ({
  rubric: rubric.id, posture: cls.posture, claims: result.summary.totalClaims, strong: result.summary.strongClaims,
  flags: result.summary.flagCounts, score: result.documentScore.score,
})

function row(doc, text, run, again, note) {
  const { route, rubric, cls, result } = run
  const s = result.documentScore
  const byRubric = {}
  for (const id of RUBRIC_ORDER) {
    const r = getRubric(id)
    const p = classifyPosture(text, r)
    byRubric[id] = compact({ rubric: r, cls: p, result: analyze(text, r, p.posture, { sourceUrl: doc.mode === 'upload' || doc.mode === 'paste' ? '' : doc.url }) })
  }
  const claimCounts = [result.summary.totalClaims, ...Object.values(byRubric).map((x) => x.claims)]
  return {
    id: doc.id, key: keyOf(doc.id), corpus: doc.corpus, url: doc.url, title: doc.title, firm: doc.firm || null, published: doc.published || null,
    gold: doc.gold || null, mode: doc.mode, note: note || null, engine: ENGINE, status: 'ok',
    chars: text.length, words: (text.match(/\S+/g) || []).length, textSha: sha(text).slice(0, 24),
    rubric: { judgedAs: rubric.label, id: rubric.id, standard: rubric.base || rubric.id, hybrid: rubric.hybrid ? rubric.hybrid.scenarios.map((x) => x.id) : null, genres: route.judgment.genres, noun: rubric.documentNoun },
    posture: cls.posture, postureConfidence: cls.confidence, postureZeroSignal: !!cls.zeroSignal,
    roles: Object.fromEntries(Object.entries(route.profile.genre.roles).map(([k, v]) => [k, v ? v.kind : null])),
    provenance: result.profile.provenance.kind, design: result.profile.design.design,
    claims: result.summary.totalClaims, strong: result.summary.strongClaims, flags: result.summary.flagCounts,
    flaggedAtStandard: s.breakdown?.flaggedAtStandard ?? null,
    signals: (result.signals || []).map((g) => `${g.id}:${g.positive ? 'positive' : g.severity}`),
    references: result.references?.length || 0,
    score: s.score, display: s.display, band: s.band, breakdown: s.breakdown,
    rendered: renderTop(result, rubric),
    sig: engineSig(run),
    deterministic: engineSig(again) === engineSig(run),
    byRubric,
    claimCountVariesByRubric: new Set(claimCounts).size > 1,
  }
}

// The review's reading material: the head of the text and every flagged or
// strong claim, with what the engine read in it. Gitignored.
function details(doc, text, { result }) {
  const pick = result.claims
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.flag || c.overreach || c.tier.weight >= 3)
    .map(({ c, i }) => ({
      i, text: c.text, tier: c.tier.key, rung: c.rung.key, flag: c.flag, overreach: c.overreach ? c.overreach.distance : 0,
      fn: c.function, attribution: c.attribution?.label || c.attribution?.kind || null, citations: (c.citations || []).map((x) => x.type),
      link: c.evidence?.status || null, disclosed: !!c.disclosed,
    }))
  return { id: doc.id, url: doc.url, chars: text.length, head: text.slice(0, 2000), tail: text.slice(-600), claims: result.claims.length, picked: pick }
}

// ── run ──────────────────────────────────────────────────────────────────────
async function main() {
  if (process.argv.includes('--merge')) return merge()
  const [k, n] = (arg('shard', '1/1')).split('/').map(Number)
  const only = arg('only') ? new Set(arg('only').split(',')) : null
  const all = listDocuments().filter((d) => !only || only.has(d.id))
  const mine = all.filter((_, i) => i % n === k - 1)
  const ledger = join(OUT, `ledger-${TAG}.shard-${k}.jsonl`)
  const detailDir = join(OUT, `details-${TAG}`)
  mkdirSync(detailDir, { recursive: true })
  // Resume: rows already written stay.
  const done = new Set(existsSync(ledger) ? readFileSync(ledger, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).id) : [])
  let i = 0
  for (const doc of mine) {
    i++
    if (done.has(doc.id)) continue
    const t0 = Date.now()
    let out
    try {
      const got = await textOf(doc)
      if (got.missing) out = { id: doc.id, key: keyOf(doc.id), corpus: doc.corpus, url: doc.url, title: doc.title, mode: doc.mode, engine: ENGINE, status: 'missing' }
      else {
        const text = got.text
        const sourceUrl = doc.mode === 'link' ? doc.url : ''
        const refused = gate(text, doc.mode)
        if (refused) out = { id: doc.id, key: keyOf(doc.id), corpus: doc.corpus, url: doc.url, title: doc.title, mode: doc.mode, engine: ENGINE, status: refused, chars: text.length, words: (text.match(/\S+/g) || []).length, textSha: sha(text).slice(0, 24) }
        else {
          const run = siteRun(text, sourceUrl)
          const again = siteRun(text, sourceUrl)
          out = row(doc, text, run, again, got.note)
          if (doc.alsoLink && doc.url) {
            const lg = gate(text, 'link')
            if (lg) out.link = { status: lg }
            else {
              const lr = siteRun(text, doc.url)
              out.link = { status: 'ok', judgedAs: lr.rubric.label, ...compact(lr), sig: engineSig(lr) }
            }
          }
          writeFileSync(join(detailDir, `${out.key}.json`), JSON.stringify(details(doc, text, run)))
        }
      }
    } catch (e) {
      out = { id: doc.id, key: keyOf(doc.id), corpus: doc.corpus, url: doc.url, mode: doc.mode, engine: ENGINE, status: 'error', reason: String(e?.stack || e).slice(0, 400) }
    }
    out.ms = Date.now() - t0
    appendFileSync(ledger, JSON.stringify(out) + '\n')
    if (i % 25 === 0 || out.status !== 'ok') console.log(`[${k}/${n}] ${i}/${mine.length} ${doc.id} ${out.status} ${out.score ?? ''}`)
  }
  console.log(`[${k}/${n}] done: ${mine.length}`)
}

function merge() {
  const rows = readdirSync(OUT).filter((f) => f.startsWith(`ledger-${TAG}.shard-`)).flatMap((f) => readFileSync(join(OUT, f), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)))
  const order = new Map(listDocuments().map((d, i) => [d.id, i]))
  rows.sort((a, b) => order.get(a.id) - order.get(b.id))
  writeFileSync(join(OUT, `ledger-${TAG}.jsonl`), rows.map((r) => JSON.stringify(r)).join('\n') + '\n')
  const st = {}
  for (const r of rows) st[r.status] = (st[r.status] || 0) + 1
  console.log(`${rows.length} rows`, st)
}

if (fileURLToPath(import.meta.url) === process.argv[1]) await main()
