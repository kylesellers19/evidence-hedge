// ─────────────────────────────────────────────────────────────────────────────
// File → clean plain text dispatcher (input plumbing endpoint before Stage 1).
//
// Accepts .pdf / .docx / .txt / .md. Rejects legacy .doc (binary) with a re-save
// hint. PDF and DOCX extraction are lazy-loaded from their own modules; every
// path runs through the shared normalizer, so the output is "as if pasted".
// ─────────────────────────────────────────────────────────────────────────────

import { ExtractionError } from './errors.js'
import { normalizeText, normalizeDocument } from './normalizer.js'
import { validateText } from './validateText.js'

export const ACCEPTED_EXTS = ['.pdf', '.docx', '.txt', '.md']
export const ACCEPT_ATTR = ACCEPTED_EXTS.join(',')

export function extOf(name) {
  const i = (name || '').lastIndexOf('.')
  return i < 0 ? '' : name.slice(i).toLowerCase()
}

/**
 * @param {File} file
 * @returns {Promise<string>} normalized plain text ready for the pipeline
 */
export async function extractFile(file) {
  const text = await extractText(file)
  // A saved bot-check page or reader error body is not a document (validateText).
  const check = validateText(text, { path: 'file' })
  if (!check.ok && check.reason !== 'empty') throw new ExtractionError(check.reason)
  return text
}

async function extractText(file) {
  const ext = extOf(file.name)

  if (ext === '.doc') throw new ExtractionError('legacy-doc')

  if (ext === '.txt' || ext === '.md') {
    return normalizeText(await file.text())
  }
  if (ext === '.pdf') {
    const { extractPdf } = await import('./extractPdf.js')
    return normalizeDocument(await extractPdf(file)) // pages[] → header/footer strip → normalize
  }
  if (ext === '.docx') {
    const { extractDocx } = await import('./extractDocx.js')
    return normalizeDocument({ text: await extractDocx(file) })
  }
  throw new ExtractionError('unsupported-type')
}
