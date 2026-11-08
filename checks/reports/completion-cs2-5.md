# Completion report — change sets 2, 3, 4 and 5

Run as one work session under the user's instruction to go through every stop-gate without asking. Each change set's predictions were committed before its code or run. Nothing was adjusted to force a match. Items that wait on Kyle are marked **pending**.

Repos:
- **App:** `kylesellers19/evidence-hedge`. Baseline `3155e36`, final `77588cf` on `main`, deployed to evidencehedge.org. Engine `1c6f4eb`; every commit after it changes checks and reports only.
- **Research:** `evidence-hedge-research`. A new repo: first commit `9f995d6`, final `b09f174`. Local only; not on GitHub yet.

## 1. Files

**App** (`git diff --name-status 3155e36..77588cf`):

| Change set | Commits | Files |
|---|---|---|
| 3: attribution | `8be10b1` predictions · `ba7854a` code · `78e007a` reports | new: `src/engine/attribution.js`, `src/engine/lexicons/attribution.js`, `src/engine/lexicons/unscientify_lexicon.json`, `checks/attribution.test.mjs`, `checks/attribution-review.mjs`, `checks/benchmark-compare.mjs`, `checks/cs3-predictions.json`; changed: `src/engine/analyze.js`, `extractClaims.js`, `profile/{design,index,provenance,standards}.js`, `signals/corporate.js`, `types.js`, `checks/lib/engine-rows.mjs`, `checks/export-units.mjs`, `checks/targets/fixture-c-gensler-fandom-2026.brief.json`, `package.json`, `THIRD_PARTY_NOTICES.md`, `public/THIRD_PARTY_NOTICES.md` |
| 4: evidence linkage | `b446b54` predictions · `513f33d` code · `bc2f938`, `12e52ed` reports · `49cc923` academic export | new: `src/engine/linkEvidence.js`, `src/engine/references.js`, `src/engine/lexicons/linkage.js`, `checks/linkage.test.mjs`, `checks/link-review.mjs`, `checks/export-academic.mjs`, `checks/cs4-predictions.json`; changed: `analyze.js`, `types.js` |
| 5: claim records | `8614379` predictions · `1c6f4eb` code · `ea80677` reports · `c111e7d` gold comparison | new: `src/engine/claimRecord.js`, `src/engine/compareClaims.js`, `src/engine/lexicons/claim-record.js`, `checks/claim-record.test.mjs`, `checks/pair-comparison.mjs`, `checks/gold-records.mjs`, `checks/cs5-predictions.json`; changed: `analyze.js`, `types.js` |
| 2: app side | `6c16743` predictions · `77588cf` fixes and reports | new: `checks/cs2-predictions.json`, `checks/reports/sidebyside-1c6f4eb.md`; changed: `checks/benchmark.mjs`, `checks/lib/{bundle,predictions}.mjs`, `checks/benchmark-guards.test.mjs`, `checks/pair-comparison.mjs` |

Reports: `checks/reports/{attribution,benchmark,links,link-review}-{ba7854a,513f33d,1c6f4eb}.*`, `benchmark-compare-*.md`, `cs4-first-run.json`, `records-1c6f4eb.json`, `pairs-1c6f4eb.json`, `sidebyside-1c6f4eb.md`.

**Research** (all new):

| Change set | Commits | Files |
|---|---|---|
| 2 | `9f995d6` … `b5f4216` (`9841d3e` registered the predictions) | `LICENSE` (GPL-3.0), `NOTICE.md`, `vendor.lock`, `artifacts.lock.json`, `fetch_foundations.sh`, `build_unified_eval.py`, `fetch_spiced.py`, `envs/{yu2019,cessc,certainty-estimator,unicausal,unscientify}/`, `envs/setup_env.sh`, `adapters/{common,_patching,yu2019,cessc,certainty-estimator,unicausal,unscientify}.py`, `patches/` (3), `predictions/` (7 files + meta), `reports/` (predictions, deviations, reproduction, verify, runs, probes), `verify.py`, `report_cs2.py` |
| 3–5 | `c52948a` predictions and envs · `b09f174` runs | `adapters/{unscientify_crosscheck,grobid}.py`, `annotation/{build_items,potato_to_records,test_roundtrip}.py`, `annotation/potato/claim-record.yaml`, `envs/{potato,grobid}/` (incl. `grobid/IMAGE`), `predictions/grobid-0.9.1-crf-*.jsonl`, `reports/{predictions-grobid.json,deviations-cs4.md,grobid-agreement-1c6f4eb.json,unscientify-crosscheck-1c6f4eb.json,cs3-5-research.md}` |

## 2. Predicted vs. actual

Each report holds the full row-by-row table: check, predicted, actual, source, split, rows, label tier and match. The tables below give every **mismatch**, plus the headline rows.

**Change set 2: tools reproduced** (research `reports/reproduction-cs2.md`; label tier published-human; default tolerance ±0.02)

| Tool | Target | Actual | Rows / split | Match |
|---|---|---|---|---|
| Yu 2019 | 0.883 macro-F1, 5-fold | 0.873 | 3,045, out-of-fold | yes |
| CESSC, BERT on SSC | 0.8855 macro-F1 | 0.890 (released weights 0.886) | 246, SSC test | yes |
| certainty-estimator | Pearson r 0.70 | 0.678 | 331, test + ext | **no**, 0.002 outside the tolerance. The paper's 0.70 is its best seed; its 5-seed mean 0.63 ± 0.061 contains 0.678. |
| UniCausal | 0.701 binary F1 | 0.745 (released weights 0.730) | five public test sets | **no**, not comparable: the paper's figure includes PDTB, a paid LDC corpus |
| UnScientify | runs without error | 0 errors | 1,076 units + 663 pairs | yes. Its uncertain share, 12.5%, is **below** the expected 15–35%. |

**Change set 2: published models beside the engine** (`checks/reports/sidebyside-1c6f4eb.md`, predictions `checks/cs2-predictions.json`): every value lands inside its range. One ordering is **wrong**:
- On pei2021 (331 rows), Spearman is engine 0.635 vs certainty-estimator 0.616. Predicted: model > engine.

Values:

| Source | Engine | Model |
|---|---|---|
| Yu 2019 | 0.708 | 0.873 |
| Eureka | 0.626 | 0.831 |
| CESSC SSC test | 0.508 | 0.890 |
| UniCausal (reproduced / released) | 0.586 | 0.609 / 0.705 |
| Wright pairs, macro-F1 (562) | 0.450 | 0.577 |

**Change set 1 numbers changed by a fix here:** yu2020_eureka was decoded with yu2019's codes, so 1 and 3 were swapped. The engine's Eureka macro-F1 goes 0.371 → 0.626 and accuracy 0.331 → 0.630, both now inside change set 1's predictions. No other engine metric changed (104 compared).

Change set 1 benchmark mismatches still standing (`benchmark-1c6f4eb.md`, label tier published-human):

| Check | Predicted | Actual |
|---|---|---|
| Fixture C unsupported share | 0.75 [0.65–0.85] | 0.516 (moved by change set 4's linking) |
| Yu 2019 engine-tuning macro-F1 / accuracy | 0.718 / 0.765, exact | 0.717 / 0.764 |
| Yu 2019 held-out macro-F1 / accuracy | 0.702 / 0.755, exact | 0.701 / 0.753 |
| pei2021 rows | 2,166 | 1,551 (615 rows carry aspects only) |
| pei2021 Spearman | 0.25 [0.15–0.35] | 0.599 |
| Wright macro-F1 | 0.35 [0.25–0.45] | 0.454 |
| Wright abstract / press strength accuracy | 0.70 / 0.62 | 0.590 / 0.504 |

**Change set 3: attribution** (`checks/cs3-predictions.json`; label tier predicted; fixtures A–C)
- Exact and as predicted:
  - Flags, designs and scores on A–C.
  - The known-good string.
  - Fixture C's self-citation signal is gone.
  - Profile and signal agree on C (0 of 25).
  - All 5 old SELF_REF sentences are own-current.
- Benchmark `dc34856` vs `ba7854a`: 0 of 100 metrics changed.
- Label mix, share of extracted claims at engine 1c6f4eb (attribution did not change after ba7854a):

| Fixture | Rows | Label | Predicted | Actual | Match |
|---|---|---|---|---|---|
| A (CADRE) | 242 | own-current | [0.02–0.20] | 0.012 | **no**: CADRE is a narrative review with almost no study of its own |
| A | 242 | unattributed | [0.30–0.70] | 0.715 | **no**: the review's unmarked background sentences |
| A | 242 | cited-other | [0.20–0.60] | 0.269 | yes |
| B (Pew) | 231 | own-current / unattributed | [0.10–0.60] / [0.30–0.85] | 0.169 / 0.818 | yes |
| C (Gensler) | 378 | own-current / unattributed | [0.15–0.45] / [0.45–0.80] | 0.254 / 0.738 | yes |

All other labels are inside their ranges.

**Change set 4: linkage** (`checks/reports/links-1c6f4eb.json`, `cs4-first-run.json`):
- Changed:
  - Fixture C unsupported 236 → 195, overconfident 2 → 5, overreach 24 unchanged.
  - Fixture A markers resolved 41 of 88.
  - Benchmark `ba7854a` vs `513f33d`: 4 metrics changed, all Fixture C counts.
- Mismatches:

| Fixture | Metric | Predicted | Actual |
|---|---|---|---|
| A | hyperlink links | [2–30] | 0 |
| B | caption links | [5–60] | 83 |
| B | proximity share | [0.10–0.90] | 0.056 |
| C | section-scope links | [25–95] | 96 |

- GROBID (research `reports/predictions-grobid.json` vs `grobid-agreement-1c6f4eb.json`): bibliography sizes match on all three documents (37, 43, 43).
- GROBID mismatches. The cause is the app's PDF text, not linking (section 6):
  - Units with callouts mapped: Allen 1, Satish 0.
  - Unit agreement: 0 on Allen and Satish.
  - GROBID-only > app-only: fails on Allen and Satish.
  - App references < GROBID bibliography: fails on JCU (54 vs 43).

**Change set 3, research cross-check** (`reports/unscientify-crosscheck-1c6f4eb.json`; weak vs predicted):
- Agreement under the documented mapping is 0.179 on all 1,053 units, 0.753 on the 251 units the app attributes, and 0.542 on the 131 where an UnScientify pattern fired. The swapped mapping gives 0.053, 0.223 and 0.420.
- The last two breakdowns were added after the first run.
- No prediction was registered for agreement.

**Change set 5: records** (`checks/reports/records-1c6f4eb.json`, `pairs-1c6f4eb.json`):
- Flags and scores are unchanged, as predicted.
- Engine pair macro-F1: 0.450 on 563 original test pairs, 0.483 on 50 bundle-test pairs.
- The handoff's "81 test-split pairs" exist in neither split.
- Fill-rate mismatches:

| Fixture | Field | Predicted | Actual |
|---|---|---|---|
| B | present tense | [0.20–0.60] | 0.16 |
| B | identification strategy | [0.08–0.35] | 0.537 |
| C | generic | [0.10–0.45] | 0.069 |
| C | present tense | [0.25–0.65] | 0.111 |

**Pending Kyle:**
- Attribution precision: 100-claim sample (`checks/data/review/attribution-sample.csv`).
- Link precision: 50-link sample.
- Fixture reviews.
- Gold claim records: the POTATO export.

## 3. Ratification table

Every item is **Provisional — not ratified**.

| Item | Value | Repo and file | Basis |
|---|---|---|---|
| Attribution cue word lists (research verbs, own-study nouns, sample references, definite study, own-prior, et al., according-to, a-study-by, published-in, researchers-at, named org, prior work, quote and speech verbs, builds-on, pronoun subject) | as listed | App, `src/engine/lexicons/attribution.js` | read from Fixtures A–C and UnScientify's word lists |
| Section-kind heading patterns | references, literature review, methods, results (incl. executive summary, "… SURVEY/FINDINGS"), discussion, introduction | App, same file | Fixture headings |
| HEADING_MAX_CHARS · PUBLISHER_FRONT_CHARS · PRONOUN_REACH | 80 · 2,000 · 3 sentences | App, `lexicons/attribution.js`, `attribution.js` | fixture layout |
| Attribution decision order and carryover rules | quoted → own-prior → mixed → other → own → … → unattributed; sample references never inherit; definite references inherit only from the previous sentence | App, `src/engine/attribution.js` | fixture cases (CADRE, Allen paragraphing) |
| Publisher-name rule | a name counts if its letters match the host label; with no host, if it appears in the first 2,000 characters; "X Research Institute" also yields "X" | App, `attribution.js` `publisherNames` | CADRE, BDC news, Pew misreads |
| Self-citation signal | fires when self > 0 and self ≥ independent; pool = reference entries + body URLs | App, `src/engine/signals/corporate.js`, `attribution.js` | handoff; Fixture C |
| Attribution sample · link sample | 100 · 50, seed 20261108 | App, `checks/attribution-review.mjs`, `checks/link-review.mjs` | handoff values |
| Link routes per attribution label | e.g. own-current → section-scope, caption (+ marker, hyperlink when it builds on prior work) | App, `src/engine/linkEvidence.js` `ROUTES` | handoff design |
| Linkage patterns · CAPTION_REACH | Source line, figure reference, notes heading and line, footnote anchor, reference number and year, author-year pair · 4 paragraphs | App, `src/engine/lexicons/linkage.js` | Fixtures A–C |
| Link confidence per basis; "et al." without a marker counts for grading but makes no link | high / low per basis | App, `linkEvidence.js` | Fixture A over-count |
| In-document rung for own results and own-study links | the rubric's own-result rung | App, `src/engine/analyze.js` | change set 4 design |
| Record causal strength | none 0, correlational 1, conditional 2, direct 3 (= change set 1's REGISTER_STRENGTH) | App, `src/engine/claimRecord.js`, `checks/lib/mapping.mjs` | benchmark confusion matrices |
| Certainty rank | hedged 1 … absolute 4 | App, `claimRecord.js` | shared tiers |
| Scope markers and their lexicons | generic, present tense, action-guiding (result verbs, quantifiers, sample references, should/must/recommend) | App, `src/engine/lexicons/claim-record.js` | Peters & Chin-Yee |
| Identification strategies, document genre rule | design → strategy table; press release / commercial / research / academic conclusion / unresolved | App, `claim-record.js`, `claimRecord.js` | handoff field list |
| Pair label | sign of the causal-strength change, restatement minus source | App, `checks/lib/mapping.mjs`, `pair-comparison.mjs` | Wright & Augenstein's labels |
| `trained_on` forms | `original-<split>`, `original-aspect-<split>`, `unicausal`; an unknown published split counts as covered | App, `checks/lib/predictions.mjs`; Research, `verify.py` | change set 2 |
| Side-by-side label rule | a model is scored only where it supplies the scored label | App, `checks/benchmark.mjs` | change set 2 |
| Bundle sentence matching, splits, conflicts | letters and digits only, lowercased; seed 20261108, 80/10/10; keep the first label | Research, `build_unified_eval.py` | reproduces the handoff's counts exactly |
| Tolerances | ±0.02; UniCausal per corpus max(0.02, 2 × SD) | Research, `reports/predictions-cs2.json` | registered before any run |
| A validation split counts as trained on; Yu rows whose copies fell into another fold are dropped | — | Research, adapters | conservative |
| Yu codes → registers → Wright 0–3 | by class name | Research, `adapters/yu2019.py` | label names |
| Environment pins | each with its reason | Research, `envs/*/requirements.in` | probes, `reports/deviations-cs2.md` |
| UnScientify mapping | 1 → own-current or own-prior, 2 → cited-other, 3 → builds on | Research, `adapters/unscientify_crosscheck.py` | handoff |
| GROBID matching | unit = first 60 normalized characters; bibliography = first-author 12 characters + year; coverage ≥ 60 characters | Research, `adapters/grobid.py` | adapter design |
| POTATO study settings | 20% double-coded (2 coders), 20% blind holdout, seed and salt 20261108, adjudication threshold 1.0; certainty pre-label rounded to 1–6 | Research, `annotation/potato/claim-record.yaml`, `build_items.py` | handoff |

## 4. Reused code

| What | License | Source commit | Notices entry |
|---|---|---|---|
| UnScientify authorial-reference word lists, verbatim in the app (`unscientify_lexicon.json`) | BSD 3-Clause (stated in the README; the LICENSE files are empty) | `24f12a6` | `THIRD_PARTY_NOTICES.md`, `public/THIRD_PARTY_NOTICES.md` |
| 12 vendored repos (research `vendor/`, not committed) | as found: GPL-3.0 (Yu 2019, UniCausal, POTATO), MIT (certainty-estimator, Certainty-in-Science-Communication, scientific-information-change), Apache-2.0 (GROBID), BSD-3 (UnScientify), no license file (bert-sklearn: `setup.py` declares Apache; correlation-to-causation-exaggeration; scientific-exaggeration-detection; cessc: README says GPLv3) | `vendor.lock` | research `NOTICE.md` |
| Patches, as recorded files | `yu2019-01` (device), `yu2019-02` (class-weight keyword arguments), `unicausal-01` (micro-batches) | `patches/` | `patches/README.md` |
| GROBID 0.9.1 | Apache-2.0 | image digest `sha256:2239577…f4cd`; macOS `libwapiti.dylib` and pdfalto 0.6.2 from `202766a` | research `NOTICE.md`, `reports/deviations-cs4.md` |
| POTATO 2.14.0 (PyPI) | GPL-3.0 | vendor pin `81f7fdb` (one commit after 2.14.0; differs only in `deploy/remote.py`) | research `NOTICE.md`, `envs/potato/requirements.in` |

No vendored file is modified in place. The app bundle adds only the BSD-3 word lists.

## 5. Abstention

All counts are on Fixtures A–C at engine 1c6f4eb (851 extracted claims).

- **Attribution:**
  - Undetermined: 2. One sentence carries own-study and other-source cues; one has a pronoun subject with no attributed antecedent.
  - Low confidence: 100. The document's own sample, 79; an unnamed study the document reports, 13; a survey item put to its own respondents, 4; an unnamed source, 2; an own result beside unnamed other work, 2.
- **Evidence:**
  - Unlinked: 559 (A 158, B 143, C 258). Undetermined: 0.
  - By reason:
    - No caption or footnote link and no same-sentence citation: 522 (unattributed claims).
    - No section-scope or caption link: 31 (own-current).
    - No marker, footnote or hyperlink: 5 (cited-other or own-prior).
    - Every basis tried: 1 (undetermined).
- **Records:**
  - Unresolved on every record until Kyle codes them: the six human-coded fields (population, exposure, comparator, outcome, timeframe, setting).
  - Identification strategy unresolved: A 242, B 107, C 257.
  - Evidence unresolved: equal to the unlinked counts.
  - Attribution unresolved: 2.
- **Pairs:** 0 undetermined. One Wright pair has no Yu prediction (a side is in Yu 2019).
- **Change set 2 rows dropped as trained-on:** 7 Yu 2019 rows (copies in other folds); 1 Wright pair (Yu); 2 Wright pairs (certainty-estimator).
- **Left out of comparisons:** seven model × check combinations where the model gives no such label (`benchmark-1c6f4eb.md`).
- **Research:**
  - UnScientify: label 0 on 23 units (its own "BUG" path); default label 1 ("No direct PRON") on 737.
  - GROBID callout sentences not mapped to an app unit: Allen 23 of 24, JCU 5 of 27, Satish 33 of 33.

## 6. Scope check

`git diff --stat 3155e36..77588cf -- decision-precision Reference src/components src/ui src/App.jsx index.html .github` is empty. Outside `checks/` and `src/engine/`, the only changes are the notices files and `package.json` (three check scripts).

Noticed but left for a later change set:
1. **PDF ingest: two-column reading order.** On the two EHP papers, only 13 of 201 and 7 of 189 GROBID sentences appear in the app's text, against 235 of 242 on the single-column JCU report. The app's PDF reader interleaves the two columns.
2. **PDF ingest: superscript citation markers are dropped** ("…and comfort ." on JCU). On 20 of the 22 units where GROBID finds a callout, the app links nothing.
3. **A claim-function misread:** "Hybrid work causes higher productivity across every industry" reads as a methods sentence, so its causal-overreach check does not run. It was the same before this work (checked against `3155e36`).
4. **SPICED loader:** fields are reported (research `reports/spiced-fields.json`); the loader waits on Kyle's review.
5. **Dead-link detection and site chrome leaking into link-fetched text** (raised before this session).
6. **Third-party code:** a hard-coded Hugging Face token in third-party `vendor/cessc/scripts/configurations.py` (not used, not copied).
