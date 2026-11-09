# AEC corpus fixes: reports on engine d6714e6

Nov. 9, 2026. Predictions: `checks/aec-fixes-predictions.json` (d9b9820, addendum 2db51c4), committed before each fix's code. Baseline engine 519810d. Corpus: 1,584 research PDFs from architecture, engineering and construction firms in the gitignored `checks/data/aec/`, run with `scripts/weigh-folder.mjs` from a `git archive` of each commit. Every report is read as an upload does, weighed linked and uploaded, and weighed a third time to confirm the result repeats. Numbers only; no document text.

## The corpus, commit by commit

| Measure | 519810d | A 7041657 | B 2b773d2 | C 070850f | D 852e7b8 | D2 d6714e6 |
|---|---:|---:|---:|---:|---:|---:|
| Weighed | 1,555 | 1,555 | 1,555 | 1,552 | 1,552 | 1,552 |
| Repeat exactly | 1,555 | 1,555 | 1,555 | 1,552 | 1,552 | 1,552 |
| Refused, not English | 0 | 0 | 0 | 3 | 3 | 3 |
| No claims | 6 | 6 | 6 | 5 | 1 | 4 |
| No claims, yet scored | 6 | 6 | 6 | 0 | 0 | 0 |
| Score exactly 1.0 (linked) | 720 | 710 | 710 | 710 | 718 | 699 |
| Median score (linked) | 1.2 | 1.2 | 1.2 | 1.2 | 1.2 | 1.2 |
| Read as a press release, linked | 295 | 34 | 34 | 33 | 33 | 33 |
| Read as a press release, uploaded | 248 | 9 | 16 | 16 | 16 | 16 |
| Publisher unknown, uploaded | 985 | 985 | 435 | 433 | 433 | 433 |
| Publisher unknown, linked | 22 | 22 | 22 | 22 | 22 | 22 |
| Publisher kind differs, linked vs uploaded | 1,141 | 1,141 | 516 | 514 | 514 | 514 |
| Judgment differs, linked vs uploaded | 1,048 | 1,127 | 512 | 510 | 510 | 510 |
| Score moves 0.5 or more, linked vs uploaded | 393 | 441 | 193 | 193 | 194 | 199 |
| Claims | 419,316 | 419,316 | 419,316 | 418,550 | 446,843 | 426,027 |
| Example lines with plain non-claim markers | 344 | 335 | 335 | 335 | 143 | 132 |
| Reports showing one | 228 | 222 | 222 | 222 | 124 | 113 |
| Series judged more than one way | 21 | 18 | 18 | 18 | 18 | 18 |
| Score 6.5 or higher on 15 claims or fewer | 11 | 11 | 11 | 5 | 4 | 4 |

Bands, linked: 519810d failing 1,260, weak 244, mixed 38, carried 6, strong 7; d6714e6 failing 1,249, weak 249, mixed 44, carried 6, strong 0. Six of the seven strong scores were the documents with no claims or no English. The seventh was a page with one claim; once its headings stood apart (fix D) it has four and scores 3.9.

## Predictions against what happened

| Fix | Prediction | Predicted | Observed | |
|---|---|---|---|---|
| A | Press releases, linked | 5–40 | 34 | hit |
| A | Press releases, uploaded | 5–40 | 9 | hit |
| A | Series judged more than one way | 5–18 | 18 | hit |
| A | Gold-corpus releases stay releases; checks pass | yes | yes | hit |
| A | Fixture C: posture not press-release | yes | research-like | hit |
| A | Fixture C: form role not press-release | yes | sponsored (it was sponsored before too; the sponsorship cue outranks a release) | hit |
| A | Fixture C: score | 1.0–1.5 | 1.0 | hit |
| A | Fixture C: brief target moves (posture, genre note, verdict) | three fields | one field, header.posture | partly: the genre note and verdict come from the hybrid, not the posture |
| A | Fixtures A, B unchanged | yes | yes | hit |
| B | Publisher unknown, uploaded | 330–550 | 435 | hit |
| B | Publisher kind differs, linked vs uploaded | 350–750 | 516 | hit |
| B | Judgment differs, linked vs uploaded | 350–750 | 512 | hit |
| B | Score moves 0.5 or more | 120–300 | 193 | hit |
| B | Fixtures and gold corpus unchanged | yes | yes | hit |
| C | Refused, not English | 2–5 | 3 | hit |
| C | No score (linked) | 4–7 | 5 | hit |
| C | No claims, yet scored | 0 | 0 | hit |
| C | Fixtures unchanged; checks pass | yes | yes | hit |
| D | Fixture A claims / flagged / score | 225–260 / 140–172 / 1.0–1.5 | 245 / 164 / 1.0 | hit |
| D | Fixture B claims / unsupported / overreach / score | 210–250 / 5–12 / 2–4 / 6.8–7.8 | 243 / 8 / 3 / 7.4 | hit |
| D | Fixture C claims / flagged / score | 360–430 / 200–245 / 1.0–1.5 | 442 / 257 / 1.0 | **miss** on claims and flagged |
| D | Fixture examples starting with a glued heading | 0 in all three | A 0, B 1, C 0 | **miss**: B's is a contact block led by a heading that ends in a colon, which the rule treats as leading on |
| D | Example lines with non-claim markers | 40–200 | 143 | hit |
| D | Reports showing one | 30–150 | 124 | hit |
| D | Claims | 385,000–440,000 | 446,843 | **miss** |
| D | Score exactly 1.0 | 600–790 | 718 | hit |
| D | Units guard passes | yes | yes | hit |
| D2 | Claims | 420,000–440,000 | 426,027 | hit |
| D2 | No score (linked) | 3–6 | 4 | hit |
| D2 | Example lines with non-claim markers | 90–150 | 132 | hit |
| D2 | Reports showing one | 80–130 | 113 | hit |
| D2 | Fixture A claims / score | 225–245 / 1.0–1.5 | 240 / 1.0 | hit |
| D2 | Fixture B claims / score | 220–243 / 7.0–7.8 | 237 / 7.4 | hit |
| D2 | Fixture B glued examples | 0 | 1 | **miss** (the same contact block) |
| D2 | Fixture C claims / score | 395–442 / 1.0–1.5 | 417 / 1.0 | hit |
| all | Every weighed report repeats exactly | yes | yes | hit |
| all | npm run check, npm run build, benchmark-guards | pass | pass | hit |

Fix D's misses led to the addendum. Cutting headings loose worked: on a sample of 106 reports it freed 2,356 sentences in place of 2,462 glued ones. But it also turned 1,595 headings, chart labels and table rows into claims of their own, and four sheets with no prose scored again. D2 treats a fragment with no verb and no closing punctuation as a label. It brought claims back to 426,027 and three of those four sheets back to no score. The fourth is a one-line title whose second word, "Leads", is on the engine's verb list.

## Fixtures

| Fixture | Claims 519810d → d6714e6 | Unsupported | Overconfident | Overreach | Score | Posture |
|---|---|---|---|---|---|---|
| A, CADRE | 242 → 240 | 148 → 150 | 3 → 3 | 16 → 14 | 1.0 → 1.0 | research-like |
| B, Pew report | 231 → 237 | 9 → 7 | 0 → 0 | 3 → 3 | 7.3 → 7.4 | standard |
| C, Gensler (upload) | 397 → 417 | 212 → 224 | 5 → 4 | 23 → 21 | 1.0 → 1.0 | press-release → research-like |

Sentence-level benchmark metrics (causal register, certainty, pairs) are unchanged: `benchmark-compare-519810d-d6714e6.md` lists 14 changed metrics, all fixture counts. Units now come from the engine's own splitter, so the unit counts there move too (A 292 → 332, B 289 → 351, C 511 → 1,053). The units count every piece a heading leaves.

## Re-recorded with the fixes

- Fixture C's brief target (A: header.posture; D and D2: every claim-dependent field).
- `checks/targets/evidence-section.json`, `evidence-map.json`, and Fixture A's build target `evidence-section-fixture-a.json` (counts, dek, source rows, verdict sequence). The build target's mockup fields (paragraph, checkFirst, examples) keep their 9bc2011 claim indexes, as its note says.
- The attribution check's eleven hand-anchored sentences, re-pointed to their new unit ids by text; two lost a leading heading.
- The review sheets in `checks/data/review/` (gitignored, no labels yet) are stale and need re-exporting before anyone labels them.

## Not fixed in this round

- **The floor.** 699 of 1,548 scored reports sit at exactly 1.0. The flag rate dominates, and a firm's report states findings with the evidence in a chart beside them. Recalibrating the flag rate, or crediting a report's own chart-backed figures, changes what the score means; that is Kyle's call.
- **Few claims, firm scores.** The score is a rate, so a report with a handful of claims can land anywhere. Four reports score 6.5 or higher on 15 claims or fewer.
- **Text the reader garbles.** One PDF prints bold by overprinting, so its words come out with every letter tripled. Another uses a font with no text mapping and comes out as control characters. Neither is caught before scoring.
- **Linked reports on a file host.** A link's host wins even when it belongs to a file host rather than the publisher, and the own-address rule runs only without a link. 22 linked reports read as unknown: 15 on file hosts (CloudFront, Contentful, Autodesk's asset host), the rest on .edu, .org and .co.za hosts the host list gives no kind.
- **"Foundation."** 78 firm reports still read as nonprofit research when uploaded, 71 of them on the nonprofit cue "foundation" (in AEC, usually a building's).
