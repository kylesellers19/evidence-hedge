// ─────────────────────────────────────────────────────────────────────────────
// REAL-FIXTURE check for column-aware PDF reading order.
//
// The column-splicing bug shipped because the normalizer was only ever tested
// against synthetic single-column strings. This check runs the spliced-row
// metric against the actual CADRE fixture (61 pages, mixed single/multi-column),
// so the bug class cannot pass silently again.
//
// Metric: for every row the reconstruction ACTUALLY forms, the max intra-row
// x-gap. A jump > SPLICE_GAP_PX means one emitted line spans two columns.
// Baseline before the fix: 909 / 2502 rows (36%) spliced.
//
// Uses pdfjs's Node (legacy) build to read text items; the app's own grouping is
// imported from src/ingest/extractPdf.js so the metric tracks the real code.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { debugRowGaps, reconstructPage } from '../src/ingest/extractPdf.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const PDF = join(HERE, '..', 'fixtures', 'cadre-neuroarchitecture.pdf')

const SPLICE_GAP_PX = 120    // same metric as the pre-fix measurement
// PROVISIONAL — ceiling for the RAW geometric metric. It cannot reach 0 on this
// fixture: ~2.6% of rows are legitimately wide single lines that the >120px
// gap test cannot distinguish from a splice (bare page-number footers "02 03",
// letter-spaced chapter banners "C H A P T E R 0 8", TOC leaders "Abstract 09",
// and table rows). Pre-fix baseline was 36.33%. The unambiguous prose-splice
// signal is HYPHEN_TELL_MAX below (a mid-word break can only come from splicing).
const MAX_SPLICE_RATE = 0.05
const HYPHEN_TELL_MAX = 5    // PROVISIONAL — "word- word" tells; pre-fix: 62

if (!existsSync(PDF)) {
  console.error('✗ fixture missing: fixtures/cadre-neuroarchitecture.pdf')
  process.exit(1)
}

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const lib = pdfjs.default || pdfjs
const data = new Uint8Array(readFileSync(PDF))
const pdf = await lib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: false }).promise

let rows = 0
let spliced = 0
const examples = []
const pageText = {}
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i)
  const items = (await page.getTextContent()).items
  for (const r of debugRowGaps(items)) {
    rows++
    if (r.maxGap > SPLICE_GAP_PX) {
      spliced++
      if (examples.length < 5) examples.push(`p${i} gap=${Math.round(r.maxGap)}: ${r.text.slice(0, 90)}`)
    }
  }
  pageText[i] = reconstructPage(items)
}

const rate = rows ? spliced / rows : 0
let ok = true
const log = (l, p, x = '') => { if (!p) ok = false; console.log(`${p ? 'PASS ✅' : 'FAIL ❌'}  ${l}${x ? ' — ' + x : ''}`) }

console.log(`spliced rows: ${spliced}/${rows} (${(rate * 100).toFixed(2)}%)   [pre-fix baseline: 909/2502 = 36.33%]`)
if (examples.length) { console.log('residual examples:'); for (const e of examples) console.log('   ' + e) }

log(`spliced-row rate ≤ ${(MAX_SPLICE_RATE * 100).toFixed(0)}%`, rate <= MAX_SPLICE_RATE, `${(rate * 100).toFixed(2)}%`)

// The three verbatim evidence spans from the stop report must now read correctly.
const all = Object.values(pageText).join('\n')
log('"frameworks" reads correctly (was "frame-Building Brains…system- works")', /frameworks/.test(all))
log('"architectural" reads correctly (was "architec-Global Challenge…neurolog- tural")', /architectural/.test(all))
log('image credit not spliced mid-sentence (was "cortex and Taxi on Street in City Zheng Liang anterior")',
  !/Taxi on Street in City Zheng Liang anterior/.test(all))

// Hyphenation-break tells (was 62 across the doc). A mid-word hyphen break can
// only be produced by splicing, so this has no structural false positives.
const tells = (all.match(/[a-z]- [a-z]/g) || []).length
log(`hyphenation-break tells ≤ ${HYPHEN_TELL_MAX}`, tells <= HYPHEN_TELL_MAX, `${tells}  [pre-fix: 62]`)

if (!ok) { console.error('\npdf column-fix check FAILED'); process.exit(1) }
console.log('\nPDF column-fix check passed.')
process.exit(0)
