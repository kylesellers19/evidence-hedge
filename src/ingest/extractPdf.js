// ─────────────────────────────────────────────────────────────────────────────
// PDF text extraction via pdfjs-dist. Lazy-loaded (dynamic import) so paste-only
// users never download pdfjs. The worker is bundled LOCALLY via Vite's `?url`
// import — no CDN, so the app keeps working offline and on GitHub Pages.
//
// Per-page text items are reconstructed into reading order by y-then-x position;
// large vertical gaps become paragraph breaks. Returns an array of page strings
// for the normalizer's header/footer detection.
// ─────────────────────────────────────────────────────────────────────────────

import { ExtractionError } from './errors.js'

const Y_TOLERANCE = 3        // px: items within this Δy share a line
const PARA_GAP_FACTOR = 1.8  // vertical gap > factor × line-height ⇒ paragraph break

function reconstructPage(items) {
  const glyphs = items
    .filter((it) => it.str && it.str.trim() !== '')
    .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], h: Math.abs(it.transform[3]) || it.height || 10 }))
  if (glyphs.length === 0) return ''

  // Group into rows by y (within tolerance).
  const rows = []
  for (const g of glyphs) {
    let row = rows.find((r) => Math.abs(r.y - g.y) <= Y_TOLERANCE)
    if (!row) { row = { y: g.y, h: g.h, items: [] }; rows.push(row) }
    row.items.push(g)
  }
  rows.sort((a, b) => b.y - a.y)              // top → bottom (PDF y grows upward)
  for (const r of rows) r.items.sort((a, b) => a.x - b.x) // left → right

  let out = ''
  let prevY = null
  let prevH = 10
  for (const r of rows) {
    const line = r.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim()
    if (!line) continue
    if (prevY !== null) out += prevY - r.y > prevH * PARA_GAP_FACTOR ? '\n\n' : '\n'
    out += line
    prevY = r.y
    prevH = r.h || prevH
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
