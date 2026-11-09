// ─────────────────────────────────────────────────────────────────────────────
// node checks/pdf-upload.test.mjs — the checks read a PDF the way a reader's
// upload does, and Node reads it the way the browser does.
//
// Fixture A once read a text extracted before the column fix: readers saw 334
// claims, the checks 242, and the checks quoted sentences spliced across
// columns that no reader sees. Both builds of pdf.js were right all along.
//
//   1. every benchmark fixture (checks/lib/fixtures.mjs) analyzes the text an
//      upload of its PDF gives: readPdfPages, then normalizeDocument
//   2. Node (pdfjs-dist's legacy build) gives the same file, page texts,
//      document text and claim count as the browser (the app's extractPdf on
//      the browser build), recorded in checks/targets/pdf-upload.json
//
// A document whose PDF is absent (Fixture B's is cached, C's lives in the
// gitignored checks/data/) is skipped, not failed. A change to the extractor,
// the normalizer, pdf.js or the engine that moves a record on purpose
// re-records it in the same commit, in the browser (checks/lib/upload-record.mjs
// says how) or, when pdf.js is unchanged, from Node:
//   node checks/pdf-upload.test.mjs --write
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/corpus.mjs'
import { FIXTURES, loadFixture, readPdfPages } from './lib/fixtures.mjs'
import { engineCommit } from './lib/engine-rows.mjs'
import { uploadRecord } from './lib/upload-record.mjs'
import { normalizeDocument } from '../src/ingest/normalizer.js'

const TARGET = join(ROOT, 'checks', 'targets', 'pdf-upload.json')

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS ✅' : 'FAIL ❌'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) failed++
}

// 1
for (const f of FIXTURES) {
  const path = join(ROOT, f.pdf)
  if (!existsSync(path)) { console.log(`SKIP ${f.id} — missing ${f.pdf}`); continue }
  const loaded = await loadFixture(f)
  if (loaded.status !== 'ok') { console.log(`SKIP ${f.id} — ${loaded.reason}`); continue }
  const upload = normalizeDocument(await readPdfPages(path))
  check(`analyzes what an upload of the PDF gives [${f.id}]`, loaded.text === upload, `${loaded.text.length} vs ${upload.length} chars, via ${loaded.via}`)
}

// 2
const target = JSON.parse(readFileSync(TARGET, 'utf8'))
const recorded = {}
for (const [id, want] of Object.entries(target.documents)) {
  const path = join(ROOT, want.pdf)
  if (!existsSync(path)) { console.log(`SKIP ${id} — missing ${want.pdf}`); recorded[id] = want; continue }
  const got = await uploadRecord(want.pdf, new Uint8Array(readFileSync(path)), await readPdfPages(path))
  recorded[id] = got
  if (process.argv.includes('--write')) continue
  if (got.file !== want.file) { check(`same PDF as the recording [${id}]`, false, `file ${got.file}, recorded ${want.file}`); continue }
  const page = got.pages.findIndex((h, k) => h !== want.pages[k])
  check(`Node reads every page as the browser did [${id}]`, got.pages.length === want.pages.length && page === -1,
    page === -1 ? `${got.pages.length} pages` : `page ${page + 1} differs`)
  check(`same text, same claim count [${id}]`, got.text === want.text && got.claims === want.claims, `${got.claims} claims, recorded ${want.claims}`)
}
console.log(`recorded ${target.recorded} at engine ${target.engine_commit}, ${target.recorded_in}`)

if (process.argv.includes('--write')) {
  writeFileSync(TARGET, JSON.stringify({ ...target, recorded: new Date().toISOString().slice(0, 10), engine_commit: engineCommit(), recorded_in: 'node: readPdfPages, pdfjs-dist legacy build', documents: recorded }, null, 1) + '\n')
  console.log(`WROTE checks/targets/pdf-upload.json at engine ${engineCommit()} — confirm in the browser if pdf.js changed`)
  process.exit(0)
}

if (failed) { console.error(`\n${failed} pdf-upload check(s) failed`); process.exit(1) }
console.log('\nPDF upload checks passed.')
