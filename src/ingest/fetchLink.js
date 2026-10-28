// ─────────────────────────────────────────────────────────────────────────────
// Link → clean plain text. Two paths, both ending in the shared normalizer:
//
//   1. Direct download. The browser fetches the link itself. If the host allows
//      cross-origin reads (CORS) and serves a PDF, DOCX, TXT or MD, the file runs
//      through the SAME extractors as an upload (extractFile), so a linked PDF
//      gets the column-aware reader rather than a third party's.
//   2. Jina Reader (r.jina.ai), plain-text mode. Used for web pages, and for any
//      document whose host blocks cross-origin reads: Jina extracts PDF/DOCX text
//      server-side. Free tier, no key: 20 requests per minute per IP.
//
// Returns { ok: true, text, sourceUrl, via } or { ok: false, reason, kind? }.
// Failures are designed states the landing page turns into a paste prompt.
// ─────────────────────────────────────────────────────────────────────────────

import { extractFile, extOf } from './extractFile.js'
import { ExtractionError } from './errors.js'
import { normalizeText } from './normalizer.js'

export const READER = 'https://r.jina.ai/'
const HEADERS_TIMEOUT_MS = 8000 // direct attempt: give up if the host hasn't answered
const FETCH_TIMEOUT_MS = 30000  // whole-link budget; a long PDF through the reader takes seconds

// Content-Type → the extension extractFile dispatches on.
const DOC_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'text/plain': '.txt',
  'text/markdown': '.md',
}
const DOC_EXTS = new Set(Object.values(DOC_TYPES))

// Site chrome the reader drops before extracting text: menus, footers, sidebars.
// Semantic elements only — <header> is kept because many articles put their own
// headline inside one.
const CHROME_SELECTOR = 'nav, footer, aside, [role=navigation], [role=contentinfo], [role=complementary]'

// A value is a URL if it has no internal whitespace and either starts with
// http(s):// or reads as a bare domain (example.com, sub.example.co.uk/path).
export function looksLikeUrl(value) {
  const s = value.trim()
  if (!s || /\s/.test(s)) return false
  if (/^https?:\/\/\S+\.\S+/i.test(s)) return true
  return /^([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(s)
}

export function normalizeUrl(value) {
  const s = value.trim()
  return /^https?:\/\//i.test(s) ? s : 'https://' + s
}

function lastSegment(url) {
  try {
    return new URL(url).pathname.split('/').pop() || 'document'
  } catch {
    return 'document'
  }
}

// Which extractor a response needs, or '' for a web page. Servers that label a
// file generically (octet-stream, or no type) are judged by the URL's extension.
export function docExtFor(contentType, url) {
  const type = (contentType || '').split(';')[0].trim().toLowerCase()
  if (DOC_TYPES[type]) return DOC_TYPES[type]
  if (type && type !== 'application/octet-stream') return ''
  const ext = extOf(lastSegment(url))
  return DOC_EXTS.has(ext) ? ext : ''
}

// Try the link directly. Resolves to a File when the host allows CORS and serves
// a document; null for anything else (web page, CORS block, network error), so
// the caller falls back to the reader.
async function downloadDocument(url, signal) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort)
  const timer = setTimeout(abort, HEADERS_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    const ext = res.ok ? docExtFor(res.headers.get('content-type'), url) : ''
    if (!ext) {
      controller.abort() // a web page: don't download the body we won't use
      return null
    }
    const blob = await res.blob()
    const base = lastSegment(url)
    return new File([blob], extOf(base) === ext ? base : base + ext, { type: blob.type })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
  }
}

async function readViaJina(url, signal) {
  try {
    const res = await fetch(READER + encodeURIComponent(url), {
      signal,
      headers: {
        'X-Return-Format': 'text', // page text as rendered, not markdown
        'X-Remove-Selector': CHROME_SELECTOR,
      },
    })
    if (res.status === 429) return { ok: false, reason: 'rate-limited' }
    if (!res.ok) return { ok: false, reason: `status ${res.status}` }
    const body = (await res.text()).trim()
    if (!body) return { ok: false, reason: 'empty' }
    return { ok: true, text: normalizeText(body), sourceUrl: url, via: 'reader' }
  } catch (e) {
    return { ok: false, reason: e && e.name === 'AbortError' ? 'timeout' : 'network' }
  }
}

/**
 * @param {string} rawUrl  as typed or pasted (scheme optional)
 * @returns {Promise<{ok: true, text: string, sourceUrl: string, via: 'download'|'reader'}
 *                 | {ok: false, reason: string, kind?: string}>}
 */
export async function fetchLink(rawUrl) {
  const url = normalizeUrl(rawUrl)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const file = await downloadDocument(url, controller.signal)
    if (file) {
      try {
        const text = await extractFile(file)
        if (!text.trim()) throw new ExtractionError('empty')
        return { ok: true, text, sourceUrl: url, via: 'download' }
      } catch (err) {
        return { ok: false, reason: 'extract', kind: err instanceof ExtractionError ? err.kind : 'corrupt' }
      }
    }
    return await readViaJina(url, controller.signal)
  } finally {
    clearTimeout(timer)
  }
}
