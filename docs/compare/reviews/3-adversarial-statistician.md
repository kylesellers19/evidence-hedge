# Review 3: adversarial statistician (statistics at c306dc7)

**Verdict: not ready. The arithmetic matches its rows and the reference, but only 2 of the 10 "differs" sentences in the four recorded texts hold as written. The rest depend on city editions counted as separate reports, a trend-gap test that isn't valid, or a report-type mix that the text leaves out.**

Hand checks (`checks/scratch/review3-hand.py`, from `list-rows.json` without the page's code): "1.7 points lower than Mortenson's" (HL −1.70); "7.9 … 5.5 (1.4 times)" (7.89, 5.46, 1.446); "5.5 … 9.7 (SmithGroup's 1.8 times; 1.3 to 2.5)" (5.458, 9.747, 1.786; e^0.233, e^0.898); "risen by about 5.2" (Theil–Sen 5.218 over 7,533 pairs). Every number matches its row. The problems are in what the rows mean.

The findings are against c306dc7. The uncommitted `narrate.js` seen at 15:27 already keeps type sentences under the cap (4), adds a type caveat to flag sentences (3) and gives trend spans and counts (6). Finding 5 still reproduces on that working tree, and findings 1, 2, 7 and 8 are in `stats.js`, which that working tree leaves as it was.

## Findings

**1. Critical. City editions are counted as independent reports.** 124 of Mortenson's 135 reports are its Construction Cost Index: 18 quarterly editions, each issued for about 7 cities with near-identical text (Q1 2021: six cities scoring 3.6, 3.6, 3.6, 3.6, 3.6 and 4.0, with 11 claims each). JE Dunn's 111 are The Look Ahead: 7 editions of about 16 cities each (Q2 2023: 1.4 to 1.6). Counting each edition once (`review3-editions.py`):
- Mortenson's score trend: −0.47 (p 0.0005) becomes +0.04 (p 0.72; interval −0.23 to 0.20).
- Mortenson's cite-nothing trend: +5.2 becomes +0.1 (p 0.94).
- Mortenson against JE Dunn on score: 0.7 (0.3 to 1.1, "Differs") becomes 0.0 to 1.8 (edition-level Mann–Whitney p 0.91).
- Arup US against JE Dunn: −1.1 to −0.6 widens to −1.6 to −0.2.

Rule 2 fails here, and with it trend-score-1, trendgap-score-1, trend-score-0 and trend-unsupported-0.

**Fix now:** add an edition key (firm, year and title with the city and quarter removed). Resample and shuffle editions, not reports, in every bootstrap, permutation and trend. Count editions toward the minimums, and print "135 reports in 29 editions". **Open for Kyle:** whether The List should hold one entry per edition.

**2. Critical. The trend-gap test assumes exchangeability that the data break.** Shuffling firm names over the dated reports treats the two firms' (year, value) pairs as exchangeable. Firms differ in level, spread and year coverage. I shuffled each firm's values across its own years, which leaves neither firm with a trend, and ran 200 simulations (`review3-gapsize.mjs`). `trendGapTest` gave p < 0.05 in:
- 55% of runs for Arup US (1999–2026) against WSP (2018–2026), cite nothing
- 46.5% for the same pair on score
- 15.5% for Arup US against Mortenson on score

The real rows show it too: trendgap-unsupported-2 has adjusted p 0.004 but an interval of −5.5 to 0.5, and trendgap-score-2 has 0.003 with 0.0 to 0.4. Only the unadjusted interval keeps these from reading "Differs", so Holm protects nothing in this family, and the forest prints p values that aren't valid. **Fix now:** take p from the paired bootstrap the interval already uses (twice the smaller tail share, +1 corrected), then apply Holm. This also removes the 21.8-second workload.

**3. High. Flags never get a like-with-like check.** `narrate.js:49` reads only `flag-*` rows, so `flagtype-*` rows never reach the text. Both flag sentences in the targets disappear once report types are matched:
- Arup US to Mortenson on cause claims is 1.45, but flagtype-overreach-1 is 0.9 (0.7 to 1.1), adjusted p 1.00. Within research reports, the one type both firms publish in number, Mortenson is higher (7.9 against 7.4).
- Mortenson to SmithGroup is 0.56 pooled, but 1.00 (0.58 to 1.77) by type, adjusted p 1.00.

**Fix now:** apply the score's like-with-like rule to flags. Say so when the type-adjusted verdict or sign changes, or withhold "differs" when the type-adjusted row contradicts it.

**4. High. The sentence cap drops the caveat and keeps the claim.** In largest-four, "0.9 points lower than JE Dunn Construction's" stands alone, though only 2 of Arup US's 351 reports share a type with JE Dunn (scoretype-3, n 2/111). `narrate.js:127` writes "leaves too few reports of the same types (2 and 111)", and `cap()` removes it because `KEEP_ONE` (lines 25 and 29) protects the last trend and trend-gap sentences. **Fix now:** never remove a type sentence while the score sentence it qualifies stays, and add a check for it.

**5. High. The lead misreports untested results.** For Mortenson against Barton Malow Holdings (4 reports) the page says "Mortenson's scores can't be told apart from Barton Malow Holdings', though some trends differ." The next sentence says there are too few reports. Two causes:
- `narrate.js:83` falls back to every firm when `apart` is empty, so "Too few reports" becomes "can't be told apart".
- "Some trends differ" appears when only Mortenson's own trend passed and no gap was tested. That reads one passing trend as a difference between two firms.

Also, a pass on a `flagtype` row alone sets `anyDiffers` (lines 52 and 53), but `flagsDiffer` (line 82) never reads those rows. **Fix now:** the lead names only firms in `apart`; a per-firm trend reads as "and Mortenson's scores have changed"; add checks for both.

**6. Medium. A step in one series is described as a straight line.** Mortenson's 2016–2020 reports are 8 research reports (median 1.2), and the cost index starts in 2021. Through 2024 the slopes are +0.3 points a year and −5.1 cite-nothing per 100 a year, the opposite signs of the stated trends. The fall is the editions from Q4 2025 on (edition medians about 1.6, against 3.4 to 5.5 before). `predictions.md` says "yearly cost reports … since 2016", but they are quarterly and began in 2021. **Fix now:** correct `predictions.md`, and put the year span and the count of dated reports in the trend sentence. **Open for Kyle:** require a minimum number of reports in each year before a slope is stated.

**7. Medium. Small-n intervals undercover.** I drew 1,000 samples from real firms' scores (`review3-coverage.mjs`). The nominal 95% interval covered the true shift:
- 88–89% of the time at 5 reports against 100
- 92% at 5 against 5
- 93–94% at 7 against 100

The type-adjusted bootstrap adds no variance from cells of 1 report and too little from cells of 2. In largest-four scoretype-1, such cells (Mortenson's 1 "Other", Arup US's 2 market reports) hold 23% of the weight. **Fix now:** use the exact Hodges–Lehmann interval (inverting the rank-sum test) for the unstratified score, and merge single-report cells before bootstrapping.

**8. Medium. Zero counts and infinite ends.**
- A firm with no flags bootstraps to 0 every time, so the interval reflects only the other firm. Suffolk has 0 cites-too-little flags in 399 claims, and its interval is −0.2 to −0.1; a rule-of-three bound allows a rate up to 0.75 per 100.
- Across all 741 pairs of firms with 5 or more reports, 46 of 74 zero-count rows exclude 0 for this reason, and 411 pooled flag rows have an infinite end (`review3-flagsweep.mjs`).
- "Cites too little" can never pass: the highest firm rate is 1.56 per 100, under the bar of 2, yet the flag takes 3 of 9 Holm slots.

**Fix now:** add a 0.5 pseudo-count per firm in the flag bootstrap, or use a Poisson bound on the zero side. **Open for Kyle:** keep testing cites too little, or say once that it is rare.

**9. Medium. Selection.**
- The audit's coverage lists reports behind forms: Gensler 95 against 19 on The List, Burns & McDonnell 326 against 162, Perkins Eastman 59 against 26. Yet the text says "Gensler's reports".
- Build 90fa8b3 holds the reports added Nov. 10 and 11 and the five that fix H changed. That subset was not chosen at random, and since 1,518 of 1,518 entries reproduce, the build rule cuts seven firms off from the rest for no measurement reason.

**Fix now:** the scope line gives coverage ("19 of 114 found; 95 behind a form"). **Open for Kyle:** run the restamp.

**10. Low. Multiplicity across families.** Each of the six families holds its own 5%. I pooled the suggested-peers firms and shuffled their names, so no firm truly differs (`review3-pagefwer.mjs`). 5 of 60 pages still said something differs, about 8%. **Open for Kyle:** apply Holm over every narrated test on a page, or test in a fixed order (score, then flags, then trends).

**11. Low. Wording and rounding.**
- "The gap reverses, to 0.4 points lower" asserts a direction that p 0.26 doesn't support. Write "can't be told apart once report types are matched (11 and 20 reports)".
- Most-different-mix scoretype-1 has a lower end of −1.45, which prints "−1.4" in the forest and "1.5" in the text, because `points()` rounds halves up (`format.js:14`). Round magnitudes instead.
- Mortenson and JE Dunn are 71% of the 331 market reports behind "score higher across The List". Leave the compared firms out of that median.
- If the agreement rule ever decides a verdict, it should get its own words rather than "can't be told apart". It decided none of the 741 pairs.

Scratch probes are in `checks/scratch/review3-*`.
