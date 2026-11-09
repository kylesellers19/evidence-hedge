// ─────────────────────────────────────────────────────────────────────────────
// The top of the evidence brief, and every number's link to its definition.
//
//   1. The headline's counts reconcile with the stats row: "F of N claims…"
//      names the stats row's flagged and weighed counts, and unsupported +
//      overconfident + overreach − (claims with two flags) = flagged. Run on
//      every gold-corpus document and Fixture C, and on every row of the latest
//      corpus-audit ledger that records the new top (checks/data/audit/, when
//      present; it is gitignored).
//   2. Every rendered score links to /method#score-N for its N: the verdict
//      mark, rendered to markup for every score; The List and the add-to-list
//      panel, read from source.
//   3. Every anchor a brief links to exists on the Method page, rendered to
//      markup: #score-1 … #score-10, the count labels, each flag type, each
//      document signal any standard or hybrid can raise, each standard.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { ROOT, loadCorpus, loadDocText } from './lib/corpus.mjs'
import { loadFixture, FIXTURES } from './lib/fixtures.mjs'
import { routeDocument } from '../src/rubrics/route.js'
import { judgmentFor } from '../src/rubrics/index.js'
import { analyze } from '../src/engine/analyze.js'
import { briefTop, ANCHORS, scoreAnchor, standardAnchor } from '../src/components/results/briefTop.js'
import { RUBRIC_ORDER, getRubric, HYBRIDS } from '../src/rubrics/index.js'
import { FLAG_ORDER } from '../src/engine/patterns.js'

let ok = true
const log = (label, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`) }

// ── 1. reconciliation ────────────────────────────────────────────────────────
function reconciles(top) {
  const st = top.stats
  const h = top.headline
  const sum = st.unsupported + st.overconfident + st.overreach - st.twoFlags === st.flagged
  let head
  if (/no expert claims|speaks from experience/.test(h)) head = st.flagged === 0
  else if (st.claims === 0) head = /no claims/.test(h)
  else if (st.flagged === 0) head = st.claims === 1 ? /^Its one claim stays/.test(h) : h.startsWith(`All ${st.claims} claims stay`)
  else if (st.flagged === st.claims) head = st.claims === 1 ? /^Its one claim says/.test(h) : h.startsWith(`All ${st.claims} claims say`)
  else head = h.startsWith(`${st.flagged} of ${st.claims} claims`)
  const breakdown = st.flagged === 0 ? top.breakdown === null : top.breakdown.startsWith(`Of the ${st.flagged} flagged,`)
  return { sum, head, breakdown, all: sum && head && breakdown }
}

const runs = []
for (const doc of loadCorpus()) {
  const loaded = await loadDocText(doc)
  if (loaded.status !== 'ok') { console.log(`SKIP ${doc.id} — ${loaded.reason}`); continue }
  runs.push({ id: doc.id, text: loaded.text, sourceUrl: doc.url || '' })
}
for (const f of FIXTURES.filter((x) => !x.corpusId)) {
  const loaded = await loadFixture(f)
  if (loaded.status !== 'ok') { console.log(`SKIP ${f.id} — ${loaded.reason}`); continue }
  runs.push({ id: f.id, text: loaded.text, sourceUrl: loaded.sourceUrl || '' })
}
let bad = []
for (const r of runs) {
  const route = routeDocument(r.text, { sourceUrl: r.sourceUrl })
  const { rubric } = judgmentFor(route.profile.genre.roles, route.judgment.genres)
  const top = briefTop(analyze(r.text, rubric, route.posture, { sourceUrl: r.sourceUrl }), rubric)
  if (!reconciles(top).all) bad.push(`${r.id}: ${top.headline} | ${JSON.stringify(top.stats)}`)
}
log(`headline counts reconcile with the stats row on ${runs.length} corpus and fixture documents`, bad.length === 0, bad.slice(0, 3).join(' · '))

// The latest corpus-audit ledger that records the new top (gitignored).
const AUDIT = join(ROOT, 'checks', 'data', 'audit')
const ledgers = existsSync(AUDIT) ? readdirSync(AUDIT).filter((f) => /^ledger-[^.]+\.jsonl$/.test(f)).sort() : []
const withTop = ledgers.map((f) => ({ f, rows: readFileSync(join(AUDIT, f), 'utf8').trim().split('\n').map((l) => JSON.parse(l)) }))
  .filter(({ rows }) => rows.some((r) => r.rendered?.stats?.flagged !== undefined && r.rendered?.breakdown !== undefined))
if (withTop.length) {
  const { f, rows } = withTop[withTop.length - 1]
  const scored = rows.filter((r) => r.status === 'ok')
  bad = scored.filter((r) => !reconciles(r.rendered).all).map((r) => r.id)
  log(`headline counts reconcile with the stats row on every corpus-audit document (${f})`, bad.length === 0, `${scored.length - bad.length}/${scored.length}${bad.length ? ' · ' + bad.slice(0, 3).join(', ') : ''}`)
} else console.log('SKIP corpus-audit ledger — none records the new brief top (run scripts/audit-corpus.mjs)')

// ── render components to markup (esbuild bundles JSX for Node) ──────────────
// The bundle sits under node_modules/.cache so React and the router load from
// node_modules as themselves (packages stay external).
const tmp = join(ROOT, 'node_modules', '.cache', 'eh-brief-top')
mkdirSync(tmp, { recursive: true })
async function bundle(entry, name) {
  const out = join(tmp, `${name}.mjs`)
  await build({
    stdin: { contents: entry, resolveDir: ROOT, loader: 'jsx' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic',
    loader: { '.css': 'empty', '.json': 'json' }, logLevel: 'error',
    define: { 'import.meta.env.BASE_URL': '"/"' },
    packages: 'external',
  })
  return import(pathToFileURL(out).href)
}
const { renderMark, renderMethod } = await bundle(`
  import React from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { MemoryRouter } from 'react-router-dom'
  import VerdictMark from './src/components/results/VerdictMark.jsx'
  import MethodPage from './src/pages/MethodPage.jsx'
  const wrap = (el) => renderToStaticMarkup(React.createElement(MemoryRouter, null, el))
  export const renderMark = (score) => wrap(React.createElement(VerdictMark, { score, rubricId: 'corporate' }))
  export const renderMethod = () => wrap(React.createElement(MethodPage))
`, 'render')

// ── 2. every rendered score links to its definition ─────────────────────────
const markBad = []
for (let s = 1; s <= 10; s += 0.1) {
  const score = Math.round(s * 10) / 10
  const display = Math.round(score)
  const html = renderMark({ score, display, band: 'mixed', summary: 'x' })
  if (!html.includes(`href="/method#score-${display}"`)) markBad.push(score)
}
log('the verdict mark links every score 1.0 to 10.0 to /method#score-N for its shown N', markBad.length === 0, markBad.slice(0, 5).join(', '))
const unscored = renderMark({ score: null, display: null, band: 'unscored', summary: 'x' })
log('no score, no score link', !/method#score-/.test(unscored))

// The List and the add-to-list panel: every place a score is printed links.
const SOURCES = ['src/pages/ListPage.jsx', 'src/components/results/AddToList.jsx']
for (const p of SOURCES) {
  const src = readFileSync(join(ROOT, p), 'utf8')
  const printed = [...src.matchAll(/(?<!\$)\{score\.toFixed\(1\)\}/g)].length // printed, not inside a template string
  const linked = [...src.matchAll(/scoreAnchor\(Math\.round\(score\)\)\}`\}[^>]*>\{score\.toFixed\(1\)\}/g)].length
    + [...src.matchAll(/scoreAnchor\(shown\)\}`\}[^>]*>\{score\.toFixed\(1\)\}/g)].length
  log(`${p}: every printed score links to its definition`, printed > 0 && linked === printed, `${linked}/${printed}`)
}

// ── 3. every anchor a brief links to exists on Method ───────────────────────
const method = renderMethod()
const ids = new Set([...method.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
const dup = [...method.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).filter((id, i, all) => all.indexOf(id) !== i)
log('Method has #score-1 through #score-10', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every((n) => ids.has(scoreAnchor(n))), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((n) => !ids.has(scoreAnchor(n))).join(' '))
const counts = [ANCHORS.readAs, ANCHORS.claims, ANCHORS.strong, ANCHORS.flagged, ANCHORS.strictest]
log('Method has an anchor for every count label', counts.every((a) => ids.has(a)), counts.filter((a) => !ids.has(a)).join(' '))
log('Method has an anchor for every flag type', FLAG_ORDER.every((k) => ids.has(ANCHORS.flag(k))), FLAG_ORDER.filter((k) => !ids.has(ANCHORS.flag(k))).join(' '))
const signalIds = [...new Set([...RUBRIC_ORDER.flatMap((id) => getRubric(id).documentSignals), ...HYBRIDS.flatMap((h) => h.audits)])]
log('Method has an anchor for every document signal', signalIds.every((id) => ids.has(ANCHORS.signal(id))), signalIds.filter((id) => !ids.has(ANCHORS.signal(id))).join(' '))
log('Method has an anchor for every standard', RUBRIC_ORDER.every((id) => ids.has(standardAnchor(id))), RUBRIC_ORDER.filter((id) => !ids.has(standardAnchor(id))).join(' '))
log('no anchor is used twice on Method', dup.length === 0, dup.join(' '))

rmSync(tmp, { recursive: true, force: true })
if (!ok) { console.error('\nbrief-top checks failed.'); process.exit(1) }
console.log('\nAll brief-top checks passed.')
process.exit(0)
