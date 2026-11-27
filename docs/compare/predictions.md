# Compare firms: predictions

Written Nov. 27, 2026, 14:40 EST, before any comparison was computed on real data. At this point
the session had seen only report counts, report types, date precision and engine builds per firm
(`INVENTORY.md`), and nothing about any firm's scores or flags beyond what earlier sessions
recorded for the whole corpus: scores bunch low (median near 2.1, about 45% at the 1.0 floor),
and most flags are claims that cite nothing.

## The four selections, by rule

Every selection is compared on one engine build. The rules below are applied to the build with
the most entries on The List (5b40af6, 1,518 entries), and each selection uses every report type
any of its firms has (the "All" button), so no report is left out by a choice of types.

1. **The two firms with the most audit reports, plus the next two:** Arup US (351), Mortenson
   (135), WSP (116) and JE Dunn Construction (111), with Arup US as the chosen firm. Burns &
   McDonnell has more (162) but sits on 90fa8b3, so it is not on this build.
2. **A firm against its three suggested peers:** the largest firm not in selection 1, Arcadis
   North America (75), with its first three suggestions by cosine similarity of report-type
   counts among firms with at least 5 reports: NV5 Global (57, 0.93), SSOE (18, 0.93) and HOK
   (31, 0.90).
3. **A firm with 5 to 7 reports against the firm with the most reports:** the largest such firm,
   Suffolk (7, all white papers), as the chosen firm, against Arup US (351, 2 of them white
   papers).
4. **The pair whose report-type mixes differ most:** among firms with at least 20 reports that
   share a type in which both have at least 5, the lowest cosine similarity: Mortenson (135; 124
   industry or market reports) as the chosen firm, against SmithGroup (33; research reports,
   other, opinion or commentary, marketing material; cosine 0.05). They share research reports
   (10 each).

## Predictions

Each is a verdict as the page gives it ("Differs", "Can't be told apart", "Too few reports"),
with a direction where one is predicted. A prediction hits when the verdict matches and, for
"Differs", the direction does too.

### Selection 1: Arup US with Mortenson, WSP and JE Dunn Construction

| # | Measure | Against | Prediction | Why |
|---|---|---|---|---|
| 1.1 | Score | Mortenson | Differs, Arup US higher | Mortenson's are market outlooks and cost indexes, full of figures stated without a source; Arup US's are mostly research reports and essays that cite more |
| 1.2 | Score | WSP | Can't be told apart | Similar mixes, mostly research reports |
| 1.3 | Score | JE Dunn Construction | Differs, Arup US higher | As Mortenson: all market reports |
| 1.4 | Score, type accounted for | Mortenson | Can't be told apart (the gap shrinks) | The two share only research reports in any number, and Mortenson has 10 |
| 1.5 | Score, type accounted for | JE Dunn Construction | Too few reports | JE Dunn has only market reports; Arup US has 2 of those |
| 1.6 | Cite nothing | Mortenson | Differs, Arup US lower | Uncited figures |
| 1.7 | Cite nothing | JE Dunn Construction | Differs, Arup US lower | Uncited figures |
| 1.8 | Cite nothing | WSP | Can't be told apart | Similar mixes |
| 1.9 | Cite too little | all three | Can't be told apart | Rare everywhere, so under 2 per 100 apart |
| 1.10 | Claim more cause than the study shows | Mortenson, JE Dunn Construction | Differs, Arup US higher | Research and essays use causal language; price outlooks less |
| 1.11 | Per-firm trend in score | Arup US | Can't be told apart from no trend | No reason to expect a steady change |
| 1.12 | Trend differences | all | Can't be told apart | As 1.11 |

### Selection 2: Arcadis North America with NV5 Global, SSOE and HOK

| # | Measure | Against | Prediction | Why |
|---|---|---|---|---|
| 2.1 | Score | NV5 Global, SSOE, HOK | Can't be told apart, all three | Suggested peers publish the same kinds of reports; the sizes (57, 18, 31) catch only large gaps |
| 2.2 | Score, type accounted for | all three | Can't be told apart | As 2.1 |
| 2.3 | Each flag | all three | Can't be told apart on at least 8 of the 9 | As 2.1 |
| 2.4 | Trend differences | all | Can't be told apart | Few dated years for SSOE and HOK |

### Selection 3: Suffolk with Arup US

| # | Measure | Prediction | Why |
|---|---|---|---|
| 3.1 | Score | Can't be told apart | 7 reports catch only a very large gap |
| 3.2 | Score, type accounted for | Too few reports | Arup US has 2 white papers |
| 3.3 | Each flag | Can't be told apart on all 3 | 7 reports |
| 3.4 | Each flag, type accounted for | Too few reports | As 3.2 |
| 3.5 | Suffolk's own trends | Can't be told apart from no trend | 7 dated reports |

### Selection 4: Mortenson with SmithGroup

| # | Measure | Prediction | Why |
|---|---|---|---|
| 4.1 | Score | Differs, Mortenson lower | Market reports against research and essays, as 1.1 |
| 4.2 | Score, type accounted for | Can't be told apart (the gap shrinks or flips) | Only research reports are shared, 10 each |
| 4.3 | Cite nothing | Differs, Mortenson higher | As 1.6 |
| 4.4 | Cite nothing, type accounted for | Can't be told apart | As 4.2 |
| 4.5 | Mortenson's trend in score | Can't be told apart from no trend | Yearly cost reports of one form |

## Results

Recorded after the run, below, without changing anything above.

### Scored Nov. 27, 2026, 15:15 EST, on the snapshot of The List at 7765977's data (1,809 rows)

**18 of 27 hit.** Selections 2 and 3 hit every prediction (9 of 9); selections 1 and 4 hit 9 of 18.

| # | Predicted | Result | |
|---|---|---|---|
| 1.1 | Score vs Mortenson: differs, Arup US higher | Differs, Arup US **lower**: −1.7 points (−1.9 to −1.4), adjusted p < 0.001 | Miss |
| 1.2 | Score vs WSP: can't be told apart | 0.0 (−0.1 to 0.2), p 0.78 | Hit |
| 1.3 | Score vs JE Dunn: differs, Arup US higher | Differs, Arup US **lower**: −0.9 (−1.1 to −0.6) | Miss |
| 1.4 | Type accounted for vs Mortenson: can't be told apart | −0.1 (−0.7 to 0.3), p 0.84 | Hit |
| 1.5 | Type accounted for vs JE Dunn: too few | Too few (2 and 111 in shared types) | Hit |
| 1.6 | Cite nothing vs Mortenson: differs, Arup US lower | Can't be told apart: Arup US 73 and Mortenson 65 per 100, a ratio of 1.1, inside 0.8 to 1.25 | Miss |
| 1.7 | Cite nothing vs JE Dunn: differs, Arup US lower | Can't be told apart: 73 and 67, ratio 1.1 | Miss |
| 1.8 | Cite nothing vs WSP: can't be told apart | Can't be told apart | Hit |
| 1.9 | Cite too little, all three: can't be told apart | All three can't be told apart (0.2 to 0.5 per 100) | Hit |
| 1.10a | Claim more cause vs Mortenson: differs, Arup US higher | Differs: 7.9 and 5.5 per 100, 1.4 times (1.2 to 1.8) | Hit |
| 1.10b | Claim more cause vs JE Dunn: differs, Arup US higher | Can't be told apart: 7.9 and 6.7, adjusted p 0.086 | Miss |
| 1.11 | Arup US's score trend: can't be told apart from none | 0.0 a year | Hit |
| 1.12 | Trend differences: can't be told apart | Mortenson's scores fall 0.5 a year (0.2 to 0.6) and its "cite nothing" rate rises 5.2 per 100 a year (3.0 to 7.4); both trend gaps with Arup US differ | Miss |
| 2.1 | Score, all three peers: can't be told apart | All three (−0.3, 0.0, −0.2) | Hit |
| 2.2 | Type accounted for, all three: can't be told apart | All three | Hit |
| 2.3 | Flags: at least 8 of 9 can't be told apart | 9 of 9 | Hit |
| 2.4 | Trend differences: can't be told apart | All | Hit |
| 3.1 | Suffolk score vs Arup US: can't be told apart | 0.2 (−0.2 to 0.6), p 0.56 | Hit |
| 3.2 | Type accounted for: too few | Too few (7 and 2) | Hit |
| 3.3 | Flags: can't be told apart | All three | Hit |
| 3.4 | Flags, type accounted for: too few | All three | Hit |
| 3.5 | Suffolk's trends: can't be told apart from none | All, from 7 dated reports | Hit |
| 4.1 | Score: differs, Mortenson lower | Differs, Mortenson **higher**: 1.8 (1.3 to 2.3) | Miss |
| 4.2 | Type accounted for: can't be told apart, shrinks or flips | Flips to −0.4 (−1.4 to 0.4), can't be told apart | Hit |
| 4.3 | Cite nothing: differs, Mortenson higher | Can't be told apart: Mortenson **lower**, 65 and 79, ratio 0.8 at the band's edge | Miss |
| 4.4 | Cite nothing, type accounted for: can't be told apart | Can't be told apart | Hit |
| 4.5 | Mortenson's score trend: none | Falls 0.5 a year (0.2 to 0.6) | Miss |

**What the misses say.** The predictions assumed that market outlooks and cost indexes, being full of
figures with no source named, would score lowest. They score highest: Mortenson's median is 3.6 and JE
Dunn's 3.2, against 1.8 for Arup US and 1.7 for SmithGroup, and The List's industry or market reports
score higher than its research reports at this build. A figure in a cost report seems to be read as the
firm's own data more often than a finding in an essay is read as backed. The misses on "cite nothing"
come from the same belief, and from the smallest gap worth stating: rates of 65 to 79 per 100 differ by
under a quarter, so a ratio of 1.1 or 0.8 does not count however small its p. The trend misses come from
one firm: Mortenson's yearly cost reports have drifted down, half a point a year since 2016. No constant
was changed after these results.

### After the reviews (15:35 EST): editions counted once, trend gaps tested by bootstrap

Review 3 found two faults in the statistics behind the results above: city editions of one quarterly
report (Mortenson's Construction Cost Index, JE Dunn's The Look Ahead) counted as separate reports, and
a trend-gap test that assumed two firms' dated reports were interchangeable. With each edition counted
once (Mortenson's 135 entries count as 27, JE Dunn's 111 as 7) and trend gaps tested by their paired
bootstrap, the same predictions score **19 of 27**:

- Changed to hits: 1.12 (no trend gap differs) and 4.5 (Mortenson's score trend is now 0.1 a year,
  −0.1 to 0.3).
- Changed to misses: 1.10a (Arup US against Mortenson on claims of cause is now 7.9 and 7.7 per 100,
  can't be told apart).
- Still misses, with new numbers: 1.1 (Arup US 0.9 lower than Mortenson, 0.1 to 1.8, adjusted p
  0.004), 1.3 (against JE Dunn's 7, −0.8, adjusted p 0.063: can't be told apart, not higher), 4.1
  (Mortenson 1.1 higher than SmithGroup, 0.2 to 2.0).

The table above is left as first scored. The trends that the first run found in Mortenson's reports
came from the copies: one edition issued for seven cities counted seven times.
