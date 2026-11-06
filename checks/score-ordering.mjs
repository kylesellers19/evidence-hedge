// ─────────────────────────────────────────────────────────────────────────────
// Score ordering on the working gold labels (fixtures/corpus.json), plus the
// D1 guarantees:
//   · allen-ehp-2016 scores above hks-human-potential, fixture-a-cadre,
//     naava-allen and hsph-press-2015
//   · fixture-b-pew-report scores above hks-human-potential
//   · blocked and reader-error input never produce a score
//   · the score is genre-invariant: every posture of the gold rubric gives the
//     same score; marketing / press-release verdicts never say "The evidence
//     supports" below the strong band
// Each document is scored under its GOLD rubric. Pairs with a missing document
// print SKIP.
// ─────────────────────────────────────────────────────────────────────────────

import { loadCorpus, loadDocText } from './lib/corpus.mjs'
import { analyze } from '../src/engine/analyze.js'
import { getRubric } from '../src/rubrics/index.js'
import { validateText } from '../src/ingest/validateText.js'

let ok = true
const log = (label, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`) }

const scores = {}
for (const doc of loadCorpus()) {
  const loaded = await loadDocText(doc)
  if (loaded.status !== 'ok') { console.log(`SKIP ${doc.id} — ${loaded.reason}`); continue }
  const rubric = getRubric(doc.gold.rubric)
  const runs = rubric.postures.map((p) => analyze(loaded.text, rubric, p, { sourceUrl: doc.url || '' }))
  const byPosture = Object.fromEntries(rubric.postures.map((p, i) => [p, runs[i].documentScore]))
  const gold = byPosture[doc.gold.posture] || runs[0].documentScore
  scores[doc.id] = gold.score
  const distinct = new Set(runs.map((r) => r.documentScore.score))
  log(`${doc.id}: ${gold.score} under ${doc.gold.rubric}, identical across ${rubric.postures.length} postures`, distinct.size === 1, [...distinct].join(' / '))
  for (const p of ['marketing', 'press-release']) {
    const s = byPosture[p]
    if (s && s.band !== 'strong') log(`${doc.id}: ${p} verdict avoids "The evidence supports"`, !/^The evidence supports/.test(s.summary), s.summary)
  }
}

const pairs = [
  ['allen-ehp-2016', 'hks-human-potential'], ['allen-ehp-2016', 'fixture-a-cadre'], ['allen-ehp-2016', 'naava-allen'],
  ['allen-ehp-2016', 'hsph-press-2015'], ['fixture-b-pew-report', 'hks-human-potential'],
]
for (const [hi, lo] of pairs) {
  if (scores[hi] === undefined || scores[lo] === undefined) { console.log(`SKIP ${hi} > ${lo} — ${scores[hi] === undefined ? hi : lo} unavailable`); continue }
  log(`${hi} (${scores[hi]}) > ${lo} (${scores[lo]})`, scores[hi] > scores[lo])
}

// Blocked and reader-error text never reaches analyze(), so never gets a score.
const BOT_WALL = "Making sure you're not a bot!\n \nLoading...\nPlease wait a moment while we ensure the security of your connection."
const READER_403 = '{"data":null,"code":403,"name":"AbuseAlleviationError","status":40305,"message":"Anonymous access to domain www.sciencealert.com blocked"}'
for (const [name, text] of [['bot wall', BOT_WALL], ['reader 403', READER_403]]) {
  for (const path of ['link', 'file', 'paste']) {
    const v = validateText(text, { path })
    log(`${name} on the ${path} path is refused before analyze()`, !v.ok && (v.reason === 'blocked' || v.reason === 'reader-error'), v.reason)
  }
}

if (!ok) { console.error('\nscore ordering failed.'); process.exit(1) }
console.log('\nScore ordering holds.')
process.exit(0)
