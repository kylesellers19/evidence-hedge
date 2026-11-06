// ─────────────────────────────────────────────────────────────────────────────
// Interstitial (bot-check / challenge / access-wall) phrasing. A short text that
// contains one of these is the wall in front of a document, not the document —
// validateText reports it as `blocked` and it never reaches analyze().
// PROVISIONAL — not ratified.
// ─────────────────────────────────────────────────────────────────────────────

export const INTERSTITIAL = [
  'not a bot',
  'checking your browser',
  'verify you are human',
  'just a moment',
  'enable javascript',
  'access denied',
  'attention required',
  'ray id',
]
