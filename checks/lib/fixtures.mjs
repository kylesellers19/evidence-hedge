// ─────────────────────────────────────────────────────────────────────────────
// Benchmark fixtures A–C (change set 1) and the app's path through them.
//
//   A  fixture-a-cadre                 CADRE coalition report. Text: the corpus
//                                      loader's, which reads the committed PDF
//                                      as an upload (as the corpus audit reads
//                                      it); pages: the same PDF.
//   B  fixture-b-pew-report            Pew Research Center report PDF (cached,
//                                      fixtures/cache/). Text: the corpus loader's
//                                      upload read of it; pages: the same PDF.
//   C  fixture-c-gensler-fandom-2026   Gensler, "The Fandom Effect 2026" (89 pp.).
//                                      Read exactly as an upload: the app's PDF
//                                      reconstruction, then normalizeDocument.
//                                      Lives in the gitignored checks/data/.
//
// All three texts are what a reader uploading the PDF gets, in Node as in the
// browser (checks/pdf-upload.test.mjs holds both). A and B pass the corpus link
// to analyze(), as the corpus audit does; C has no link (an upload). Routing is the app's: routeDocument → judgment.rubric and
// posture → analyze(), as RubricBranch does before the user changes anything.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadCorpus, loadDocText } from './corpus.mjs'
import { buildUnits } from './units.mjs'
import { normalizeDocument } from '../../src/ingest/normalizer.js'
import { validateText } from '../../src/ingest/validateText.js'
import { routeDocument } from '../../src/rubrics/route.js'
import { analyze } from '../../src/engine/analyze.js'

export const DATA = join(ROOT, 'checks', 'data')

export const FIXTURES = [
  { id: 'fixture-a-cadre', label: 'A', corpusId: 'fixture-a-cadre', pdf: 'fixtures/cadre-neuroarchitecture.pdf' },
  { id: 'fixture-b-pew-report', label: 'B', corpusId: 'fixture-b-pew-report', pdf: 'fixtures/cache/fixture-b-pew-report.pdf' },
  { id: 'fixture-c-gensler-fandom-2026', label: 'C', pdf: 'checks/data/fixtures/fixture-c-gensler-fandom-2026.pdf' },
]

// Per-page text, as extractPdfFile (checks/lib/corpus.mjs) reads it before normalizing.
export async function readPdfPages(path) {
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
  return pages
}

/**
 * @returns {Promise<{status:'ok', text:string, pages:string[]|null, sourceUrl:string, via:string} | {status:'skip', reason:string}>}
 */
export async function loadFixture(f) {
  const pdfPath = join(ROOT, f.pdf)
  if (!existsSync(pdfPath)) return { status: 'skip', reason: `missing ${f.pdf}` }
  const pages = await readPdfPages(pdfPath)
  if (f.corpusId) {
    const doc = loadCorpus().find((d) => d.id === f.corpusId)
    const loaded = await loadDocText(doc)
    if (loaded.status !== 'ok') return loaded
    const v = validateText(loaded.text, { path: 'paste' })
    if (!v.ok) return { status: 'skip', reason: `validateText: ${v.reason}` }
    return { status: 'ok', text: loaded.text, pages, sourceUrl: doc.url || '', via: `corpus:${loaded.file}` }
  }
  const text = normalizeDocument(pages)
  const v = validateText(text, { path: 'file' })
  if (!v.ok && v.reason !== 'empty') return { status: 'skip', reason: `validateText: ${v.reason}` }
  return { status: 'ok', text, pages, sourceUrl: '', via: `upload:${f.pdf}` }
}

/** Load, segment into units and analyze one fixture the way the app does. */
export async function runFixture(f) {
  const loaded = await loadFixture(f)
  if (loaded.status !== 'ok') return loaded
  const units = buildUnits(f.id, loaded.text, loaded.pages)
  const route = routeDocument(loaded.text, { sourceUrl: loaded.sourceUrl })
  const rubric = route.judgment.rubric
  const analysis = analyze(loaded.text, rubric, route.posture, { sourceUrl: loaded.sourceUrl })
  return { status: 'ok', fixture: f, loaded, units, route, rubric, analysis }
}
