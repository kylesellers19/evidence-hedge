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
