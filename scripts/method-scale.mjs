// ─────────────────────────────────────────────────────────────────────────────
// The Method page's scale section ("What makes a 1 through a 10"), as data.
//
//   node scripts/method-scale.mjs [--tag run1]
//
// Reads the corpus audit's ledger and its one-by-one review verdicts
// (checks/data/audit/, gitignored) and writes src/pages/method-scale.json:
// how many documents showed each score, one anchor document per score, and
// how the same documents score under each standard. An anchor must have an
// `ok` review verdict; a score with none says so. Anchors carry a title, a
// publisher and a link, never text from the document. Re-run after an engine
// change and a new review, and the page shows the new engine's examples.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../checks/lib/corpus.mjs'

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i < 0 ? dflt : process.argv[i + 1]
}
const TAG = arg('tag', 'run1')
const AUDIT = join(ROOT, 'checks', 'data', 'audit')
const OUT = join(ROOT, 'src', 'pages', 'method-scale.json')

const rows = readFileSync(join(AUDIT, `ledger-${TAG}.jsonl`), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
const reviewDir = join(AUDIT, `reviews-${TAG}`)
const verdicts = new Map()
if (existsSync(reviewDir)) {
  for (const f of readdirSync(reviewDir).filter((f) => f.endsWith('.jsonl'))) {
    for (const l of readFileSync(join(reviewDir, f), 'utf8').split('\n').filter(Boolean)) {
      try { const v = JSON.parse(l); verdicts.set(v.id, v) } catch {}
    }
  }
}

const scored = rows.filter((r) => r.status === 'ok' && r.score != null)
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null }

// Who published it: the AEC manifest's firm, else the gold corpus's publisher.
const GOLD_PUBLISHERS = {
  'gold:allen-ehp-2016': 'Environmental Health Perspectives',
  'gold:fixture-b-pew-report': 'Pew Research Center',
  'gold:fixture-b-pew-html': 'Pew Research Center',
  'gold:hsph-press-2015': 'Harvard T.H. Chan School of Public Health',
  'gold:sciencedaily-2015': 'ScienceDaily',
  'gold:gba-news-2015': 'GreenBuildingAdvisor',
  'gold:bdc-blog-allen': 'Building Design + Construction',
  'gold:bdc-gensler-news-2024': 'Building Design + Construction',
  'gold:naava-allen': 'Naava',
  'gold:gensler-gws-2024': 'Gensler',
  'gold:gensler-press-2024': 'Gensler',
  'gold:co2meter-plants': 'CO2Meter',
  'gold:jcu-timber-pilot': 'James Cook University',
  'gold:fixture-a-cadre': 'CADRE',
  'academic:satish-ehp-2012': 'Environmental Health Perspectives',
}
const GOLD_TITLES = {
  'gold:allen-ehp-2016': 'Associations of cognitive function scores with carbon dioxide, ventilation and volatile organic compound exposures in office workers',
  'gold:fixture-b-pew-report': 'U.S. Workers Are More Worried Than Hopeful About Future AI Use in the Workplace (report PDF)',
  'gold:fixture-b-pew-html': 'U.S. Workers Are More Worried Than Hopeful About Future AI Use in the Workplace',
  'academic:satish-ehp-2012': 'Is CO2 an indoor pollutant? Direct effects of low-to-moderate CO2 concentrations on human decision-making performance',
  'gold:jcu-timber-pilot': 'Timber pilot study (research online)',
}

// Anchor choice, deterministic: an `ok` verdict, a link a reader can open,
// then the score nearest the middle of its whole number, then the id.
function anchorFor(n) {
  const pool = scored
    .filter((r) => r.display === n && verdicts.get(r.id)?.verdict === 'ok' && r.url)
    .sort((a, b) => Math.abs(a.score - n) - Math.abs(b.score - n) || (a.id < b.id ? -1 : 1))
  const r = pool[0]
  if (!r) return null
  return {
    id: r.id,
    title: GOLD_TITLES[r.id] || r.title,
    publisher: r.firm || GOLD_PUBLISHERS[r.id] || null,
    url: r.url,
    score: r.score,
    readAs: r.rubric.judgedAs,
    standard: r.rubric.standard,
    published: r.published || null,
  }
}

const byScore = {}
for (let n = 10; n >= 1; n--) {
  const at = scored.filter((r) => r.display === n)
  byScore[n] = {
    documents: at.length,
    reviewedOk: at.filter((r) => verdicts.get(r.id)?.verdict === 'ok').length,
    anchor: anchorFor(n),
  }
}

// The same documents under each standard (the audit runs every document under
// all four): the median score and the share shown as a 1.
const STANDARDS = ['research', 'corporate', 'journalism', 'general']
const byStandard = {}
for (const id of STANDARDS) {
  const xs = scored.map((r) => r.byRubric?.[id]?.score).filter((x) => x != null)
  byStandard[id] = { documents: xs.length, median: median(xs), shownAsOne: xs.filter((x) => Math.round(x) === 1).length }
}
const moreUnderJournalism = scored.filter((r) => r.byRubric?.journalism && r.byRubric.journalism.claims > Math.min(...['research', 'corporate', 'general'].map((k) => r.byRubric[k]?.claims ?? Infinity))).length

const engines = [...new Set(scored.map((r) => r.engine))]
const out = {
  engine: engines.join(', '),
  generated: new Date().toISOString().slice(0, 10),
  corpus: { documents: rows.length, scored: scored.length, reviewed: [...verdicts.keys()].length },
  byScore,
  byStandard,
  moreClaimsUnderJournalism: moreUnderJournalism,
}
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n')
console.log(`wrote ${OUT}`)
for (let n = 10; n >= 1; n--) console.log(n, byScore[n].documents, byScore[n].reviewedOk, byScore[n].anchor ? `${byScore[n].anchor.publisher}: ${byScore[n].anchor.title} (${byScore[n].anchor.score})` : 'no clean example yet')
console.log(byStandard, 'more claims under journalism:', moreUnderJournalism)
