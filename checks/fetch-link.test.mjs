// ─────────────────────────────────────────────────────────────────────────────
// Link fetch routing (src/ingest/fetchLink.js), with fetch mocked — no network.
// A document the host lets the browser download goes through the upload
// extractors; a web page or a CORS-blocked link goes to the Jina reader at
// r.jina.ai (the earlier r.jina.ac host does not exist), in plain-text mode.
// Plain Node.
// ─────────────────────────────────────────────────────────────────────────────

import { fetchLink, docExtFor, normalizeUrl, READER } from '../src/ingest/fetchLink.js'

let ok = true
const log = (label, pass, extra = '') => {
  if (!pass) ok = false
  console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`)
}

// Mock: `direct(url)` answers the browser's own request, `reader(url, opts)` the
// Jina request. Each returns a Response, or throws to simulate a CORS block.
let calls = []
function mock({ direct, reader }) {
  calls = []
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({ url, opts })
    return url.startsWith(READER) ? reader(url, opts) : direct(url, opts)
  }
}
const corsBlocked = () => { throw new TypeError('Failed to fetch') }
const respond = (body, type, status = 200) =>
  new Response(body, { status, headers: type ? { 'content-type': type } : {} })
const readerText = (body) => () => respond(body, 'text/plain; charset=utf-8')

const ARTICLE = 'Our platform is the #1 best-in-class solution and is unmatched in the industry.'

// 1. Web page, CORS blocked → reader, plain-text mode, on r.jina.ai.
mock({ direct: corsBlocked, reader: readerText(ARTICLE) })
let r = await fetchLink('https://example.com/post')
const readerCall = calls.find((c) => c.url.startsWith(READER))
log('CORS-blocked page falls back to the reader', r.ok && r.via === 'reader', JSON.stringify({ via: r.via, reason: r.reason }))
log('reader host is r.jina.ai', !!readerCall && readerCall.url.startsWith('https://r.jina.ai/'), readerCall?.url)
log('reader asked for plain text', readerCall?.opts?.headers?.['X-Return-Format'] === 'text')
log('reader strips nav/footer/aside chrome', /\bnav\b/.test(readerCall?.opts?.headers?.['X-Remove-Selector'] || ''))
log('reader text reaches the pipeline', r.text === ARTICLE)

// 2. Web page the host serves with CORS → still the reader (pages need rendering).
mock({ direct: () => respond('<html><body>page</body></html>', 'text/html; charset=utf-8'), reader: readerText(ARTICLE) })
r = await fetchLink('https://example.com/post')
log('CORS-readable HTML page still goes to the reader', r.ok && r.via === 'reader')

// 3. Downloadable document → upload extractors, no reader call.
mock({ direct: () => respond('Line one of the report.\n\nLine two.', 'text/plain'), reader: readerText('WRONG') })
r = await fetchLink('https://example.com/report.txt')
log('downloadable TXT goes through the upload extractor', r.ok && r.via === 'download', JSON.stringify(r.text))
log('no reader call when the download works', !calls.some((c) => c.url.startsWith(READER)))

// 4. Generic content type → judged by the URL's extension.
mock({ direct: () => respond('# Title\n\nBody text here.', 'application/octet-stream'), reader: readerText('WRONG') })
r = await fetchLink('https://example.com/notes.md')
log('octet-stream .md link is treated as a document', r.ok && r.via === 'download')

// 5. Legacy .doc → the upload path's designed message, not a generic failure.
mock({ direct: () => respond('binary', 'application/msword'), reader: readerText('WRONG') })
r = await fetchLink('https://example.com/old.doc')
log('legacy .doc link surfaces the legacy-doc state', !r.ok && r.reason === 'extract' && r.kind === 'legacy-doc', JSON.stringify(r))

// 6. Reader failure states.
mock({ direct: corsBlocked, reader: () => respond('{"code":429}', 'application/json', 429) })
r = await fetchLink('https://example.com/post')
log('reader 429 → rate-limited', !r.ok && r.reason === 'rate-limited', r.reason)
mock({ direct: corsBlocked, reader: () => respond('{"code":422}', 'application/json', 422) })
r = await fetchLink('https://no-such-host.example/')
log('reader 422 → status failure', !r.ok && r.reason === 'status 422', r.reason)
mock({ direct: corsBlocked, reader: readerText('   ') })
r = await fetchLink('https://example.com/post')
log('empty reader body → empty', !r.ok && r.reason === 'empty', r.reason)

// 7. Content-type dispatch and URL normalization.
log('pdf with parameters → .pdf', docExtFor('application/pdf; charset=binary', 'https://x.org/a') === '.pdf')
log('extension-less PDF (arxiv-style) → .pdf', docExtFor('application/pdf', 'https://arxiv.org/pdf/1706.03762') === '.pdf')
log('HTML at a .pdf URL is a page, not a document', docExtFor('text/html', 'https://x.org/a.pdf') === '')
log('no content type + .docx URL → .docx', docExtFor(null, 'https://x.org/files/a.docx') === '.docx')
log('bare domain gets https://', normalizeUrl(' example.com/a ') === 'https://example.com/a')

if (!ok) { console.error('\nfetch-link checks failed.'); process.exit(1) }
console.log('\nfetch-link checks passed.')
process.exit(0)
