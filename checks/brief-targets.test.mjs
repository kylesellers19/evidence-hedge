// ─────────────────────────────────────────────────────────────────────────────
// node checks/brief-targets.test.mjs — the evidence brief, held to a target.
//
// Each checks/targets/<fixture>.brief.json records what the brief shows for one
// benchmark fixture (checks/lib/fixtures.mjs): header, verdict, counts, how it
// was judged, profile, signals, patterns with their example lines,
// distribution and the provenance footer (checks/lib/brief.mjs). This test runs
// the fixture the way the app does and fails on any field that moved.
//
// A target is the engine's output at a known commit, not a prediction
// (checks/benchmark-predictions.json says what we expect; this says what the
// brief showed). A change that moves a brief on purpose re-records the target
// in the same commit:
//   node checks/brief-targets.test.mjs --write <fixture-id>
// A fixture whose source is absent (Fixture C lives in the gitignored
// checks/data/) is skipped, not failed.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/corpus.mjs'
import { FIXTURES, runFixture } from './lib/fixtures.mjs'
import { engineCommit } from './lib/engine-rows.mjs'
import { briefOf, redact, diff } from './lib/brief.mjs'

const DIR = join(ROOT, 'checks', 'targets')
const fileFor = (id) => join(DIR, `${id}.brief.json`)

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS ✅' : 'FAIL ❌'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) failed++
}

async function briefFor(id) {
  const f = FIXTURES.find((x) => x.id === id)
  if (!f) throw new Error(`no fixture ${id} in checks/lib/fixtures.mjs`)
  const run = await runFixture(f)
  if (run.status !== 'ok') return run
  return { status: 'ok', brief: redact(briefOf(run), run.loaded.text) }
}

const w = process.argv.indexOf('--write')
if (w !== -1) {
  const id = process.argv[w + 1]
  const got = await briefFor(id)
  if (got.status !== 'ok') { console.error(`cannot record ${id}: ${got.reason}`); process.exit(1) }
  mkdirSync(DIR, { recursive: true })
  const prior = existsSync(fileFor(id)) ? JSON.parse(readFileSync(fileFor(id), 'utf8')) : {}
  const target = {
    fixture: id,
    recorded: new Date().toISOString().slice(0, 10),
    engine_commit: engineCommit(),
    source: prior.source || 'node checks/brief-targets.test.mjs --write',
    brief: got.brief,
  }
  writeFileSync(fileFor(id), JSON.stringify(target, null, 2) + '\n')
  console.log(`WROTE checks/targets/${id}.brief.json at engine ${target.engine_commit}`)
  process.exit(0)
}

const files = existsSync(DIR) ? readdirSync(DIR).filter((n) => n.endsWith('.brief.json')).sort() : []
check('at least one brief target', files.length > 0, `${files.length} in checks/targets/`)
const commit = engineCommit()
for (const name of files) {
  const target = JSON.parse(readFileSync(join(DIR, name), 'utf8'))
  const got = await briefFor(target.fixture)
  if (got.status !== 'ok') { console.log(`SKIP ${target.fixture} — ${got.reason}`); continue }
  const drift = diff(target.brief, got.brief)
  check(
    `brief matches its target [${target.fixture}]`,
    drift.length === 0,
    drift.length ? `${drift.length} fields moved since ${target.engine_commit}:\n    ${drift.slice(0, 20).join('\n    ')}` : `engine ${commit}, target ${target.engine_commit}`,
  )
}

if (failed) { console.error(`\n${failed} brief-target check(s) failed`); process.exit(1) }
