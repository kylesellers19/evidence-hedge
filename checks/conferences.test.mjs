import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { VERDICTS, readFilters, writeFilter, selectSessions, formatDate, formatLocator, claimSourceUrl, chronology, validateRelease } from '../src/conferences/model.js'

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8')
const release = JSON.parse(read('src/conferences/release.json'))
const body = read(`public/${release.path}`)
const data = validateRelease(JSON.parse(body))
const sessions = data.sessions
const claims = sessions.flatMap((s) => s.claims)
const evidence = new Map(data.evidence.map((e) => [e.id, e]))
const cm = new Map(claims.map((c) => [c.id, c]))
const sm = new Map(sessions.map((s) => [s.id, s]))
const domains = [...new Set(sessions.map((s) => s.domain))]
const defaults = readFilters(new URLSearchParams(), domains)
let checks = 0
function test(name, run) { run(); checks++; console.log(`PASS ${name}`) }

test('release fingerprint and date match the immutable public file', () => {
  assert.equal(createHash('sha256').update(body).digest('hex'), release.sha256)
  assert.equal(data.release, release.date)
})
test('discovery, review and new-access denominators stay separate', () => {
  assert.equal(new Set(sessions.map((s) => s.id)).size, 99)
  assert.equal(sessions.filter((s) => s.originalCatalogue).length, 89)
  assert.equal(sessions.filter((s) => s.firstPass).length, 15)
  assert.equal(sessions.filter((s) => s.reviewed).length, 17)
  assert.equal(sessions.filter((s) => s.originalCatalogue && !s.reviewed).length, 72)
  assert.equal(sessions.filter((s) => !s.originalCatalogue).length, 10)
  assert.equal(claims.length, 86)
  assert.equal(cm.size, 86)
  assert.equal(evidence.size, 178)
  assert.equal(data.access.leads.length, 30)
  assert(sessions.filter((s) => !s.reviewed).every((s) => s.claims.length === 0))
  assert(sessions.every((s) => !Object.hasOwn(s, 'score')))
  assert.deepEqual(data.eventWindow, ['2024-11-21', '2026-11-21'])
})
test('every reviewed claim has source, context, criteria and resolvable evidence', () => {
  for (const c of claims) {
    assert(VERDICTS.includes(c.verdict), c.id)
    assert.equal(c.review.final, c.verdict, c.id)
    assert(c.statement && c.scope && c.context && c.rationale && c.sourceUrl && c.speaker, c.id)
    assert.match(c.sourceSpanHash, /^[a-f0-9]{64}$/)
    assert(c.criteria.length && c.criteria.every((r) => data.criteria.some((d) => d.code === r.code) && r.reason), c.id)
    assert(c.evidenceIds.every((id) => evidence.has(id)), c.id)
    assert(c.evidenceIds.length || c.verdict === 'Not empirical' || c.unresolved.length, c.id)
    assert(formatLocator(c.locator), c.id)
  }
  for (const e of data.evidence) assert(e.availableAtEvent === null || typeof e.availableAtEvent === 'boolean', e.id)
})
test('adjudication and chronology survive publication', () => {
  const expansion = claims.filter((c) => c.stage === 'Expansion')
  const pilot = claims.filter((c) => c.stage === 'Pilot')
  assert.equal(expansion.length, 66)
  assert.equal(expansion.filter((c) => c.review.agreed).length, 52)
  assert.equal(pilot.filter((c) => c.review.agreed).length, 18)
  assert.equal(cm.get('T10-C02').review.primary, 'Overstated')
  assert.equal(cm.get('T10-C02').verdict, 'Supported')
  assert.match(cm.get('T10-C02').statement, /expected/)
  assert.match(cm.get('T10-C02').rationale, /1,514/)
  assert.equal(cm.get('EC06-C03').verdict, 'Overstated')
  assert.match(cm.get('EC06-C03').scope, /scale/)
  assert.equal(cm.get('EC29-C02').verdict, 'Indeterminate')
  assert(cm.get('EC29-C02').evidenceIds.includes('EC29-R2-E03'))
  assert.equal(evidence.get('H12-E05').availableAtEvent, false)
  assert.equal(chronology(evidence.get('H12-E05')), 'Later evidence')
  assert.equal(chronology({ availableAtEvent: null }), 'Event-time availability unresolved')
  assert.notEqual(cm.get('EC04-C01').sourceUrl, cm.get('EC04-C04').sourceUrl)
  assert.match(claimSourceUrl(cm.get('EC04-C01')), /8cQ3qf6Za5A/)
  assert.match(claimSourceUrl(cm.get('EC04-C04')), /O6plkT8WlTU/)
})
test('summary counts reconcile without producing a session score', () => {
  const expected = { Supported:31, Overstated:18, Contradicted:4, Unsubstantiated:5, Indeterminate:18, 'Not empirical':10 }
  assert.deepEqual(data.counts.verdicts, expected)
  for (const [v,n] of Object.entries(expected)) assert.equal(claims.filter((c) => c.verdict === v).length, n)
})
test('source boundaries and date precision remain readable', () => {
  assert.match(sm.get('H01').unit.boundaries, /^00:00–51:40/)
  assert.equal(sm.get('H01').date, '2026-06-24')
  assert.equal(sm.get('H01').speakers.length, 4)
  assert(sm.get('T10').speakers.includes('Chris Peterson'))
  assert.match(sm.get('EC26').unit.boundaries, /3:13:43–4:26:09/)
  assert.equal(formatDate('2025-09'), 'Sept. 2025')
  assert.equal(formatDate('2025-10-20/2025-10-21'), 'Oct. 20, 2025–Oct. 21, 2025')
  assert.equal(formatDate('2025-02-25 to 2025-02-26'), 'Feb. 25, 2025–Feb. 26, 2025')
  assert.match(data.access.speechChecks.find((s) => s.session_id === 'EC30').limitations, /Schedule|delivery/i)
})
test('public data carries safe URLs and short quotations, never local research text or paths', () => {
  const quoteWords = new Map()
  for (const s of sessions) {
    assert.match(s.id, /^[A-Z0-9-]+$/)
    assert(s.sources.length)
    for (const c of s.claims) quoteWords.set(c.sourceUrl, (quoteWords.get(c.sourceUrl) || 0) + c.excerpt.split(/\s+/).length)
  }
  assert([...quoteWords.values()].every((n) => n <= 25))
  function visit(value, key = '') {
    assert(!['full_wording','full_wording_local_reference','source_files','raw_record_file','snapshot_markdown','second_review_source_urls'].includes(key), key)
    if (typeof value === 'string') {
      assert(!/\/Users\/|file:\/\/|plugin:\/\/|\[object Object\]/.test(value), key)
      if (/^(?:https?:|javascript:|data:)/.test(value)) {
        const u = new URL(value)
        assert.equal(u.protocol, 'https:', key)
        assert(!/\s/.test(value), key)
      }
    } else if (value && typeof value === 'object') for (const [k,v] of Object.entries(value)) visit(v,k)
  }
  visit(data)
})
test('filters search claim text and speakers without mixing unlike populations', () => {
  assert.equal(selectSessions(data, defaults).length, 17)
  assert.equal(selectSessions(data, defaults, true).length, 89)
  assert.equal(selectSessions(data, {...defaults,show:'unreviewed'},true).length,72)
  assert.equal(selectSessions(data, {...defaults,show:'unreviewed',verdict:'Supported'},true).length,0)
  assert.deepEqual(selectSessions(data, {...defaults,q:'Tomas Puig'}).map((r)=>r.session.id), ['ROOT01'])
  const filtered=selectSessions(data, {...defaults,domain:'Climate and energy',verdict:'Supported'})
  assert.deepEqual(filtered.map((r)=>r.session.id),['EC15'])
  assert.equal(filtered[0].claims.length,2)
  assert.equal(selectSessions(data,{...defaults,q:'a completely absent search 789987'}).length,0)
  assert(selectSessions(data,{...defaults,q:'baseline retention'}).some((r)=>r.session.id==='H01'))
})
test('bookmark state handles invalid parameters, punctuation and clears without losing unrelated keys', () => {
  const bad=readFilters(new URLSearchParams('domain=nope&verdict=Fiction&sort=bad&view=bad&show=bad&q=%3Cscript%3E'),domains)
  assert.equal(bad.domain,'');assert.equal(bad.verdict,'');assert.equal(bad.sort,'date-desc');assert.equal(bad.view,'sessions')
  assert.equal(bad.q,'<script>')
  const params=new URLSearchParams('q=energy&view=claims&domain=Climate+and+energy')
  const next=writeFilter(params,'q','')
  assert.equal(next.has('q'),false);assert.equal(next.get('view'),'claims');assert.equal(params.get('q'),'energy')
  assert.equal(writeFilter(next,'view','sessions').has('view'),false)
  assert.equal(readFilters(new URLSearchParams({q:'x'.repeat(300)}),domains).q.length,250)
})
test('sorting leaves original release order unchanged and dates keep uncertainty', () => {
  const before=JSON.stringify(data)
  const asc=selectSessions(data,{...defaults,sort:'date-asc'})
  assert.equal(asc[0].session.id,'ROOT01')
  assert.equal(asc.at(-1).session.id,'H01')
  selectSessions(data,{...defaults,sort:'title'})
  assert.equal(JSON.stringify(data),before)
})
test('deep source links use the correct clock and do not alter PDF citations', () => {
  const c=cm.get('EC15-C03')
  assert.equal(new URL(claimSourceUrl({...c,sourceUrl:'https://www.youtube.com/watch?v=U1EtnWBmk8A'})).searchParams.get('t'),'174')
  assert.equal(claimSourceUrl(cm.get('T03-C01')),cm.get('T03-C01').sourceUrl)
  assert.equal(formatLocator({start_ms:169599,end_ms:185600}),'02:49–03:05')
  assert.equal(formatLocator({text:'PDF p. 8, paragraph 2'}),'PDF p. 8, paragraph 2')
})
test('malformed release responses fail explicitly', () => {
  assert.throws(()=>validateRelease({sessions:[]}))
  assert.throws(()=>validateRelease(null))
})
console.log(`\n${checks} conference checks passed; 99 session records, 86 claims and 178 evidence records validated.`)
