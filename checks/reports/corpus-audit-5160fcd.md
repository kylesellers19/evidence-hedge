# Corpus audit, one-by-one review and the results-page cleanup

Baseline `5160fcd` (main, Nov. 9, 2026). Branch `corpus-audit-method-scale`. This is the text-free copy: documents appear by id and link only, with claim lines named by their index on the review cards (`#12`). The full report, with the review notes and claim text, is in the gitignored `checks/data/audit/report-full.md`. Every judgment call is in the [decision log](corpus-audit-decisions.md).

## 1. Status (Part 0)

- **Corpus.** The AEC corpus: 1,584 firm PDFs from 100 firms, in the gitignored `checks/data/aec/`, run by `scripts/weigh-folder.mjs` and now by `scripts/audit-corpus.mjs`. The gold corpus: 17 documents in `fixtures/corpus.json`. Fixture C. One academic PDF not already in the gold set. 1,603 documents in all.
- **Engine.** `5160fcd` at the start, and the live build stamp read the same. No commit on this branch changes a score, claim, tier, rung, flag, rubric or posture (section 10).
- **The previous audit plan.** The AEC fixes A to D and the provenance fixes E to G were merged (main `5160fcd`). Nothing from that plan was open beyond what this audit re-measures.

## 2. Corpus counts

| Stage | AEC | Gold | Fixture C | Academic |
|---|---:|---:|---:|---:|
| In the corpus | 1,584 | 17 | 1 | 1 |
| Passed by the site's gates | 1,564 | 14 | 1 | 1 |
| Refused: no text layer | 17 | 0 | 0 | 0 |
| Refused: not English | 3 | 0 | 0 | 0 |
| File absent (supplied text not on this machine) | 0 | 3 | 0 | 0 |

Of the 1,580 the gates passed, 1,568 receive a score and 12 have no claims to weigh. Three pairs of AEC files hold the same text.

**Fetch failures, AEC collection** (100 firms searched): 17 firms blocked: robots.txt disallows (6), Cloudflare challenge (4), media listing closed with a 401 (2), TLS or connection reset (2), HTTP 429 rate limit (1), other (2). Another 26 firms gate 636 documents behind a form; none of those were fetched.

## 3. Parity with the live site

20 documents, chosen across the strata, run on evidencehedge.org (engine `5160fcd`) and through the harness.
- 19 of 20 match exactly on score, rubric label, posture, claims, read as strong, flagged and headline.
- The one link differs: `gold:gba-news-2015` ([link](https://www.greenbuildingadvisor.com/article/stuffy-offices-lower-cognitive-function)). The reader service returned different page text on the day of the check. The harness given that day's reader text matches the live page.

| Document | Mode | Matches |
|---|---|---|
| `aec:architecture/gensler/gensler-us-workplace-survey-2019` | upload | yes |
| `aec:top100/je-dunn/look-ahead-q4-2022-austin` | upload | yes |
| `aec:top100/arup/inclusive-citiessharp-heat-risk` | upload | yes |
| `aec:top100/je-dunn/look-ahead-q1-2023-savannah` | upload | yes |
| `aec:top100/hok/new-scientific-workplace` | upload | yes |
| `aec:top100/mortenson/cost-index-minneapolis-q1-2024` | upload | yes |
| `aec:top100/jensen-hughes/final-whitepaper-firealarmshoteling-2022` | upload | yes |
| `aec:top100/gray/gray-shifting-public-opinion-of-jobs-in-manufacturing-grayway` | upload | yes |
| `aec:top100/perkins-and-will/healthy-affordable-housing-toolkit` | upload | yes |
| `aec:top100/nv5-global/nv5s-tl-five-communication-skills-you-never-learned-in-college-vettrai` | upload | yes |
| `aec:top100/je-dunn/look-ahead-q3-2023-nashville` | upload | yes |
| `aec:top100/robins-morton/reaching-beyond-formula-sustainability` | upload | yes |
| `aec:top100/terracon/pipe-pile-paper-guoming` | upload | yes |
| `aec:top100/arup/navigating-collaboration-good-governance-for-green-shipping-corridors` | upload | yes |
| `aec:top100/terracon/real-cost-free-data-ebook` | upload | yes |
| `aec:top100/gray/gray-grayway-the-allure-of-natural-gas` | upload | yes |
| `gold:fixture-b-pew-report` | upload | yes |
| `academic:satish-ehp-2012` | upload | yes |
| `gold:fixture-b-pew-html` | paste | yes |
| `gold:gba-news-2015` | link | no: the reader text changed |

**Repeat runs.** All 1,580 documents give identical output when run twice.

**In bulk, in the browser.** Documents were uploaded one by one into a local build of the baseline commit, through the page's own file input, and the rendered brief was compared with the ledger: 1,085 of the 1,116 documents with a LOW, HIGH, ROUTE or reviewer TEXT code; the other 31, among the largest files, were not opened, because the browser tabs running them closed before they finished (the harness ran all of them). 0 differ.

## 4. Scores

**Shown score, by the standard each document was held to**

| Standard | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | no score | documents |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| corporate | 535 | 168 | 124 | 89 | 61 | 14 | 1 | 0 | 0 | 0 | 0 | 992 |
| journalism | 80 | 13 | 6 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 102 |
| research | 140 | 62 | 34 | 17 | 11 | 3 | 4 | 3 | 0 | 0 | 0 | 274 |
| general | 52 | 61 | 38 | 25 | 15 | 2 | 5 | 1 | 0 | 1 | 12 | 212 |

**Every document under each standard** (the same 1,580, each run under all four)

| Standard | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | no score | median |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| research | 748 | 405 | 176 | 131 | 63 | 30 | 11 | 4 | 0 | 0 | 12 | 1.5 |
| corporate | 791 | 334 | 201 | 125 | 88 | 19 | 9 | 0 | 1 | 0 | 12 | 1.4 |
| journalism | 1,278 | 104 | 105 | 70 | 9 | 6 | 1 | 0 | 0 | 0 | 7 | 1.0 |
| general | 419 | 476 | 268 | 165 | 136 | 71 | 22 | 7 | 2 | 2 | 12 | 2.2 |

**Scores are relative to the standard.** The same text scores lower under journalism than under the other three standards, and highest under general web. Journalism also counts more claims: headlines and labels are claims under it. 1,325 of 1,580 documents have more claims under journalism. Research, corporate and general web never differ in claim count.

**The pile-up at 1.** 807 documents show a 1 (51% of those scored), and 665 sit at the floor of 1.0. For the documents at 1, the mean losses are:
- flagged claims as a rate: 6.44
- causal overreach: 2.30 (624 at the 2.5 cap)
- document checks: 0.97
- everything else: under 0.2

The flag rate alone floors only 4 documents. Most floors are the flag rate plus overreach.

**Expected and actual, per stratum.** The ranges were written before run1 (decision 7) and are screening expectations, not targets.

| Stratum | Expected | Documents | Median | Min | Max | Inside | Outside |
|---|---:|---:|---:|---:|---:|---:|---:|
| Peer-reviewed journal | 5–9 | 3 | 4.9 | 3.6 | 8.1 | 1 | 2 |
| Academic press release | 2–6 | 2 | 4.1 | 4.1 | 4.4 | 2 | 0 |
| Trade-press news | 3–7 | 3 | 2.0 | 1.3 | 3.0 | 1 | 2 |
| Trade-press opinion | 2–6 | 0 | | | | 0 | 0 |
| Firm research-like | 1–4 | 903 | 1.4 | 1.0 | 8.3 | 791 | 112 |
| Firm marketing | 1–3 | 654 | 1.3 | 1.0 | 10 | 564 | 90 |
| Nonprofit research | 4–8 | 3 | 7.4 | 1.0 | 7.5 | 2 | 1 |
| Personal experience | 7.5 | 0 | | | | 0 | 0 |

## 5. Anomalies

**How the review ran.**
- Every one of the 1,603 documents has a review row: 31 `ok`, 1,572 with at least one code.
- Reviewers read 283,387 claim lines on cards that list every flagged or strong claim.
- I checked a seeded 10% sample of verdicts (160 verdicts, 156 documents) against the lines they cite. 155 hold, one code was overturned in part, and eight hold with a corrected detail (decision 28).
- A coded document can carry several codes, so the shares below add to more than 100%.

| Code | Documents | Share | Coded by |
|---|---:|---:|---|
| INGEST: page furniture or a bad splice counted as a claim | 1,387 | 86.5% | reviewers |
| CLAIM: a non-claim, or another speaker's words, charged to the author | 1,101 | 68.7% | reviewers |
| LINK: evidence present but not linked to the claim | 839 | 52.3% | reviewers |
| ROUTE: wrong reading (genre, posture, publisher or noun) | 802 | 50.0% | reviewers |
| LOW: the score is lower than the document deserves | 606 | 37.8% | reviewers |
| TIER: certainty read wrong | 561 | 35.0% | reviewers |
| HIGH: the score is higher than the document deserves | 16 | 1.0% | reviewers |
| TEXT: the baseline page says something false or garbled | 1,536 | 97.2% | script (1,536), reviewers (4) |
| DET: the claim count changes with the standard | 1,325 | 83.9% | script |

**Examples, three per code.**
- Ids and claim indices only; the wording is mine.
- Root causes name the file and function.
- No fix has been applied: each changes engine, ingest or rubric behavior, which this audit may not do.

### INGEST

Examples:
- `aec:architecture/gensler/gensler-us-workplace-survey-2019` ([link](https://www.gensler.com/uploads/document/614/file/Gensler-US-Workplace-Survey-2019.pdf)), #4, #7, #29: two columns interleaved into one sentence, and chart labels counted as claims.
- `aec:architecture/hok/hok-forward-2019-tech-workplace`, #16, #356 to #385: endnote entries and photo captions counted as claims.
- `aec:architecture/perkins-and-will/pw-research-journal-14-02`, #0 (five times), #307 to #331: front matter repeated, and table cells read as sentences.

Root causes:
- `src/ingest/normalizer.js: stripHeadersFooters` removes a line only when it stands alone, unchanged, on at least 40% of pages.
- `src/ingest/extractPdf.js: reconstructPage` misses some two-column layouts and side boxes.
- `src/engine/measure/segment.js: segmentDocument` sets aside a reference list only after a recognized heading late in the text.

Proposed fix:
- Strip short lines repeated on three or more pages at a page's top or bottom, including when fused to a body line.
- Split columns per page from the x-gap histogram.
- Treat any block of numbered or author-year entries as a reference list.

### CLAIM

Examples:
- `aec:architecture/gensler/gensler-design-forecast-2019`, #39, #703, #707: calls to action and photo credits counted as claims.
- `aec:architecture/hok/hok-designing-a-neurodiverse-workplace-2019`, #53, #119: interviewees' speech charged to the author.
- `aec:top100/jensen-hughes/ips-whitepaper-epa-rmp-changes-1-7-25-final`, #3, #4: a federal rule's own requirements read as the firm's advice. That gives 38 overreach flags, at the cap.

Root causes:
- `src/engine/nonClaimFilter.js` lets fused headings, captions and calls to action through.
- `src/engine/attribution.js: attributeSentence` recognizes quoted speech only within quotation marks.
- `src/engine/measure/claimFunction.js: claimFunction` reads "must" in a restated rule as a recommendation.

Proposed fix:
- Drop sentences whose first clause is an all-caps or title-case heading.
- Treat a speaker label or an interview layout as attribution.
- Read a sentence that names a rule or code section as reporting that rule.

### LINK

Examples:
- `aec:top100/cannondesign/spatial-network-analysis-plos-one` ([link](https://cannondesign-production.s3.amazonaws.com/be5c631e-e0bb-4085-89a4-68da93641fc1/Spatial_Network_Analysis_PlosOne.pdf)), #21: bracket citations written with spaces inside are not read. 8 of 97 references parse, and the paper scores 1.2.
- `aec:architecture/hok/hok-forward-2019-tech-workplace`, #50, #60: roman-numeral endnote markers with an endnote list, yet 0 references parse.
- `aec:top100/perkins-eastman/latrobe-community-connectivity`, #9, #22: the study's own questionnaire results read as citing nothing.

Root causes:
- `src/engine/extractClaims.js`: the numeric citation pattern allows no space inside the brackets and no en dash.
- `src/engine/references.js: parseReferences`: superscript and roman-numeral markers count only when a numbered list parses.
- `src/engine/measure/claimFunction.js: claimFunction` reads a result as the document's own only with a first-person or study cue.
- `src/engine/gradeEvidence.js: gradeEvidence` with the corporate ladder (`src/rubrics/corporate.config.js`) gives no rung for a source named in the sentence.

Proposed fix:
- Allow spaces and en dashes in bracket citations.
- Accept markers whenever any notes list exists.
- In a document whose design is a survey, test or index, read its reported figures as its own results.
- Let a named organization reach the attribution rung on every ladder.

### ROUTE

Examples:
- `aec:architecture/gensler/gensler-design-forecast-2019`: a brand brochure called a "research report" at the research-like setting.
- `aec:top100/terracon/which-buildings-require-asbestos-testing`: a consultant's trade-magazine piece read as published by government.
- `aec:top100/arup/the-arup-journal-2000-issue-1`: a firm's own journal of project histories held to journalism as news.

Root causes:
- `src/engine/profile/provenance.js: textScores` reads government and nonprofit cues across the whole text, citations included.
- `src/engine/profile/genre.js: readForm` reads "reporting" from a byline and quotes anywhere.
- `src/rubrics/hybrids.js` gives every firm document with its own evidence the noun "research report", and `judgmentFor` falls back to general web when no speaker is read.

Proposed fix:
- Read provenance cues outside citations, and let the document's own address outrank them.
- Require a byline near the top for "reporting".
- Take the noun from the form ("newsletter", "white paper", "magazine"), keeping "research report" for documents with a method section.

### TIER

Examples:
- `aec:architecture/gensler/gensler-design-forecast-2019`, #169, #391: superlatives used as names or in narration read as absolute.
- `aec:top100/arup/exporting-hydrogen-from-ireland`, #64: "established" in the sense of "set up" read as a booster.
- `aec:top100/arup/the-role-of-consumer-choice-in-decarbonising-heat`, #41: a quantity of 100% read as absolute.

Root cause: `src/engine/lexicons/hyland.js: BOOSTERS, ABSOLUTES`, matched without context by `src/engine/measure/certainty.js: measureCertainty`. 53% of strong claims rest only on such words.

Proposed fix: context rules for "established", "best", "always", "never", "proof" and percentages.

### LOW

Examples:
- `aec:top100/cannondesign/spatial-network-analysis-plos-one`: 1.2 against about 5 to 6.
- `aec:top100/kpf/ui-topology-catalogue-view-enhanced-towers`: 1.0 against about 5.
- `aec:top100/perkins-eastman/latrobe-educational-adequacy`: 1.6 against about 4 to 5.

Root causes:
- INGEST and LINK above.
- The research-like ceiling flags every plain unsourced statement at full weight. Its null-severity table would soften that to a note, but the table is never read for undisclosed claims (section 8, question 1).

### HIGH

Examples:
- `aec:top100/terracon/contractor-vs-consultant` ([link](https://www.terracon.com/wp-content/uploads/2025/05/contractor-vs-consultant.pdf)): 10 on one claim.
- `aec:architecture/page/page-two-phase-liquid-immersion-cooling-2022`: 5.2 under general web against 1.3 under corporate.
- `aec:top100/turner-construction/cost-index-q1-2026`: 4.2 on four claims.

Root causes:
- Firm documents with no publisher read fall back to the general-web standard (`src/rubrics/hybrids.js: judgmentFor`). Its ceilings let a plain unsourced statement pass.
- `src/engine/scoreDocument.js` scores a document however few claims it has.

Proposed fix:
- Route a document that speaks for a firm ("we", services, contact block) to the corporate standard.
- Show the counts without a score below a minimum number of claims.

### TEXT (baseline page)

Examples:
- `aec:top100/arup/cities-alive-water-for-people`: the headline listed overreach as part of a total the stats row did not count.
- `aec:top100/ssoe/report-final-web`: the dek said the firm reported someone else's study, which was false.
- `aec:architecture/gensler/gensler-us-workplace-survey-2019`: the dek said research standards while the claims were held to the corporate standard.

Root cause: the templates in `src/engine/analyze.js: buildVerdict`, `src/engine/scoreDocument.js` and `src/rubrics/hybrids.js`. Fixed in Part 4 (section 7).

### DET

Examples:
- `aec:top100/aecom/ferry-technical-analysis` ([link](https://aecom.com/wp-content/uploads/2019/04/Ferry-Technical-Analysis.pdf)): 2,143 claims under three standards, 3,870 under journalism.
- `aec:top100/nv5-global/mid-atlantic-trm`: 2,256 and 2,922.
- `aec:top100/nv5-global/njeepotentialreport-finalwithappa-h-5-24-19`: 2,110 and 2,630.

Cause: by design. Journalism keeps headings and labels as claims. Not a defect. The Method page said the opposite and now says this (decision 24).

## 6. The strongest LOW and HIGH calls

Ranked by how far the reviewer's fair score sits from the shown score. Each "my read" is mine, after the claim lines the reviewer cited.

| # | LOW | Shown | Reviewer | My read |
|---|---|---:|---:|---|
| 1 | `aec:top100/mortenson/mortenson-energy-storage-2016` | 1.0 | 5–6 | Too low, but 3 to 4: most flags are chart callouts, and the survey is a convenience sample. |
| 2 | `aec:top100/cannondesign/spatial-network-analysis-plos-one` | 1.2 | 5–6 | Agree. The clearest defect: spaced bracket citations unread. |
| 3 | `aec:top100/terracon/which-buildings-require-asbestos-testing` | 1.0 | 5 | Agree. The named rules are not read as sources; read as published by government. |
| 4 | `aec:top100/burns-and-mcdonnell/analysis-of-50-energy-efficient-net-zero-energy-buildings` | 1.0 | 5 | Agree. Own analysis held to journalism as opinion. |
| 5 | `aec:top100/nv5-global/eefa-potential-study` | 1.0 | 5 | Agree. Appendix tables become claims; own results read as background. |
| 6 | `aec:top100/smithgroup/smithgroup-why-not-mass-timber` | 1.0 | 5 | Agree, about 4. Own survey and its limits counted as unsourced. |
| 7 | `aec:top100/kpf/ui-topology-catalogue-view-enhanced-towers` | 1.0 | 5 | Agree. A conference paper's own results read as citing nothing. |
| 8 | `aec:top100/kpf/ui-urbane-3d-framework-data-driven-decisions` | 1.0 | 5 | Agree. Same pattern. |
| 9 | `gold:gba-news-2015` | 2.0 | 6 | Agree. Page chrome and comments from the reader service. |
| 10 | `aec:top100/kpf/ui-urban-pulse-capturing-rhythm-of-cities` | 1.1 | 5 | Agree. A 53-entry reference list parsed as none. |
| 11 | `aec:top100/mortenson/2016-wind-operations-maintenance-research-study` | 1.2 | 5 | Partly: about 3. Chart callouts read as recommendations. |
| 12 | `aec:top100/jensen-hughes/ips-whitepaper-epa-rmp-changes-1-7-25-final` | 1.2 | 5 | Agree. A rule's text charged as advice. |
| 13 | `aec:top100/zgf/early-bird-violet-blue-light-bs2023` | 1.3 | 5 | Agree. A simulation paper's own results read as citing nothing. |
| 14 | `aec:top100/aecom/city-deals-playbook` | 1.0 | 4–5 | Partly: about 3. Advice from experience; low is defensible, the floor harsh. |
| 15 | `aec:top100/jensen-hughes/epa-final-rule-facility-response-plans-whitepaper` | 1.0 | 4–5 | Agree. Form fields and rule text. |
| 16 | `aec:top100/jensen-hughes/uscg-final-rule-cybsercurity-in-the-mts-whitepaper` | 1.0 | 4–5 | Agree. Same as 12. |
| 17 | `aec:top100/arup/faces-of-change-en` | 1.0 | 4–5 | Agree. A book of personal stories read as a research paper. |
| 18 | `aec:top100/arup/the-arup-journal-2000-issue-1` | 1.0 | 4–5 | Partly: 2 to 3. Project narrative read as news. Reviewers disagree on sibling issues (decision 27). |
| 19 | `aec:top100/arup/the-arup-journal-2000-issue-2` | 1.0 | 4–5 | Same as 18. |
| 20 | `aec:top100/arup/the-arup-journal-2000-issue-3` | 1.0 | 4–5 | Same as 18, plus sponsorship signals read from advertisements. |

Only 16 documents were coded HIGH, so all of them are here.

| # | HIGH | Shown | Other standard | My read |
|---|---|---:|---|---|
| 1 | `aec:top100/terracon/contractor-vs-consultant` | 10 | corporate 2.3 | Agree. One claim, unflagged under general web. |
| 2 | `aec:top100/perkins-eastman/latrobe-grant-summary` | 7.4 | corporate 2.3 | Agree. Six claims under general web. |
| 3 | `aec:top100/dpr-construction/3-trends-shaping-life-sciences-builds` | 6.9 | corporate 6.9 | Agree, about 3 to 4. Ten claims. |
| 4 | `aec:top100/arup/unlocking-sustainable-urban-regeneration-in-europe-v4` | 6.9 | corporate 5.6 | Agree. Outcomes read as method statements escape flags. |
| 5 | `aec:top100/wsp/d-overview-of-references` | 6.7 | corporate 2.3 | Agree. A project list with nothing to weigh. |
| 6 | `aec:top100/arup/re-imagining-facilities-management-for-the-digital-age` | 6.1 | corporate 6.9 | Agree. Same as 4. |
| 7 | `aec:top100/turner-construction/innovation-project-pulse-business-intelligence` | 5.3 | corporate 1.4 | Agree. A product sheet under general web. |
| 8 | `aec:architecture/page/page-two-phase-liquid-immersion-cooling-2022` | 5.2 | corporate 1.3 | Agree. A vendor-co-authored paper under general web. |
| 9 | `aec:top100/sto-building-group/supply-chain-methods-of-approach-2020` | 5.1 | corporate 5.1 | Agree. Nine claims from mostly unreadable text. |
| 10 | `aec:top100/arcadis-north-america/bridge-health` | 5.0 | corporate 2.8 | Agree. A brochure under general web. |
| 11 | `aec:top100/gray/realities-of-data-centers-in-2026` | 4.9 | corporate 1.6 | Agree. |
| 12 | `aec:top100/dpr-construction/can-your-project-benefit-from-a-self-performing-gc` | 4.9 | corporate 4.9 | Agree. Three claims, two not claims. |
| 13 | `aec:top100/wsp/10-steps-toward-a-successful-climate-plan-for-facility-owners` | 4.4 | corporate 4.4 | Partly: about 3. Eleven claims. |
| 14 | `aec:top100/turner-construction/cost-index-q1-2026` | 4.2 | general 6.2 | Agree. Four claims. |
| 15 | `aec:top100/nv5-global/thought-leadership-high-flying-efficiency1` | 4.0 | general 5.0 | Agree. Garbled spacing merges sentences; the clean copy scores 2.7. |
| 16 | `aec:technology/sitetracker/telecom-pulse-report` | 3.6 | corporate 4.0 | Agree. Three claims. |

HIGH has two causes:
- Eight of the 16 are firm documents read under general web; under corporate they score 1.3 to 2.8.
- Nine have 14 claims or fewer.

## 7. The previously reported failures

Counted on the baseline page (run1) and on this branch's page (run3, all 1,580 documents the gates passed).

| Failure | Baseline | Now |
|---|---:|---:|
| The headline counts overreach that the stats row's "flagged" leaves out | 1,460 | 0 |
| The score counts more flags than the stats row shows, with nothing on the page to say why | 369 | 0 (the strictest-setting line appears on all 369) |
| The dek names research standards while the claims are held to the corporate standard | 722 | 0 |
| "1 cites sources too weak to carry them" | 213 | 0 |
| A posture shown in mixed case ("Research-Like") | 825 | 0 |
| A document with no claims told "No assertive claims" | 12 | 0 |
| Headline over 15 words | 1,568 | 0 |
| Headline numbers that differ from the stats row | n/a | 0 |
| The breakdown's parts that do not add up to "flagged" | n/a | 0 |

`checks/brief-top.test.mjs` holds the last three on the gold corpus, Fixture C and the latest ledger.

## 8. The document in the screenshot (Part 3)

No document in either corpus reproduces the screenshot's numbers:
- 178 claims, 2 read as strong, 99 unsupported, 1 overconfident, 21 overreach.
- Not as an upload, a link, or under any of the four standards.
- Not either of the two files in `example files/`.

Per the brief it is logged (decision 10) and used nowhere else.

**1. Why at least 98 of the 100 flags fall on claims not read as strong.**
- Under the corporate standard at its research-like setting (also the setting every score uses), an unsourced claim may be at most hedged. A plain statement that cites nothing is one step over and is flagged unsupported.
- In the 322 corpus documents read the same way, 95.6% of unsupported and overconfident flags fall on plain statements, and none on hedged ones.
- The ceiling table intends this. The null-severity table says the opposite for the same claim (a note, not a flag), but it is read only when a claim discloses its own gap, so the softer rule never applies. Two tables disagree, and the one that would soften the flag never runs.
- Proposed fix, not applied: weight an unsupported flag by its null severity, or delete the rows that never apply and say so on Method. Kyle's call, since it changes what a score means.

**2. How the 21 overlap the 100.**
- A claim carries at most one of unsupported and overconfident. Causal overreach is a separate check and can sit on the same claim.
- So the document had between 100 and 121 distinct flagged claims.
- In the 322 documents read like it, 67% of overreach flags sit on claims already flagged. At that rate about 14 of the 21 overlap, giving about 107 distinct flagged claims.
- The new brief counts distinct claims as "flagged", gives the three kinds under it and says how many claims have two flags, so the counts add up on the page.

**3. Whether 1/10 is fair.** That needs the document, so no verdict is given. For documents read the same way and scored 1, reviewers judged the floor:
- defensible for firm reports made of plain unsourced statements;
- too low where the document's own data, its references or extraction junk drove the flags.

## 9. Screenshots

Before and after, at 1,440, 1,280 and 390 CSS pixels, in `checks/data/audit/screens/` (gitignored, since they show document text):
- Gensler 2019 workplace survey, in place of the screenshot's document: corporate × research, research-like, 1/10 (decision 23).
- Pew report (research).
- JE Dunn Nashville look-ahead (journalism).
- NV5 communication-skills piece (general web).
- The Method scale at all three widths.

The live screenshots are listed in section 10. The four quality-test questions were answered for each screen; none needed a fix:
1. Does every line tell the reader something new?
2. Does the top open on how the judgment works?
3. Does the mechanism come before the number?
4. Is the headline one finding in 15 words or fewer?

## 10. Publish

- **Commits.** `5160fcd..f3cc18d` on main, fast-forwarded from `corpus-audit-method-scale` (origin had not moved), plus this report's final commit:
  - `024655e` and `9ba9022`: checkpoints with the harness, the brief's top, links to Method, and the numbers and scale on Method.
  - `44d04ff`, `948cd42`, `6ec5524`, `128936c`: Method wording and scale examples.
  - `e40e9a1`: spot-check viewer.
  - `f94fc09`: marketing dek.
  - `7ebf2a2`: this report and the decision log.
  - `f3cc18d`: the mixed-genre "Read as" line.
- **Workflow runs.** "Deploy to GitHub Pages", both succeeded:
  - [42691265585](https://github.com/kylesellers19/evidence-hedge/actions/runs/42691265585) for `7ebf2a2`.
  - [42691988875](https://github.com/kylesellers19/evidence-hedge/actions/runs/42691988875) for `f3cc18d`.
- **Live build stamp.** `f3cc18d`, read from the live bundle and from the footer ("Engine f3cc18d"). The bundle also carries `5160fcd`, the build the Method scale's examples were scored on, as the page says.
- **Second push.** `f3cc18d` was not a fix forward for a live-versus-local difference. It is a wording fix found while preparing the live checks (decision 34), pushed before them so they ran on the final build. No revert was needed.
- **Live checks, Chrome, on `f3cc18d`.**
  - **Nine uploads.** The four Part 7 documents and five parity documents match the harness on every field of the brief's top: read as, held to, headline, dek, score, score link, verdict sentence, stats, breakdown and strictest-setting line.
  - **In-app links.** Eleven link types each landed 16 pixels below the top, as designed, and Back returned the same results every time: score, claims weighed, read as strong, flagged, each flag, two signals, read as and held to. Every Method link on a brief points at an anchor that exists.
  - **Direct loads.** `#score-1`, `#score-7`, `#score-10`, `#flagged`, `#standard-journalism` and `#signal-limitations-absent` each landed at 16 pixels, and all ten score anchors exist.
  - **Method scale.** Read at all three widths; its numbers agree with the formula.
  - **Widths.** Screenshots at 1,440, 1,280 and 390 of the four documents and the scale; no horizontal scroll at any width. Files: `checks/data/audit/screens/live-*`.
  - **One test artifact.** Clicking a link within 300 ms of Back lands the next page off by the restored scroll; at a second's pause every link landed exactly.
- **Bulk confirmation in the browser** (baseline build, the page's own upload): 1,085 of the 1,116 documents with a LOW, HIGH, ROUTE or reviewer TEXT code; the other 31, among the largest files, were not opened, because the browser tabs running them closed before they finished (the harness ran all of them), 1,088 documents in all. 0 differ from the ledger and 0 failed to run.

## 11. Decision log

[corpus-audit-decisions.md](corpus-audit-decisions.md), rows 1 to 36.

## 12. Self-audit corrections

- **Diff review.** Every line changed since `5160fcd` in `src/engine/`, `src/rubrics/` and `src/ingest/` is display text: headline and verdict-box templates, genre notes, a criterion's spelled-out acronyms, and a `readAs` label. Each of run2, run3 and run4 matches run1 on every engine output for all 1,603 documents.
- **Claim check.** The report ranking read "about 350 junk lines" as a fair score of 350. Fixed (decision 29).
- **Claim check.** The marketing dek claimed that marketing copy is held "to the same evidence standard as any document", against the brief's own "Held to" line. Reworded (decision 31).
- **Claim check.** Method's journalism count (1,320 of the 1,568 with a score) and this report's (1,325 of 1,580) are both right. They count different sets.
- **Spot-check.** 160 verdicts. One code overturned in part; eight details corrected (decision 28).
- **Re-read of 10 verdicts outside the sample** (5 `ok`, 5 anomaly): all ten hold. One `ok` verdict on a refusal for not English was checked against the text (it is French). The `ok` verdict on Method's example for a 3 rested on a reviewer reading 3 lines; I read all 23 of its flags, and it stands.
- **Banned words.** Two strings of mine fixed on Method (decision 30).

## 13. Ratification table

Every row is PROVISIONAL — not ratified. Each names where it lives, so a decision changes one place.

| # | Item | Value | Where |
|---|---|---|---|
| R1 | Headline template | "F of N claims say more than their evidence shows." (singular "says … its"; "All N claims …"; "Its one claim …"; "We found no claims in this {noun} to weigh."; gate: "This {noun} speaks from experience, so no claim in it owes a source.") | `src/engine/analyze.js: buildVerdict, GATE_HEADLINE` |
| R2 | "Flagged" on a brief | Claims with any flag (unsupported, overconfident or causal overreach), each counted once | `src/engine/analyze.js` (`summary.flaggedClaims`), `src/components/results/briefTop.js: statsOf` |
| R3 | Stats-row breakdown | "Of the F flagged, U cite nothing, O cite too little and C claim more cause than the study shows (K claims have two flags)." | `briefTop.js: breakdownText` |
| R4 | Strictest-setting line | "For the score, every claim is held to the strictest setting, where X of N cite nothing or too little." Shown when the score's own count differs from the brief's | `briefTop.js: strictText` |
| R5 | Tag row, now the title block's "Read as" | A hybrid's scenario name ("A mix of {genres} writing" when no scenario fits); a single genre's reading by posture | `src/engine/scoreDocument.js: READ_AS`, `src/rubrics/hybrids.js` (`name`, `readAs`) |
| R6 | Title block's "Held to" | "The {standard} standard" (", still a draft" for a draft standard) | `briefTop.js: readingOf` |
| R7 | Dek (genre notes) | Advice only, never naming a standard; one per scenario and per posture | `src/rubrics/hybrids.js` (`note`), `scoreDocument.js: GENRE_NOTES` |
| R8 | Verdict-box sentences | weak, mixed, carried, gate and unscored sentences | `scoreDocument.js: SUMMARY, GATE_SUMMARY, UNSCORED_SUMMARY` |
| R9 | Count definitions on Method | Read as, held to, claims weighed, read as strong, flagged, the strictest setting | `src/pages/MethodPage.jsx: BriefNumbers` |
| R10 | Flag definitions on Method | The three flags, each with its brief wording | `MethodPage.jsx` (`#flags`) |
| R11 | Definitions of scores 1 to 10 | One sentence per band and per whole number; the losses that produce each number; the plain-statement equivalent | `MethodPage.jsx: ScoreScale, ScaleEntry` |
| R12 | Anchor documents | Chosen by script: an `ok` review verdict, a link, the score nearest the whole number; "no clean example yet" otherwise (6, 7, 9 and 10 have none) | `scripts/method-scale.mjs`, `src/pages/method-scale.json` |
| R13 | Method anchors | `#score-1` to `#score-10`, `#read-as`, `#held-to`, `#claims-weighed`, `#read-as-strong`, `#flagged`, `#strictest-setting`, `#flag-<type>`, `#signal-<id>`, `#standard-<id>`, `#numbers`, `#scale` | `briefTop.js: ANCHORS`, `MethodPage.jsx` |
| R14 | Bracket width | 0.6 + 0.35 × (1 − coherence)^1.2 of the mark's size, capped at 1 | `src/components/results/VerdictMark.jsx: drawnDiameter` |
| R15 | Part 1 expected ranges | Peer-reviewed journal 5–9; academic press release 2–6; trade-press news 3–7; trade-press opinion 2–6; firm research-like 1–4; firm marketing 1–3; nonprofit research 4–8; personal experience 7.5 | `checks/data/audit/expected-ranges.json` (gitignored; values here) |
| R16 | E-E-A-T and YMYL spelled out | Criterion text for the general-web standard | `src/rubrics/general.config.js` |
