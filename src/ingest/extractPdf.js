// ─────────────────────────────────────────────────────────────────────────────
// PDF text extraction via pdfjs-dist. Lazy-loaded (dynamic import) so paste-only
// users never download pdfjs. The worker is bundled LOCALLY via Vite's `?url`
// import — no CDN, so the app keeps working offline and on GitHub Pages.
//
// COLUMN-AWARE reading order. Grouping text items into rows by y alone splices
// multi-column pages across the gutter ("evidence-based frame-" + column 2 +
// "works…"). Instead, per page we:
//   1. segregate font-size-outlier text (image credits / captions) so it cannot
//      splice body sentences — it is appended at the end of the page, not dropped;
//   2. detect vertical gutters from an x-coverage histogram of the body text;
//   3. if no gutter → single column, identical to the previous row-by-y path;
//   4. else segment into columns, split the page into bands at full-width rows
//      (headings that cross a gutter), and read each band column-by-column.
//
// Detection is PER PAGE — this document mixes single- and multi-column pages.
// Returns an array of page strings for the normalizer's header/footer detection.
// ─────────────────────────────────────────────────────────────────────────────

import { ExtractionError } from './errors.js'

// ── Tunables — all PROVISIONAL, surfaced in the completion report ────────────
const Y_TOLERANCE = 3            // PROVISIONAL — px: items within this Δy share a line
const PARA_GAP_FACTOR = 1.8      // PROVISIONAL — vertical gap > factor × line-height ⇒ paragraph break
const COL_BUCKET = 4             // PROVISIONAL — px width of an x-coverage bucket
const COLUMN_GAP_MIN = 10        // PROVISIONAL — min interior x-gap (px) to count as a gutter.
                                 //   Measured: the CADRE 2-column gutter is only ~12px wide, so
                                 //   a larger threshold silently falls back to single-column and
                                 //   re-splices. Safe because the gutter must be a SUSTAINED
                                 //   low-coverage channel down the page, not a word gap.
const GUTTER_COVERAGE_FRAC = 0.05 // PROVISIONAL — bucket is "gutter" if coverage ≤ frac × max.
                                  //   Tolerates the few full-width headings crossing a gutter,
                                  //   but must stay BELOW a sparse margin-label column's own
                                  //   coverage (measured 3-4 items) or that column reads as
                                  //   gutter and its labels splice into the body text.
// Gutters must be strictly interior to the TEXT span (minX/maxX are derived from
// the glyphs, not the page box, so there is no outer margin to exclude). A
// percentage edge-margin here wrongly discarded narrow margin-label columns —
// e.g. a label at x=54 with its gutter at x=100 on a 1224px spread.
const SMALL_FONT_RATIO = 0.85    // PROVISIONAL — h < ratio × page modal height ⇒ caption/credit

// Most common glyph height on the page = body text size.
function modalHeight(glyphs) {
  const tally = new Map()
  for (const g of glyphs) {
    const k = Math.round(g.h)
    tally.set(k, (tally.get(k) || 0) + 1)
  }
  let best = 0, bestN = -1
  for (const [k, n] of tally) if (n > bestN) { best = k; bestN = n }
  return best || 10
}

// Group glyphs into rows by y, ordered top→bottom, each row left→right.
function toRows(glyphs) {
  const rows = []
  for (const g of glyphs) {
    let row = rows.find((r) => Math.abs(r.y - g.y) <= Y_TOLERANCE)
    if (!row) { row = { y: g.y, h: g.h, items: [] }; rows.push(row) }
    row.items.push(g)
  }
  rows.sort((a, b) => b.y - a.y)
  for (const r of rows) {
    r.items.sort((a, b) => a.x - b.x)
    r.text = r.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim()
  }
  return rows.filter((r) => r.text)
}

// Emit rows with the original paragraph-gap logic (unchanged single-column path).
function emitRows(glyphs) {
  const rows = toRows(glyphs)
  let out = ''
  let prevY = null
  let prevH = 10
  for (const r of rows) {
    if (prevY !== null) out += prevY - r.y > prevH * PARA_GAP_FACTOR ? '\n\n' : '\n'
    out += r.text
    prevY = r.y
    prevH = r.h || prevH
  }
  return out
}

// Interior vertical gutters, from an x-coverage histogram of the body glyphs.
// Uses a coverage FRACTION (not zero-coverage) so a handful of full-width
// headings crossing the gutter don't hide it.
function findGutters(glyphs) {
  const minX = Math.min(...glyphs.map((g) => g.x))
  const maxX = Math.max(...glyphs.map((g) => g.x + (g.w || 0)))
  const span = maxX - minX
  if (!(span > 0)) return []
  const nb = Math.ceil(span / COL_BUCKET)
  if (nb < 3) return []
  const cov = new Array(nb).fill(0)
  for (const g of glyphs) {
    const a = Math.max(0, Math.floor((g.x - minX) / COL_BUCKET))
    const b = Math.min(nb - 1, Math.floor((g.x + (g.w || 0) - minX) / COL_BUCKET))
    for (let k = a; k <= b; k++) cov[k]++
  }
  const maxCov = Math.max(...cov)
  if (!maxCov) return []
  const thresh = maxCov * GUTTER_COVERAGE_FRAC

  const runs = []
  let start = null
  for (let k = 0; k < nb; k++) {
    const low = cov[k] <= thresh
    if (low && start === null) start = k
    if (!low && start !== null) { runs.push([start, k - 1]); start = null }
  }
  if (start !== null) runs.push([start, nb - 1])

  return runs
    .filter(([a, b]) => (b - a + 1) * COL_BUCKET >= COLUMN_GAP_MIN)
    .filter(([a, b]) => a > 0 && b < nb - 1) // strictly interior to the text span
    .map(([a, b]) => ({ x0: minX + a * COL_BUCKET, x1: minX + (b + 1) * COL_BUCKET }))
}

function columnBounds(glyphs, gutters) {
  const minX = Math.min(...glyphs.map((g) => g.x))
  const maxX = Math.max(...glyphs.map((g) => g.x + (g.w || 0)))
  const bounds = []
  let left = minX
  for (const gut of gutters) { bounds.push({ x0: left, x1: gut.x0 }); left = gut.x1 }
  bounds.push({ x0: left, x1: maxX })
  return bounds
}

// -1 ⇒ the glyph spans a gutter (full-width element, e.g. a heading).
function columnIndexFor(g, bounds, gutters) {
  const gx0 = g.x
  const gx1 = g.x + (g.w || 0)
  for (const gut of gutters) if (gx0 < gut.x0 && gx1 > gut.x1) return -1
  const mid = (gx0 + gx1) / 2
  for (let i = 0; i < bounds.length; i++) if (mid >= bounds[i].x0 && mid <= bounds[i].x1) return i
  return 0
}

function toGlyphs(items) {
  return items
    .filter((it) => it.str && it.str.trim() !== '')
    .map((it) => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      w: it.width || 0,
      h: Math.abs(it.transform[3]) || it.height || 10,
    }))
}

// Split page glyphs into the groups the reconstruction reads independently:
// each column, the full-width rows, and the segregated small-font text.
function pageGroups(glyphs) {
  const modal = modalHeight(glyphs)
  const body = []
  const small = []
  for (const g of glyphs) (g.h < SMALL_FONT_RATIO * modal ? small : body).push(g)
  const source = body.length ? body : glyphs // guard: never segregate everything
  const gutters = findGutters(source)
  if (gutters.length === 0) return { source, gutters, bounds: [], cols: [source], full: [], small }
  const bounds = columnBounds(source, gutters)
  const full = []
  const cols = bounds.map(() => [])
  for (const g of source) {
    const ci = columnIndexFor(g, bounds, gutters)
    if (ci < 0) full.push(g)
    else cols[ci].push(g)
  }
  return { source, gutters, bounds, cols, full, small }
}

export function reconstructPage(items) {
  const glyphs = toGlyphs(items)
  if (glyphs.length === 0) return ''

  // 1. Segregate caption/credit-sized outliers (kept, appended at page end).
  const modal = modalHeight(glyphs)
  const body = []
  const small = []
  for (const g of glyphs) (g.h < SMALL_FONT_RATIO * modal ? small : body).push(g)
  const source = body.length ? body : glyphs // guard: never segregate everything

  // 2-4. Column-aware reading order.
  const gutters = findGutters(source)
  let text
  if (gutters.length === 0) {
    // Single column: identical to the previous row-by-y path for the BODY text.
    // (Caption/credit segregation above still applies, so a single-column page
    // that contains font-size outliers is intentionally reordered — its text is
    // preserved, only moved to the end of the page.)
    text = emitRows(source)
  } else {
    const bounds = columnBounds(source, gutters)
    const full = []
    const cols = bounds.map(() => [])
    for (const g of source) {
      const ci = columnIndexFor(g, bounds, gutters)
      if (ci < 0) full.push(g)
      else cols[ci].push(g)
    }
    // Bands: full-width rows are dividers; within a band read column by column.
    const fullRows = toRows(full)
    const blocks = []
    const emitBand = (hi, lo) => {
      // Columns joined with a soft break so a paragraph flowing col1→col2 is
      // rejoined by the normalizer rather than split mid-sentence.
      const segs = []
      for (const col of cols) {
        const seg = col.filter((g) => g.y < hi && g.y > lo)
        if (seg.length) segs.push(emitRows(seg))
      }
      if (segs.length) blocks.push(segs.join('\n'))
    }
    let upper = Infinity
    for (const fr of fullRows) {
      emitBand(upper, fr.y)
      blocks.push(fr.text) // heading stands alone as its own block
      upper = fr.y
    }
    emitBand(upper, -Infinity)
    text = blocks.filter(Boolean).join('\n\n')
  }

  // 5. Captions / credits segregated to the end — never spliced into body text.
  if (small.length) {
    const s = emitRows(small)
    if (s) text += (text ? '\n\n' : '') + s
  }
  return text
}

// ── Instrumentation for checks/pdf-column-fix.mjs ────────────────────────────
// Reports the max intra-row x-gap for every row the reconstruction ACTUALLY
// forms (reusing the same grouping, so the metric cannot drift from the code).
// A large intra-row jump means one emitted line splices two columns. This bug
// class shipped once because only synthetic text was tested — the real-fixture
// check exists so it cannot pass silently again.
export function debugRowGaps(items) {
  const glyphs = toGlyphs(items)
  if (!glyphs.length) return []
  const { cols, full, small } = pageGroups(glyphs)
  const out = []
  for (const grp of [...cols, full, small]) {
    if (!grp || !grp.length) continue
    for (const r of toRows(grp)) {
      const xs = r.items.map((i) => i.x).sort((a, b) => a - b)
      let maxGap = 0
      for (let k = 1; k < xs.length; k++) maxGap = Math.max(maxGap, xs[k] - xs[k - 1])
      out.push({ maxGap, text: r.text })
    }
  }
  return out
}

/**
 * @param {File} file
 * @returns {Promise<string[]>} per-page text
 */
export async function extractPdf(file) {
  const pdfjs = await import('pdfjs-dist')
  // Local, bundled worker URL (Vite emits it as an asset). No network fetch.
  const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

  const data = new Uint8Array(await file.arrayBuffer())
  let pdf
  try {
    pdf = await pdfjs.getDocument({ data }).promise
  } catch (e) {
    if (e && (e.name === 'PasswordException' || /password/i.test(e.message || ''))) {
      throw new ExtractionError('encrypted')
    }
    throw new ExtractionError('corrupt')
  }

  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(reconstructPage(content.items))
  }

  // Image-only / scanned PDFs yield (near-)empty text.
  if (pages.join('').replace(/\s/g, '').length === 0) throw new ExtractionError('scanned')
  return pages
}
