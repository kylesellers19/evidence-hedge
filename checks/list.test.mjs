// ─────────────────────────────────────────────────────────────────────────────
// The List (src/list/):
//   · sorting by up to three columns: each level breaks the ties of the one
//     above, ties keep their arrival order, blanks sort last either way, a
//     fourth level is never applied
//   · heading clicks: a plain click sorts by that column alone (again flips
//     it); Shift-click adds the next level, flips an existing one, and takes
//     the last level's place once three are set
//   · the sort controls: none clears a level and those below; a column chosen
//     at a second level moves there
//   · the entry sent to The List carries the confirmed details, the score, the
//     engine build and the text's SHA-256, and never the document's text
//   · the add form's rules, AP dates, and the table definition's vocabularies
//     match src/list/fields.js (docs/the-list.sql)
//   · finding reports (src/list/filter.js): the search needs every word in the
//     firm or report name and drops "and"; nothing typed reaches the table's
//     query but letters and digits; the score bands are the brief's; the
//     static List and the table's query apply the same filters; the address
//     holds every choice, ignores what The List lacks and keeps the rest
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { LIST_FIELDS, INDUSTRIES, REPORT_TYPES, MAX_SORTS } from '../src/list/fields.js'
import { sortEntries, clickHeading, setLevel } from '../src/list/sort.js'
import { draftEntry, validateEntry, buildEntry, docHash, apDate, apDatePartial, guessReportName } from '../src/list/entry.js'
import { NO_FILTERS, SCORE_BANDS, searchWords, matches, restFilter, readParams, writeParams, isFiltered, median } from '../src/list/filter.js'
import { bandFor } from '../src/engine/scoreDocument.js'

let ok = true
const log = (label, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`) }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const ids = (rows) => rows.map((r) => r.id).join(',')

// ── sorting ──────────────────────────────────────────────────────────────────
const rows = [
  { id: 1, company: 'beta', industry: 'Energy', reportType: 'White paper', reportName: 'B', publishedOn: '2025-03-01', score: 6.1 },
  { id: 2, company: 'Alpha', industry: 'Energy', reportType: 'Press release', reportName: 'A', publishedOn: '2026-01-15', score: 6.1 },
  { id: 3, company: 'Gamma', industry: 'Utilities', reportType: 'White paper', reportName: 'C', publishedOn: '', score: 8.4 },
  { id: 4, company: 'alpha', industry: 'Energy', reportType: 'White paper', reportName: 'D', publishedOn: '2024-07-04', score: 3.2 },
  { id: 5, company: 'Delta', industry: 'Utilities', reportType: 'Research report', reportName: 'E', publishedOn: '2026-01-15', score: 6.1 },
]
log('no sort keeps arrival order', ids(sortEntries(rows, [])) === '1,2,3,4,5')
log('text sorts ignore case; ties keep arrival order', ids(sortEntries(rows, [{ key: 'company', dir: 'asc' }])) === '2,4,1,5,3')
log('numbers sort high to low', ids(sortEntries(rows, [{ key: 'score', dir: 'desc' }])) === '3,1,2,5,4')
log('a second level breaks the first level’s ties',
  ids(sortEntries(rows, [{ key: 'score', dir: 'desc' }, { key: 'company', dir: 'asc' }])) === '3,2,1,5,4')
log('a third level breaks the second level’s ties',
  ids(sortEntries(rows, [{ key: 'industry', dir: 'asc' }, { key: 'score', dir: 'desc' }, { key: 'publishedOn', dir: 'asc' }])) === '1,2,4,3,5')
log('blank dates sort last, newest first', ids(sortEntries(rows, [{ key: 'publishedOn', dir: 'desc' }])) === '2,5,1,4,3')
log('blank dates sort last, oldest first too', ids(sortEntries(rows, [{ key: 'publishedOn', dir: 'asc' }])) === '4,1,2,5,3')
const four = [{ key: 'industry', dir: 'asc' }, { key: 'reportType', dir: 'asc' }, { key: 'score', dir: 'asc' }, { key: 'company', dir: 'desc' }]
log(`a level past ${MAX_SORTS} is never applied`, same(sortEntries(rows, four), sortEntries(rows, four.slice(0, MAX_SORTS))))
log('sorting never changes its input', ids(rows) === '1,2,3,4,5')

// ── heading clicks ───────────────────────────────────────────────────────────
let s = clickHeading([], 'score')
log('a click sorts by that column, in its first direction', same(s, [{ key: 'score', dir: 'desc' }]))
s = clickHeading(s, 'score')
log('a second click flips it', same(s, [{ key: 'score', dir: 'asc' }]))
s = clickHeading(s, 'company', { add: true })
s = clickHeading(s, 'publishedOn', { add: true })
log('Shift-click adds levels', same(s.map((x) => x.key), ['score', 'company', 'publishedOn']))
s = clickHeading(s, 'industry', { add: true })
log('a fourth Shift-click takes the third level’s place', same(s.map((x) => x.key), ['score', 'company', 'industry']))
s = clickHeading(s, 'company', { add: true })
log('Shift-click on a level flips it in place', s[1].key === 'company' && s[1].dir === 'desc')
log('a plain click starts over with one column', same(clickHeading(s, 'reportName'), [{ key: 'reportName', dir: 'asc' }]))

// ── sort controls ────────────────────────────────────────────────────────────
const three = [{ key: 'score', dir: 'desc' }, { key: 'company', dir: 'asc' }, { key: 'industry', dir: 'asc' }]
log('none at the second level clears it and the third', same(setLevel(three, 1, '', null), three.slice(0, 1)))
log('a column already at the third level moves to the second',
  same(setLevel(three, 1, 'industry', 'desc'), [{ key: 'score', dir: 'desc' }, { key: 'industry', dir: 'desc' }]))
log('a direction change keeps the column', same(setLevel(three, 0, 'score', 'asc')[0], { key: 'score', dir: 'asc' }))

// ── finding reports ──────────────────────────────────────────────────────────
log('the search splits into words and drops "and"',
  same(searchWords('Perkins and Will'), ['perkins', 'will']) && same(searchWords('Perkins&Will'), ['perkins', 'will']) && same(searchWords('  '), []))
log('a search word is only letters and digits', same(searchWords('a,b(c)"d*e%f\\g.h'), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']))
log('letters outside English stay letters', same(searchWords('Société Générale'), ['société', 'générale']))

const found = [
  { id: 1, company: 'Perkins&Will', industry: 'Professional services and consulting', reportType: 'Research report', reportName: 'Healthy Materials', score: 2.5, origin: 'audit' },
  { id: 2, company: 'Arup', industry: 'Professional services and consulting', reportType: 'White paper', reportName: 'Cities Alive', score: 4.49, origin: 'audit' },
  { id: 3, company: 'Turner & Townsend', industry: 'Industrials', reportType: 'Industry or market report', reportName: 'Will costs fall?', score: 4.5 },
  { id: 4, company: 'Arup', industry: 'Professional services and consulting', reportType: 'Research report', reportName: 'Perkins study', score: 8.5, origin: 'reader' },
  { id: 5, company: 'Gensler', industry: 'Professional services and consulting', reportType: 'Survey report', reportName: 'Workplace Survey', score: 1 },
]
const keep = (f) => ids(found.filter((r) => matches(r, { ...NO_FILTERS, ...f })))
log('no filters keep every report', keep({}) === '1,2,3,4,5' && !isFiltered(NO_FILTERS))
log('every word has to appear, in the firm or the report name', keep({ q: 'perkins and will' }) === '1' && keep({ q: 'arup perkins' }) === '4' && keep({ q: 'will' }) === '1,3')
log('the search ignores case', keep({ q: 'GENSLER' }) === '5')
log('a firm is its exact name', keep({ firm: 'Arup' }) === '2,4' && keep({ firm: 'arup' }) === '')
log('industry, report type and who added it narrow the list',
  keep({ industry: 'Industrials' }) === '3' && keep({ type: 'Research report' }) === '1,4' && keep({ show: 'reader' }) === '3,4,5' && keep({ show: 'audit' }) === '1,2')
log('a score band runs from its threshold up to the next',
  keep({ score: 'weak' }) === '1,2' && keep({ score: 'mixed' }) === '3' && keep({ score: 'strong' }) === '4' && keep({ score: 'failing' }) === '5')
log('the score bands are the brief’s, each whole number in one',
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every((n) => SCORE_BANDS.filter((b) => n >= b.min && (b.max === null || n < b.max)).map((b) => b.key).join() === bandFor(n)))
log('the score bands are worded as whole numbers', same(SCORE_BANDS.map((b) => b.label), ['Strong (9 to 10)', 'Carried (7 to 8)', 'Mixed (5 to 6)', 'Weak (3 to 4)', 'Failing (1 to 2)']))

const rest = decodeURIComponent(restFilter({ q: 'Perkins & Will', firm: 'Turner & Townsend', industry: 'Industrials', type: 'White paper', score: 'weak', show: 'audit' }))
log('the table is asked the same: every word in either name',
  rest.includes('&and=(or(company.ilike.*perkins*,report_name.ilike.*perkins*),or(company.ilike.*will*,report_name.ilike.*will*))'), rest)
log('the table is asked the same: exact firm, industry, type, band and origin',
  ['company=eq.Turner & Townsend', 'industry=eq.Industrials', 'report_type=eq.White paper', 'score=gte.2.5', 'score=lt.4.5', 'origin=eq.audit'].every((p) => rest.includes(`&${p}`)), rest)
log('a firm name with an ampersand cannot split the query', restFilter({ firm: 'Turner & Townsend' }) === '&company=eq.Turner%20%26%20Townsend')
log('the top band has no ceiling', restFilter({ score: 'strong' }) === '&score=gte.8.5')
log('a table without origins is not asked for one', !restFilter({ show: 'reader' }, { origin: false }).includes('origin'))
const typed = restFilter({ q: 'a,b(c)"d*' })
log('nothing typed reaches the query but a word', decodeURIComponent(typed) ===
  `&and=(${['a', 'b', 'c', 'd'].map((w) => `or(company.ilike.*${w}*,report_name.ilike.*${w}*)`).join(',')})`, typed)

const address = new URLSearchParams('v=ae74748c&q=arup&firm=Turner+%26+Townsend&industry=industrials&type=white-paper&score=weak&show=audit&sort=score.desc,company.asc')
const back = readParams(address)
log('an address gives back the filters and sort',
  same(back.filters, { q: 'arup', firm: 'Turner & Townsend', industry: 'Industrials', type: 'White paper', score: 'weak', show: 'audit' }) &&
  same(back.sorts, [{ key: 'score', dir: 'desc' }, { key: 'company', dir: 'asc' }]))
log('writing them back gives the same address', writeParams(address, back).toString() === address.toString(), writeParams(address, back).toString())
const odd = readParams(new URLSearchParams('industry=mining&type=memo&score=great&show=everyone&sort=score.up,colour.asc,score.asc,company.desc,score.desc,industry.asc,reportName.asc'))
log('an address naming what The List lacks is ignored, and a column sorts once, three at most', same(odd.filters, NO_FILTERS) &&
  same(odd.sorts, [{ key: 'score', dir: 'asc' }, { key: 'company', dir: 'desc' }, { key: 'industry', dir: 'asc' }]), JSON.stringify(odd))
log('choices cleared leave only the rest of the address', writeParams(address, { filters: NO_FILTERS, sorts: [] }).toString() === 'v=ae74748c')
log('a median', median([3, 1, 2]) === 2 && median([4, 1, 3, 2]) === 2.5 && median([]) === null)

// ── the entry sent to The List ───────────────────────────────────────────────
const text = 'Acme 2026 Outlook\n\nOur platform cuts costs by 40%, a confidential figure nobody should see.'
const draft = { company: '  Acme   Corp ', industry: 'Energy', reportType: 'White paper', reportName: 'Acme 2026 Outlook', publishedOn: '2026-02-03' }
const hash = await docHash(text)
const entry = buildEntry(draft, { score: 4.26, engine: 'af3c2e7', docHash: hash })
log('the fingerprint is the text’s SHA-256', hash === createHash('sha256').update(text).digest('hex'))
log('the entry holds only the listed fields',
  same(Object.keys(entry).sort(), ['company', 'docHash', 'engine', 'industry', 'publishedOn', 'reportName', 'reportType', 'score']))
const sent = JSON.stringify(entry)
log('the document’s text is never in the entry', !sent.includes('confidential') && !sent.includes('40%'))
log('details are tidied and the score kept to one decimal', entry.company === 'Acme Corp' && entry.score === 4.3)

const today = '2026-11-08'
log('a complete draft passes', same(validateEntry(draft, { today }), {}))
const bad = validateEntry({ company: '', industry: 'Mining', reportType: 'Memo', reportName: ' ', publishedOn: '2027-01-01' }, { today })
log('every field is checked', same(Object.keys(bad).sort(), ['company', 'industry', 'publishedOn', 'reportName', 'reportType']))
log('a malformed date is refused', 'publishedOn' in validateEntry({ ...draft, publishedOn: '02/03/2026' }, { today }))

const pressResult = { profile: { genre: { roles: { form: { kind: 'press-release' } } } } }
log('the engine’s reading of the form suggests the report type', draftEntry({ text, result: pressResult }).reportType === 'Press release')
log('a file name suggests the report name', guessReportName('', { filename: 'CADRE+Building+Brains+Report+Final (1).pdf' }) === 'CADRE Building Brains Report Final')
log('else the first short line does', guessReportName(text, {}) === 'Acme 2026 Outlook')

log('AP dates', apDate('2026-10-29') === 'Oct. 29, 2026' && apDate('2026-03-05') === 'March 5, 2026' && apDate('2025-09-01') === 'Sept. 1, 2025' && apDate('') === '')

// ── the table definition agrees with the form ────────────────────────────────
const sql = readFileSync(new URL('../docs/the-list.sql', import.meta.url), 'utf8')
const missing = [...INDUSTRIES, ...REPORT_TYPES].filter((v) => !sql.includes(`'${v}'`))
log('docs/the-list.sql allows every industry and report type the form offers', missing.length === 0, missing.join(', '))
// Version 2: the corpus audit's entries sit beside readers' own.
log('docs/the-list.sql adds a link, an origin, a date precision and claim counts',
  ['source_url', 'origin', 'published_precision', 'claims', 'flagged'].every((c) => new RegExp(`add column if not exists ${c}\\b`).test(sql)))
log("the public key adds only readers' entries, with a full date",
  /for insert[\s\S]{0,80}with check \(origin = 'reader' and published_precision = 'day' and published_on is not null\)/.test(sql.split('Version 2')[1] || ''))
log('a date known to its month or year shows as one',
  apDatePartial('2023-11-01', 'month') === 'Nov. 2023' && apDatePartial('2019-01-01', 'year') === '2019' && apDatePartial(null, 'unknown') === 'Unknown' && apDatePartial('2026-10-29') === 'Oct. 29, 2026')
const store = readFileSync(new URL('../src/list/store.js', import.meta.url), 'utf8')
const columns = (store.match(/const COLUMNS = '([^']+)'/) || [])[1] || ''
log('a page of The List asks for no document text', columns && !/text|body|content|doc_hash/.test(columns), columns)
log('The List has the six columns asked for',
  same(LIST_FIELDS.map((f) => f.label), ['Company', 'Industry', 'Report type', 'Report name', 'Publication date', 'Score']))

if (!ok) { console.error('\nList checks failed.'); process.exit(1) }
console.log('\nList checks passed.')
process.exit(0)
