# Benchmark: engine dc34856 vs ba7854a

Generated 2026-11-08. Source, split, rows and label tier come from the new run where both have the metric.

| Check | Source | Split | Rows (old → new) | Tier | Metric | Old | New | Change |
|---|---|---|---|---|---|---|---|---|
| fixture-counts | fixture-a-cadre | fixture | 292 → 292 | predicted | claims | 242 | 242 |  |
| fixture-counts | fixture-a-cadre | fixture | 242 → 242 | predicted | unsupported-assertion | 148 | 148 |  |
| fixture-counts | fixture-a-cadre | fixture | 242 → 242 | predicted | overconfident | 3 | 3 |  |
| fixture-counts | fixture-a-cadre | fixture | 242 → 242 | predicted | causal-overreach | 16 | 16 |  |
| fixture-counts | fixture-a-cadre | fixture | 242 → 242 | predicted | flagRows | 167 | 167 |  |
| fixture-counts | fixture-a-cadre | fixture | 242 → 242 | predicted | unsupportedShare | 0.612 | 0.612 |  |
| fixture-counts | fixture-b-pew-report | fixture | 289 → 289 | predicted | claims | 231 | 231 |  |
| fixture-counts | fixture-b-pew-report | fixture | 231 → 231 | predicted | unsupported-assertion | 9 | 9 |  |
| fixture-counts | fixture-b-pew-report | fixture | 231 → 231 | predicted | overconfident | 0 | 0 |  |
| fixture-counts | fixture-b-pew-report | fixture | 231 → 231 | predicted | causal-overreach | 3 | 3 |  |
| fixture-counts | fixture-b-pew-report | fixture | 231 → 231 | predicted | flagRows | 12 | 12 |  |
| fixture-counts | fixture-b-pew-report | fixture | 231 → 231 | predicted | unsupportedShare | 0.039 | 0.039 |  |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 495 → 495 | predicted | claims | 378 | 378 |  |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 → 378 | predicted | unsupported-assertion | 236 | 236 |  |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 → 378 | predicted | overconfident | 2 | 2 |  |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 → 378 | predicted | causal-overreach | 24 | 24 |  |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 → 378 | predicted | flagRows | 262 | 262 |  |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 → 378 | predicted | unsupportedShare | 0.624 | 0.624 |  |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | 0 → 0 | gold | nonClaimLeakage | — | — |  |
| fixture-review | fixture-a-cadre | fixture | — → 0 | gold | precision:causal-overreach | — | — |  |
| fixture-review | fixture-a-cadre | fixture | — → 0 | gold | precision:overconfident | — | — |  |
| fixture-review | fixture-a-cadre | fixture | — → 0 | gold | precision:unsupported-assertion | — | — |  |
| fixture-review | fixture-a-cadre | fixture-sample | — → 0 | gold | missRate | — | — |  |
| fixture-review | fixture-a-cadre | fixture | — → 0 | gold | nonClaimLeakage | — | — |  |
| fixture-review | fixture-b-pew-report | fixture | — → 0 | gold | precision:causal-overreach | — | — |  |
| fixture-review | fixture-b-pew-report | fixture | — → 0 | gold | precision:unsupported-assertion | — | — |  |
| fixture-review | fixture-b-pew-report | fixture-sample | — → 0 | gold | missRate | — | — |  |
| fixture-review | fixture-b-pew-report | fixture | — → 0 | gold | nonClaimLeakage | — | — |  |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | — → 0 | gold | precision:causal-overreach | — | — |  |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | — → 0 | gold | precision:overconfident | — | — |  |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | — → 0 | gold | precision:unsupported-assertion | — | — |  |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture-sample | — → 0 | gold | missRate | — | — |  |
| causal-register | yu2019_pubmed | all | — → 3051 | published-human | rows | — | 3051 | changed |
| causal-register | yu2019_pubmed | all | — → 3051 | published-human | macroF1 | — | 0.708 | changed |
| causal-register | yu2019_pubmed | all | — → 3051 | published-human | accuracy | — | 0.758 | changed |
| causal-register | yu2019_pubmed | all | — → 3051 | published-human | perClass | — | (table) | changed |
| causal-register | yu2019_pubmed | all | — → 3051 | published-human | confusion | — | (table) | changed |
| causal-register | yu2019_pubmed | bundle-test | — → 342 | published-human | rows | — | 342 | changed |
| causal-register | yu2019_pubmed | bundle-test | — → 342 | published-human | macroF1 | — | 0.681 | changed |
| causal-register | yu2019_pubmed | bundle-test | — → 342 | published-human | accuracy | — | 0.722 | changed |
| causal-register | yu2019_pubmed | bundle-test | — → 342 | published-human | perClass | — | (table) | changed |
| causal-register | yu2019_pubmed | bundle-test | — → 342 | published-human | confusion | — | (table) | changed |
| causal-register | yu2019_pubmed | engine-tuning | — → 1707 | published-human | rows | — | 1707 | changed |
| causal-register | yu2019_pubmed | engine-tuning | — → 1707 | published-human | macroF1 | — | 0.717 | changed |
| causal-register | yu2019_pubmed | engine-tuning | — → 1707 | published-human | accuracy | — | 0.764 | changed |
| causal-register | yu2019_pubmed | engine-tuning | — → 1707 | published-human | perClass | — | (table) | changed |
| causal-register | yu2019_pubmed | engine-tuning | — → 1707 | published-human | confusion | — | (table) | changed |
| causal-register | yu2019_pubmed | engine-held-out | — → 734 | published-human | rows | — | 734 | changed |
| causal-register | yu2019_pubmed | engine-held-out | — → 734 | published-human | macroF1 | — | 0.701 | changed |
| causal-register | yu2019_pubmed | engine-held-out | — → 734 | published-human | accuracy | — | 0.753 | changed |
| causal-register | yu2019_pubmed | engine-held-out | — → 734 | published-human | perClass | — | (table) | changed |
| causal-register | yu2019_pubmed | engine-held-out | — → 734 | published-human | confusion | — | (table) | changed |
| causal-register | yu2019_pubmed | never-seen | — → 610 | published-human | rows | — | 610 | changed |
| causal-register | yu2019_pubmed | never-seen | — → 610 | published-human | macroF1 | — | 0.689 | changed |
| causal-register | yu2019_pubmed | never-seen | — → 610 | published-human | accuracy | — | 0.746 | changed |
| causal-register | yu2019_pubmed | never-seen | — → 610 | published-human | perClass | — | (table) | changed |
| causal-register | yu2019_pubmed | never-seen | — → 610 | published-human | confusion | — | (table) | changed |
| causal-register | yu2019_pubmed | never-seen | — → 610 | published-human | perClassF1Order | — | (table) | changed |
| causal-register | yu2020_eureka | all | — → 2073 | published-human | rows | — | 2073 | changed |
| causal-register | yu2020_eureka | all | — → 2073 | published-human | macroF1 | — | 0.371 | changed |
| causal-register | yu2020_eureka | all | — → 2073 | published-human | accuracy | — | 0.331 | changed |
| causal-register | yu2020_eureka | all | — → 2073 | published-human | perClass | — | (table) | changed |
| causal-register | yu2020_eureka | all | — → 2073 | published-human | confusion | — | (table) | changed |
| causal-register | yu2020_eureka | bundle-test | — → 193 | published-human | rows | — | 193 | changed |
| causal-register | yu2020_eureka | bundle-test | — → 193 | published-human | macroF1 | — | 0.349 | changed |
| causal-register | yu2020_eureka | bundle-test | — → 193 | published-human | accuracy | — | 0.301 | changed |
| causal-register | yu2020_eureka | bundle-test | — → 193 | published-human | perClass | — | (table) | changed |
| causal-register | yu2020_eureka | bundle-test | — → 193 | published-human | confusion | — | (table) | changed |
| certainty | pei2021 | all | — → 1551 | published-human | rows | — | 1551 | changed |
| certainty | pei2021 | all | — → 1551 | published-human | spearman | — | 0.599 | changed |
| certainty | pei2021 | all | — → 1551 | published-human | measuredShare | — | 0.647 | changed |
| certainty | pei2021 | all | — → 1551 | published-human | tierCounts | — | (table) | changed |
| certainty | pei2021 | bundle-test | — → 164 | published-human | rows | — | 164 | changed |
| certainty | pei2021 | bundle-test | — → 164 | published-human | spearman | — | 0.558 | changed |
| certainty | pei2021 | bundle-test | — → 164 | published-human | measuredShare | — | 0.634 | changed |
| certainty | pei2021 | bundle-test | — → 164 | published-human | tierCounts | — | (table) | changed |
| restatement-gap | wright2021_pairs | all | — → 663 | published-human | rows | — | 663 | changed |
| restatement-gap | wright2021_pairs | all | — → 663 | published-human | agreement | — | 0.511 | changed |
| restatement-gap | wright2021_pairs | all | — → 663 | published-human | macroF1 | — | 0.454 | changed |
| restatement-gap | wright2021_pairs | all | — → 663 | published-human | abstractStrengthAccuracy | — | 0.59 | changed |
| restatement-gap | wright2021_pairs | all | — → 663 | published-human | pressStrengthAccuracy | — | 0.504 | changed |
| restatement-gap | wright2021_pairs | all | — → 663 | published-human | confusion | — | (table) | changed |
| restatement-gap | wright2021_pairs | bundle-test | — → 50 | published-human | rows | — | 50 | changed |
| restatement-gap | wright2021_pairs | bundle-test | — → 50 | published-human | agreement | — | 0.54 | changed |
| restatement-gap | wright2021_pairs | bundle-test | — → 50 | published-human | macroF1 | — | 0.483 | changed |
| restatement-gap | wright2021_pairs | bundle-test | — → 50 | published-human | abstractStrengthAccuracy | — | 0.6 | changed |
| restatement-gap | wright2021_pairs | bundle-test | — → 50 | published-human | pressStrengthAccuracy | — | 0.42 | changed |
| restatement-gap | wright2021_pairs | bundle-test | — → 50 | published-human | confusion | — | (table) | changed |
| causal-sentence | cessc_ssc | all | — → 1058 | published-human | rows | — | 1058 | changed |
| causal-sentence | cessc_ssc | all | — → 1058 | published-human | precision | — | 0.772 | changed |
| causal-sentence | cessc_ssc | all | — → 1058 | published-human | recall | — | 0.473 | changed |
| causal-sentence | cessc_ssc | all | — → 1058 | published-human | counts | — | (table) | changed |
| causal-sentence | cessc_ssc | all | — → 1058 | published-human | precision (wide: + correlational) | — | 0.714 | changed |
| causal-sentence | cessc_ssc | all | — → 1058 | published-human | recall (wide: + correlational) | — | 0.656 | changed |
| causal-sentence | cessc_ssc | bundle-test | — → 117 | published-human | rows | — | 117 | changed |
| causal-sentence | cessc_ssc | bundle-test | — → 117 | published-human | precision | — | 0.795 | changed |
| causal-sentence | cessc_ssc | bundle-test | — → 117 | published-human | recall | — | 0.554 | changed |
| causal-sentence | cessc_ssc | bundle-test | — → 117 | published-human | counts | — | (table) | changed |
| causal-sentence | cessc_ssc | bundle-test | — → 117 | published-human | precision (wide: + correlational) | — | 0.731 | changed |
| causal-sentence | cessc_ssc | bundle-test | — → 117 | published-human | recall (wide: + correlational) | — | 0.679 | changed |

## Fixtures

### fixture-a-cadre

| Field | Old | New |
|---|---|---|
| claims | 242 | 242 |
| score | 1 | 1 |
| flags | {"unsupported-assertion":148,"overconfident":3,"causal-overreach":16} | {"unsupported-assertion":148,"overconfident":3,"causal-overreach":16} |
| route | hybrid:firm-research · research-like | hybrid:firm-research · research-like |
| signals | register-mismatch, undisclosed-interest | register-mismatch, undisclosed-interest |

### fixture-b-pew-report

| Field | Old | New |
|---|---|---|
| claims | 231 | 231 |
| score | 7.3 | 7.3 |
| flags | {"unsupported-assertion":9,"overconfident":0,"causal-overreach":3} | {"unsupported-assertion":9,"overconfident":0,"causal-overreach":3} |
| route | research · standard | research · standard |
| signals | limitations-absent, completeness-gaps | limitations-absent, completeness-gaps |

### fixture-c-gensler-fandom-2026

| Field | Old | New |
|---|---|---|
| claims | 378 | 378 |
| score | 1 | 1 |
| flags | {"unsupported-assertion":236,"overconfident":2,"causal-overreach":24} | {"unsupported-assertion":236,"overconfident":2,"causal-overreach":24} |
| route | hybrid:firm-research · press-release | hybrid:firm-research · press-release |
| signals | self-citation-dominance, register-mismatch, completeness-gaps, limitations-absent, undisclosed-interest | register-mismatch, completeness-gaps, limitations-absent, undisclosed-interest |

