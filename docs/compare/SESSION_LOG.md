# Compare firms: session log

Session of Nov. 27, 2026, from 14:09 EST, unattended. Spec: "Evidence Hedge: Compare firms,
under The List (unattended session)", pasted by Kyle. If context is compacted, reread this file
first, then `INVENTORY.md`.

## Where things are

- App worktree `Evidence Hedge/.claude/worktrees/compare`, branch `compare`, baseline tag
  `compare-baseline` (9bde978). `checks/data` links to the main checkout's.
- Milestones are fast-forwarded into `main` with `git push origin compare:main`; the main
  checkout's own `main` is left alone (another session's branch state).
- Live table: Supabase project evidence-hedge, read with the publishable key. No write path
  (`INVENTORY.md`), so SQL goes to `checks/data/list/` for Kyle.

## Timeline (EST)

- 14:09 Baseline tag and worktree; `npm ci`.
- 14:10 Live table read: 1,809 audit entries, three builds, no reader entries; version 3
  columns absent.
- 14:14 Every live row matched to one ledger row; the 90fa8b3 run reproduces all 1,518 5b40af6
  entries. Baseline `npm run check` passes.
- 14:20 `INVENTORY.md` written.
- 14:20 Part A. Version 3 block in `docs/the-list.sql`; `list-load.mjs` writes the counts and
  checks the identity on every row; `--counts-only` and `--restamp` modes. SQL tested on a
  scratch Postgres 17 loaded with the 1,809 live rows: the version 3 block runs twice cleanly;
  the counts update sets all 1,809 (each equal to the ledger row that gave its score), row
  count, scores, builds and fingerprints unchanged, identity and checks hold, safe to rerun;
  readers' inserts: today's row and a row with all three counts pass, one count alone or
  counts that break a check are refused, an audit row from the public key is refused.
- 14:21 WATG's 20 PDFs re-weighed at 90fa8b3 from a `git archive` (ledger `run15w-90fa8b3`):
  identical to 9bde978 on all 20. The optional restamp then puts all 1,809 on 90fa8b3 with no
  score moving (tested on the scratch copy).
- 14:22 The column probe first asked for the version 3 columns, and its 400 showed as a console
  error on every visit; it now reads one row and looks for them.
- 14:23 Milestone 1 pushed: main = 7765977, Pages run 46056374322, live 14:25; `site-smoke`
  passes on https://evidencehedge.org (`/list/compare` shows its one sentence).
- Network: the system resolver stopped finding github.com (api.github.com and the site resolve).
  Git runs with `-c http.curloptResolve=github.com:443:<address from nslookup>`.
- 14:28 Predictions written and committed (dd74d51) before any comparison ran on real data.
- 14:33 List snapshot (`checks/targets/compare/list-rows.json`): the 1,809 public rows with counts
  from the ledgers that gave each score.
- 14:35 Statistics built. The largest selection took 28.7 s on one thread; the trend-gap shuffle
  (Theil–Sen over up to 113,000 pooled pairs per shuffle) was most of it. Work replanned as seeded
  slices for a worker pool: 3.9 s on 9 threads, results identical on any number of threads.
- 14:44 Python reference started in a subagent, from the definitions only, without the JavaScript
  (`scripts/compare-reference.py`, scipy and statsmodels).
- 14:45 to 15:05 Text, page, worker pool, styles, `check:compare`, `compare-browser`.
- 14:55 Reference agreement: estimates, rates and counted p to 1e-9; sampled p within three Monte
  Carlo errors. Interval ends first failed on lumpy bootstrap distributions (Suffolk's 7 reports: the
  97.5% point is 0.225 by 200,000 draws, but a 4,000-draw run lands on 0.225 or 0.05), where batch-
  means errors understate the noise; tolerance changed to order-statistic bands (logged in
  `docs/compare.md`). One end still outside its band was looked into (our end varies 9.36 to 9.40
  over seeds, 100,000 draws give 9.367, the reference 9.330) and recorded in
  `checks/targets/compare/reference-misses.json`.
- 15:05 Milestone 2 pushed: main = c306dc7, Pages run 46061720397 (`check:compare` ran in the
  workflow), live 15:11; `site-smoke` and `compare-browser` pass on https://evidencehedge.org (the
  browser check answers the table's requests with the snapshot; readers see "isn't available yet").
- 15:15 Predictions scored: 18 of 27 (`predictions.md`).
- 15:15 to 15:30 Three reviews in subagents (`reviews/`). Fixed: the text, grid and table items they
  marked "Fix now", and two statistical faults from review 3: city editions counted as reports, and
  the trend-gap shuffle's false positives. Both are logged as decisions in `docs/compare.md`; neither
  moved a constant. The reference was changed the same way for the trend-gap p. Predictions rescored:
  19 of 27.
- 15:28 Coverage study, first run (before editions counted once): score intervals cover 81.0% to
  91.4% at 5 reports; rerun with editions counted once started.
- 15:40 Milestone 3 checks: `npm run check` (31 scripts) and `compare-browser` pass locally.
- 15:46 Coverage rerun with editions counted once (`coverage.md`; the first run is superseded).
- 15:48 629096b live (Pages run 46065992682); session ends.
- 15:39 Milestone 3 live: main = 75f7b36, Pages run 46064970220; `site-smoke` and `compare-browser`
  pass on https://evidencehedge.org. Without the snapshot, the live page shows its one sentence and
  The List shows no compare links: the gate holds until the SQL runs.

## Completion report

### 1. Kyle's action

There is no write path to the database (no linked Supabase project, no database URL or service-role
key in any env file, no Supabase MCP server), so the SQL is written for the Supabase SQL editor, in
the gitignored `checks/data/list/` of the main checkout.

**Before running it, decide what counts as a report.** The tool goes live for readers the moment the
SQL runs. It now counts a quarterly report issued for several cities once (`EDITIONS_COUNT_ONCE`,
`src/list/compare/constants.js`): Mortenson's 135 entries count as 27 and JE Dunn's 111 as 7. If you
want each city copy counted, set it to `false` (and re-record with
`node checks/compare.test.mjs --write`); review 3 shows that inflates every interval and test that
touches those two firms.

Run, in order:

1. `list-v3.sql`: docs/the-list.sql's version 3 block. Adds `unsupported`, `overconfident` and
   `overreach`, their checks, and the readers' insert policy. Safe to run again. You see "Success. No
   rows returned".
2. `list-counts.sql`: sets the three counts on the 1,809 audit entries, each from the ledger row that
   gave its score (matched on fingerprint, build, score, claims and flagged), in one transaction that
   undoes itself if any audit entry is left without counts. Changes no score, build or row count. You
   see one table: `audit | 1809 | 1809`.
3. Optional, `list-restamp-to-90fa8b3.sql`: marks the 1,518 entries scored by 5b40af6 and WATG's 19
   (9bde978) as scored by 90fa8b3, where the 90fa8b3 run reproduces every score and count (it does
   for all 1,809). Changes only the engine column. You see `90fa8b3 | 1809`. Without it, a
   comparison led by HKS, Gensler, Burns & McDonnell or Weitz can't include Arup US, Perkins&Will or
   the other 5b40af6 firms, and WATG can be compared with no one.

All three were run against a scratch Postgres 17 copy of the live table: results as stated above.

Then, without a redeploy: `/list/compare` shows the tool, The List shows "Compare firms" beside its
search and "Compare {firm} with others" on a firm's line, and readers' new entries carry their flag
counts. To check it against the live table: `node checks/compare-browser.mjs https://evidencehedge.org
docs/compare/screens/live --live`, and refresh the checks' snapshot with
`node scripts/compare-snapshot.mjs` (it reads the counts from the table once they exist).

### 2. What shipped

- https://evidencehedge.org/list/compare (says comparison isn't available until the SQL runs), the
  Method section https://evidencehedge.org/method#compare, and the Legal and Method lines on what the
  add form sends.
- Milestone 1, Part A: 7765977, Pages run 46056374322.
- Milestone 2, the tool: c306dc7, Pages run 46061720397.
- Milestone 3, predictions, reviews and fixes: 75f7b36, Pages run 46064970220; coverage and this
  report: 629096b, Pages run 46065992682, live 15:48 with `site-smoke` and `compare-browser`
  passing on https://evidencehedge.org and the gate holding for readers.
- `npm run check` runs 31 scripts, `check:compare` among them, and the deploy runs `check:compare`
  before its build.

### 3. Ratification table

Every value is PROVISIONAL. "Effect" is measured on the four predicted selections (largest four,
suggested peers, small against largest, most different mix), at 75f7b36.

| Constant | Value | Why | Effect on the four selections |
|---|---|---|---|
| BOOTSTRAP_DRAWS | 4,000 | Percentile intervals settle to about 0.01 point; the spec's figure | Interval ends vary by a few hundredths between seeds; one reference miss of 0.017 recorded |
| PERMUTATION_DRAWS | 10,000 | A p near 0.05 is known to about ±0.002; the spec's figure | 4 tests counted every arrangement instead (Suffolk's trends) |
| CONFIDENCE | 0.95 | The usual | Coverage at small n is lower; see 5 |
| ALPHA | 0.05 | The usual, after Holm | 3 differences in all (1, 0, 0, 2) |
| MIN_REPORTS | 5 | Below 5, one report swings a median; the spec's figure | 8 pair rows "Too few reports" (4, 0, 4, 0) |
| MIN_SCORE_SHIFT | 0.5 points | Score bands step by a point | Decided no row |
| RATE_RATIO_LOW / HIGH | 0.8 / 1.25 | Under a quarter apart reads as no lean | Decided 2 rows (1, 0, 0, 1), both "cites nothing": Arup US 73 against WSP 67 per 100 by type, Mortenson 72 against SmithGroup 79 |
| MIN_RATE_GAP | 2 per 100 claims | About one claim in a 50-claim report | Decided 3 rows (3, 0, 0, 0), all "cites too little" (rates 0.2 to 0.7 per 100) |
| MIN_SCORE_SLOPE / MIN_RATE_SLOPE | 0.2 points / 1 per 100 a year | A band in five years; the rate gap in two | Decided 2 rows (1, 0, 1, 0): Arup US's score trend, 0.0 a year with adjusted p 0.001 |
| TREND_MIN_REPORTS / YEARS | 6 / 3 | 15 pairs at most; not one jump | 4 trend rows short (all JE Dunn: 7 editions in 2 years) |
| EDITIONS_COUNT_ONCE | true | Added after review 3; near copies aren't independent | Mortenson 135 → 27, JE Dunn 111 → 7. With the trend-gap change, the four selections went from 12 differences to 3; Mortenson's trends came from its copies |
| MAX_OTHERS | 3 | Four columns fit a phone and a page | — |
| SUGGESTIONS / SUGGEST_MIN_REPORTS | 4 / 5 | One line; comparable firms only | Suggested peers' selection is the first three |
| MAX_SENTENCES | 8 | Text shorter than the grid | 5, 1, 1 and 5 sentences; none cut |
| FLAG_SENTENCES_PER_FIRM | 2 | The rest are in the table | No firm had more than one flag difference |
| READERS_BY_DEFAULT | false | Readers choose what they add | No reader entries exist yet |
| WORKER_MS | 100 ms | The spec's threshold | The largest selection takes about a second on 9 threads, so the work always runs in workers |
| Pre-check rule | Types where the chosen firm and another each have a report; else the chosen firm's | Start from comparable types | — |
| One build per comparison | The chosen firm's majority build | Rule 3 applied literally | No report in the four selections was left out by it; HKS, Gensler, Burns & McDonnell and Weitz can't be set against 5b40af6 firms until the restamp |
| Holm families | 6 | Spec | Raw p under 0.05 but adjusted over: 15 rows (6, 5, 3, 1) |

Changed after seeing results, each logged in `docs/compare.md`: none of the constants above. Two
methods changed after review 3 (editions counted once; the trend-gap p from the paired bootstrap),
and the reference tolerance for interval ends changed from batch means to order-statistic bands
after the first comparison with the reference.

### 4. Predictions

18 of 27 as first run; 19 of 27 after the review fixes (`predictions.md`). Selections 2 and 3 hit
every prediction. The misses share one wrong belief: market outlooks and cost indexes score highest
at this build, not lowest.

### 5. The reference implementation and interval coverage

- `scripts/compare-reference.py` (scipy 1.18.1, statsmodels 0.15.0, written from definitions without
  the JavaScript): 164 rows over 5 selections. Point estimates, pooled rates, differences and every
  counted p match to 1e-9; every sampled p within three Monte Carlo errors; every interval end inside
  our order-statistic band but one, looked into and recorded (`reference-misses.json`). Holm matches
  statsmodels.
- Counted against sampled p on real small selections (Autodesk against Trimble, 252 arrangements;
  Suffolk's 7 dated reports, 5,040 orderings): agree within three errors.
- Coverage (`coverage.md`, with editions counted once; the five firms with the most reports, 500
  draws each against the rest of The List): score intervals cover 86.6% to 88.8% at 5 reports and
  92.8% to 95.6% at 10, against 95% nominal. Rate-ratio intervals cover less: "claims more cause"
  78.8% to 82.4% at 5 and 88.2% to 91.2% at 10; "cites nothing" 57.0% to 83.6% at 5 and 65.0% to
  93.2% at 10, worst for firms whose report lengths vary most (WSP, Arcadis North America), since a
  pooled rate swings with whether a long report is drawn. Review 3's own study agrees for scores (88%
  to 89% at 5 against 100).
- Recommendation, not made: for the score, the exact Hodges–Lehmann interval (inverting the rank-sum
  test) when a firm has under 10 reports; for rates, a bootstrap-t or BCa interval on the log ratio, or
  a report-level quasi-Poisson model; and until then, read an interval from fewer than 10 reports as
  narrower than it should be. Raising MIN_REPORTS to 10 for intervals would be the simplest change; it
  is Kyle's to make.

### 6. Open items from the reviews

1. **What counts as a report** (reviews 2 and 3). City editions now count once; decide, and whether
   The List should hold one entry per edition.
2. **One build** (inventory, review 3). Run the optional restamp, or the build rule keeps seven firms
   apart from the rest.
3. **Small-n intervals** (review 3, coverage). See 5.
4. **Zero counts** (review 3). A firm with no flags of a kind bootstraps to 0 every time, so the
   interval shows only the other firm's spread; a 0.5 pseudo-count or a Poisson bound would fix it.
5. **"Cites too little" can never pass** (review 3): the highest firm rate is about 1.6 per 100, under
   the 2-per-100 bar, yet it takes a third of the flag family's Holm slots. Keep testing it, or say once
   that it is rare.
6. **The ratio band and common flags** (review 2): at 65 to 79 per 100, gaps of 14 claims sit inside
   0.8 to 1.25. A floor in claims per 100 for common flags would let them through.
7. **Flag differences that don't hold type by type** (reviews 2 and 3): the text says so now; decide
   whether "Differs" needs both.
8. **Multiplicity across families** (review 3): with no true difference, about 8% of simulated pages
   still said something differs. Holm over every narrated test, or a fixed order (score, flags,
   trends), would hold the page to 5%.
9. **Trends that are steps** (review 3): a slope is stated without checking that a line fits; a minimum
   number of reports per year, or a fit check, would catch series that jump.
10. **Lead on the type-adjusted score?** (review 1) and **a verdict word for small but certain gaps**
    (reviews 1 and 2).
11. **Selection** (review 3): reports behind forms are not on The List (Gensler 95 found, 19 listed);
    the scope line could say so per firm, from the audit's coverage records.
12. **The List can't filter by build** (review 2), so a count's link can show more entries than the
    comparison used.
13. **Site-wide**: the "THE LIST" kicker is an eyebrow by your rule (review 1); the page names two
    builds, the comparison's and the footer's engine (review 1).
14. **Phones**: at 390 px the first screen holds only the first panel (review 1).
15. **Per-type minimum in the type-adjusted measures** (review 2): Arup US against Mortenson by type
    rests partly on Arup US's 2 market reports.
