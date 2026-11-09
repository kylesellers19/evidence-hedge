# AEC provenance fixes: reports on engine 8feaff1

Nov. 9, 2026. Predictions: `checks/aec-provenance-predictions.json` (b4f5ef2), committed before any fix code. Baseline engine d6714e6 (app bcbedf8; no engine change between them). Corpus: the 1,584 research PDFs in the gitignored `checks/data/aec/`, run with `scripts/weigh-folder.mjs` from a `git archive` of each commit. Every report is read as an upload does, weighed linked and uploaded, and weighed a third time to confirm the result repeats. Numbers only; no document text.

## Where this started

The corpus's highest upload score was 8.8, for the Perkins&Will Research Journal, Volume 03.02. Linked, the same text scored 2.8. Three faults stacked up:

- The issue holds five articles, each with its own reference list. The engine cut at the first list past 40% of the text, so the last two articles and the back cover were counted as references.
- The firm's web address sits on that back cover, so the uploaded file had no address and its publisher came from text cues alone.
- One cue was a citation of Pew Research Center in an earlier article's reference list. That list sat before the 40% mark, so it stayed in the body, and one mention is enough to name the publisher as a nonprofit research group.

Across the corpus, the cue that did most of the damage was "foundation", which in these reports is usually a building's.

## The corpus, commit by commit

| Measure | d6714e6 | E 1bf5361 | F 7187124 | G 8feaff1 |
|---|---:|---:|---:|---:|
| Weighed | 1,552 | 1,552 | 1,552 | 1,552 |
| Repeat exactly | 1,552 | 1,552 | 1,552 | 1,552 |
| Publisher unknown, uploaded | 433 | 414 | 414 | 453 |
| Publisher unknown, linked | 22 | 22 | 22 | 25 |
| Read as nonprofit research, linked | 103 | 103 | 103 | 4 |
| Read as nonprofit research, uploaded | 181 | 164 | 164 | 64 |
| Read as a firm, linked | 1,365 | 1,365 | 1,365 | 1,458 |
| Read as a firm, uploaded | 862 | 900 | 900 | 956 |
| Publisher kind differs, linked vs uploaded | 514 | 476 | 476 | 521 |
| Judgment differs, linked vs uploaded | 510 | 473 | 473 | 514 |
| Score moves 0.5 or more, linked vs uploaded | 199 | 181 | 181 | 198 |
| Score exactly 1.0 (linked) | 699 | 699 | 697 | 718 |
| Median score (linked) | 1.2 | 1.2 | 1.3 | 1.2 |
| Claims | 426,027 | 426,027 | 434,027 | 434,165 |
| References (linked) | 15,086 | 15,086 | 10,443 | 10,443 |
| Read as a press release, linked | 33 | 33 | 33 | 36 |
| Perkins&Will journals: claims | 15,374 | 15,374 | 22,934 | 22,934 |
| Perkins&Will journals: median score, linked / uploaded | 1.0 / 2.9 | 1.0 / 1.0 | 1.6 / 1.6 | 1.6 / 1.6 |
| Perkins&Will journals: largest gap, linked vs uploaded | 6.0 | 0 | 0 | 0 |
| Highest score, linked / uploaded | 8.3 / 8.8 | 8.3 / 8.3 | 8.3 / 8.3 | 8.3 / 8.3 |

Bands, linked: d6714e6 failing 1,249, weak 249, mixed 44, carried 6, unscored 4; 8feaff1 failing 1,253, weak 246, mixed 44, carried 5, unscored 4. Per-commit results and this table are in `checks/data/aec/results-<commit>/`.

## Predictions against what happened

| Fix | Prediction | Predicted | Observed | |
|---|---|---|---|---|
| E | Publisher unknown, uploaded | 405–425 | 414 | hit |
| E | Nonprofit research, uploaded | 155–172 | 164 | hit |
| E | Publisher kind differs | 465–490 | 476 | hit |
| E | Judgment differs | 460–488 | 473 | hit |
| E | Score moves 0.5 or more | 155–192 | 181 | hit |
| E | Perkins&Will journals read as a firm, uploaded | 26 | 26 | hit |
| E | Perkins&Will journals: median score, uploaded | 1.0–1.8 | 1.0 | hit |
| E | Highest upload score | 8.3 | 8.3 | hit |
| E | Linked readings unchanged | yes | yes | hit |
| F | Reports whose body changes | 28 | 28 | hit |
| F | Claims | 431,000–438,000 | 434,027 | hit |
| F | References (linked) | 9,500–12,500 | 10,443 | hit |
| F | Score exactly 1.0 | 690–715 | 697 | hit |
| F | Perkins&Will journals: claims | 20,000–26,000 | 22,934 | hit |
| F | Perkins&Will journals: median score, linked | 1.0–1.5 | 1.6 | **miss** |
| F | Publisher kind differs / judgment differs, near E's | within 3 / 5 | 476 / 473 | hit |
| G | Nonprofit research, linked | 0–10 | 4 | hit |
| G | Nonprofit research, uploaded | 55–75 | 64 | hit |
| G | Read as a firm, linked | 1,445–1,465 | 1,458 | hit |
| G | Publisher unknown, uploaded | 440–465 | 453 | hit |
| G | Publisher kind differs | 505–535 | 521 | hit |
| G | Judgment differs | 500–530 | 514 | hit |
| G | Linked judgments that move | 90–110 | 97 | hit |
| G | Score exactly 1.0 | 700–770 | 718 | hit |
| G | Score moves 0.5 or more | 150–240 | 198 | hit |
| all | Fixtures A–C and the gold corpus unchanged; brief targets not re-recorded | yes | yes | hit |
| all | Every weighed report repeats exactly | yes | yes | hit |
| all | npm run check and npm run build after each fix | pass | pass | hit |

F's miss came from the citations. Once each article's list was a real reference list, the numbered markers in its claims ("[3]") resolved to entries. Before, the early lists sat in the body and the "references" were later articles' paragraphs, so those markers resolved to nothing. In Volume 03.01, flagged claims fell from 342 to 127 while claims rose from 464 to 760, and the score rose from 1.0 to 4.0. Seven journals moved by half a point or more, six of them up. One limit: every article numbers its list from [1], so a marker links to an entry with its number in any list of the issue, not necessarily its own article's.

## The journal that started it

Volume 03.02: 2.8 linked and 8.8 uploaded before; 2.8 both ways after E; 2.6 both ways after F, with 962 claims instead of 676 and 66 references instead of 220 (the 220 included two articles' paragraphs). The highest score is now the Perkins Eastman Latrobe Prize study on school modernization, 8.3 both ways, on 11 claims.

## What else moved

- **Uploads read as a firm.** E gave 47 uploads their own address (23 Perkins&Will journals, 10 Arup, 4 Jacobs). 38 changed publisher, and their scores fell by 1.47 on average (28 down, one up).
- **Firms no longer read as nonprofits.** G moved 100 linked readings off nonprofit research: 92 to a firm, the rest to government, trade press or unknown. Their scores fell by 0.68 on average where they changed (36 down, 12 up), and 21 more reports sit on the 1.0 floor.
- **Uploads with nothing to go on.** 39 uploads that read as nonprofit research now read as unknown: no own address, and no cue left once "foundation" needs a name. That is why the publisher kind differs, linked vs uploaded, in more reports after G than after E. The difference is now "a firm" against "unknown", not a wrong kind.
- **Three new press releases.** Two WSP case sheets and a SmithGroup news item now read as press releases from their link, once read as a firm rather than a nonprofit. Two scores are unchanged; one rose from 3.1 to 3.5.
- **Repeated headings.** Four single-list reports repeat the list's heading on each page. Their lists are now split at each heading, so the entry count moves by 1 to 4; body and claims are unchanged.

## Fixtures

Unchanged on every fix: A 330 claims, B 235, C 417, the same scores and the same brief targets. Fixture A's nonprofit cue total falls from 18 to 17 and Fixture C's from 1 to 0, neither shown on the page. The gold corpus keeps every provenance label (14 loaded; three supplied files are absent, as before).

## Not fixed in this round

- **Lists the engine does not recognize.** A list whose entries are numbered [n] but carry few other reference cues does not open a list, so a later recognized list can still run to the end of the issue. Volume 09.01 keeps 39% of its text in the body, and 07.01 and 14.02 keep 61%. Counting bracket numbers as entries would fix more of them, but it would also cut the reference lists of five single-list reports.
- **64 uploads still read as nonprofit research.** 48 have no address the engine can find; the rest are on .org, .uk, .gov and .au hosts. Their cues are mentions ("nonprofit", "coalition"), not self-descriptions.
- **File hosts.** 25 linked reports read as unknown (22 before): the three new ones moved from nonprofit research and sit on a university host, CloudFront and Contentful. The four still read as nonprofit research are on CloudFront and Contentful too. A link's host wins even when it is a file host.
- **Few claims, top score.** The highest score in the corpus rests on 11 claims, and the next two on 12 and 15.
- **Linkage records for d6714e6.** `npm run check` on bcbedf8 rewrites `checks/reports/links-d6714e6.json` and `records-d6714e6.json` (Fixture A reads 330 claims since bcbedf8, against the recorded 240). They were left as committed; this round's records are `links-8feaff1.json` and `records-8feaff1.json`.
