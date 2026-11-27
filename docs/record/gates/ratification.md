# Ratification table: every judgment constant of the Record

Generated from `record/config.py` and the modules that register constants
(`ratification_table()`), research branch `record`. Every value is **PROVISIONAL —
not ratified**. None was moved to make a gate pass; the three changed after a first
look at the data are marked and explained in the gate reports (map, novelty).

42 constants.

| Constant | Value | Unit | Stage | Why | Status |
|---|---|---|---|---|---|
| `CLUSTER_K_RANGE` | [8, 30] | k-means clusters tried (inclusive) | map | Wide enough to separate the corpus's broad questions (markets, workplaces, health, climate), narrow enough that a cluster is still one question; k is then chosen by silhouette, not by hand. | PROVISIONAL — not ratified |
| `DOC_CLAIMS_SAMPLED` | 60 | claims per document, evenly spaced, outside front matter | map | A document's question shows across its body; 60 evenly spaced claims cover long reports at a fixed cost. | PROVISIONAL — not ratified |
| `TITLE_WEIGHT` | 0.25 | weight of the title embedding in a document's vector | map | Titles name the question but are short and branded; claims carry most of the signal. | PROVISIONAL — not ratified |
| `CLUSTER_RULE` | max documents x organizations, among coherent clusters | rule | map | 'Most documents across the most organizations': the product rewards both and a firm's own series cannot win on volume alone. | PROVISIONAL — not ratified |
| `CLUSTER_MIN_SILHOUETTE` | 0.0 | mean silhouette of a cluster's members (cosine), exclusive | map | Added after the first run, before any measure was computed (docs/record/gates/map.md): a cluster whose members are on average closer to another cluster than to their own is a leftover bin, not a question. The first rule chose such a bin (mean silhouette -0.0003). Zero is the definitional bound, not a tuned value. | PROVISIONAL — not ratified |
| `SUBQ_K_RANGE` | [6, 24] | k-means clusters of claims tried | map | A sub-question should hold several organizations' claims; more than about 24 splits one finding across groups. k chosen by silhouette on a fixed sample. | PROVISIONAL — not ratified |
| `SUBQ_MIN_CLAIMS` | 3 | claims a document needs in a sub-question to be on it | map | One stray sentence does not put a document on a sub-question; three is the smallest count that a single misplaced sentence cannot reach alone in most documents. | PROVISIONAL — not ratified |
| `SUBQ_MIN_SHARE` | 0.1 | share of a document's body claims that must fall in a sub-question | map | Added at review, before coverage existed: with the count floor alone a long report was 'on' nearly every sub-question (69 of 86 documents on one), so 'a shared sub-question' meant almost any pair. A tenth is twice the uniform share with 19 groups. | PROVISIONAL — not ratified |
| `SUBQ_LABEL_MIN_ORGS` | 3 | organizations whose claims must hold a label term | map | A sub-question's public label uses only words that three or more organizations use, so a label never names a firm's own product, place or series. | PROVISIONAL — not ratified |
| `NEW_IMS` | 3.5 | SPICED IMS, 1-5 | novelty | Same bar as propagation M2: an earlier claim with a shared anchor and IMS at or above 3.5 states mostly the same information, so the later claim is not new. | PROVISIONAL — not ratified |
| `NEW_IMS_NO_ANCHOR` | 4.0 | SPICED IMS, 1-5 | novelty | Same bar as propagation M3: without a shared anchor only a high information match makes a claim not new. | PROVISIONAL — not ratified |
| `NEW_CANDIDATES` | 20 | earlier claims scored per claim (nearest by embedding) | novelty | SPICED scores pairs; the nearest 20 earlier claims by the grouping embedding hold the match when there is one (measured on the labeling sheet). | PROVISIONAL — not ratified |
| `NEW_CLAIM_FUNCTIONS` | ["own-result", "interpretation"] | engine claim functions | novelty | A finding is a result or a reading of one. Changed after the first map build, before any organization was measured: with 'other' included, 13,804 of 15,553 judged claims were generic sentences (descriptions, marketing, boilerplate), so the measure counted length, not findings (gates/novelty.md). | PROVISIONAL — not ratified |
| `NEW_ANCHORED` | true | flag: a claim with a distinctive numeric anchor is also a finding | novelty | A measured statement ('62% of firms use ...') is a finding whatever function the engine gives it. | PROVISIONAL — not ratified |
| `REFERENCE_LINE` | https?:///\bwww\./\bAccessed\b/\bRetrieved\b/\bdoi[:.] | regex | map | The engine takes some reference-list entries as claims; the first map build grouped 519 of them into a sub-question of their own ('https, html, accessed'). A line with a URL or an access date is a citation, not a claim the document makes. | PROVISIONAL — not ratified |
| `BACKFILL_YEARS` | 5 | years of documents before the reporting window | depth | The spec's minimum: a truncated past inflates originality (Park, Leahey and Funk 2023 on backward-citation truncation). | PROVISIONAL — not ratified |
| `REPORT_WINDOW` | ["2023-01-01", "2026-11-26"] | reporting window | depth | The years the page reports on; everything earlier is backfill for judging what was new. | PROVISIONAL — not ratified |
| `INTERVAL` | 0.95 | posterior interval | estimate | Spec. | PROVISIONAL — not ratified |
| `MIN_UNITS_TO_ESTIMATE` | 1 | trials an organization needs for any estimate | estimate | Partial pooling replaces cutoffs; zero trials means there is nothing to estimate. | PROVISIONAL — not ratified |
| `POOL_MIN_GROUPS` | 3 | organizations with trials needed to fit the prior | estimate | A beta prior has two parameters; fewer than three groups cannot inform both. | PROVISIONAL — not ratified |
| `BOOT_DRAWS` | 2000 | posterior or bootstrap draws | estimate | Monte Carlo error under 0.5 points on a 95% bound. | PROVISIONAL — not ratified |
| `COVERAGE_LINK_TIERS` | ["L1", "L2"] | propagation link tiers counted as coverage | coverage | Headline-eligible tiers in the propagation spec; L3 and X never count. | PROVISIONAL — not ratified |
| `CAPTURE_MIN_LISTS` | 2 | overlapping discovery lists needed | coverage | Two lists give Lincoln-Petersen under independence; three or more let a log-linear model fit a dependence between two lists. | PROVISIONAL — not ratified |
| `HAWKES_MIN_EVENTS` | 20 | independent articles for a report's Hawkes fit | dynamics | An exponential-kernel Hawkes model has three parameters; under about 20 events the branching ratio is not identified apart from the baseline. | PROVISIONAL — not ratified |
| `CD_MIN_CITING` | 5 | later citing documents for a CD index | citations | Below five forward citations the index takes only a few values and says little. | PROVISIONAL — not ratified |
| `RESONANCE_WINDOW` | 5 | documents before and after (time order) | novelty | Barron et al. report results stable across windows; 5 on each side fits a map of under 100 dated documents, so only the five newest and five oldest go unscored. Set before any value was computed. | PROVISIONAL — not ratified |
| `FIRST_CHECK_MIN_DEPTH_YEARS` | 5 | years of backfill before a 'first' claim | first | Below this the check cannot see far enough back: the verdict is 'not checkable'. | PROVISIONAL — not ratified |
| `STANCE_MIN_PROB` | 0.5 | stance model probability to call supports or contradicts | citations | Otherwise the finding is null (neither). | PROVISIONAL — not ratified |
| `PERMUTATIONS` | 10000 | label permutations | citations | p-value resolution 0.0001. | PROVISIONAL — not ratified |
| `DESIGN_ORDER` | ["randomized trial", "field experiment", "quasi-experiment", "panel survey", "cross-sectional survey", "telemetry", "administrative data", "case study", "forecast", "commentary"] | precedence for the primary design | map | Designs that can bear more causal or measured weight come first; a report that forecasts from agency data is read as administrative data, the evidence it stands on. | PROVISIONAL — not ratified |
| `DESIGN_MIN_HITS` | {"randomized trial": 1, "field experiment": 2, "quasi-experiment": 1, "panel survey": 1, "cross-sectional survey": 2, "telemetry": 2, "administrative data": 2, "case study": 2, "forecast": 3} | phrase matches for a design to be present | map | One match for phrases that only a design's own method section uses (randomized, difference-in-differences, panel); two or three for words a report may use in passing. | PROVISIONAL — not ratified |
| `SILHOUETTE_SAMPLE` | 6000 | claims sampled for the silhouette (seeded) | map | Silhouette is quadratic in claims; 6,000 gives a stable mean at a fixed cost. | PROVISIONAL — not ratified |
| `EXPOSURE_PHRASE` | according to | phrase counted as the crawl's size per month | open ground | Common in news of every kind and unrelated to any sub-question, so its count tracks how much news the crawl holds that month. | PROVISIONAL — not ratified |
| `OPEN_YEARS` | [2017, 2025] | full CC-NEWS crawl years in the model | open ground | CC-NEWS starts in August 2016 and Infini-News ends in April 2026; partial years would read as falling or rising demand. | PROVISIONAL — not ratified |
| `OPEN_BOOT` | 200 | bootstrap draws | open ground | Interval bounds stable to about 0.05. | PROVISIONAL — not ratified |
| `OPEN_TERMS` | 3 | label terms counted per sub-question | open ground | The label's own terms: what the page shows is what was counted. | PROVISIONAL — not ratified |
| `OPEN_FORMS` | space-padded: lower, Capitalized, and UPPER for terms of 4 letters or fewer | rule | open ground | Infini-News matches byte substrings, not words: the first count of 'ai' matched inside 'said' and 'again' (6.3 billion hits). A space on each side keeps whole words; short terms are often acronyms, so their upper-case form is counted too. Misses a word next to punctuation (an undercount). | PROVISIONAL — not ratified |
| `NTR_SMOOTH` | 0.5 | pseudo-count added to every sub-question before normalizing | novelty | KL divergence needs no zero; half a claim per sub-question (Jeffreys) keeps a one-sub-question document from dominating. | PROVISIONAL — not ratified |
| `L2R_MIN_POSITIVES` | 30 | citing pairs in each of the training and validation periods | citations | Below 30 positives a ranker's validation AUC has an interval wider than 0.2. | PROVISIONAL — not ratified |
| `HALF_LIFE_QUIET_YEARS` | 1.0 | years without a restatement before the window ends | dynamics | A finding last restated within a year of the window's end may still be restated: censored. | PROVISIONAL — not ratified |
| `REF_TITLE_MATCH` | 90 | rapidfuzz ratio of normalized titles, 0-100 | citations | Report titles are short and series reuse words; 90 accepts punctuation and case differences, not a different edition's year. | PROVISIONAL — not ratified |
| `REF_YEAR_SLACK` | 1 | years between the reference's year and the target's date | citations | A report dated December is often cited with the next year. | PROVISIONAL — not ratified |

Propagation-engine constants the Record reuses (TITLE_MATCH_THRESHOLD, ATTRIBUTION_WINDOW_K,
M1_CHAR_CONTAINMENT, M2_MIN_IMS, M3_MIN_IMS, NEAR_DUP_JACCARD, MINHASH_PERMUTATIONS and the
Gate 1 constants) are listed in the research repo's `reports/propagation/gate1-pilot.md`, also
PROVISIONAL.
