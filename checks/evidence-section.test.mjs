// ─────────────────────────────────────────────────────────────────────────────
// node checks/evidence-section.test.mjs — the evidence section
// (src/engine/evidenceSection.js, docs/evidence-section.md) reads the analysis
// through four plain verdicts and judges nothing of its own.
//
// On every corpus document whose text is present (a missing one is a SKIP):
//   1. every claim gets one verdict, read from the engine: fact ⇔ unsupported-
//      assertion; overstates ⇔ overconfident or causal overreach; method; then
//      backed ⇔ rung rank > 0, cautious ⇔ rank 0; the counts add up
//   2. "need checking" is fact plus overstates
//   3. building the section changes nothing in the analysis; the same input
//      gives the same section
//   4. every reason line is 12 words or fewer, and nothing a reader sees uses
//      a word the rules keep off the page (reach, carry, rung, tier, ground,
//      grade, ceiling, posture, outrun, "the engine", ditto marks …)
//   5. underlines sit inside the claim, in order, and only on claims that need
//      checking
//   6. at most six claims to check first, each one needing checking
//   7. every judged claim sits in exactly one part, parts in document order
//   8. at most eight source rows, "Nothing" last; rows add up to the judged
//      claims and each row's verdicts add up to the row
// On the benchmark fixtures (checks/lib/fixtures.mjs) that load:
//   9. a PDF's claims all land on one of its pages
//  10. the brief records the section with no document text left readable
// Against recorded numbers:
//  11. Fixture A's frozen text equals the build target's recorded engine
//      output (checks/targets/evidence-section-fixture-a.json, from the design
//      brief). The brief recorded fixtures/cadre-neuroarchitecture-normalized.txt,
//      extracted before the column fix (5f24dfc); Fixture A itself now reads the
//      PDF as an upload, and is held by 12
//  12. counts and rows equal checks/targets/evidence-section.json for each
//      document it lists. A change that moves them on purpose re-records:
//        node checks/evidence-section.test.mjs --write
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadCorpus, loadDocText } from './lib/corpus.mjs'
import { FIXTURES, runFixture } from './lib/fixtures.mjs'
import { engineCommit } from './lib/engine-rows.mjs'
import { briefOf, redact } from './lib/brief.mjs'
import { routeDocument } from '../src/rubrics/route.js'
import { analyze } from '../src/engine/analyze.js'
import { buildEvidenceSection, VERDICTS, REASON_WORDS } from '../src/engine/evidenceSection.js'

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS ✅' : 'FAIL ❌'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) failed++
}

const TARGETS = join(ROOT, 'checks', 'targets', 'evidence-section.json')
const REFERENCE_A = join(ROOT, 'checks', 'targets', 'evidence-section-fixture-a.json')
const REFERENCE_A_TEXT = join(ROOT, 'fixtures', 'cadre-neuroarchitecture-normalized.txt')
const WRITE = process.argv.includes('--write')
const BANNED = /\b(?:reach(?:es)?|carr(?:y|ies)|rung|tiers?|ground|grades?|ceiling|posture|outruns?|whose finding|the engine|stated past|linked|loose|presumed)\b|″|^(?:From|Via|To)$/i
const LETTER = { backed: 'b', overstates: 'o', fact: 'f', cautious: 'h', method: 'm' }
const recordOf = (s) => (s.gated ? { gated: true } : {
  counts: s.counts,
  rows: s.sources.rows.map((r) => [r.label, r.backed, r.overstates, r.fact, r.cautious]),
  checkFirst: s.checkFirst,
})
const recorded = {}

const expected = (c) => (c.flag === 'unsupported-assertion' ? 'fact'
  : c.flag === 'overconfident' || c.overreach ? 'overstates'
    : c.function === 'method' ? 'method'
      : c.rung.rank > 0 ? 'backed' : 'cautious')

let ran = 0
for (const doc of loadCorpus()) {
  const loaded = await loadDocText(doc)
  if (loaded.status !== 'ok') { console.log(`SKIP ${doc.id} — ${loaded.reason}`); continue }
  ran++
  const id = doc.id
  const sourceUrl = doc.url || ''
  const route = routeDocument(loaded.text, { sourceUrl })
  const rubric = route.judgment.rubric
  const result = analyze(loaded.text, rubric, route.posture, { sourceUrl })
  const before = JSON.stringify(result)
  const s = buildEvidenceSection(result, rubric)
  recorded[id] = recordOf(s)
  if (s.gated) { check(`gated: one sentence [${id}]`, typeof s.sentence === 'string' && !s.claims); continue }

  // 1
  const wrong = s.claims.filter((c) => c.verdict !== expected(result.claims[c.index]))
  const sum = Object.values(s.counts).reduce((a, b) => a + b, 0)
  check(`one verdict each, read from the engine [${id}]`, wrong.length === 0 && sum === result.claims.length && s.claims.length === result.claims.length,
    `${result.claims.length} claims, ${wrong.length} differ`)

  // 2
  const flagged = result.claims.filter((c) => c.flag || c.overreach).length
  check(`need checking is fact plus overstates [${id}]`, s.needs === s.counts.fact + s.counts.overstates && s.needs === flagged, `${s.needs} vs ${flagged}`)

  // 3
  check(`the analysis is unchanged; same input, same section [${id}]`,
    JSON.stringify(result) === before && JSON.stringify(buildEvidenceSection(result, rubric)) === JSON.stringify(s))

  // 4
  const long = s.claims.filter((c) => c.reason.split(/\s+/).length > REASON_WORDS)
  const shown = [s.dek, s.methods, ...VERDICTS.flatMap((v) => [v.label, ...v.bar]), ...s.claims.map((c) => c.reason),
    ...s.where.places.map((p) => p.label), ...s.sources.rows.flatMap((r) => [r.label, r.sub])].filter(Boolean)
  const banned = shown.filter((t) => BANNED.test(t))
  check(`reasons ≤ ${REASON_WORDS} words; no kept-off word shown [${id}]`, long.length === 0 && banned.length === 0,
    [...long.slice(0, 2).map((c) => c.reason), ...banned.slice(0, 2)].join(' | '))

  // 5
  const badMarks = s.claims.filter((c) => (!c.needs && c.underline.length)
    || c.underline.some(([a, b], k) => a < 0 || b > c.text.length || a >= b || (k > 0 && a < c.underline[k - 1][1])))
  check(`underlines inside the claim, in order, only where checking is needed [${id}]`, badMarks.length === 0, `${badMarks.length} claims`)

  // 6
  const first = s.checkFirst.map((i) => s.claims[i])
  check(`check first: at most six, each needing checking [${id}]`,
    first.length <= 6 && new Set(s.checkFirst).size === first.length && first.every((c) => c.needs) && (s.needs === 0 || first.length > 0),
    `${first.length} of ${s.needs}`)

  // 7
  const judged = s.claims.filter((c) => c.verdict !== 'method')
  const placed = s.where.places.flatMap((p) => p.claims)
  const ordered = judged.every((c, k) => k === 0 || c.place >= judged[k - 1].place)
  check(`each judged claim in one part, parts in order [${id}]`, placed.length === judged.length && new Set(placed).size === placed.length && ordered,
    `${s.where.places.length} parts`)

  // 8
  const rows = s.sources.rows
  const nothingLast = !rows.some((r) => r.key === 'none') || rows[rows.length - 1].key === 'none'
  const rowsAdd = rows.reduce((n, r) => n + r.claims, 0) === judged.length && rows.every((r) => r.backed + r.overstates + r.fact + r.cautious === r.claims)
  check(`at most 8 source rows, "Nothing" last, rows add up [${id}]`, rows.length <= 8 && nothingLast && rowsAdd, `${rows.length} rows`)
}
check('at least one real document ran', ran > 0, `${ran} documents`)

// 9, 10
for (const f of FIXTURES) {
  const run = await runFixture(f)
  if (run.status !== 'ok') { console.log(`SKIP ${f.id} — ${run.reason}`); continue }
  if (run.loaded.pages) {
    const s = buildEvidenceSection(run.analysis, run.rubric, { pages: run.loaded.pages })
    const n = run.loaded.pages.length
    check(`every claim on one of the PDF's pages [${f.id}]`, s.where.unit === 'page' && s.where.places.length === n
      && s.claims.every((c) => c.place >= 0 && c.place < n), `${n} pages`)
  }
  const brief = redact(briefOf(run), run.loaded.text)
  const flat = run.loaded.text.replace(/\s+/g, ' ')
  const leaks = []
  const walk = (v) => {
    if (typeof v === 'string') {
      const t = v.replace(/\s+/g, ' ')
      for (let i = 0; i + 30 <= t.length; i += 10) if (flat.includes(t.slice(i, i + 30))) { leaks.push(t.slice(0, 60)); break }
    } else if (v && typeof v === 'object') for (const x of Object.values(v)) walk(x)
  }
  walk(brief.evidenceSection)
  check(`the brief's section keeps document text hashed [${f.id}]`, !!brief.evidenceSection && leaks.length === 0, leaks.slice(0, 2).join(' | '))
}

// 11
{
  const ref = JSON.parse(readFileSync(REFERENCE_A, 'utf8'))
  if (!existsSync(REFERENCE_A_TEXT)) console.log(`SKIP ${ref.fixture} reference — text absent`)
  else {
    const text = readFileSync(REFERENCE_A_TEXT, 'utf8')
    const route = routeDocument(text, {})
    const s = buildEvidenceSection(analyze(text, route.judgment.rubric, route.posture, {}), route.judgment.rubric)
    const counts = { backed: s.counts.backed, overstates: s.counts.overstates, fact: s.counts.fact, cautious: s.counts.cautious, methods: s.counts.method }
    const want = Object.fromEntries(Object.entries(ref.verdicts).map(([k, v]) => [k, v.count]))
    check('Fixture A, frozen text: the four counts match the build target', JSON.stringify(counts) === JSON.stringify(want), JSON.stringify(counts))
    check('Fixture A, frozen text: claim by claim, the same verdicts', s.claims.map((c) => LETTER[c.verdict]).join('') === ref.sequence.value)
    check('Fixture A, frozen text: the dek matches the build target', s.dek === ref.dek, s.dek)
    const rows = s.sources.rows.map((r) => [r.label, r.backed, r.overstates, r.fact, r.cautious])
    const wantRows = ref.sources.map((r) => [r.label, r.backed, r.overstates, r.fact, r.cautious])
    check('Fixture A, frozen text: the source rows match the build target', JSON.stringify(rows) === JSON.stringify(wantRows), JSON.stringify(rows.map((r) => r[0])))
  }
}

// 12
if (WRITE) {
  writeFileSync(TARGETS, JSON.stringify({ recorded: new Date().toISOString().slice(0, 10), engine_commit: engineCommit(), documents: recorded }, null, 2) + '\n')
  console.log(`WROTE checks/targets/evidence-section.json at engine ${engineCommit()} (${Object.keys(recorded).length} documents)`)
} else if (existsSync(TARGETS)) {
  const target = JSON.parse(readFileSync(TARGETS, 'utf8'))
  for (const [id, rec] of Object.entries(target.documents)) {
    if (!recorded[id]) { console.log(`SKIP target ${id} — document not present`); continue }
    check(`section matches its target [${id}]`, JSON.stringify(recorded[id]) === JSON.stringify(rec), `target engine ${target.engine_commit}`)
  }
} else {
  console.log('SKIP targets — checks/targets/evidence-section.json not recorded yet')
}

if (failed) { console.error(`\n${failed} evidence-section check(s) failed`); process.exit(1) }
console.log('\nEvidence-section checks passed.')
