// ─────────────────────────────────────────────────────────────────────────────
// The top of the evidence brief as text, for the corpus audit
// (scripts/audit-corpus.mjs): the same values ResultsPage and VerdictMark
// render, from src/components/results/briefTop.js, so a template change shows
// on every document in the ledger.
//
// Ledgers written before Nov. 9, 2026's results-page change (tag run1) hold
// the earlier top: "Judged as … · held to … · <posture>", the genre note and
// the long headline; the audit report compares the two.
// ─────────────────────────────────────────────────────────────────────────────

import { briefTop } from '../../src/components/results/briefTop.js'

export function renderTop(result, rubric) {
  return briefTop(result, rubric)
}
