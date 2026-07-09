// ─────────────────────────────────────────────────────────────────────────────
// DOCX text extraction via mammoth (extractRawText), client-side. Lazy-loaded so
// paste-only users never download mammoth. Vite applies mammoth's "browser"
// field, so the import is browser-safe (no Node fs).
// ─────────────────────────────────────────────────────────────────────────────

import { ExtractionError } from './errors.js'

/**
 * @param {File} file
 * @returns {Promise<string>} raw document text
 */
export async function extractDocx(file) {
  const mod = await import('mammoth')
  const mammoth = mod.default || mod
  const arrayBuffer = await file.arrayBuffer()

  let result
  try {
    result = await mammoth.extractRawText({ arrayBuffer })
  } catch (e) {
    throw new ExtractionError('corrupt')
  }

  const text = (result?.value || '').trim()
  if (!text) throw new ExtractionError('empty')
  return text
}
