// ─────────────────────────────────────────────────────────────────────────────
// Hybrid genres (profile/genre.js, rubrics/hybrids.js):
//   · corpus: the genres each document mixes and its primary scenario match the
//     working gold labels (gold.genres, gold.hybrid)
//   · synthetic documents for the scenarios the corpus lacks (sponsored
//     content, brand journalism, independent research, a research explainer,
//     independent reporting, firm research pasted without a link) and guards
//     against false hybrids (multi-source news, a stated non-advocacy policy)
//   · invariants on every routed document: the hybrid's claims are the standard
//     rubric's claims, measured and graded identically; it runs every signal the
//     standard runs; its score is never above the standard's and does not move
//     with the posture; the judgment is deterministic
//   · score ordering under the routed judgment: allen-ehp-2016 above each
//     hybrid built on its study and above the firm and coalition reports;
//     fixture-b-pew-report above hks-human-potential
// Missing corpus documents print SKIP.
// ─────────────────────────────────────────────────────────────────────────────

import { loadCorpus, loadDocText } from './lib/corpus.mjs'
import { routeDocument } from '../src/rubrics/route.js'
import { getRubric, judgmentFor } from '../src/rubrics/index.js'
import { analyze } from '../src/engine/analyze.js'

let ok = true
const log = (label, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`) }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const claimKey = (c) => [c.text, c.tier.key, c.function, c.register.register, c.recommendation.strength, c.rung.key, c.flag].join(' ¦ ')

function invariants(id, text, sourceUrl) {
  const route = routeDocument(text, { sourceUrl })
  const { judgment } = route
  if (!judgment.hybrid) return route
  const base = getRubric(judgment.standard)
  const h = analyze(text, judgment.rubric, route.posture, { sourceUrl })
  const b = analyze(text, base, route.posture, { sourceUrl })
  log(`${id}: hybrid claims identical to the ${base.id} standard's`, same(h.claims.map(claimKey), b.claims.map(claimKey)))
  log(`${id}: runs every ${base.id} signal`, base.documentSignals.every((s) => judgment.rubric.documentSignals.includes(s)))
  log(`${id}: hybrid score ${h.documentScore.score} ≤ ${base.id} score ${b.documentScore.score}`, h.documentScore.score <= b.documentScore.score)
  const byPosture = base.postures.map((p) => analyze(text, judgment.rubric, p, { sourceUrl }).documentScore.score)
  log(`${id}: hybrid score identical across ${base.postures.length} postures`, new Set(byPosture).size === 1, byPosture.join(' / '))
  const again = routeDocument(text, { sourceUrl })
  log(`${id}: judgment is deterministic`, same(again.judgment.genres, judgment.genres) && again.judgment.rubric.id === judgment.rubric.id)
  return route
}

// ── Corpus vs working gold ────────────────────────────────────────────────────
const scores = {}
for (const doc of loadCorpus()) {
  const loaded = await loadDocText(doc)
  if (loaded.status !== 'ok') { console.log(`SKIP ${doc.id} — ${loaded.reason}`); continue }
  const route = invariants(doc.id, loaded.text, doc.url || '')
  const j = route.judgment
  log(`${doc.id}: reads as ${j.genres.join(' × ')}`, same(j.genres, doc.gold.genres), `gold ${doc.gold.genres.join(' × ')}`)
  log(`${doc.id}: scenario ${j.scenarios[0]?.id || 'none'}`, (j.scenarios[0]?.id || undefined) === doc.gold.hybrid, `gold ${doc.gold.hybrid || 'none'}`)
  log(`${doc.id}: held to ${j.standard}`, j.standard === doc.gold.rubric, `gold ${doc.gold.rubric}`)
  scores[doc.id] = analyze(loaded.text, j.rubric, route.posture, { sourceUrl: doc.url || '' }).documentScore.score
}

for (const [hi, lo] of [['allen-ehp-2016', 'hsph-press-2015'], ['allen-ehp-2016', 'gba-news-2015'], ['allen-ehp-2016', 'naava-allen'],
  ['allen-ehp-2016', 'fixture-a-cadre'], ['allen-ehp-2016', 'hks-human-potential'], ['fixture-b-pew-report', 'hks-human-potential']]) {
  if (scores[hi] === undefined || scores[lo] === undefined) { console.log(`SKIP ${hi} > ${lo} — ${scores[hi] === undefined ? hi : lo} unavailable`); continue }
  log(`${hi} (${scores[hi]}) > ${lo} (${scores[lo]}) under the routed judgment`, scores[hi] > scores[lo])
}

// ── Synthetic documents ───────────────────────────────────────────────────────
const SYNTHETIC = [
  {
    id: 'sponsored-on-news-site', url: 'https://www.nytimes.com/paidpost/acme/focus.html', genres: ['journalism', 'corporate'], scenario: 'sponsored-content', standard: 'corporate',
    signal: ['sponsorship-disclosure', 'flag'],
    text: 'How smarter offices sharpen focus\nBy Jane Doe\n\nOpen offices are the single biggest drain on attention, according to workplace consultant Mark Reyes. "Most teams lose two hours a day to noise," Reyes said. Acoustic pods always restore deep work, said Lena Ortiz, who manages facilities at a Chicago bank. The Acme Pod is the proven answer for every modern office.\n\nThis content was produced by Acme Workspace in partnership with the publication’s brand studio.',
  },
  {
    id: 'sponsored-labeled-at-top', url: 'https://www.nytimes.com/paidpost/acme/focus.html', genres: ['journalism', 'corporate'], scenario: 'sponsored-content', standard: 'corporate',
    signal: ['sponsorship-disclosure', 'positive'],
    text: 'Paid post by Acme Workspace\nHow smarter offices sharpen focus\nBy Jane Doe\n\nOpen offices are the single biggest drain on attention, according to workplace consultant Mark Reyes. "Most teams lose two hours a day to noise," Reyes said. Acoustic pods always restore deep work, said Lena Ortiz, who manages facilities at a Chicago bank.',
  },
  {
    id: 'brand-journalism', url: 'https://www.acmeworkspace.com/stories/focus-at-work', genres: ['corporate', 'journalism'], scenario: 'brand-journalism', standard: 'corporate',
    text: 'Inside the quiet revolution in office design\nBy Jane Doe\n\nTeams that switch to focus rooms finish projects faster, according to Acme’s design lead Priya Shah. "We see it on every floor we fit out," Shah said. Facilities managers told us the change is permanent. "Nobody goes back," said Tom Wills of Northfield Bank.',
  },
  {
    id: 'independent-research', url: 'https://jdoe.substack.com/p/daylight-and-attention', genres: ['general', 'research'], scenario: 'independent-research', standard: 'research',
    text: 'Daylight and attention in home offices\n\nAbstract\nWe surveyed 412 remote workers about window access and self-rated attention.\n\nIntroduction\nDaylight is often linked with alertness.\n\nMethods\nWe surveyed 412 remote workers through an online panel in March 2025.\n\nResults\nWorkers with a window reported higher attention scores.\n\nDiscussion\nDaylight may support attention, though the design cannot show cause.',
  },
  {
    id: 'research-explainer', url: 'https://jdoe.substack.com/p/what-the-plant-study-shows', genres: ['general', 'research'], scenario: 'research-explainer', standard: 'general',
    text: 'What the houseplant study actually shows\n\nI keep seeing houseplants sold as cold remedies. The study surveyed 2,000 adults about their homes and their health last winter. People with more plants reported fewer colds. Houseplants prevent colds in every home. You should put one in every room.',
  },
  {
    id: 'independent-reporting', url: 'https://jdoe.substack.com/p/council-vote', genres: ['general', 'journalism'], scenario: 'independent-reporting', standard: 'journalism',
    text: 'The council vote nobody saw coming\nBy Jane Doe\n\nThe council approved the rezoning 5–2 on Tuesday, according to the meeting minutes. "We had the votes a week ago," said councilmember Ana Ruiz. Opponents told me they will appeal. "This is not over," said resident Paul Kim.',
  },
  {
    id: 'firm-research-pasted', url: '', genres: ['corporate', 'research'], scenario: 'firm-research', standard: 'corporate',
    signal: ['undisclosed-interest', 'note'],
    text: 'Human Potential in the Workplace\n\nOur clients ask how space shapes performance. We surveyed 1,200 office workers across 9 countries. The survey of 1,200 respondents used a methodology our team developed; sample size n = 1,200. Figure 1 shows the results. Workers in daylit offices are dramatically more productive. Design always drives engagement.\n\n© 2024 Acme Design, Inc. All rights reserved. © 2024 Acme Design, Inc.',
  },
  {
    id: 'firm-research-disclosed', url: '', genres: ['corporate', 'research'], scenario: 'firm-research', standard: 'corporate',
    signal: ['undisclosed-interest', 'positive'],
    text: 'Human Potential in the Workplace\n\nOur clients ask how space shapes performance. We surveyed 1,200 office workers across 9 countries. The survey of 1,200 respondents used a methodology our team developed; sample size n = 1,200. Figure 1 shows the results. Workers in daylit offices are dramatically more productive.\n\nDisclosure: this research was funded by Acme Design, which designs workplaces.\n\n© 2024 Acme Design, Inc. All rights reserved. © 2024 Acme Design, Inc.',
  },
  {
    id: 'multi-source-news (no firm stake)', url: 'https://www.bdcnetwork.com/news/office-study', genres: ['journalism'], scenario: undefined, standard: 'journalism',
    text: 'Offices are getting quieter\nBy Jane Doe\n\nNoise complaints fell last year, according to the Building Owners Association. "We expected the opposite," said Maria Chen of Northfield University. Architects at Smith & Partners said acoustic panels are now standard. Union officials told reporters the change came from worker demands. "Quiet is a labor issue," said Dan Ortiz of the Office Workers Union.',
  },
  {
    id: 'journal paper about advocacy (no stake)', url: 'https://journals.plos.org/plosone/article?id=x', genres: ['research'], scenario: undefined, standard: 'research',
    text: 'Abstract\nWe study how coalitions shape building codes.\n\nIntroduction\nPolicy advocacy by industry partners is common; coalition members include firms and unions.\n\nMethods\nWe conducted semi-structured interviews with 40 coalition staff.\n\nResults\nAdvocacy efforts focused on raising public awareness.\n\nDiscussion\nIndustry members set the agenda.',
  },
  {
    id: 'non-advocacy nonprofit', url: 'https://www.pewresearch.org/short-reads/x', genres: ['research'], scenario: undefined, standard: 'research',
    text: 'Pew Research Center is a nonpartisan, nonadvocacy fact tank. It does not take policy positions. Members include researchers across many fields, and policy advocacy groups often cite its work. We surveyed 5,273 adults in October 2024. Respondents were drawn from the American Trends Panel.',
  },
]

for (const s of SYNTHETIC) {
  const route = invariants(s.id, s.text, s.url)
  const j = route.judgment
  log(`${s.id}: reads as ${j.genres.join(' × ')}`, same(j.genres, s.genres), `want ${s.genres.join(' × ')}`)
  log(`${s.id}: scenario ${j.scenarios[0]?.id || 'none'}`, j.scenarios[0]?.id === s.scenario, `want ${s.scenario || 'none'}`)
  log(`${s.id}: held to ${j.standard}`, j.standard === s.standard, `want ${s.standard}`)
  if (s.signal) {
    const [sid, kind] = s.signal
    const sig = analyze(s.text, j.rubric, route.posture, { sourceUrl: s.url }).signals.find((x) => x.id === sid)
    const got = !sig ? 'absent' : sig.positive ? 'positive' : sig.severity
    log(`${s.id}: ${sid} is ${kind}`, got === kind, `got ${got}`)
  }
}

// ── Branch-screen overrides recompose ─────────────────────────────────────────
const hks = SYNTHETIC.find((s) => s.id === 'firm-research-pasted')
const hksRoles = routeDocument(hks.text).profile.genre.roles
log('dropping a genre on the branch screen returns the single rubric', judgmentFor(hksRoles, ['research']).rubric === getRubric('research'))
const added = judgmentFor(hksRoles, ['corporate', 'research', 'journalism'])
log('adding a genre on the branch screen keeps the standard and adds that genre’s scenario audits',
  added.standard === 'corporate' && added.scenarios.some((x) => x.id === 'science-news') && added.rubric.documentSignals.includes('study-traceability'))
const allenLike = { speaker: { genre: 'research', kind: 'peer-reviewed-journal' }, form: { genre: 'research', kind: 'research-paper' }, evidence: { genre: 'research', kind: 'own', design: 'rct' } }
const forced = judgmentFor(allenLike, ['research', 'corporate'])
log('a genre added with no role behind it holds the speaker’s standard, adds that genre’s own audits, and says so',
  forced.scenarios[0].id === 'mixed' && forced.standard === 'research' && /No hybrid scenario fits/.test(forced.rubric.hybrid.why) &&
  ['platitude-density', 'self-citation-dominance', 'register-mismatch'].every((id) => forced.rubric.documentSignals.includes(id)))
const labBlog = judgmentFor({ speaker: { genre: 'research', kind: 'nonprofit-research' } }, ['research', 'general'])
log('the posture-gate never joins a mix', !labBlog.rubric.documentSignals.includes('posture-gate'))

if (!ok) { console.error('\nhybrid checks failed.'); process.exit(1) }
console.log('\nHybrid checks passed.')
process.exit(0)
