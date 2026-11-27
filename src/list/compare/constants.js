// ─────────────────────────────────────────────────────────────────────────────
// Every threshold, minimum, draw count and interface cap the compare tool uses,
// in one place. PROVISIONAL — not ratified: each value is a proposal, listed
// with its reason by ratificationTable() and in docs/compare/SESSION_LOG.md's
// completion report, and none was moved after seeing results.
// ─────────────────────────────────────────────────────────────────────────────

export const COMPARE_CONSTANTS = Object.freeze({
  // How many times each interval resamples reports, and each test shuffles
  // firm names or years. A test with fewer possible arrangements than
  // PERMUTATION_DRAWS counts every arrangement instead.
  BOOTSTRAP_DRAWS: 4000,
  PERMUTATION_DRAWS: 10000,
  // Intervals are 95%; a difference needs an adjusted p under 0.05.
  CONFIDENCE: 0.95,
  ALPHA: 0.05,
  // Each firm needs this many reports in the data a test uses.
  MIN_REPORTS: 5,
  // The smallest differences worth stating.
  MIN_SCORE_SHIFT: 0.5, // points
  RATE_RATIO_LOW: 0.8,
  RATE_RATIO_HIGH: 1.25,
  MIN_RATE_GAP: 2, // per 100 claims
  MIN_SCORE_SLOPE: 0.2, // points a year
  MIN_RATE_SLOPE: 1, // per 100 claims a year
  // A trend needs this many dated reports across this many distinct years.
  TREND_MIN_REPORTS: 6,
  TREND_MIN_YEARS: 3,
  // A quarterly report issued for several cities (the same title and quarter,
  // a different city) counts once, as its median-scoring copy.
  EDITIONS_COUNT_ONCE: true,
  // The interface.
  MAX_OTHERS: 3,
  SUGGESTIONS: 4,
  SUGGEST_MIN_REPORTS: 5,
  MAX_SENTENCES: 8,
  FLAG_SENTENCES_PER_FIRM: 2,
  READERS_BY_DEFAULT: false,
  // Over this many milliseconds on this machine, the statistics run in a Web Worker.
  WORKER_MS: 100,
})

const WHY = {
  BOOTSTRAP_DRAWS: 'Percentile intervals settle to about 0.01 of a point at 4,000 draws; the spec’s figure.',
  PERMUTATION_DRAWS: 'A p near 0.05 is known to about ±0.002 at 10,000 draws; the spec’s figure.',
  CONFIDENCE: 'The usual 95%.',
  ALPHA: 'The usual 0.05, after Holm’s adjustment within each family.',
  MIN_REPORTS: 'Below 5 reports a firm’s median and rates swing with one report; the spec’s figure.',
  MIN_SCORE_SHIFT: 'Half a point: the step between score bands on the brief is one point, and scores print to one decimal.',
  RATE_RATIO_LOW: 'A ratio within 0.8 to 1.25 is a difference of under a quarter, read as no real lean.',
  RATE_RATIO_HIGH: 'As RATE_RATIO_LOW, its reciprocal.',
  MIN_RATE_GAP: '2 claims in 100 is about one claim in a 50-claim report.',
  MIN_SCORE_SLOPE: '0.2 points a year is a band in five years.',
  MIN_RATE_SLOPE: '1 claim in 100 a year is the rate gap above in two years.',
  TREND_MIN_REPORTS: 'Six dated reports give 15 pairs for a Theil–Sen slope at most.',
  TREND_MIN_YEARS: 'Three distinct years, so a slope is not one jump between two.',
  EDITIONS_COUNT_ONCE: 'Added after review 3: city editions of one report are near copies (Mortenson’s Cost Index, JE Dunn’s Look Ahead), so counting each as a report treated copies as independent. Kyle decides what counts as a report.',
  MAX_OTHERS: 'Four firms side by side fit a phone and a printed page.',
  SUGGESTIONS: 'Four suggestions fit one line on a wide screen.',
  SUGGEST_MIN_REPORTS: 'A suggestion should be comparable: the same minimum as a test.',
  MAX_SENTENCES: 'The text stays shorter than the grid it describes.',
  FLAG_SENTENCES_PER_FIRM: 'The two largest flag differences per firm; the forest plot has the rest.',
  READERS_BY_DEFAULT: 'Readers choose which reports to add, so their entries come in only when asked for.',
  WORKER_MS: 'The spec’s threshold for moving the work off the page’s thread.',
}

// The interface rules that are not numbers, for the table.
export const COMPARE_RULES = Object.freeze({
  PRECHECK: 'Report types pre-checked: those where the chosen firm and at least one other firm each have a report; if none, the chosen firm’s types.',
  BUILD: 'One engine build per comparison: the build that scored most of the chosen firm’s reports (ties to the build with more entries on The List).',
})

export function ratificationTable() {
  return [
    ...Object.entries(COMPARE_CONSTANTS).map(([name, value]) => ({ name, value, why: WHY[name], status: 'PROVISIONAL' })),
    ...Object.entries(COMPARE_RULES).map(([name, value]) => ({ name, value, why: 'Interface rule.', status: 'PROVISIONAL' })),
  ]
}
