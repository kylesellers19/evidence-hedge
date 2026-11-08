// ─────────────────────────────────────────────────────────────────────────────
// node checks/benchmark-verify.mjs [baseline] — change set 1 verification.
//
//   1. Engine files unchanged against the baseline commit (default: the
//      predictions file's baseline): no diff and no untracked file under src/.
//   2. checks/data/ is gitignored, nothing under it is tracked or staged.
//   3. Unit ids are stable: two fresh exports are byte-identical, and match the
//      export in checks/data/.
//   4. Every metric in the report names its source, split, row count and label tier.
//   5. The report records the engine commit it ran on.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { ROOT } from './lib/corpus.mjs'
import { DATA } from './lib/fixtures.mjs'
import { engineCommit } from './lib/engine-rows.mjs'

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' })
const PRED = JSON.parse(readFileSync(join(ROOT, 'checks', 'benchmark-predictions.json'), 'utf8'))
const baseline = process.argv[2] || PRED.baseline
const commit = engineCommit()

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS ✅' : 'FAIL ❌'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) failed++
}

// 1. Engine unchanged
const diff = git('diff', '--name-only', baseline, '--', 'src').trim()
const untracked = git('ls-files', '--others', '--exclude-standard', '--', 'src').trim()
check(`engine files unchanged against ${baseline}`, !diff && !untracked, diff || untracked ? (diff + ' ' + untracked).trim() : 'git diff on src/ is empty')

// 2. Data ignored, none tracked or staged
let ignored = true
try { git('check-ignore', '-q', 'checks/data/probe') } catch { ignored = false }
const tracked = git('ls-files', '--', 'checks/data').trim()
const staged = git('diff', '--cached', '--name-only', '--', 'checks/data').trim()
check('checks/data/ is gitignored, nothing under it tracked or staged', ignored && !tracked && !staged, [!ignored && 'not ignored', tracked && `tracked: ${tracked}`, staged && `staged: ${staged}`].filter(Boolean).join('; '))

// 3. Stable exports
const files = (dir) => {
  const out = []
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : out.push(relative(dir, p)) } }
  walk(dir)
  return out.sort()
}
const exportTo = (dir) => execFileSync('node', [join(ROOT, 'checks', 'export-units.mjs'), '--out', dir], { cwd: ROOT, stdio: 'pipe' })
const a = mkdtempSync(join(tmpdir(), 'eh-units-a-'))
const b = mkdtempSync(join(tmpdir(), 'eh-units-b-'))
try {
  exportTo(a); exportTo(b)
  const fa = files(a), fb = files(b)
  const differ = fa.filter((f) => !fb.includes(f) || !readFileSync(join(a, f)).equals(readFileSync(join(b, f))))
  check('two exports are byte-identical', fa.length > 0 && fa.length === fb.length && !differ.length, `${fa.length} files${differ.length ? '; differ: ' + differ.join(', ') : ''}`)
  const stale = fa.filter((f) => !existsSync(join(DATA, f)) || !readFileSync(join(a, f)).equals(readFileSync(join(DATA, f))))
  check('checks/data/ export matches a fresh export', !stale.length, stale.length ? `stale: ${stale.join(', ')}` : '')
} finally {
  rmSync(a, { recursive: true, force: true }); rmSync(b, { recursive: true, force: true })
}

// 4–5. Report
const reportPath = join(ROOT, 'checks', 'reports', `benchmark-${commit}.json`)
if (!existsSync(reportPath)) check('benchmark report exists for this commit', false, `run node checks/benchmark.mjs (expected ${relative(ROOT, reportPath)})`)
else {
  const r = JSON.parse(readFileSync(reportPath, 'utf8'))
  const bad = r.metrics.filter((m) => !m.source || !m.split || typeof m.rows !== 'number' || !m.label_tier)
  check('every metric names its source, split, row count and label tier', r.metrics.length > 0 && !bad.length, `${r.metrics.length} metrics${bad.length ? `, ${bad.length} unlabeled` : ''}`)
  check('the report records the engine commit', r.engine_commit === commit, `engine_commit ${r.engine_commit}`)
}

if (failed) { console.error(`\n${failed} verification item(s) failed.`); process.exit(1) }
console.log('\nChange set 1 verification passed.')
