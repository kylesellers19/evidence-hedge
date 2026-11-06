// ─────────────────────────────────────────────────────────────────────────────
// Ingestion checks (Phase 1): validateText, failure copy, the reader-only
// site-chrome stripper and the mid-word URL un-splice. Plain Node, no network:
// the two failure bodies below are the reader's real responses for the corpus
// test URLs, captured 2026-11-06 and tagged with their corpus ids.
// ─────────────────────────────────────────────────────────────────────────────

import { validateText, MIN_LINK_WORDS } from '../src/ingest/validateText.js'
import { failureCopy } from '../src/ingest/failureCopy.js'
import { isChromeLine, stripChromeLines } from '../src/ingest/chromeLines.js'
import { unspliceUrls } from '../src/ingest/normalizer.js'
import { fetchLink, READER } from '../src/ingest/fetchLink.js'
import { extractFile } from '../src/ingest/extractFile.js'
import { ExtractionError } from '../src/ingest/errors.js'

let ok = true
const log = (label, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`) }

// reading-jones-2025 testUrl (centaur.reading.ac.uk) through the reader: a bot wall.
const BOT_WALL = "Making sure you're not a bot!\n \nLoading...\nPlease wait a moment while we ensure the security of your connection."
// sciencealert-plants testUrl through the reader: HTTP 403 with a JSON envelope (message trimmed).
const READER_403 = JSON.stringify({ data: null, code: 403, name: 'AbuseAlleviationError', status: 40305, message: 'Anonymous access to domain www.sciencealert.com blocked until Fri Nov 06 2026 03:25:45 GMT+0000' })
const LONG = Array(40).fill('Stale air in offices can lower cognitive function by half, researchers said.').join(' ')

// ── validateText ─────────────────────────────────────────────────────────────
log('bot wall → blocked (every path)', ['link', 'file', 'paste'].every((path) => validateText(BOT_WALL, { path }).reason === 'blocked'))
const re = validateText(READER_403, { path: 'paste' })
log('reader 403 envelope → reader-error, named', re.reason === 'reader-error' && re.detail.name === 'AbuseAlleviationError' && re.detail.code === 403)
log('name ending in "Error" alone → reader-error', validateText('{"name":"TimeoutError","message":"x"}').reason === 'reader-error')
log(`under ${MIN_LINK_WORDS} words → too-short on the link path`, validateText('Thirty words or so of real text.', { path: 'link' }).reason === 'too-short')
log('too-short never applies to paste or file', validateText('Thirty words or so of real text.', { path: 'paste' }).ok && validateText('Short text here.', { path: 'file' }).ok)
log('long article that mentions "access denied" is not a wall',
  validateText(LONG + ' The tenant was told access denied at the door.', { path: 'link' }).ok)
log('ordinary JSON-looking text without an error code passes', validateText('{"note": "a quoted object"} ' + LONG, { path: 'link' }).ok)

// ── failure copy: one actionable sentence per reason, never one generic line ──
const reasons = [
  { reason: 'reader-error', detail: re.detail, host: 'sciencealert.com' },
  { reason: 'blocked', host: 'centaur.reading.ac.uk' },
  { reason: 'too-short', detail: { words: 42 } },
  { reason: 'rate-limited' }, { reason: 'timeout' }, { reason: 'network' }, { reason: 'empty' },
  { reason: 'status', detail: { status: 502 }, host: 'example.com' },
  { reason: 'extract', kind: 'scanned' },
]
const copies = reasons.map(failureCopy)
log('each reason has its own sentence', new Set(copies).size === copies.length)
log('each is one sentence ending in a full stop', copies.every((c) => /\.$/.test(c) && (c.match(/\. /g) || []).length === 0), copies.find((c) => (c.match(/\. /g) || []).length))
log('ScienceAlert → its specific message (reader, host, error name)',
  /sciencealert\.com/.test(copies[0]) && /AbuseAlleviationError/.test(copies[0]), copies[0])
log('bot wall → names the bot check', /bot check/.test(copies[1]), copies[1])

// ── the two corpus test URLs never become documents (fetch mocked) ───────────
const respond = (body, type, status = 200) => new Response(body, { status, headers: { 'content-type': type } })
globalThis.fetch = async (url) => {
  if (!url.startsWith(READER)) throw new TypeError('Failed to fetch') // CORS-blocked direct attempt
  return /centaur/.test(decodeURIComponent(url)) ? respond(BOT_WALL, 'text/plain') : respond(READER_403, 'application/json', 403)
}
const wall = await fetchLink('https://centaur.reading.ac.uk/123665/1/1-s2.0-S2352710225017139-main.pdf')
log('reading-jones-2025 test URL → blocked, no text', !wall.ok && wall.reason === 'blocked' && !wall.text, JSON.stringify({ reason: wall.reason, host: wall.host }))
const r403 = await fetchLink('https://www.sciencealert.com/a-nasa-study-about-houseplants-has-been-widely-misread-scientist-says')
log('sciencealert-plants test URL → reader-error, no text', !r403.ok && r403.reason === 'reader-error' && !r403.text, JSON.stringify({ reason: r403.reason, host: r403.host }))
let fileReason = null
try { await extractFile(new File([BOT_WALL], 'saved-page.txt', { type: 'text/plain' })) } catch (e) { fileReason = e instanceof ExtractionError ? e.kind : e.message }
log('a saved bot-wall file is refused on upload', fileReason === 'blocked', fileReason)

// ── site-chrome stripper (reader only) ───────────────────────────────────────
const chrome = [
  ['Skip to main content', 'allen-ehp-2016'],
  ['Log in or Sign up to save your favorite articles', 'gba-news-2015'],
  ['Find articles by Piers MacNaughton 1, Usha Satish', 'allen-ehp-2016'],
  ['Privacy Statement | Cookie Descriptions', 'gensler-gws-2024'],
  ['X Facebook Threads LinkedIn WhatsApp Mail', 'fixture-b-pew-html'],
]
for (const [line, id] of chrome) log(`chrome dropped [${id}]: "${line}"`, isChromeLine(line))
const keep = [
  ['Stale air in offices can lower cognitive function by half, researchers said, suggesting fresh air is one key to improved productivity among workers.', 'gba-news-2015'],
  ['Green Building News', 'gba-news-2015'],
  ['Strengths and Limitations', 'allen-ehp-2016'],
  ['Your cart is empty', 'co2meter-plants'], // has a finite verb → kept (rule, not lexicon, decides)
]
for (const [line, id] of keep) log(`kept [${id}]: "${line.slice(0, 60)}"`, !isChromeLine(line))
const stripped = stripChromeLines('Skip to content\nStuffy Offices Lower Cognitive Function\nLog in or Sign up to save your favorite articles\nStale air in offices can lower cognitive function by half.')
log('stripper reports what it dropped', stripped.dropped.length === 2 && /Stuffy Offices/.test(stripped.text), JSON.stringify(stripped.dropped))

// ── mid-word URL splice (fixture-a-cadre) ────────────────────────────────────
const cadre = 'how the built and natural envihttps://neurocivitas.group.cam.ac.uk/ ronment can advance human health'
log('[fixture-a-cadre] "envi<url> ronment" → "environment <url>"', unspliceUrls(cadre) === 'how the built and natural environment https://neurocivitas.group.cam.ac.uk/ can advance human health', unspliceUrls(cadre))
log('a URL after a space is untouched', unspliceUrls('See https://example.org/ for details.') === 'See https://example.org/ for details.')

if (!ok) { console.error('\ningest checks failed.'); process.exit(1) }
console.log('\nAll ingest checks passed.')
process.exit(0)
