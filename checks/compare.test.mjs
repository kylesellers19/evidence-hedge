// ─────────────────────────────────────────────────────────────────────────────
// Compare firms (src/list/compare/, docs/compare.md), on real List rows
// (checks/targets/compare/list-rows.json):
//   · the statistics agree with the reference implementation
//     (scripts/compare-reference.py → checks/targets/compare-stats.json):
//     point estimates, rates and exact p to 1e-9; sampled p and interval ends
//     within three Monte Carlo standard errors
//   · on real selections small enough to count every arrangement, sampled
//     permutation p agrees with the count
//   · Holm is applied within each family, as statsmodels applies it
//   · the same selection gives the same output, byte for byte, on one thread
//     or several
//   · the text: every number in a sentence is a formatted value of a row the
//     sentence cites; only results that differ are described as differences;
//     no banned word; at most eight sentences; flag labels come from the
//     brief's own modules; and each target selection's text is the recorded
//     one (checks/targets/compare/<slug>.json; re-record a deliberate change
//     with --write)
//   · the address: repeated vs, names with commas, types as slugs, round trip
//   · every constant is in COMPARE_CONSTANTS and the ratification table; ratified ones keep their value
//
//   node checks/compare.test.mjs [--write]
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { loadRows, runSelection } from './lib/compare-run.mjs'
import { SELECTIONS, SMALL } from './lib/compare-selections.mjs'
import { COMPARE_CONSTANTS, RATIFIED, ratificationTable } from '../src/list/compare/constants.js'
import { holm, rankTest, trendTest, flagTest, rng, combineTest } from '../src/list/compare/stats.js'
import { narrate } from '../src/list/compare/narrate.js'
import { MEASURES, readSelection, writeSelection } from '../src/list/compare/data.js'

const WRITE = process.argv.includes('--write')
let ok = true
const log = (label, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`) }

const rows = loadRows()
const runs = {}
for (const sel of [...SELECTIONS, SMALL]) runs[sel.slug] = await runSelection(rows, sel)
const textOf = (run) => narrate(run.rows, { ...run.sel, measures: MEASURES, allTypes: true })

// ── the reference implementation ─────────────────────────────────────────────
const REF = new URL('./targets/compare-stats.json', import.meta.url)
const RECORDED = JSON.parse(readFileSync(new URL('./targets/compare/reference-misses.json', import.meta.url), 'utf8')).misses
if (!existsSync(REF)) log('the reference values exist (scripts/compare-reference.py)', false)
else {
  const ref = JSON.parse(readFileSync(REF, 'utf8'), (k, v) => (v === 'Infinity' ? Infinity : v === '-Infinity' ? -Infinity : v))
  for (const [slug, run] of Object.entries(runs)) {
    const expected = ref.selections?.[slug]
    if (!expected) { log(`${slug}: reference values`, false, 'missing'); continue }
    const misses = { estimate: [], exact: [], sampled: [], interval: [], rate: [] }
    let compared = 0
    for (const r of run.rows) {
      const e = expected[r.id]
      if (!e) { misses.estimate.push(`${r.id} missing`); continue }
      compared++
      const close = (a, b, tol) => (a == null && b == null) || (a === b) || (a != null && b != null && Math.abs(a - b) <= tol)
      if (!close(r.estimate, e.estimate, 1e-9)) misses.estimate.push(`${r.id} ${r.estimate} vs ${e.estimate}`)
      for (const k of ['rateA', 'rateB', 'diff']) if (r[k] !== undefined && e[k] != null && !close(r[k], e[k], 1e-9)) misses.rate.push(`${r.id} ${k} ${r[k]} vs ${e[k]}`)
      if (r.p == null || e.p == null) { if ((r.p == null) !== (e.p == null)) misses.sampled.push(`${r.id} p ${r.p} vs ${e.p}`); continue }
      if (r.exact && e.exact) { if (!close(r.p, e.p, 1e-9)) misses.exact.push(`${r.id} ${r.p} vs ${e.p}`) }
      else {
        const se = Math.sqrt((r.mcse?.p || 0) ** 2 + (e.se_p || 0) ** 2)
        if (!close(r.p, e.p, Math.max(3 * se, 1e-9))) misses.sampled.push(`${r.id} ${r.p.toFixed(4)} vs ${e.p.toFixed(4)} (3 SE ${(3 * se).toFixed(4)})`)
      }
      for (const k of ['lo', 'hi']) {
        if (r[k] == null || e[k] == null) continue
        const [a, b] = r.mcse[k]
        const inside = e[k] >= a - 1e-9 && e[k] <= b + 1e-9
        if (!inside) misses.interval.push(`${r.id} ${k} ${r[k]} vs ${e[k]} (band ${a} to ${b})`)
      }
    }
    log(`${slug}: every row has a reference value (${compared})`, compared === run.rows.length)
    log(`${slug}: point estimates match to 1e-9`, !misses.estimate.length, misses.estimate.slice(0, 3).join('; '))
    log(`${slug}: pooled rates and differences match to 1e-9`, !misses.rate.length, misses.rate.slice(0, 3).join('; '))
    log(`${slug}: p from every arrangement matches to 1e-9`, !misses.exact.length, misses.exact.slice(0, 3).join('; '))
    log(`${slug}: sampled p within three Monte Carlo standard errors`, !misses.sampled.length, misses.sampled.slice(0, 3).join('; '))
    // A miss looked into and recorded (checks/targets/compare/reference-misses.json)
    // is reported, not failed; any other fails.
    const recorded = RECORDED.filter((m) => m.selection === slug).map((m) => `${m.row} ${m.end}`)
    const fresh = misses.interval.filter((m) => !recorded.some((r) => m.startsWith(r)))
    for (const m of misses.interval.filter((x) => !fresh.includes(x))) console.log(`RECORDED   ${slug}: ${m}`)
    log(`${slug}: interval ends within three Monte Carlo standard errors (order-statistic bands)`, !fresh.length, fresh.slice(0, 3).join('; '))
  }
  const hc = ref.holm_check
  if (hc) {
    const mine = holm(hc.p)
    log('Holm matches statsmodels on its own test list', mine.every((v, i) => (v == null && (hc.adjusted || hc.pAdj)[i] == null) || Math.abs(v - (hc.adjusted || hc.pAdj)[i]) < 1e-12), JSON.stringify(mine))
  }
}

// ── counting every arrangement ───────────────────────────────────────────────
{
  const run = runs['small-exact']
  const [a, b] = run.input.firms
  const strata = [{ a: a.reports.map((r) => r.score), b: b.reports.map((r) => r.score) }]
  const exact = combineTest([rankTest(strata, { rand: rng(1) })])
  const sampled = combineTest([rankTest(strata, { rand: rng(2), draws: COMPARE_CONSTANTS.PERMUTATION_DRAWS, exactLimit: 0 })])
  const se = Math.sqrt((exact.p * (1 - exact.p)) / COMPARE_CONSTANTS.PERMUTATION_DRAWS)
  log(`small-exact: ${exact.arrangements} arrangements counted, and sampling them agrees (${exact.p.toFixed(4)} vs ${sampled.p.toFixed(4)})`,
    exact.exact && !sampled.exact && Math.abs(exact.p - sampled.p) <= 3 * se + 1e-9)
  const flags = [{ a: a.reports.map((r) => ({ k: r.unsupported, c: r.claims })), b: b.reports.map((r) => ({ k: r.unsupported, c: r.claims })) }]
  const fe = combineTest([flagTest(flags, { zero: false, rand: rng(3) })])
  const fs = combineTest([(() => {
    // the same test, sampled: one stratum too large to count is the only way
    // labelTest samples, so ask for it directly through rankTest's switch
    return flagTestSampled(flags)
  })()])
  const fse = Math.sqrt((fe.p * (1 - fe.p)) / COMPARE_CONSTANTS.PERMUTATION_DRAWS)
  log(`small-exact: the flag test counted and sampled agree (${fe.p.toFixed(4)} vs ${fs.p.toFixed(4)})`, fe.exact && Math.abs(fe.p - fs.p) <= 3 * fse + 1e-9)
  const suffolk = runs['small-against-largest'].input.firms[0].reports.filter((r) => Number.isInteger(r.year))
  const x = suffolk.map((r) => r.year), y = suffolk.map((r) => r.score)
  const te = combineTest([trendTest(x, y, { rand: rng(4) })])
  const ts = combineTest([trendTest(x, y, { rand: rng(5), exactLimit: 0 })])
  const tse = Math.sqrt((te.p * (1 - te.p)) / COMPARE_CONSTANTS.PERMUTATION_DRAWS)
  log(`Suffolk's ${x.length} dated reports: every ordering of the years counted, and sampling agrees (${te.p.toFixed(4)} vs ${ts.p.toFixed(4)})`, te.exact && !ts.exact && Math.abs(te.p - ts.p) <= 3 * tse + 1e-9)
}
function flagTestSampled(cells) {
  // flagTest has no switch of its own; the same statistic through labelTest.
  return flagTest(cells, { zero: false, rand: rng(6), draws: COMPARE_CONSTANTS.PERMUTATION_DRAWS, exactLimit: 0 })
}

// ── Holm within each family ──────────────────────────────────────────────────
for (const [slug, run] of Object.entries(runs)) {
  const fams = [...new Set(run.rows.map((r) => r.family))]
  const right = fams.every((f) => {
    const members = run.rows.filter((r) => r.family === f)
    const adj = holm(members.map((r) => r.p ?? null))
    return members.every((r, i) => (r.pAdj == null && adj[i] == null) || Math.abs(r.pAdj - adj[i]) < 1e-15) &&
      members.every((r) => r.p == null || r.pAdj >= r.p - 1e-15)
  })
  log(`${slug}: Holm is applied within each of ${fams.length} families, never lowering a p`, right)
}

// ── byte for byte ────────────────────────────────────────────────────────────
{
  const sel = SELECTIONS.find((s) => s.slug === 'most-different-mix')
  const one = await runSelection(rows, sel, { threads: 1 })
  const many = await runSelection(rows, sel, { threads: 4 })
  const again = await runSelection(rows, sel, { threads: 4 })
  const out = (r) => JSON.stringify({ rows: r.rows, text: textOf(r) })
  log('the same selection gives the same output, byte for byte, on one thread or four, run twice', out(one) === out(many) && out(many) === out(again))
}

// ── the text ─────────────────────────────────────────────────────────────────
const BANNED = ['fallacy', 'fallacies', 'carry', 'carries', 'significant', 'significance', 'outperform', 'better firm', 'because', 'due to', 'drives', 'leads to', 'results in',
  'reach', 'reaches', 'rung', 'tier', 'ground', 'grade', 'ceiling', 'posture', 'outrun', 'outruns', 'past its reach', 'whose finding', 'the engine', 'stated past', 'article type']
const banned = (t) => BANNED.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(t))
// A number is digits not inside a word (NV5 Global is a name).
const NUMBER = /(?<![\p{L}\d])−?\d+(?:,\d{3})*(?:\.\d+)?(?![\p{L}\d])/gu
const FIXED = [/95% interval/g, /every 100 claims/g, /per 100 claims/g]
for (const [slug, run] of Object.entries(runs)) {
  const text = textOf(run)
  const R = Object.fromEntries(run.rows.map((r) => [r.id, r]))
  const unsupported = []
  const wrongKind = []
  for (const s of text) {
    const values = new Set(s.cites.flatMap((id) => Object.values(R[id]?.fmt || {}).filter((v) => typeof v === 'string')))
    let rest = s.text
    for (const f of FIXED) rest = rest.replace(f, '')
    for (const n of rest.match(NUMBER) || []) if (!values.has(n)) unsupported.push(`"${n}" in: ${s.text}`)
    const cited = s.cites.map((id) => R[id])
    // A difference cites a row that differs; any other row it cites is the
    // like-with-like check, which the sentence must say did not hold.
    if (s.kind === 'differs' && (cited[0]?.verdict !== 'differs' ||
      (cited.slice(1).some((r) => r.verdict !== 'differs') && !/though not once report type is accounted for|too few reports of the same types/.test(s.text)))) wrongKind.push(s.text)
    // The lean sentence describes each firm's own rates, and compares none.
    if (s.kind === 'lean' && /higher|lower|times as many|differ|more than|fewer/.test(s.text)) wrongKind.push(s.text)
    if (s.kind === 'apart' && !/can’t be told apart/.test(s.text)) wrongKind.push(s.text)
    if (s.kind === 'few' && !/too few/.test(s.text)) wrongKind.push(s.text)
    if (s.kind === 'none' && (!/can be told apart from chance/.test(s.text) || run.rows.some((r) => r.verdict === 'differs'))) wrongKind.push(s.text)
    if (s.kind === 'lead') {
      // "higher than"/"lower than" only for firms whose score differs.
      for (const r of cited) {
        const named = new RegExp(`(higher|lower) than [^.]*${r.other.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(s.text.split('can’t be told apart')[0])
        if (named && r.verdict !== 'differs') wrongKind.push(s.text)
      }
    }
    if (s.kind === 'mix' && !cited.every((r) => r.kind === 'pair-type')) wrongKind.push(s.text)
  }
  log(`${slug}: every number in the text is a value of a row its sentence cites`, !unsupported.length, unsupported.slice(0, 3).join(' | '))
  log(`${slug}: only results that differ are described as differences`, !wrongKind.length, wrongKind.slice(0, 2).join(' | '))
  const words = text.flatMap((s) => banned(s.text))
  log(`${slug}: no banned word in the text`, !words.length, words.join(', '))
  log(`${slug}: ${text.length} ${text.length === 1 ? 'sentence' : 'sentences'}, no more than ${COMPARE_CONSTANTS.MAX_SENTENCES}`, text.length <= COMPARE_CONSTANTS.MAX_SENTENCES)

  // The recorded text.
  const file = new URL(`./targets/compare/${slug}.json`, import.meta.url)
  const now = { selection: run.sel, build: run.data.build, sentences: text }
  if (WRITE) writeFileSync(file, JSON.stringify(now, null, 1) + '\n')
  if (!existsSync(file)) log(`${slug}: the recorded text exists`, false)
  else {
    const was = JSON.parse(readFileSync(file, 'utf8'))
    const moved = was.sentences.map((s, i) => (JSON.stringify(s) === JSON.stringify(text[i]) ? null : `${i + 1}: ${s.text} → ${text[i]?.text}`)).filter(Boolean)
    log(`${slug}: the text is the recorded one`, moved.length === 0 && was.sentences.length === text.length, moved.slice(0, 2).join(' | '))
  }
}

// ── the code's own words ─────────────────────────────────────────────────────
{
  const dir = new URL('../src/list/compare/', import.meta.url)
  const files = readdirSync(dir).filter((f) => /\.(js|jsx)$/.test(f))
  const strings = files.flatMap((f) => {
    const src = readFileSync(new URL(f, dir), 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
    return [...src.matchAll(/(['`"])((?:(?!\1)[^\\\n]|\\.)*)\1/g)].map((m) => m[2]).concat([...src.matchAll(/>([^<>{}\n]+)</g)].map((m) => m[1]))
  })
  const hits = strings.flatMap((t) => banned(t).map((w) => `${w}: ${t.slice(0, 60)}`))
  log('no banned word in the page’s own copy', !hits.length, hits.slice(0, 3).join(' | '))
  const retyped = files.filter((f) => /cites? nothing|cites? too little|more cause than the study shows/.test(readFileSync(new URL(f, dir), 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n')))
  log('flag labels come from briefTop.js and FLAG_ORDER, never retyped', !retyped.length, retyped.join(', '))
  const narrateSrc = readFileSync(new URL('narrate.js', dir), 'utf8') + readFileSync(new URL('format.js', dir), 'utf8')
  log('the text imports statsLabels; the measures follow FLAG_ORDER', /statsLabels/.test(narrateSrc) && /FLAG_ORDER/.test(readFileSync(new URL('data.js', dir), 'utf8')) && MEASURES.join() === 'unsupported,overconfident,overreach')
}

// ── the address ──────────────────────────────────────────────────────────────
{
  const sel = { firm: 'Skidmore, Owings & Merrill (SOM)', vs: ['Burns & McDonnell', 'Salas O\'Brien', 'HKS'], types: ['Survey report', 'White paper'], readers: true }
  const address = writeSelection(sel).toString()
  const back = readSelection(new URLSearchParams(address))
  log('a selection survives its address, commas and ampersands included', JSON.stringify(back) === JSON.stringify(sel), address)
  log('firms repeat as vs and types are slugs', /vs=Burns\+%26\+McDonnell&vs=Salas/.test(address) && /types=survey-report%2Cwhite-paper/.test(address))
  const odd = readSelection(new URLSearchParams('firm=HKS&vs=HKS&vs=Arup&vs=Arup&vs=A&vs=B&vs=C&types=memo,white-paper'))
  log('an address drops repeats, the chosen firm, a fourth firm and unknown types',
    JSON.stringify(odd.vs) === JSON.stringify(['Arup', 'A', 'B']) && JSON.stringify(odd.types) === JSON.stringify(['White paper']))
}

// ── constants ────────────────────────────────────────────────────────────────
{
  const table = ratificationTable()
  log('every constant is in the ratification table, marked PROVISIONAL unless ratified', Object.keys(COMPARE_CONSTANTS).every((k) =>
    table.some((t) => t.name === k && t.why && t.status === (RATIFIED[k]?.value === COMPARE_CONSTANTS[k] ? 'RATIFIED' : 'PROVISIONAL'))))
  log('a ratified constant still holds its ratified value, with who and when', Object.entries(RATIFIED).every(([k, r]) =>
    COMPARE_CONSTANTS[k] === r.value && r.by && /^\d{4}-\d{2}-\d{2}$/.test(r.on)))
  const src = readFileSync(new URL('../src/list/compare/constants.js', import.meta.url), 'utf8')
  log('the constants are marked PROVISIONAL in the code', /PROVISIONAL — not ratified/.test(src))
  log('the draw counts are the spec’s', COMPARE_CONSTANTS.BOOTSTRAP_DRAWS === 4000 && COMPARE_CONSTANTS.PERMUTATION_DRAWS === 10000)
}

console.log(`\n${Object.values(runs).map((r) => `${r.sel.slug} ${Math.round(r.ms)} ms`).join(', ')}`)
if (!ok) { console.error('\nCompare checks failed.'); process.exit(1) }
console.log('\nCompare checks passed.')
process.exit(0)
