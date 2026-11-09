// ─────────────────────────────────────────────────────────────────────────────
// failureCopy(failure) → one actionable sentence per failure reason.
//
// Every ingest path (link, file, paste) reports a failure as
// { reason, kind?, detail?, host? }; the landing page shows this sentence in
// place of the old generic "Couldn't pull readable text". Each sentence says
// what happened and what to do next. PROVISIONAL — not ratified (copy).
// ─────────────────────────────────────────────────────────────────────────────

// File-extraction kinds (ExtractionError.kind), also reached through a link to
// a downloadable document.
const EXTRACT = {
  'legacy-doc': 'Legacy .doc files can’t be read — re-save it as .docx and upload it again.',
  encrypted: 'This PDF is password-protected — remove the protection and upload it again, or paste the text.',
  scanned: 'This looks like a scanned, image-only PDF with no text layer — paste the text instead, since OCR isn’t supported.',
  corrupt: 'That file couldn’t be read and may be corrupt — try another copy, or paste the text.',
  empty: 'No readable text was found in that file — paste the text instead.',
  'unsupported-type': 'That file type isn’t supported — upload a PDF, DOCX, TXT or MD file, or paste the text.',
  blocked: 'That file is a saved bot-check page, not the document — open the original, get past the check, and save or paste the real text.',
  'reader-error': 'That file is a link-reader error message, not the document — open the original page and paste its text instead.',
  'not-english': 'This file isn’t in English, and we read English only, so upload or paste an English version if there is one.',
}

const site = (host) => host || 'that site'

const COPY = {
  'reader-error': (f) => {
    const name = f.detail?.name ? ` (${f.detail.name})` : f.detail?.code ? ` (error ${f.detail.code})` : ''
    return `The link reader refused ${site(f.host)}${name} — open the page in your browser, copy the article text, and paste it here.`
  },
  blocked: (f) =>
    `${f.host ? f.host : 'That link'} returned a bot check instead of the document — open it in your browser, get past the check, and paste the text or upload the file here.`,
  'too-short': (f) =>
    `That link returned only ${f.detail?.words ?? 'a few'} words, too few to weigh — paste the full text, or upload the PDF if the page links to one.`,
  'rate-limited': () =>
    'The link reader is at its limit of 20 requests a minute — wait a minute and try again, or paste the text here.',
  timeout: () => 'The link reader timed out on that page — try again, or paste the text here.',
  network: () => 'The link reader could not be reached — check your connection and try again, or paste the text here.',
  empty: () => 'No readable text came back — paste the text here instead.',
  'not-english': () => 'This document isn’t in English, and we read English only, so paste or link an English version if there is one.',
  status: (f) =>
    `The link reader got an error ${f.detail?.status ?? ''} from ${site(f.host)} — check the address, or paste the text here.`.replace('error  from', 'error from'),
}

/**
 * @param {{ reason: string, kind?: string, detail?: object, host?: string }} failure
 * @returns {string}
 */
export function failureCopy(failure) {
  if (!failure) return COPY.empty()
  if (failure.reason === 'extract') return EXTRACT[failure.kind] || EXTRACT.corrupt
  return (COPY[failure.reason] || COPY.empty)(failure)
}
