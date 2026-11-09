// ─────────────────────────────────────────────────────────────────────────────
// PDF text extraction via pdfjs-dist. Lazy-loaded (dynamic import) so paste-only
// users never download pdfjs. The worker is bundled LOCALLY via Vite's `?url`
// import — no CDN, so the app keeps working offline and on GitHub Pages.
//
// COLUMN-AWARE reading order. Grouping text items into rows by y alone splices
// multi-column pages across the gutter ("evidence-based frame-" + column 2 +
// "works…"). Instead, per page we:
//   1. segregate font-size-outlier text (image credits / captions) so it cannot
//      splice body sentences — it is appended at the end of the page, not dropped.
//      Small glyphs touching body text on its line (superscript citation and
//      note markers, subscripts) are not captions: they stay inline, digits as
//      Unicode super/subscripts ("comfort⁷,¹²", "CO₂");
//   2. detect vertical gutters from an x-coverage histogram of the body text,
//      and, where a table or figure crosses a gutter, from the rows that have
//      text beside it and nothing across it;
//   3. if no gutter → single column, identical to the previous row-by-y path;
//   4. else segment into columns, split the page into bands at full-width rows
//      (headings, tables, abstracts that cross a gutter), and read each band
//      column-by-column; consecutive full-width rows read as one block.
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
const FINE_BUCKET = 2            // PROVISIONAL — a second, finer pass: at 4px a 10px gutter can read
const FINE_GAP_MIN = 8           //   as two buckets (8px) and miss COLUMN_GAP_MIN (measured: EHP's
                                 //   three-column pages, gutters ~10px). Its gutters, and channels,
                                 //   count only with column text on both sides (SIDE_TEXT_SHARE).
const SIDE_TEXT_SHARE = 0.15     // PROVISIONAL — share of the page's characters each side of a fine
                                 //   gutter or channel must hold, so a bullet or label column is
                                 //   never split off by them (Pew's "▪", CADRE's side headings)
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
const ATTACH_GAP = 2.5           // PROVISIONAL — px: a small glyph this close to body text on its
                                 //   line is a super/subscript of it, not a caption
const RAISED = 0.15              // PROVISIONAL — baseline above the body's by > frac × h ⇒ superscript
const LOWERED = 0.08             // PROVISIONAL — baseline below the body's by > frac × h ⇒ subscript
const SCRIPT_ABOVE = 0.6         // PROVISIONAL — a superscript's baseline is at most this × h above
const SCRIPT_BELOW = 0.35        // PROVISIONAL — a subscript's baseline is at most this × h below
const MARKER_TEXT = /^[\d,\s–—-]{1,8}$/ // PROVISIONAL — a body-size glyph this short may be a raised marker
const CHANNEL_ROW_SHARE = 0.4    // PROVISIONAL — a gutter crossed by a table or figure still counts
                                 //   when this share of the page's rows has text beside it and
                                 //   nothing across it (EHP: tables crossing two gutters)
const CHANNEL_SIDE_SHARE = 0.25  // PROVISIONAL — …and this share of rows has text on each side, so
                                 //   a page margin or a sparse label column is never a channel
const CHANNEL_NEAR = 40          // PROVISIONAL — px: text this close counts as beside the channel
const WORD_GAP = 0.6             // PROVISIONAL — × text height: same-size glyphs either side of a
                                 //   gutter closer than this are one line running across it
const SIZE_SHIFT = 0.15           // PROVISIONAL — rows whose text heights differ by more than this
                                 //   share of the smaller are different blocks (a heading over
                                 //   body text, body text over a caption): a paragraph break
const HEADING_ROW_WORDS = 12     // PROVISIONAL — a row this short, with no closing punctuation,
                                 //   set in another face than the row next to it, is a heading

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
    // The row's own size and face: those of most of its characters.
    const weight = (pick) => { const t = new Map(); for (const i of r.items) { const k = pick(i); t.set(k, (t.get(k) || 0) + i.str.length) } return [...t].sort((a, b) => b[1] - a[1])[0]?.[0] }
    r.h = weight((i) => Math.round(i.h * 10) / 10) || r.h
    r.font = weight((i) => i.font || '')
    // An inline super/subscript is glued to the word it follows ("comfort⁷,¹²")
    // and what touches it is glued to it ("¹²."), unless that text opens with
    // its own space ("CO₂ levels").
    r.text = r.items.reduce((s, i, k) => {
      const p = r.items[k - 1]
      const touch = p && (i.glue || p.glue) && i.x - (p.x + (p.w || 0)) <= ATTACH_GAP
      if (!touch) return (s ? s + ' ' : '') + i.str
      return i.glue ? s.replace(/\s+$/, '') + i.str.trim() : s + i.str
    }, '').replace(/\s+/g, ' ').trim()
  }
  return rows.filter((r) => r.text)
}

// A heading row: short, with no closing punctuation.
const headingLike = (r) => r.text.split(' ').length <= HEADING_ROW_WORDS && !/[.!?:;,]["'”’)]?$/.test(r.text)

// A new block starts at a vertical gap, at a change of text size (a heading
// over body text, body text over a caption), or where a heading-like row is
// set in another face than its neighbour (a bold heading at body size). Without
// the break the normalizer would join the heading to the sentence below it.
function blockBreak(prev, r, prevH) {
  if (prev.y - r.y > prevH * PARA_GAP_FACTOR) return true
  if (Math.abs(prev.h - r.h) > SIZE_SHIFT * Math.min(prev.h, r.h)) return true
  return prev.font !== r.font && (headingLike(prev) || headingLike(r))
}

// Emit rows with the paragraph-gap logic (unchanged single-column path).
function emitRows(glyphs) {
  const rows = toRows(glyphs)
  let out = ''
  let prev = null
  let prevH = 10
  for (const r of rows) {
    if (prev) out += blockBreak(prev, r, prevH) ? '\n\n' : '\n'
    out += r.text
    prev = r
    prevH = r.h || prevH
  }
  return out
}

// Interior vertical gutters, from an x-coverage histogram of the body glyphs.
// Uses a coverage FRACTION (not zero-coverage) so a handful of full-width
// headings crossing the gutter don't hide it.
function lowRuns(glyphs, bucket, minGap) {
  const minX = Math.min(...glyphs.map((g) => g.x))
  const maxX = Math.max(...glyphs.map((g) => g.x + (g.w || 0)))
  const span = maxX - minX
  if (!(span > 0)) return []
  const nb = Math.ceil(span / bucket)
  if (nb < 3) return []
  const cov = new Array(nb).fill(0)
  for (const g of glyphs) {
    const a = Math.max(0, Math.floor((g.x - minX) / bucket))
    const b = Math.min(nb - 1, Math.floor((g.x + (g.w || 0) - minX) / bucket))
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
    .filter(([a, b]) => (b - a + 1) * bucket >= minGap)
    .filter(([a, b]) => a > 0 && b < nb - 1) // strictly interior to the text span
    .map(([a, b]) => ({ x0: minX + a * bucket, x1: minX + (b + 1) * bucket }))
}

// The coarse histogram's gutters as before, plus the fine pass's and the
// channels that have a column of text directly on each side (up to the next
// gutter); overlapping or nearly touching gutters are one.
function findGutters(glyphs) {
  const coarse = lowRuns(glyphs, COL_BUCKET, COLUMN_GAP_MIN)
  const found = []
  for (const g of [...lowRuns(glyphs, FINE_BUCKET, FINE_GAP_MIN), ...findChannels(glyphs)].sort((a, b) => a.x0 - b.x0)) {
    if (coarse.some((c) => g.x0 < c.x1 && g.x1 > c.x0)) continue
    const last = found[found.length - 1]
    if (last && g.x0 < last.x1) last.x1 = Math.max(last.x1, g.x1) // the two passes found one gutter
    else found.push({ ...g })
  }
  const chars = glyphs.reduce((n, g) => n + g.str.length, 0)
  const textIn = (x0, x1) => glyphs.reduce((n, g) => { const m = g.x + (g.w || 0) / 2; return m > x0 && m < x1 ? n + g.str.length : n }, 0)
  // Left to right: the column a candidate closes runs back to the last gutter
  // kept, the one it opens up to the next coarse gutter (a table's own column
  // channels beside a real gutter do not starve it).
  const extra = []
  for (const g of found) {
    const before = [...coarse, ...extra].filter((e) => e.x1 <= g.x0).reduce((x, e) => Math.max(x, e.x1), -Infinity)
    const after = coarse.filter((e) => e.x0 >= g.x1).reduce((x, e) => Math.min(x, e.x0), Infinity)
    if (textIn(before, g.x0) >= chars * SIDE_TEXT_SHARE && textIn(g.x1, after) >= chars * SIDE_TEXT_SHARE) extra.push({ ...g, extra: true })
  }
  const merged = []
  for (const g of [...coarse, ...extra].sort((a, b) => a.x0 - b.x0)) {
    const last = merged[merged.length - 1]
    if (last && (last.extra || g.extra) && g.x0 - last.x1 < FINE_GAP_MIN) last.x1 = Math.max(last.x1, g.x1)
    else merged.push({ ...g })
  }
  return merged
}

// Gutters a table, figure or abstract crosses, so their coverage is too high
// for the histogram: x-runs where most of the page's rows have text beside the
// run and nothing across it, with text on both sides of it.
function findChannels(glyphs) {
  const rows = toRows(glyphs)
  if (rows.length < 8) return []
  const minX = Math.min(...glyphs.map((g) => g.x))
  const maxX = Math.max(...glyphs.map((g) => g.x + (g.w || 0)))
  const nb = Math.ceil((maxX - minX) / FINE_BUCKET)
  const clear = new Array(nb).fill(0)
  for (const r of rows) {
    const iv = r.items.map((i) => [i.x, i.x + (i.w || 0)])
    for (let k = 0; k < nb; k++) {
      const x0 = minX + k * FINE_BUCKET, x1 = x0 + FINE_BUCKET
      if (iv.some(([a, b]) => a < x1 && b > x0)) continue
      if (iv.some(([, b]) => b <= x0 && b >= x0 - CHANNEL_NEAR) || iv.some(([a]) => a >= x1 && a <= x1 + CHANNEL_NEAR)) clear[k]++
    }
  }
  const need = rows.length * CHANNEL_ROW_SHARE
  const out = []
  let start = null
  for (let k = 0; k <= nb; k++) {
    const ok = k < nb && clear[k] >= need
    if (ok && start === null) start = k
    if (!ok && start !== null) {
      const [a, b] = [start, k - 1]
      start = null
      if ((b - a + 1) * FINE_BUCKET < FINE_GAP_MIN || a === 0 || b === nb - 1) continue
      const x0 = minX + a * FINE_BUCKET, x1 = minX + (b + 1) * FINE_BUCKET
      const left = rows.filter((r) => r.items.some((i) => i.x + (i.w || 0) <= x0)).length
      const right = rows.filter((r) => r.items.some((i) => i.x >= x1)).length
      if (left >= rows.length * CHANNEL_SIDE_SHARE && right >= rows.length * CHANNEL_SIDE_SHARE) out.push({ x0, x1 })
    }
  }
  return out
}

// A row is full-width when its text runs across a gutter: one glyph spans it,
// or, at a fine gutter or channel, the same-size glyphs either side of it are
// no farther apart than a word gap. A prose
// line on a page whose table makes a channel stays whole, even when its glyphs
// happen to break inside the channel.
function crossesGutter(items, gutters) {
  for (const gut of gutters) {
    if (items.some((g) => g.x < gut.x0 && g.x + (g.w || 0) > gut.x1)) return true
    const c = (gut.x0 + gut.x1) / 2
    let l = null, r = null
    for (const g of items) {
      if (g.x + (g.w || 0) / 2 < c) { if (!l || g.x + (g.w || 0) > l.x + (l.w || 0)) l = g }
      else if (!r || g.x < r.x) r = g
    }
    if (gut.extra && l && r && Math.abs(l.h - r.h) <= 0.15 * Math.max(l.h, r.h) && r.x - (l.x + (l.w || 0)) < WORD_GAP * Math.max(l.h, r.h)) return true
  }
  return false
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
      font: it.fontName || '',
    }))
}

const SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const SUB = '₀₁₂₃₄₅₆₇₈₉'
const scriptDigits = (s, set) => s.replace(/\d/g, (d) => set[d])

// Body text, and the small-font glyphs set apart as captions and credits. A
// small glyph touching body text on its line is a super/subscript of that
// text: it joins the body on the body's baseline, glued to its neighbour, its
// digits as Unicode super/subscripts (markers "7,12" or "14–16", "CO2").
function separateSmall(glyphs) {
  const modal = modalHeight(glyphs)
  const body = []
  const small = []
  for (const g of glyphs) (g.h < SMALL_FONT_RATIO * modal ? small : body).push(g)
  if (!body.length) return { source: glyphs, small: [] } // guard: never segregate everything
  // A short run of digits at body size that sits on no line of its own is a
  // super/subscript set with a text rise ("in²" on EHP pages): it attaches the
  // same way, and stays where it is when it touches nothing.
  const isMarker = (g) => MARKER_TEXT.test(g.str.trim())
  const floating = new Set(body.filter((g) => isMarker(g) &&
    !body.some((c) => c !== g && !isMarker(c) && Math.abs(c.y - g.y) <= Y_TOLERANCE)))
  const source = body.filter((g) => !floating.has(g))
  const captions = []
  for (const g of [...small, ...floating].sort((a, b) => a.x - b.x)) {
    // The touching body glyph on its own line: a superscript sits at most
    // ~0.6 h above that line's baseline, a subscript ~0.35 h below; the nearest wins.
    let b = null
    for (const c of source) {
      const dy = g.y - c.y
      if (dy > SCRIPT_ABOVE * c.h || dy < -SCRIPT_BELOW * c.h) continue
      if (Math.abs(g.x - (c.x + c.w)) > ATTACH_GAP && Math.abs(c.x - (g.x + g.w)) > ATTACH_GAP) continue
      if (!b || Math.abs(dy) < Math.abs(g.y - b.y)) b = c
    }
    if (!b) { (floating.has(g) ? source : captions).push(g); continue }
    const s = g.str.trim()
    const str = g.y > b.y + RAISED * b.h && /^\d[\d,\s–—-]*$/.test(s) ? scriptDigits(s.replace(/\s+/g, ''), SUPER)
      : g.y < b.y - LOWERED * b.h && /^\d+$/.test(s) ? scriptDigits(s, SUB)
      : s
    source.push({ ...g, str, y: b.y, h: b.h, glue: true })
  }
  return { source, small: captions }
}

// Read a region of the page: a gutter no row runs across splits it into the
// text left and right of it, read in turn (joined with a soft break, so a
// paragraph flowing from one column into the next is rejoined by the
// normalizer); otherwise rows running across every gutter — a heading, an
// abstract, a table over all the columns — divide it into bands, each read in
// turn; with no such row, it splits at the gutter the fewest rows cross. Only the page's own gutters are used, so a few rows whose word gaps
// line up never make a column. `leaves` collects every glyph group read row by
// row, for the column check's metric.
function readRegion(glyphs, gutters, leaves, depth = 0) {
  const inside = gutters.filter((g) => glyphs.some((x) => x.x + (x.w || 0) <= g.x0) && glyphs.some((x) => x.x >= g.x1))
  const leaf = (gs) => { leaves?.push(gs); return emitRows(gs) }
  if (!inside.length || depth > 8) return leaf(glyphs)
  const rows = toRows(glyphs)
  const clean = inside.find((g) => !rows.some((r) => crossesGutter(r.items, [g])))
  if (clean) {
    const c = (clean.x0 + clean.x1) / 2
    const left = glyphs.filter((g) => g.x + (g.w || 0) / 2 < c)
    const right = glyphs.filter((g) => g.x + (g.w || 0) / 2 >= c)
    return [readRegion(left, inside, leaves, depth + 1), readRegion(right, inside, leaves, depth + 1)].filter(Boolean).join('\n')
  }
  const dividers = rows.filter((r) => inside.every((g) => crossesGutter(r.items, [g])))
  if (!dividers.length) {
    // No row runs across every gutter: split at the gutter the fewest rows
    // cross (a caption or table row intruding on it), each crossing row going
    // whole to the side holding most of its text.
    const crossing = inside.map((g) => rows.filter((r) => crossesGutter(r.items, [g])))
    const k = crossing.reduce((best, c, i) => (c.length < crossing[best].length ? i : best), 0)
    const g = inside[k], c = (g.x0 + g.x1) / 2, across = new Set(crossing[k])
    const mid = (x) => x.x + (x.w || 0) / 2
    const left = [], right = []
    for (const r of rows) {
      if (!across.has(r)) { for (const x of r.items) (mid(x) < c ? left : right).push(x); continue }
      const lw = r.items.filter((x) => mid(x) < c).reduce((n, x) => n + x.str.length, 0)
      const rw = r.items.reduce((n, x) => n + x.str.length, 0) - lw
      if (lw >= rw) left.push(...r.items)
      else right.push(...r.items)
    }
    const rest = inside.filter((x) => x !== g)
    return [readRegion(left, rest, leaves, depth + 1), readRegion(right, rest, leaves, depth + 1)].filter(Boolean).join('\n')
  }
  const isDivider = new Set(dividers)
  // Consecutive dividers (a two-line heading, an abstract) read as one block,
  // with the usual paragraph-gap logic.
  const blocks = []
  let band = [], run = []
  const flushBand = () => { if (band.length) blocks.push(readRegion(band.flatMap((r) => r.items), inside, leaves, depth + 1)); band = [] }
  const flushRun = () => { if (run.length) blocks.push(leaf(run.flatMap((r) => r.items))); run = [] }
  for (const r of rows) {
    if (isDivider.has(r)) { flushBand(); run.push(r) } else { flushRun(); band.push(r) }
  }
  flushBand(); flushRun()
  return blocks.filter(Boolean).join('\n\n')
}

export function reconstructPage(items) {
  const glyphs = toGlyphs(items)
  if (glyphs.length === 0) return ''

  // 1. Segregate caption/credit-sized outliers (kept, appended at page end).
  const { source, small } = separateSmall(glyphs)
  // 2-4. Column-aware reading order. With no gutter the page reads as one
  // column, identical to the previous row-by-y path for the BODY text.
  // (Caption/credit segregation above still applies, so a single-column page
  // that contains font-size outliers is intentionally reordered — its text is
  // preserved, only moved to the end of the page.)
  let text = readRegion(source, findGutters(source))

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
  const { source, small } = separateSmall(glyphs)
  const leaves = []
  readRegion(source, findGutters(source), leaves)
  const out = []
  for (const grp of [...leaves, small]) {
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
