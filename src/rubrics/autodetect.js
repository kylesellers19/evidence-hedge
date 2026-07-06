// ─────────────────────────────────────────────────────────────────────────────
// autodetect(text) → rubric id
//
// Auto-detect is just a function that returns which config to inject. It scores
// the raw text against a handful of per-rubric signal lexicons and returns the
// best-scoring id (falling back to 'general'). It special-cases NOTHING in the
// engine — it only chooses which pluggable config gets handed to analyze().
// ─────────────────────────────────────────────────────────────────────────────

const SIGNALS = {
  research: [
    /\bet al\.?/i, /\bdoi[:\s]/i, /10\.\d{4,}/, /\bp\s*[<=]\s*0?\.\d/i,
    /\bmeta-analysis\b/i, /\bpeer-reviewed\b/i, /\bhypothesis\b/i,
    /\bmethodology\b/i, /\([A-Z][a-z]+,?\s*\d{4}\)/, /\bsample size\b/i,
  ],
  corporate: [
    /\bbest-in-class\b/i, /\bworld-class\b/i, /\bbest-in-class\b/i, /\b#1\b/,
    /\bshareholders?\b/i, /\bquarter(ly)?\b/i, /\brevenue\b/i, /\bROI\b/,
    /\bour (mission|customers|platform|solution)\b/i, /\byear over year\b/i,
    /\bindustry-leading\b/i, /\b10-[KQ]\b/,
  ],
  journalism: [
    /\baccording to\b/i, /\bsources? (say|said|familiar)\b/i, /\breportedly\b/i,
    /\btold (reporters|the)\b/i, /\bin an interview\b/i, /\bspokesperson\b/i,
    /\bbreaking\b/i, /\bon (monday|tuesday|wednesday|thursday|friday)\b/i,
  ],
}

/** @returns {string} a rubric id */
export function autodetect(text = '') {
  const scores = { research: 0, corporate: 0, journalism: 0, general: 0.5 }
  for (const [id, patterns] of Object.entries(SIGNALS)) {
    for (const re of patterns) {
      if (re.test(text)) scores[id] += 1
    }
  }
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
}
