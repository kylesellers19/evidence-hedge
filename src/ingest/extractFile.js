// ─────────────────────────────────────────────────────────────────────────────
// File → clean plain text dispatcher (input plumbing endpoint before Stage 1).
//
// Accepts .pdf / .docx / .txt / .md. Rejects legacy .doc (binary) with a re-save
// hint. PDF and DOCX extraction are lazy-loaded from their own modules; every
// path runs through the shared normalizer, so the output is "as if pasted".
// ─────────────────────────────────────────────────────────────────────────────

import { ExtractionError } from './errors.js'
import { normalizeText, normalizeDocument } from './normalizer.js'

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

// Designed failure states (not error toasts) — shown inline, routing the person
// to paste when extraction can't proceed.
export const FAILURE_MESSAGES = {
  'legacy-doc': 'Legacy .doc files aren’t supported — re-save as .docx and try again.',
  encrypted: 'This PDF is password-protected. Remove the protection, or paste the text instead.',
  scanned: 'This looks like a scanned or image-only PDF. OCR isn’t supported — paste the text instead.',
  corrupt: 'That file couldn’t be read — it may be corrupt. Paste the text instead.',
  empty: 'No readable text was found in that file. Paste the text instead.',
  'unsupported-type': 'Unsupported file type. Use PDF, DOCX, TXT, or MD — or paste the text.',
}

export const messageFor = (kind) => FAILURE_MESSAGES[kind] || FAILURE_MESSAGES.corrupt
