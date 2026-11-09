// ─────────────────────────────────────────────────────────────────────────────
// node checks/evidence-map.test.mjs — the evidence map (src/engine/evidenceMap.js)
// is a reading of the analysis, never a judgment of its own.
//
// On every corpus document whose text is present (committed or cached; real
// documents only, a missing one is a SKIP that is printed):
//   1. every claim lands in exactly one ground, and the rows add up
//   2. judgments are the engine's: outruns ⇔ a flag; overreach ⇔ causal
//      overreach with no flag; gated ⇔ the posture gate fired
//   3. building the map changes nothing in the analysis (deep snapshot)
//   4. a flagged claim's ceiling is its flag explanation's ceiling
//   5. rows agree with the links: a reference row has a high-confidence marker
//      resolved to an entry; a nothing-on-file row is unlinked at rank 0
//   6. a claim with a link lands in the same row under every rubric (links and
//      attribution are rubric-invariant; only the unlinked rows read the rung)
//   7. the same input gives the same map
//   8. the census's outruns equals the verdict's flagged count
//   9. the rows partition the claims; every claim in a row has the row's reach,
//      and a claim sits past its row's reach exactly when the engine flagged
//      it, unless it is a method statement, a hedged (disclosed) absence, or
//      the posture gate fired
//  10. a source split by grade continues on a ditto line: no two adjacent rows
//      of one kind carry the same name
// On the benchmark fixtures (checks/lib/fixtures.mjs) that load:
//  11. the brief records the map with no document text left readable: every
//      string of 30+ characters the document contains verbatim is hashed
// Against the recorded rows:
//  12. row counts equal checks/targets/evidence-map.json for each document it
//      lists (recorded output at a known commit, not a prediction). A change
//      that moves them on purpose re-records in the same commit:
//        node checks/evidence-map.test.mjs --write
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadCorpus, loadDocText } from './lib/corpus.mjs'
import { FIXTURES, runFixture } from './lib/fixtures.mjs'
import { engineCommit } from './lib/engine-rows.mjs'
import { briefOf, redact } from './lib/brief.mjs'
import { routeDocument } from '../src/rubrics/route.js'
import { analyze } from '../src/engine/analyze.js'
import { getRubric, RUBRIC_ORDER } from '../src/rubrics/index.js'
import { buildEvidenceMap, GROUND_KINDS } from '../src/engine/evidenceMap.js'

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS ✅' : 'FAIL ❌'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) failed++
}

const TARGETS = join(ROOT, 'checks', 'targets', 'evidence-map.json')
const WRITE = process.argv.includes('--write')
const rowsOf = (map) => map.rows.map((r) => ({ kind: r.kind, grade: r.grade, rung: r.rung.key, claims: r.claims.length, reaches: r.reach, pastIt: r.outruns, overreach: r.overreach }))
const recorded = {}

const docs = loadCorpus()
let ran = 0
for (const doc of docs) {
  const loaded = await loadDocText(doc)
  if (loaded.status !== 'ok') { console.log(`SKIP ${doc.id} — ${loaded.reason}`); continue }
  ran++
  const sourceUrl = doc.url || ''
  const route = routeDocument(loaded.text, { sourceUrl })
  const rubric = route.judgment.rubric
  const result = analyze(loaded.text, rubric, route.posture, { sourceUrl })
  const before = JSON.stringify(result)
  const map = buildEvidenceMap(result, rubric)
  const id = doc.id

  // 1
  const placed = map.claims.map((c) => map.grounds.filter((g) => g.claims.includes(c.index)).length)
  const total = map.grounds.reduce((n, g) => n + g.claims.length, 0)
  check(`each claim in one ground, rows add up [${id}]`, placed.every((k) => k === 1) && total === result.claims.length && map.claims.length === result.claims.length,
    `${result.claims.length} claims, ${map.grounds.length} rows`)

  // 2
  const gated = (result.signals || []).some((s) => s.gate)
  const wrongJudgment = map.claims.filter((m) => {
    const c = result.claims[m.index]
    const want = gated ? 'gated' : c.flag ? 'outruns' : c.overreach ? 'overreach' : 'within'
    return m.judgment !== want
  })
  check(`judgments are the engine's [${id}]`, wrongJudgment.length === 0, wrongJudgment.length ? `${wrongJudgment.length} differ` : gated ? 'gated' : '')

  // 3
  check(`the analysis is unchanged by the map [${id}]`, JSON.stringify(result) === before)

  // 4
  const wrongCeiling = map.claims.filter((m) => {
    const c = result.claims[m.index]
    return c.flag && c.explanation && c.explanation.ceiling !== m.ceiling
  })
  check(`flagged ceilings match their explanations [${id}]`, wrongCeiling.length === 0, wrongCeiling.length ? `${wrongCeiling.length} differ` : '')

  // 5
  const badRef = map.claims.filter((m) => m.kind === 'reference' && !result.claims[m.index].evidence.links.some((l) => l.basis === 'marker' && l.target.kind === 'reference' && l.confidence === 'high'))
  const badNone = map.claims.filter((m) => (m.kind === 'none' || m.kind === 'hedged-none') && !(result.claims[m.index].evidence.status === 'unlinked' && result.claims[m.index].rung.rank === 0))
  check(`rows agree with the links [${id}]`, badRef.length === 0 && badNone.length === 0, `${badRef.length} reference, ${badNone.length} nothing-on-file mismatches`)

  // 6
  const linkedKind = new Map(map.claims.filter((m) => m.linkCount > 0).map((m) => [m.text, m.kind]))
  const moved = []
  for (const rid of RUBRIC_ORDER) {
    const r = getRubric(rid)
    const other = buildEvidenceMap(analyze(loaded.text, r, r.defaultPosture, { sourceUrl }), r)
    for (const m of other.claims) {
      if (m.linkCount > 0 && linkedKind.has(m.text) && linkedKind.get(m.text) !== m.kind) moved.push(`${rid}: ${linkedKind.get(m.text)} → ${m.kind}`)
    }
  }
  check(`linked claims keep their row under every rubric [${id}]`, moved.length === 0, moved.slice(0, 3).join('; '))

  // 7
  check(`same input, same map [${id}]`, JSON.stringify(buildEvidenceMap(result, rubric)) === JSON.stringify(map))

  // 8
  const flagged = result.summary.flagCounts['unsupported-assertion'] + result.summary.flagCounts.overconfident
  check(`census outruns equals the flagged count [${id}]`, map.census.outruns === flagged, `${map.census.outruns} vs ${flagged}`)

  // 9
  const inRows = map.rows.flatMap((r) => r.claims)
  const partition = inRows.length === map.claims.length && new Set(inRows).size === map.claims.length
  const wrongReach = map.rows.filter((r) => r.claims.some((i) => map.claims[i].ceiling !== r.ceiling))
  const pastNotFlagged = map.claims.filter((m) => {
    const c = result.claims[m.index]
    const past = m.tier.weight > m.ceiling
    const excused = gated || c.function === 'method' || (c.disclosed && !c.flag)
    return excused ? (!past && !!c.flag) : past !== (c.flag != null)
  })
  check(`rows partition the claims; past reach ⇔ flagged [${id}]`, partition && wrongReach.length === 0 && pastNotFlagged.length === 0,
    `${map.rows.length} rows, ${wrongReach.length} with mixed reach, ${pastNotFlagged.length} claims where position and flag disagree`)

  // 10
  const repeated = map.rows.filter((r, i) => i > 0 && !r.continued && map.rows[i - 1].kind === r.kind && map.rows[i - 1].label === r.label)
  check(`a source split by grade continues on a ditto line [${id}]`, repeated.length === 0, repeated.slice(0, 3).map((r) => `${r.kind}: ${r.label}`).join('; '))

  recorded[id] = rowsOf(map)
  console.log(`      ${id}: ${GROUND_KINDS.filter((k) => map.grounds.some((g) => g.kind === k.kind)).map((k) => `${k.kind} ${map.grounds.find((g) => g.kind === k.kind).claims.length}`).join(', ')}`)
}
check('at least one real document ran', ran > 0, `${ran} of ${docs.length}`)

// 11
for (const f of FIXTURES) {
  const run = await runFixture(f)
  if (run.status !== 'ok') { console.log(`SKIP ${f.id} — ${run.reason}`); continue }
  const brief = redact(briefOf(run), run.loaded.text)
  const flat = run.loaded.text.replace(/\s+/g, ' ')
  const leaks = []
  const walk = (v) => {
    if (typeof v === 'string') {
      const s = v.replace(/\s+/g, ' ')
      for (let i = 0; i + 30 <= s.length; i += 10) if (flat.includes(s.slice(i, i + 30))) { leaks.push(s.slice(0, 60)); break }
    } else if (v && typeof v === 'object') for (const x of Object.values(v)) walk(x)
  }
  walk(brief.evidenceMap)
  check(`the brief's map keeps document text hashed [${f.id}]`, brief.evidenceMap && leaks.length === 0, leaks.slice(0, 2).join(' | '))
}

// 12
if (WRITE) {
  writeFileSync(TARGETS, JSON.stringify({ recorded: new Date().toISOString().slice(0, 10), engine_commit: engineCommit(), rows: recorded }, null, 2) + '\n')
  console.log(`WROTE checks/targets/evidence-map.json at engine ${engineCommit()} (${Object.keys(recorded).length} documents)`)
} else if (existsSync(TARGETS)) {
  const target = JSON.parse(readFileSync(TARGETS, 'utf8'))
  for (const [id, rows] of Object.entries(target.rows)) {
    if (!recorded[id]) { console.log(`SKIP target ${id} — document not present`); continue }
    check(`rows match their target [${id}]`, JSON.stringify(recorded[id]) === JSON.stringify(rows), `target engine ${target.engine_commit}`)
  }
} else {
  console.log('SKIP targets — checks/targets/evidence-map.json not recorded yet')
}

if (failed) { console.error(`\n${failed} evidence-map check(s) failed`); process.exit(1) }
console.log('\nEvidence-map checks passed.')
