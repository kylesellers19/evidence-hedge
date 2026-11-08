// ─────────────────────────────────────────────────────────────────────────────
// node checks/linkage.test.mjs — change set 4: evidence linkage.
//
//   1. Every claim on the corpus and Fixtures A–C carries evidence: a status, its
//      links (each with a basis, anchor, target and confidence), the bases it
//      tried, and a reason when unlinked or undetermined. Flagged claims carry
//      the same object on their explanation, so an unflagged-by-linkage claim
//      says "unlinked" instead of reading as unsourced.
//   2. Fixture C: "Our pre-World Cup survey data shows that 9 of 10
//      respondents…" links to the report's own survey, by section scope or caption.
//   3. Markers resolve to reference entries where a list exists; a marker with
//      no matching entry is an unresolved-marker link, never dropped.
//   4. Reports link counts per basis against checks/cs4-predictions.json, and the
//      share of links resting on proximity (before: 1.0, every link was
//      same-sentence), into checks/reports/links-<engine commit>.json. A
//      mismatch is reported there and in the completion report; it does not
//      fail this check.
//   5. Superscript markers, as PDF ingest keeps them inline ("workers⁷"):
//      against a numbered reference list they are citation markers and the
//      sentence reads as cited; with no list they make no link and leave the
//      sentence's attribution alone. A numbered entry keeps its number.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadCorpus, loadDocText } from './lib/corpus.mjs'
import { FIXTURES, runFixture } from './lib/fixtures.mjs'
import { engineCommit } from './lib/engine-rows.mjs'
import { routeDocument } from '../src/rubrics/route.js'
import { analyze } from '../src/engine/analyze.js'
import { LINK_BASES } from '../src/engine/linkEvidence.js'
import { getRubric } from '../src/rubrics/index.js'
import { splitSentences } from '../src/engine/extractClaims.js'
import { segmentDocument } from '../src/engine/measure/segment.js'
import { parseReferences } from '../src/engine/references.js'

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS ✅' : 'FAIL ❌'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) failed++
}

function wellFormed(id, a) {
  const bad = a.claims.filter((c) => {
    const e = c.evidence
    if (!e || !['linked', 'unlinked', 'undetermined'].includes(e.status) || !Array.isArray(e.links) || !Array.isArray(e.tried)) return true
    if (e.status !== 'linked' && !e.reason) return true
    if (e.status === 'unlinked' && e.links.length) return true
    if (e.links.some((l) => !LINK_BASES.includes(l.basis) || !l.target?.kind || !['high', 'low'].includes(l.confidence) || typeof l.anchor !== 'string')) return true
    if (c.explanation && c.explanation.evidence !== e) return true
    if (c.overreach && c.overreach.explanation.evidence !== e) return true
    return false
  })
  check(`every claim carries evidence, explanations carry it [${id}]`, bad.length === 0, bad.length ? `${bad.length} malformed, first: "${bad[0].text.slice(0, 60)}"` : `${a.claims.length} claims`)
}

for (const doc of loadCorpus()) {
  const loaded = await loadDocText(doc)
  if (loaded.status !== 'ok') { console.log(`SKIP ${doc.id} — ${loaded.reason}`); continue }
  const route = routeDocument(loaded.text, { sourceUrl: doc.url || '' })
  wellFormed(doc.id, analyze(loaded.text, route.judgment.rubric, route.posture, { sourceUrl: doc.url || '' }))
}

// 5. Superscript markers (synthetic documents)
{
  const filler = Array.from({ length: 40 }, (_, i) => `Office layouts vary widely across the ${i + 1} sites that were visited during the year.`).join(' ')
  const refs = Array.from({ length: 8 }, (_, i) => `${i + 1}. Author${String.fromCharCode(65 + i)}, J. K. A study of offices number ${i + 1}. Journal of Buildings ${10 + i}, 1–9 (20${10 + i}).`).join(' ')
  const cited = `${filler}\n\nOpen-plan offices reduce sustained focus among knowledge workers⁷. ${filler}\n\nReferences ${refs}`
  const entries = parseReferences(segmentDocument(cited).references)
  check('a numbered reference entry keeps its number ("1. Surname, J. K.")', entries.length === 8 && entries.every((e, i) => e.number === i + 1), JSON.stringify(entries.map((e) => e.number)))
  const a = analyze(cited, getRubric('research'), 'standard')
  const c = a.claims.find((x) => x.text.includes('focus among knowledge workers'))
  const link = c?.evidence.links.find((l) => l.basis === 'marker')
  check('a superscript marker resolves against a numbered reference list', link?.target.kind === 'reference' && entries[link.target.index]?.number === 7, JSON.stringify(link))
  check('…and the sentence reads as citing other work', c?.attribution.label === 'cited-other', c?.attribution.label)

  const noted = `${filler}\n\nMost workers have heard about artificial intelligence in their jobs.¹ The share who use it every day rose sharply this year. ${filler}`
  check('splitSentences keeps the boundary after a superscript marker', splitSentences(noted).some((x) => x.endsWith('in their jobs.¹')))
  const b = analyze(noted, getRubric('research'), 'standard')
  const n = b.claims.find((x) => x.text.includes('in their jobs.¹'))
  check('with no reference or notes list a superscript makes no link', !!n && !n.evidence.links.length && n.attribution.label !== 'cited-other', n ? `${n.evidence.status}, ${n.attribution.label}` : 'claim not found')
}

const PRED = JSON.parse(readFileSync(join(ROOT, 'checks', 'cs4-predictions.json'), 'utf8')).predictions
const inRange = (v, r) => Array.isArray(r) ? v >= r[0] && v <= r[1] : v === r
const commit = engineCommit()
const report = { engine_commit: commit, label_tier: 'predicted', source: 'fixtures A–C', split: 'fixture', fixtures: {} }
const mismatches = []

for (const f of FIXTURES) {
  const run = await runFixture(f)
  if (run.status !== 'ok') { console.log(`SKIP ${f.id} — ${run.reason}`); continue }
  const a = run.analysis
  wellFormed(f.id, a)
  const per = Object.fromEntries(LINK_BASES.map((b) => [b, 0]))
  let links = 0, markers = 0, resolved = 0, unresolved = 0
  const status = { linked: 0, unlinked: 0, undetermined: 0 }
  for (const c of a.claims) {
    status[c.evidence.status]++
    for (const l of c.evidence.links) {
      per[l.basis]++; links++
      if (l.basis === 'marker') { markers++; if (l.target.kind === 'reference') resolved++; else unresolved++ }
    }
  }
  const n = a.claims.length
  const row = {
    claims: n, rows: n, linksPerBasis: per, links,
    markersResolved: markers ? +(resolved / markers).toFixed(3) : null, unresolvedMarkers: unresolved,
    proximityShare: { before: 1, after: links ? +(per.proximity / links).toFixed(3) : null },
    status, unlinkedShare: +(status.unlinked / n).toFixed(3),
    flags: a.summary.flagCounts, score: a.documentScore.score,
  }
  report.fixtures[f.id] = row
  const compare = (name, value, range) => { if (range != null && value != null && !inRange(value, range)) mismatches.push(`${f.id} ${name}: predicted ${JSON.stringify(range)}, actual ${value}`) }
  for (const b of LINK_BASES) compare(`links.${b}`, per[b], PRED.linksPerBasis[f.id]?.[b])
  compare('markersResolved', row.markersResolved, PRED.markersResolved[f.id])
  compare('proximityShare', row.proximityShare.after, PRED.proximityShare.after[f.id])
  compare('unlinkedShare', row.unlinkedShare, PRED.unlinkedShare[f.id])
  for (const [k, v] of Object.entries(a.summary.flagCounts)) compare(`flags.${k}`, v, PRED.flagCounts[f.id]?.[k])
  compare('score', a.documentScore.score, PRED.score[f.id])

  // 3 — markers on a document with a reference list
  if (f.label === 'A') {
    check('fixture A: author-year markers resolve to reference entries', resolved > 0, `${resolved} of ${markers} resolved`)
    check('fixture A: unresolved markers are kept as links', unresolved === markers - resolved, `${unresolved} unresolved-marker links`)
  }
  // 2 — the handoff's check claim
  if (f.label === 'C') {
    const c = a.claims.find((x) => x.text.includes('9 of 10 respondents are open'))
    const own = c?.evidence.links.find((l) => ['section-scope', 'caption'].includes(l.basis) && l.target.kind === 'own-study')
    check("fixture C: 'Our pre-World Cup survey data shows that 9 of 10 respondents…' links to the report's own survey", !!own, own ? `by ${own.basis} → ${own.target.design}` : JSON.stringify(c?.evidence))
  }
}

report.mismatches = mismatches
mkdirSync(join(ROOT, 'checks', 'reports'), { recursive: true })
writeFileSync(join(ROOT, 'checks', 'reports', `links-${commit}.json`), JSON.stringify(report, null, 2) + '\n')
console.log(`\nlink counts vs predictions: ${mismatches.length} mismatch(es)${mismatches.length ? '\n  ' + mismatches.join('\n  ') : ''}`)
console.log(`→ checks/reports/links-${commit}.json`)

if (failed) { console.error(`\n${failed} linkage check(s) failed.`); process.exit(1) }
console.log('\nLinkage checks passed.')
