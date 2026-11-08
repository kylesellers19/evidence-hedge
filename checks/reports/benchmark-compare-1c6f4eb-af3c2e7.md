# Benchmark: engine 1c6f4eb vs af3c2e7

Generated 2026-11-08. Source, split, rows and label tier come from the new run where both have the metric.

| Check | Source | Split | Rows (old → new) | Tier | Metric | Old | New | Change |
|---|---|---|---|---|---|---|---|---|
| fixture-counts | fixture-a-cadre | fixture | 292 → 292 | predicted | claims | 242 | 242 |  |
| fixture-counts | fixture-a-cadre | fixture | 242 → 242 | predicted | unsupported-assertion | 148 | 148 |  |
| fixture-counts | fixture-a-cadre | fixture | 242 → 242 | predicted | overconfident | 3 | 3 |  |
| fixture-counts | fixture-a-cadre | fixture | 242 → 242 | predicted | causal-overreach | 16 | 16 |  |
| fixture-counts | fixture-a-cadre | fixture | 242 → 242 | predicted | flagRows | 167 | 167 |  |
| fixture-counts | fixture-a-cadre | fixture | 242 → 242 | predicted | unsupportedShare | 0.612 | 0.612 |  |
| fixture-review | fixture-a-cadre | fixture | 0 → 0 | gold | precision:causal-overreach | — | — |  |
| fixture-review | fixture-a-cadre | fixture | 0 → 0 | gold | precision:overconfident | — | — |  |
| fixture-review | fixture-a-cadre | fixture | 0 → 0 | gold | precision:unsupported-assertion | — | — |  |
| fixture-review | fixture-a-cadre | fixture-sample | 0 → 0 | gold | missRate | — | — |  |
| fixture-review | fixture-a-cadre | fixture | 0 → 0 | gold | nonClaimLeakage | — | — |  |
| fixture-counts | fixture-b-pew-report | fixture | 289 → 289 | predicted | claims | 231 | 231 |  |
| fixture-counts | fixture-b-pew-report | fixture | 231 → 231 | predicted | unsupported-assertion | 9 | 9 |  |
| fixture-counts | fixture-b-pew-report | fixture | 231 → 231 | predicted | overconfident | 0 | 0 |  |
| fixture-counts | fixture-b-pew-report | fixture | 231 → 231 | predicted | causal-overreach | 3 | 3 |  |
| fixture-counts | fixture-b-pew-report | fixture | 231 → 231 | predicted | flagRows | 12 | 12 |  |
| fixture-counts | fixture-b-pew-report | fixture | 231 → 231 | predicted | unsupportedShare | 0.039 | 0.039 |  |
| fixture-review | fixture-b-pew-report | fixture | 0 → 0 | gold | precision:causal-overreach | — | — |  |
| fixture-review | fixture-b-pew-report | fixture | 0 → 0 | gold | precision:unsupported-assertion | — | — |  |
| fixture-review | fixture-b-pew-report | fixture-sample | 0 → 0 | gold | missRate | — | — |  |
| fixture-review | fixture-b-pew-report | fixture | 0 → 0 | gold | nonClaimLeakage | — | — |  |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 495 → 511 | predicted | claims | 378 | 397 | +19 |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 → 397 | predicted | unsupported-assertion | 195 | 212 | +17 |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 → 397 | predicted | overconfident | 5 | 5 |  |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 → 397 | predicted | causal-overreach | 24 | 23 | -1 |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 → 397 | predicted | flagRows | 224 | 240 | +16 |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 → 397 | predicted | unsupportedShare | 0.516 | 0.534 | +0.018 |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | 0 → 0 | gold | precision:causal-overreach | — | — |  |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | 0 → 0 | gold | precision:overconfident | — | — |  |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | 0 → 0 | gold | precision:unsupported-assertion | — | — |  |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture-sample | 0 → 0 | gold | missRate | — | — |  |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | 0 → 0 | gold | nonClaimLeakage | — | — |  |
| causal-register | yu2019_pubmed | all | 3051 → 3051 | published-human | rows | 3051 | 3051 |  |
| causal-register | yu2019_pubmed | all | 3051 → 3051 | published-human | macroF1 | 0.708 | 0.708 |  |
| causal-register | yu2019_pubmed | all | 3051 → 3051 | published-human | accuracy | 0.758 | 0.758 |  |
| causal-register | yu2019_pubmed | all | 3051 → 3051 | published-human | perClass | (table) | (table) |  |
| causal-register | yu2019_pubmed | all | 3051 → 3051 | published-human | confusion | (table) | (table) |  |
| causal-register | yu2019_pubmed | bundle-test | 342 → 342 | published-human | rows | 342 | 342 |  |
| causal-register | yu2019_pubmed | bundle-test | 342 → 342 | published-human | macroF1 | 0.681 | 0.681 |  |
| causal-register | yu2019_pubmed | bundle-test | 342 → 342 | published-human | accuracy | 0.722 | 0.722 |  |
| causal-register | yu2019_pubmed | bundle-test | 342 → 342 | published-human | perClass | (table) | (table) |  |
| causal-register | yu2019_pubmed | bundle-test | 342 → 342 | published-human | confusion | (table) | (table) |  |
| causal-register | yu2019_pubmed | engine-tuning | 1707 → 1707 | published-human | rows | 1707 | 1707 |  |
| causal-register | yu2019_pubmed | engine-tuning | 1707 → 1707 | published-human | macroF1 | 0.717 | 0.717 |  |
| causal-register | yu2019_pubmed | engine-tuning | 1707 → 1707 | published-human | accuracy | 0.764 | 0.764 |  |
| causal-register | yu2019_pubmed | engine-tuning | 1707 → 1707 | published-human | perClass | (table) | (table) |  |
| causal-register | yu2019_pubmed | engine-tuning | 1707 → 1707 | published-human | confusion | (table) | (table) |  |
| causal-register | yu2019_pubmed | engine-held-out | 734 → 734 | published-human | rows | 734 | 734 |  |
| causal-register | yu2019_pubmed | engine-held-out | 734 → 734 | published-human | macroF1 | 0.701 | 0.701 |  |
| causal-register | yu2019_pubmed | engine-held-out | 734 → 734 | published-human | accuracy | 0.753 | 0.753 |  |
| causal-register | yu2019_pubmed | engine-held-out | 734 → 734 | published-human | perClass | (table) | (table) |  |
| causal-register | yu2019_pubmed | engine-held-out | 734 → 734 | published-human | confusion | (table) | (table) |  |
| causal-register | yu2019_pubmed | never-seen | 610 → 610 | published-human | rows | 610 | 610 |  |
| causal-register | yu2019_pubmed | never-seen | 610 → 610 | published-human | macroF1 | 0.689 | 0.689 |  |
| causal-register | yu2019_pubmed | never-seen | 610 → 610 | published-human | accuracy | 0.746 | 0.746 |  |
| causal-register | yu2019_pubmed | never-seen | 610 → 610 | published-human | perClass | (table) | (table) |  |
| causal-register | yu2019_pubmed | never-seen | 610 → 610 | published-human | confusion | (table) | (table) |  |
| causal-register | yu2019_pubmed | never-seen | 610 → 610 | published-human | perClassF1Order | (table) | (table) |  |
| causal-register | yu2019_pubmed | model-eligible | 3045 → 3045 | published-human | macroF1 (yu2019-causal@84abecc) | 0.873 | 0.873 |  |
| causal-register | yu2019_pubmed | model-eligible | 3045 → 3045 | published-human | macroF1 | 0.708 | 0.708 |  |
| causal-register | yu2020_eureka | all | 2073 → 2073 | published-human | rows | 2073 | 2073 |  |
| causal-register | yu2020_eureka | all | 2073 → 2073 | published-human | macroF1 | 0.626 | 0.626 |  |
| causal-register | yu2020_eureka | all | 2073 → 2073 | published-human | accuracy | 0.63 | 0.63 |  |
| causal-register | yu2020_eureka | all | 2073 → 2073 | published-human | perClass | (table) | (table) |  |
| causal-register | yu2020_eureka | all | 2073 → 2073 | published-human | confusion | (table) | (table) |  |
| causal-register | yu2020_eureka | bundle-test | 193 → 193 | published-human | rows | 193 | 193 |  |
| causal-register | yu2020_eureka | bundle-test | 193 → 193 | published-human | macroF1 | 0.624 | 0.624 |  |
| causal-register | yu2020_eureka | bundle-test | 193 → 193 | published-human | accuracy | 0.632 | 0.632 |  |
| causal-register | yu2020_eureka | bundle-test | 193 → 193 | published-human | perClass | (table) | (table) |  |
| causal-register | yu2020_eureka | bundle-test | 193 → 193 | published-human | confusion | (table) | (table) |  |
| causal-register | yu2020_eureka | model-eligible | 2073 → 2073 | published-human | macroF1 (yu2019-causal@84abecc) | 0.831 | 0.831 |  |
| causal-register | yu2020_eureka | model-eligible | 2073 → 2073 | published-human | macroF1 | 0.626 | 0.626 |  |
| certainty | pei2021 | all | 1551 → 1551 | published-human | rows | 1551 | 1551 |  |
| certainty | pei2021 | all | 1551 → 1551 | published-human | spearman | 0.599 | 0.599 |  |
| certainty | pei2021 | all | 1551 → 1551 | published-human | measuredShare | 0.647 | 0.647 |  |
| certainty | pei2021 | all | 1551 → 1551 | published-human | tierCounts | (table) | (table) |  |
| certainty | pei2021 | bundle-test | 164 → 164 | published-human | rows | 164 | 164 |  |
| certainty | pei2021 | bundle-test | 164 → 164 | published-human | spearman | 0.558 | 0.558 |  |
| certainty | pei2021 | bundle-test | 164 → 164 | published-human | measuredShare | 0.634 | 0.634 |  |
| certainty | pei2021 | bundle-test | 164 → 164 | published-human | tierCounts | (table) | (table) |  |
| certainty | pei2021 | model-eligible | 331 → 331 | published-human | spearman (certainty-estimator-sentence@97a130c) | 0.616 | 0.616 |  |
| certainty | pei2021 | model-eligible | 331 → 331 | published-human | spearman | 0.635 | 0.635 |  |
| restatement-gap | wright2021_pairs | all | 663 → 663 | published-human | rows | 663 | 663 |  |
| restatement-gap | wright2021_pairs | all | 663 → 663 | published-human | agreement | 0.511 | 0.511 |  |
| restatement-gap | wright2021_pairs | all | 663 → 663 | published-human | macroF1 | 0.454 | 0.454 |  |
| restatement-gap | wright2021_pairs | all | 663 → 663 | published-human | abstractStrengthAccuracy | 0.59 | 0.59 |  |
| restatement-gap | wright2021_pairs | all | 663 → 663 | published-human | pressStrengthAccuracy | 0.504 | 0.504 |  |
| restatement-gap | wright2021_pairs | all | 663 → 663 | published-human | confusion | (table) | (table) |  |
| restatement-gap | wright2021_pairs | bundle-test | 50 → 50 | published-human | rows | 50 | 50 |  |
| restatement-gap | wright2021_pairs | bundle-test | 50 → 50 | published-human | agreement | 0.54 | 0.54 |  |
| restatement-gap | wright2021_pairs | bundle-test | 50 → 50 | published-human | macroF1 | 0.483 | 0.483 |  |
| restatement-gap | wright2021_pairs | bundle-test | 50 → 50 | published-human | abstractStrengthAccuracy | 0.6 | 0.6 |  |
| restatement-gap | wright2021_pairs | bundle-test | 50 → 50 | published-human | pressStrengthAccuracy | 0.42 | 0.42 |  |
| restatement-gap | wright2021_pairs | bundle-test | 50 → 50 | published-human | confusion | (table) | (table) |  |
| causal-sentence | cessc_ssc | all | 1058 → 1058 | published-human | rows | 1058 | 1058 |  |
| causal-sentence | cessc_ssc | all | 1058 → 1058 | published-human | precision | 0.772 | 0.772 |  |
| causal-sentence | cessc_ssc | all | 1058 → 1058 | published-human | recall | 0.473 | 0.473 |  |
| causal-sentence | cessc_ssc | all | 1058 → 1058 | published-human | counts | (table) | (table) |  |
| causal-sentence | cessc_ssc | all | 1058 → 1058 | published-human | precision (wide: + correlational) | 0.714 | 0.714 |  |
| causal-sentence | cessc_ssc | all | 1058 → 1058 | published-human | recall (wide: + correlational) | 0.656 | 0.656 |  |
| causal-sentence | cessc_ssc | bundle-test | 117 → 117 | published-human | rows | 117 | 117 |  |
| causal-sentence | cessc_ssc | bundle-test | 117 → 117 | published-human | precision | 0.795 | 0.795 |  |
| causal-sentence | cessc_ssc | bundle-test | 117 → 117 | published-human | recall | 0.554 | 0.554 |  |
| causal-sentence | cessc_ssc | bundle-test | 117 → 117 | published-human | counts | (table) | (table) |  |
| causal-sentence | cessc_ssc | bundle-test | 117 → 117 | published-human | precision (wide: + correlational) | 0.731 | 0.731 |  |
| causal-sentence | cessc_ssc | bundle-test | 117 → 117 | published-human | recall (wide: + correlational) | 0.679 | 0.679 |  |
| causal-sentence | cessc_ssc | model-eligible | 246 → 246 | published-human | f1 (cessc@42819b2) | 0.89 | 0.89 |  |
| causal-sentence | cessc_ssc | model-eligible | 1058 → 1058 | published-human | f1 | 0.586 | 0.586 |  |
| causal-sentence | cessc_ssc | model-eligible | 1058 → 1058 | published-human | f1 (unicausal-seq@96ed92b) | 0.609 | 0.609 |  |
| causal-sentence | cessc_ssc | model-eligible | 1058 → 1058 | published-human | f1 (unicausal-seq-released@96ed92b) | 0.705 | 0.705 |  |

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
| claims | 378 | 397 |
| score | 1 | 1 |
| flags | {"unsupported-assertion":195,"overconfident":5,"causal-overreach":24} | {"unsupported-assertion":212,"overconfident":5,"causal-overreach":23} |
| route | hybrid:firm-research · press-release | hybrid:firm-research · press-release |
| signals | register-mismatch, completeness-gaps, limitations-absent, undisclosed-interest | register-mismatch, completeness-gaps, limitations-absent, undisclosed-interest |

