# Compare firms

The compare tool under The List, at `/list/compare`. A reader picks one firm, up to three
others and the report types, and presses Compare. The page shows each firm's score by report
type, its flagged claims per 100 claims, how both move by publication year, sentences generated
from the statistics, and the numbers behind every sentence as a forest plot.

Built in `src/list/compare/`: `data.js` (which entries, which build, the firms, suggestions, report
types and the address), `stats.js` (the statistics), `format.js` (how numbers and names are
written), `narrate.js` (the text), `useStats.js` and `worker.js` (the statistics in Web Workers),
and the page (`ComparePage.jsx`, `CompareTool.jsx`, `Pickers.jsx`, `Results.jsx`, `charts.jsx`),
styled by `src/styles/compare.css`. Held by `npm run check:compare` (`checks/compare.test.mjs`)
and `checks/compare-browser.mjs`. The session that built it: `docs/compare/` (inventory,
predictions, session log, reviews, screenshots).

## The questions it answers

1. Do this firm's reports score higher or lower than these firms' reports of the same kind?
2. Which flags does each firm's writing lean toward?
3. Is either of those changing over time?
4. Which of these differences are bigger than chance would produce with this many reports?

## Rules

1. **No language model.** The text comes from templates filled by the statistics. Every number in
   a sentence is a formatted value of a statistics row the sentence cites, and the check proves it.
2. **The report is the unit.** Every interval resamples reports and every test shuffles reports
   (or their years). Claims are never independent draws.
3. **Like with like.** One engine build per comparison. Only the corpus audit's entries by default;
   readers' entries only when asked for, and only those the same build scored.
4. **Only differences that pass are described as differences** (below). When nothing passes, one
   sentence says so, with the report counts.
5. **Words.** Never "fallacy". The three flags take the brief's labels, imported from
   `briefTop.js` (`statsLabels`) and ordered by `patterns.js` (`FLAG_ORDER`). The words never shown
   to readers in `docs/evidence-section.md` apply, and so do "carry", "carries", "significant",
   "outperform", "better firm" and causal words about firms ("because", "due to", "drives", "leads
   to", "results in"). Sentence case, Delgam's copy rules, AP dates, "report types".
6. **Constants are provisional,** all in `COMPARE_CONSTANTS` (`constants.js`), listed with reasons by
   `ratificationTable()`.

## The statistics

The chosen firm is compared with each other firm, one pair at a time.

| Measure | Estimate | 95% interval | Test | With report type accounted for |
|---|---|---|---|---|
| Score | Hodges–Lehmann shift (median of every pairwise difference, chosen minus other), points | Percentile bootstrap, reports resampled within each firm | Firm names shuffled between the two firms' reports; statistic the Mann–Whitney U (centered) | Shift within each type both firms have, weighted n₁n₂/(n₁+n₂); bootstrap within firm × type; shuffles within type; statistic van Elteren's |
| Each flag | Ratio of pooled rates (100 × count ÷ claims); the text also gives the rates | Cluster bootstrap over reports within each firm | Firm names shuffled over reports; statistic \|log ratio\| | Mantel–Haenszel rate ratio across types, claims as the denominator; bootstrap within firm × type; shuffles within type |
| Trend, per firm | Theil–Sen slope of score, or of each report's flag rate, on publication year | Bootstrap over the firm's dated reports | Years shuffled among the firm's reports; statistic Mann–Kendall's \|S\| | — |
| Trend gap | Chosen firm's slope minus the other's | The two firms' bootstraps, paired draw by draw | Firm names shuffled among the two firms' dated reports, years kept; statistic \|slope gap\| | — |

- **Draws:** 4,000 bootstrap, 10,000 permutation. A test with no more possible arrangements than
  10,000 counts every one (p = share at least as extreme); otherwise p = (b + 1) / (m + 1).
- **Seed:** each task's generator (mulberry32) is seeded by a hash (cyrb53) of the normalized
  selection, the data's fingerprint (rows, highest id, build), the row and the part, so the same
  address gives the same numbers on every load.
- **Holm** within each family: score; score by type; flags (3 × the other firms); flags by type;
  per-firm trends; trend gaps. Only tests that ran are counted.
- **"Differs"** needs all of: adjusted p under 0.05; an interval that leaves out no difference; at
  least 5 reports per firm in the data the test uses; and a gap worth stating (0.5 points; a ratio
  outside 0.8 to 1.25 and at least 2 per 100 claims apart; 0.2 points or 1 per 100 claims a year).
  For a flag, the report-weighted rate (the mean of the reports' own rates) must lean the same way
  as the pooled one. Anything else that was tested is "Can't be told apart"; untested is "Too few
  reports".
- **Zero counts:** when either firm's pooled count for a flag is 0, the estimate, interval and test
  use the difference per 100 claims (Mantel–Haenszel's rate difference across types), and the text
  says "none". When both are 0 there is nothing to tell apart (p = 1).
- **Trend minimums:** 6 dated reports across 3 distinct years. A year, month or day date gives a
  year; an unknown date leaves the report out of trends only.

## Decisions

Taken while building, Nov. 27, 2026. Everything here is PROVISIONAL.

- **Builds.** The List holds three builds (5b40af6, 90fa8b3, 9bde978; `docs/compare/INVENTORY.md`).
  Rule 3 is applied literally: the build is the one behind most of the chosen firm's reports (ties
  to the build with more entries), other firms come in at that build only, and the scope line says
  how many of the chosen firms' reports another build scored. 90fa8b3 reproduces every 5b40af6
  entry's score and counts, and 9bde978 has the same engine code as 90fa8b3, so an optional SQL file
  (`scripts/list-load.mjs --restamp`) can put all 1,809 entries on one build without moving a score.
  That is Kyle's call.
- **The page leads with "All chosen types".** 174 of 238 firm × type cells hold fewer than 5 reports.
  Type rows where no pair (the chosen firm and another) reaches 5 reports collapse behind one
  control. The minimums are as written.
- **The trend-gap test is the slow one.** Each shuffle needs two Theil–Sen medians over up to 113,000
  pooled pairs, so the largest real selection (Arup US with Mortenson, WSP and JE Dunn
  Construction, all types) is 21.8 seconds of work on one thread. The work is planned as 724 seeded
  slices and spread over Web Workers (3.9 seconds on 9 threads here), with "Working it out…" while it
  runs. The draw counts are as written.
- **The trend-gap interval** pairs the two firms' own bootstrap draws (independent resamples), so it
  costs nothing extra.
- **Sign changes** with report type accounted for count only between gaps that print as more than
  0.0; a gap that rounds to nothing "closes".
- **Too many sentences:** over eight, sentences go by rank (trend gaps, trends, flags, the type-mix
  line, the type-adjusted line, the grouped "can't be told apart" lines), last first, but never the
  last sentence of a kind of finding, so the text still says whether the firms lean differently and
  whether any is changing. Every firm's score sentence stays.
- **The type-mix line** ("Gensler publishes more market reports, which score lower across The List")
  appears only when the type with the widest share gap scores on the side that explains the gap,
  by its median across The List at the build.
- **The closing line** reads "as Evidence Hedge weighed them", not "as the engine weighed them": "the
  engine" is on the list of words never shown to readers.
- **The scope line** says readers' reports were "left out: a different engine build scored them",
  without "because".
- **Over time:** the x axis spans the chosen firms' dated years; the context column shows The List's
  reports from those years. A firm with enough dated reports but too few distinct years reads "Too
  few years (n)".
- **Per-firm trends** have rows in the forest table too, since the text cites them.
- **Marks:** the chosen firm in `--eh-ink`, the others in `--eh-ink-faint` (5.4:1; `--eh-dot` is under
  3:1 on paper), the context column in `--eh-dot` with its values printed.
- **Reference tolerances.** Point estimates, rates, differences and counted p match the Python
  reference (`scripts/compare-reference.py`) to 1e-9. A sampled p must fall within three combined
  binomial standard errors. An interval end must fall inside our run's order-statistic band: the
  draws' quantiles at the end's probability ± 3√2 standard errors on the probability scale. Batch
  means were tried first and understate the error for the lumpy bootstrap distributions small firms
  give (Suffolk's 7 reports: the 97.5% point is 0.225 or 0.05 depending on the draws). A miss that
  was looked into is recorded in `checks/targets/compare/reference-misses.json` and reported, not
  failed; any other fails.
- **Entry points** on The List ("Compare firms" beside the search, "Compare {firm} with others" on the
  firm line) and the tool itself show only when the table answers with the version 3 counts; until
  then `/list/compare` says comparison isn't available yet.

## Checks

- `npm run check:compare`: agreement with the reference; counted against sampled p on real small
  selections; Holm within families; byte-for-byte determinism on one thread or four; every number
  in the text cited; only differences described as differences; banned words; at most eight
  sentences; flag labels imported; the address; the constants. The text of the four selections in
  `docs/compare/predictions.md` is recorded in `checks/targets/compare/<slug>.json`; re-record a
  deliberate change with `node checks/compare.test.mjs --write` in the same commit.
- `node checks/compare-browser.mjs <base> <out>`: four widths, layout and axe, the keyboard path,
  the shared address and Back. Add `--live` once the table has the counts.
- The data: `checks/targets/compare/list-rows.json` (`node scripts/compare-snapshot.mjs`), the
  List's public rows with flag counts; `reference-inputs.json` (`node scripts/compare-inputs.mjs`);
  `checks/targets/compare-stats.json` (`uv run --with scipy --with statsmodels --with numpy python
  scripts/compare-reference.py`).
