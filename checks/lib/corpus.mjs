// ─────────────────────────────────────────────────────────────────────────────
// Corpus loader shared by scripts/fetch-corpus.mjs and the corpus checks.
//
// fixtures/corpus.json lists every document. Text comes from, in order:
//   · fixtures/corpus/<id>.raw.txt   committed (public-domain / CC only, D4)
//   · fixtures/cache/<id>.raw.txt    reader body as fetched (gitignored)
//   · fixtures/cache/<id>.txt        PDF or supplied text, already extracted
//   · doc.path                       text committed before this audit
// Reader bodies are kept raw and run through the app's own reader pipeline at
// load, so ingestion changes apply without refetching. A missing file is a
// SKIP the caller must print; nothing passes silently.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizeText, normalizeDocument } from '../../src/ingest/normalizer.js'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const CACHE = join(ROOT, 'fixtures', 'cache')
export const COMMITTED = join(ROOT, 'fixtures', 'corpus')

export function loadCorpus() {
  return JSON.parse(readFileSync(join(ROOT, 'fixtures', 'corpus.json'), 'utf8')).docs
}

// The app's reader pipeline, if this build has one; plain normalize otherwise.
async function readerPipeline() {
  const mod = await import('../../src/ingest/fetchLink.js')
  if (!mod.readerBodyToText) return { toText: (body) => normalizeText(body), chromeDrops: () => [] }
  const { stripChromeLines } = await import('../../src/ingest/chromeLines.js')
  return { toText: mod.readerBodyToText, chromeDrops: (body) => stripChromeLines(body).dropped }
}

/**
 * @returns {Promise<{status:'ok', text:string, via:string, file:string, chromeDropped?:string[]} | {status:'skip', reason:string}>}
 */
export async function loadDocText(doc) {
  if (doc.source === 'committed') {
    const p = join(ROOT, doc.path)
    if (!existsSync(p)) return { status: 'skip', reason: `missing ${doc.path}` }
    return { status: 'ok', text: readFileSync(p, 'utf8'), via: 'committed', file: doc.path }
  }
  if (doc.source === 'reader') {
    for (const p of [join(COMMITTED, `${doc.id}.raw.txt`), join(CACHE, `${doc.id}.raw.txt`)]) {
      if (existsSync(p)) {
        const { toText, chromeDrops } = await readerPipeline()
        const body = readFileSync(p, 'utf8')
        return { status: 'ok', text: toText(body), via: 'reader', file: p.slice(ROOT.length + 1), chromeDropped: chromeDrops(body) }
      }
    }
    return { status: 'skip', reason: 'not fetched — run npm run fixtures:fetch' }
  }
  // pdf / supplied: extracted text in the cache.
  for (const p of [join(COMMITTED, `${doc.id}.txt`), join(CACHE, `${doc.id}.txt`)]) {
    if (existsSync(p)) return { status: 'ok', text: readFileSync(p, 'utf8'), via: doc.source, file: p.slice(ROOT.length + 1) }
  }
  return {
    status: 'skip',
    reason: doc.source === 'supplied' ? `supplied file absent (fixtures/cache/${doc.id}.txt or .pdf)` : 'not fetched — run npm run fixtures:fetch',
  }
}

// A PDF read exactly as an upload is: the app's column-aware page reconstruction,
// then the shared document normalizer.
export async function extractPdfFile(path) {
  const { reconstructPage } = await import('../../src/ingest/extractPdf.js')
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const lib = pdfjs.default || pdfjs
  const data = new Uint8Array(readFileSync(path))
  const pdf = await lib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: false, verbosity: 0 }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    pages.push(reconstructPage((await page.getTextContent()).items))
  }
  return normalizeDocument(pages)
}
