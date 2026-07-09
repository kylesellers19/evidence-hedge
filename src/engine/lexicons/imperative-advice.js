// ─────────────────────────────────────────────────────────────────────────────
// Imperative-advice guard. A short line matching the nav-chrome DROP rule is
// KEPT if it also matches this lexicon (or the YMYL domain lexicon) — because a
// terse imperative can be a real, consequential claim ("Never mix bleach and
// ammonia"), not chrome.
// ─────────────────────────────────────────────────────────────────────────────

export const IMPERATIVE_ADVICE = [
  'never',
  'always',
  'do not',
  "don't",
  'avoid',
  'make sure',
  'be sure',
  'you should',
  'you must',
  'you need to',
  'warning',
  'caution',
  'danger',
  'seek medical',
  'call 911',
  'stop taking',
]
