// ─────────────────────────────────────────────────────────────────────────────
// node checks/attribution.test.mjs — change set 3: whose finding each claim is.
//
//   1. Every claim on the corpus and Fixtures A–C carries an attribution: one
//      of the six labels, a confidence, cue spans, and a reason when it is
//      undetermined; flagged claims carry the same object on their explanation.
//   2. Real sentences, by unit id (checks/data/units, gitignored), get the
//      label read off the document by hand. No document text is committed.
//   3. Fixture C: every sentence the old self-citation signal counted ("we
//      surveyed", "our survey", "our analysis") is own-current, and none of
//      them is a self-citation.
//   4. The profile's self-citation count and the signal read one counter, on
//      every document.
//   5. The known-good regression string keeps its flags (check:regression
//      holds the values); its claims are attributed.
//   6. The UnScientify word lists keep their notice; the served notices file
//      matches THIRD_PARTY_NOTICES.md.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadCorpus, loadDocText } from './lib/corpus.mjs'
import { FIXTURES, runFixture } from './lib/fixtures.mjs'
import { unitAttribution } from './lib/engine-rows.mjs'
import { routeDocument } from '../src/rubrics/route.js'
import { analyze } from '../src/engine/analyze.js'
import { getRubric } from '../src/rubrics/index.js'
import { ATTRIBUTION_LABELS } from '../src/engine/attribution.js'

// The known-good string, read from checks/regression-baseline.mjs (importing it
// would run that check, which exits).
const KNOWN_GOOD = readFileSync(join(ROOT, 'checks', 'regression-baseline.mjs'), 'utf8')
  .match(/export const FIXTURE =([\s\S]*?)\n\n/)[1].match(/'([^']*)'/g).map((s) => s.slice(1, -1)).join('')

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS ✅' : 'FAIL ❌'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) failed++
}

// Labels read off the documents by hand (unit id → label). The fragment is a
// few words so a reader can find the sentence; the text itself stays in the
// gitignored unit files.
const EXPECTED = [
  ['fixture-c-gensler-fandom-2026:p5:7:d4d41cc4b1e6', 'own-current', '"we surveyed 2,752 people"'],
  ['fixture-c-gensler-fandom-2026:p6:1:dadabb4d65ad', 'own-current', '"our post-World Cup survey found"'],
  ['fixture-c-gensler-fandom-2026:p11:4:88b25065f798', 'own-current', '"Our pre-World Cup survey data shows"'],
  ['fixture-c-gensler-fandom-2026:p44:1:196cc4cfb4c6', 'own-current', '"Our analysis found"'],
  ['fixture-c-gensler-fandom-2026:p13:6:a3beba1e0f4b', 'own-prior', '"Gensler research has found"'],
  ['fixture-c-gensler-fandom-2026:p28:1:d3d6705d6798', 'undetermined', '"They also show" (no attributed antecedent)'],
  ['fixture-b-pew-report:p3:0:aa72dd5a1a11', 'own-current', '"For this analysis, we surveyed"'],
  ['fixture-b-pew-report:p28:8:5135d673c6d1', 'own-current', '"Center researchers performed" (the publisher)'],
  ['fixture-b-pew-report:p32:12:6c95e5bad710', 'own-prior', '"Pew Research Center\'s previous work"'],
  ['fixture-b-pew-report:p29:5:5af73d295c1a', 'cited-other', '"procedures from Hur, Achen (2013)"'],
  ['fixture-a-cadre:p7:8:5f788c852f6e', 'cited-other', '"World Economic Forum (2024)"'],
]

const runs = {}
for (const f of FIXTURES) {
  const r = await runFixture(f)
  if (r.status !== 'ok') { console.log(`SKIP ${f.id} — ${r.reason}`); continue }
  runs[f.id] = r
}

function wellFormed(id, analysis) {
  const bad = analysis.claims.filter((c) => {
    const a = c.attribution
    if (!a || !ATTRIBUTION_LABELS.includes(a.label) || !['high', 'low'].includes(a.confidence) || !Array.isArray(a.cues)) return true
    if (a.label === 'undetermined' && !a.reason) return true
    if (c.explanation && c.explanation.attribution !== a) return true
    if (c.overreach && c.overreach.explanation.attribution !== a) return true
    return false
  })
  check(`every claim attributed, explanations carry it [${id}]`, bad.length === 0, bad.length ? `${bad.length} malformed, first: "${bad[0].text.slice(0, 60)}"` : `${analysis.claims.length} claims`)
}

function oneCounter(id, analysis) {
  const sc = analysis.profile.provenance.selfCitation
  const sig = analysis.signals.find((s) => s.id === 'self-citation-dominance')
  const nums = sig ? sig.summary.match(/\((\d+) self-citations? vs (\d+) independent\)/) : null
  const ok = typeof sc.independent === 'number' && (!sig || (nums && Number(nums[1]) === sc.matched && Number(nums[2]) === sc.independent))
  check(`profile and self-citation signal read one counter [${id}]`, ok, `profile ${sc.matched} of ${sc.pool}; signal ${sig ? nums?.slice(1).join(' vs ') : 'absent'}`)
}

// 1, 4 — corpus and fixtures
for (const doc of loadCorpus()) {
  const loaded = await loadDocText(doc)
  if (loaded.status !== 'ok') { console.log(`SKIP ${doc.id} — ${loaded.reason}`); continue }
  const route = routeDocument(loaded.text, { sourceUrl: doc.url || '' })
  const a = analyze(loaded.text, route.judgment.rubric, route.posture, { sourceUrl: doc.url || '' })
  wellFormed(doc.id, a)
  oneCounter(doc.id, a)
}
for (const [id, r] of Object.entries(runs)) { wellFormed(id, r.analysis); oneCounter(id, r.analysis) }

// 2 — real sentences by unit id
for (const [unitId, want, note] of EXPECTED) {
  const fixture = unitId.split(':')[0]
  const r = runs[fixture]
  if (!r) { console.log(`SKIP ${unitId} — fixture absent`); continue }
  const i = r.units.findIndex((u) => u.id === unitId)
  if (i < 0) { check(`${note} is a unit`, false, `${unitId} not found (unit ids moved?)`); continue }
  const got = unitAttribution(r)[i]
  check(`${note} → ${want}`, got.label === want, `${got.label}/${got.confidence} ${got.cues.map((c) => c.cue).join('+')}`)
}

// 3 — Fixture C: the old signal's spans are own-current, none a self-citation
const C = runs['fixture-c-gensler-fandom-2026']
if (!C) console.log('SKIP fixture C — absent')
else {
  // The pre-change-set-3 signal's pattern, kept here only to find what it counted.
  const OLD_SELF_REF = /\b(our data|our study|our analysis|our research|our results|our survey|our internal(?:\s+\w+)?|we found|we measured|we surveyed|company data)\b/i
  const att = unitAttribution(C)
  const hits = C.units.map((u, i) => ({ u, a: att[i] })).filter(({ u }) => OLD_SELF_REF.test(u.text))
  const notOwn = hits.filter(({ a }) => a.label !== 'own-current')
  check('fixture C: the old signal counted 5 sentences', hits.length === 5, `${hits.length}`)
  check('fixture C: all of them are own-current', notOwn.length === 0, notOwn.map(({ u, a }) => `${u.id} ${a.label}`).join('; '))
  const sc = C.analysis.profile.provenance.selfCitation
  const counted = hits.filter(({ u }) => sc.targets.some((t) => u.text.includes(t)))
  check('fixture C: none of them counts as a self-citation', counted.length === 0 && sc.matched === 0, `${sc.matched} self-citations of ${sc.pool}`)
  check('fixture C: the self-citation signal no longer fires', !C.analysis.signals.some((s) => s.id === 'self-citation-dominance'))
}

// 5 — known-good string
{
  const a = analyze(KNOWN_GOOD, getRubric('corporate'), 'research-like')
  const flags = a.claims.filter((c) => c.flag).map((c) => c.flag).sort()
  check('known-good string keeps 1 unsupported-assertion + 1 overconfident', JSON.stringify(flags) === JSON.stringify(['overconfident', 'unsupported-assertion']), flags.join(', '))
  check('known-good string claims are attributed', a.claims.every((c) => c.attribution), a.claims.map((c) => c.attribution.label).join(', '))
}

// 6 — notices
{
  const lex = JSON.parse(readFileSync(join(ROOT, 'src', 'engine', 'lexicons', 'unscientify_lexicon.json'), 'utf8'))
  check('UnScientify lexicon keeps its notice and source commit', /BSD 3-Clause/.test(lex._notice) && /^[0-9a-f]{40}$/.test(lex._source.commit))
  const root = readFileSync(join(ROOT, 'THIRD_PARTY_NOTICES.md'), 'utf8')
  const served = join(ROOT, 'public', 'THIRD_PARTY_NOTICES.md')
  check('THIRD_PARTY_NOTICES.md lists UnScientify', /UnScientify/.test(root) && /BSD 3-Clause/.test(root))
  check('served notices match THIRD_PARTY_NOTICES.md', existsSync(served) && readFileSync(served, 'utf8') === root)
}

if (failed) { console.error(`\n${failed} attribution check(s) failed.`); process.exit(1) }
console.log('\nAttribution checks passed.')
