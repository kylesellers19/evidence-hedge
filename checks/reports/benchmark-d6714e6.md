# Benchmark — engine d6714e6

Generated 2026-11-09 by `node checks/benchmark.mjs`. Baseline dc34856. Predictions approved 2026-11-07 (`checks/benchmark-predictions.json`).

## Predicted vs. actual

| Check | Source | Split | Rows | Label tier | Metric | Predicted | Actual | Match |
|---|---|---|---|---|---|---|---|---|
| fixture-counts | fixture-a-cadre | fixture | 332 | predicted | claims | 242 (exact) | 240 | **no** |
| fixture-counts | fixture-a-cadre | fixture | 240 | predicted | unsupported-assertion | 148 (exact) | 150 | **no** |
| fixture-counts | fixture-a-cadre | fixture | 240 | predicted | overconfident | 3 (exact) | 3 | yes |
| fixture-counts | fixture-a-cadre | fixture | 240 | predicted | causal-overreach | 16 (exact) | 14 | **no** |
| fixture-counts | fixture-a-cadre | fixture | 240 | predicted | flagRows | 167 (exact) | 167 | yes |
| fixture-counts | fixture-b-pew-report | fixture | 351 | predicted | claims | 231 (exact) | 237 | **no** |
| fixture-counts | fixture-b-pew-report | fixture | 237 | predicted | unsupported-assertion | 9 (exact) | 7 | **no** |
| fixture-counts | fixture-b-pew-report | fixture | 237 | predicted | overconfident | 0 (exact) | 0 | yes |
| fixture-counts | fixture-b-pew-report | fixture | 237 | predicted | causal-overreach | 3 (exact) | 3 | yes |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 1053 | predicted | claims | 300 [180–450] | 417 | yes |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 417 | predicted | overconfident | 2 [0–5] | 4 | yes |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 417 | predicted | causal-overreach | 10 [4–25] | 21 | yes |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 417 | predicted | unsupportedShare | 0.75 [0.65–0.85] | 0.537 | **no** |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | 0 | gold | nonClaimLeakage | 0.25 [0.15–0.4] | — | pending |
| causal-register | yu2019_pubmed | bundle-test | 342 | published-human | macroF1 | 0.7 [0.66–0.74] | 0.681 | yes |
| causal-register | yu2019_pubmed | engine-tuning | 1707 | published-human | rows | 1712 [1703–1712] | 1707 | yes |
| causal-register | yu2019_pubmed | engine-tuning | 1707 | published-human | macroF1 | 0.718 (exact) | 0.717 | **no** |
| causal-register | yu2019_pubmed | engine-tuning | 1707 | published-human | accuracy | 0.765 (exact) | 0.764 | **no** |
| causal-register | yu2019_pubmed | engine-held-out | 734 | published-human | rows | 734 [725–734] | 734 | yes |
| causal-register | yu2019_pubmed | engine-held-out | 734 | published-human | macroF1 | 0.702 (exact) | 0.701 | **no** |
| causal-register | yu2019_pubmed | engine-held-out | 734 | published-human | accuracy | 0.755 (exact) | 0.753 | **no** |
| causal-register | yu2019_pubmed | never-seen | 610 | published-human | rows | 606 [597–615] | 610 | yes |
| causal-register | yu2019_pubmed | never-seen | 610 | published-human | macroF1 | 0.68 [0.62–0.74] | 0.689 | yes |
| causal-register | yu2019_pubmed | never-seen | 610 | published-human | perClassF1Order | ["none","correlational","direct-causal","conditional-causal"] | `["none","correlational","direct-causal","conditional-causal"]` | yes |
| causal-register | yu2020_eureka | all | 2073 | published-human | rows | 2073 (exact) | 2073 | yes |
| causal-register | yu2020_eureka | all | 2073 | published-human | macroF1 | 0.58 [0.5–0.66] | 0.626 | yes |
| causal-register | yu2020_eureka | all | 2073 | published-human | accuracy | 0.65 [0.57–0.72] | 0.63 | yes |
| certainty | pei2021 | all | 1551 | published-human | rows | 2166 (exact) | 1551 | **no** |
| certainty | pei2021 | all | 1551 | published-human | spearman | 0.25 [0.15–0.35] | 0.599 | **no** |
| certainty | pei2021 | all | 1551 | published-human | measuredShare | 0.6 [0.6–1] | 0.647 | yes |
| restatement-gap | wright2021_pairs | all | 663 | published-human | rows | 663 (exact) | 663 | yes |
| restatement-gap | wright2021_pairs | all | 663 | published-human | agreement | 0.45 [0.35–0.55] | 0.511 | yes |
| restatement-gap | wright2021_pairs | all | 663 | published-human | macroF1 | 0.35 [0.25–0.45] | 0.454 | **no** |
| restatement-gap | wright2021_pairs | all | 663 | published-human | abstractStrengthAccuracy | 0.7 [0.62–0.78] | 0.59 | **no** |
| restatement-gap | wright2021_pairs | all | 663 | published-human | pressStrengthAccuracy | 0.62 [0.54–0.7] | 0.504 | **no** |
| causal-sentence | cessc_ssc | all | 1058 | published-human | rows | 1058 (exact) | 1058 | yes |
| causal-sentence | cessc_ssc | all | 1058 | published-human | precision | 0.65 [0.5–0.8] | 0.772 | yes |
| causal-sentence | cessc_ssc | all | 1058 | published-human | recall | 0.45 [0.3–0.6] | 0.473 | yes |

## Checks not run

- **spiced**: skip — fields reported; loader not written until Kyle reviews them

## Models left out of a comparison

- **certainty-estimator-aspect@97a130c** on yu2019_pubmed (causal-register): supplies no label this check scores, on all 3051 eligible rows
- **certainty-estimator-sentence@97a130c** on yu2019_pubmed (causal-register): supplies no label this check scores, on all 3051 eligible rows
- **cessc@42819b2** on yu2019_pubmed (causal-register): supplies no label this check scores, on all 3051 eligible rows
- **certainty-estimator-aspect@97a130c** on yu2020_eureka (causal-register): supplies no label this check scores, on all 2073 eligible rows
- **certainty-estimator-sentence@97a130c** on yu2020_eureka (causal-register): supplies no label this check scores, on all 2073 eligible rows
- **cessc@42819b2** on yu2020_eureka (causal-register): supplies no label this check scores, on all 2073 eligible rows
- **certainty-estimator-aspect@97a130c** on pei2021 (certainty): supplies no label this check scores, on all 278 eligible rows

## Fixtures

| Fixture | Standard | Rubric | Posture | Units (on a page) | Claims | Unsupported | Overconfident | Causal overreach | Score | Signals |
|---|---|---|---|---|---|---|---|---|---|---|
| fixture-a-cadre | corporate | hybrid:firm-research | research-like | 332 (322) | 240 | 150 | 3 | 14 | 1 | register-mismatch, undisclosed-interest |
| fixture-b-pew-report | research | research | standard | 351 (348) | 237 | 7 | 0 | 3 | 7.4 | limitations-absent, completeness-gaps |
| fixture-c-gensler-fandom-2026 | corporate | hybrid:firm-research | research-like | 1053 (1046) | 417 | 224 | 4 | 21 | 1 | register-mismatch, completeness-gaps, limitations-absent, undisclosed-interest |

## All metrics

| Check | Source | Split | Rows | Label tier | System | Metric | Value |
|---|---|---|---|---|---|---|---|
| fixture-counts | fixture-a-cadre | fixture | 332 | predicted | engine@d6714e6 | claims | 240 |
| fixture-counts | fixture-a-cadre | fixture | 240 | predicted | engine@d6714e6 | unsupported-assertion | 150 |
| fixture-counts | fixture-a-cadre | fixture | 240 | predicted | engine@d6714e6 | overconfident | 3 |
| fixture-counts | fixture-a-cadre | fixture | 240 | predicted | engine@d6714e6 | causal-overreach | 14 |
| fixture-counts | fixture-a-cadre | fixture | 240 | predicted | engine@d6714e6 | flagRows | 167 |
| fixture-counts | fixture-a-cadre | fixture | 240 | predicted | engine@d6714e6 | unsupportedShare | 0.625 |
| fixture-review | fixture-a-cadre | fixture | 0 | gold | engine@d6714e6 | precision:causal-overreach | — |
| fixture-review | fixture-a-cadre | fixture | 0 | gold | engine@d6714e6 | precision:overconfident | — |
| fixture-review | fixture-a-cadre | fixture | 0 | gold | engine@d6714e6 | precision:unsupported-assertion | — |
| fixture-review | fixture-a-cadre | fixture-sample | 0 | gold | engine@d6714e6 | missRate | — |
| fixture-review | fixture-a-cadre | fixture | 0 | gold | engine@d6714e6 | nonClaimLeakage | — |
| fixture-counts | fixture-b-pew-report | fixture | 351 | predicted | engine@d6714e6 | claims | 237 |
| fixture-counts | fixture-b-pew-report | fixture | 237 | predicted | engine@d6714e6 | unsupported-assertion | 7 |
| fixture-counts | fixture-b-pew-report | fixture | 237 | predicted | engine@d6714e6 | overconfident | 0 |
| fixture-counts | fixture-b-pew-report | fixture | 237 | predicted | engine@d6714e6 | causal-overreach | 3 |
| fixture-counts | fixture-b-pew-report | fixture | 237 | predicted | engine@d6714e6 | flagRows | 10 |
| fixture-counts | fixture-b-pew-report | fixture | 237 | predicted | engine@d6714e6 | unsupportedShare | 0.03 |
| fixture-review | fixture-b-pew-report | fixture | 0 | gold | engine@d6714e6 | precision:causal-overreach | — |
| fixture-review | fixture-b-pew-report | fixture | 0 | gold | engine@d6714e6 | precision:unsupported-assertion | — |
| fixture-review | fixture-b-pew-report | fixture-sample | 0 | gold | engine@d6714e6 | missRate | — |
| fixture-review | fixture-b-pew-report | fixture | 0 | gold | engine@d6714e6 | nonClaimLeakage | — |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 1053 | predicted | engine@d6714e6 | claims | 417 |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 417 | predicted | engine@d6714e6 | unsupported-assertion | 224 |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 417 | predicted | engine@d6714e6 | overconfident | 4 |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 417 | predicted | engine@d6714e6 | causal-overreach | 21 |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 417 | predicted | engine@d6714e6 | flagRows | 249 |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 417 | predicted | engine@d6714e6 | unsupportedShare | 0.537 |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | 0 | gold | engine@d6714e6 | precision:causal-overreach | — |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | 0 | gold | engine@d6714e6 | precision:overconfident | — |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | 0 | gold | engine@d6714e6 | precision:unsupported-assertion | — |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture-sample | 0 | gold | engine@d6714e6 | missRate | — |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | 0 | gold | engine@d6714e6 | nonClaimLeakage | — |
| causal-register | yu2019_pubmed | all | 3051 | published-human | engine@d6714e6 | rows | 3051 |
| causal-register | yu2019_pubmed | all | 3051 | published-human | engine@d6714e6 | macroF1 | 0.708 |
| causal-register | yu2019_pubmed | all | 3051 | published-human | engine@d6714e6 | accuracy | 0.758 |
| causal-register | yu2019_pubmed | bundle-test | 342 | published-human | engine@d6714e6 | rows | 342 |
| causal-register | yu2019_pubmed | bundle-test | 342 | published-human | engine@d6714e6 | macroF1 | 0.681 |
| causal-register | yu2019_pubmed | bundle-test | 342 | published-human | engine@d6714e6 | accuracy | 0.722 |
| causal-register | yu2019_pubmed | engine-tuning | 1707 | published-human | engine@d6714e6 | rows | 1707 |
| causal-register | yu2019_pubmed | engine-tuning | 1707 | published-human | engine@d6714e6 | macroF1 | 0.717 |
| causal-register | yu2019_pubmed | engine-tuning | 1707 | published-human | engine@d6714e6 | accuracy | 0.764 |
| causal-register | yu2019_pubmed | engine-held-out | 734 | published-human | engine@d6714e6 | rows | 734 |
| causal-register | yu2019_pubmed | engine-held-out | 734 | published-human | engine@d6714e6 | macroF1 | 0.701 |
| causal-register | yu2019_pubmed | engine-held-out | 734 | published-human | engine@d6714e6 | accuracy | 0.753 |
| causal-register | yu2019_pubmed | never-seen | 610 | published-human | engine@d6714e6 | rows | 610 |
| causal-register | yu2019_pubmed | never-seen | 610 | published-human | engine@d6714e6 | macroF1 | 0.689 |
| causal-register | yu2019_pubmed | never-seen | 610 | published-human | engine@d6714e6 | accuracy | 0.746 |
| causal-register | yu2019_pubmed | never-seen | 610 | published-human | engine@d6714e6 | perClassF1Order | `["none","correlational","direct-causal","conditional-causal"]` |
| causal-register | yu2019_pubmed | model-eligible | 3045 | published-human | yu2019-causal@84abecc | macroF1 | 0.873 |
| causal-register | yu2019_pubmed | model-eligible | 3045 | published-human | engine@d6714e6 | macroF1 | 0.708 |
| causal-register | yu2020_eureka | all | 2073 | published-human | engine@d6714e6 | rows | 2073 |
| causal-register | yu2020_eureka | all | 2073 | published-human | engine@d6714e6 | macroF1 | 0.626 |
| causal-register | yu2020_eureka | all | 2073 | published-human | engine@d6714e6 | accuracy | 0.63 |
| causal-register | yu2020_eureka | bundle-test | 193 | published-human | engine@d6714e6 | rows | 193 |
| causal-register | yu2020_eureka | bundle-test | 193 | published-human | engine@d6714e6 | macroF1 | 0.624 |
| causal-register | yu2020_eureka | bundle-test | 193 | published-human | engine@d6714e6 | accuracy | 0.632 |
| causal-register | yu2020_eureka | model-eligible | 2073 | published-human | yu2019-causal@84abecc | macroF1 | 0.831 |
| causal-register | yu2020_eureka | model-eligible | 2073 | published-human | engine@d6714e6 | macroF1 | 0.626 |
| certainty | pei2021 | all | 1551 | published-human | engine@d6714e6 | rows | 1551 |
| certainty | pei2021 | all | 1551 | published-human | engine@d6714e6 | spearman | 0.599 |
| certainty | pei2021 | all | 1551 | published-human | engine@d6714e6 | measuredShare | 0.647 |
| certainty | pei2021 | all | 1551 | published-human | engine@d6714e6 | tierCounts | `{"hedged":498,"measured":1004,"assertive":36,"absolute":13}` |
| certainty | pei2021 | bundle-test | 164 | published-human | engine@d6714e6 | rows | 164 |
| certainty | pei2021 | bundle-test | 164 | published-human | engine@d6714e6 | spearman | 0.558 |
| certainty | pei2021 | bundle-test | 164 | published-human | engine@d6714e6 | measuredShare | 0.634 |
| certainty | pei2021 | bundle-test | 164 | published-human | engine@d6714e6 | tierCounts | `{"hedged":53,"measured":104,"assertive":5,"absolute":2}` |
| certainty | pei2021 | model-eligible | 331 | published-human | certainty-estimator-sentence@97a130c | spearman | 0.616 |
| certainty | pei2021 | model-eligible | 331 | published-human | engine@d6714e6 | spearman | 0.635 |
| restatement-gap | wright2021_pairs | all | 663 | published-human | engine@d6714e6 | rows | 663 |
| restatement-gap | wright2021_pairs | all | 663 | published-human | engine@d6714e6 | agreement | 0.511 |
| restatement-gap | wright2021_pairs | all | 663 | published-human | engine@d6714e6 | macroF1 | 0.454 |
| restatement-gap | wright2021_pairs | all | 663 | published-human | engine@d6714e6 | abstractStrengthAccuracy | 0.59 |
| restatement-gap | wright2021_pairs | all | 663 | published-human | engine@d6714e6 | pressStrengthAccuracy | 0.504 |
| restatement-gap | wright2021_pairs | bundle-test | 50 | published-human | engine@d6714e6 | rows | 50 |
| restatement-gap | wright2021_pairs | bundle-test | 50 | published-human | engine@d6714e6 | agreement | 0.54 |
| restatement-gap | wright2021_pairs | bundle-test | 50 | published-human | engine@d6714e6 | macroF1 | 0.483 |
| restatement-gap | wright2021_pairs | bundle-test | 50 | published-human | engine@d6714e6 | abstractStrengthAccuracy | 0.6 |
| restatement-gap | wright2021_pairs | bundle-test | 50 | published-human | engine@d6714e6 | pressStrengthAccuracy | 0.42 |
| causal-sentence | cessc_ssc | all | 1058 | published-human | engine@d6714e6 | rows | 1058 |
| causal-sentence | cessc_ssc | all | 1058 | published-human | engine@d6714e6 | precision | 0.772 |
| causal-sentence | cessc_ssc | all | 1058 | published-human | engine@d6714e6 | recall | 0.473 |
| causal-sentence | cessc_ssc | all | 1058 | published-human | engine@d6714e6 | counts | `{"tp":250,"fp":74,"fn":279,"tn":455}` |
| causal-sentence | cessc_ssc | all | 1058 | published-human | engine@d6714e6 | precision (wide: + correlational) | 0.714 |
| causal-sentence | cessc_ssc | all | 1058 | published-human | engine@d6714e6 | recall (wide: + correlational) | 0.656 |
| causal-sentence | cessc_ssc | bundle-test | 117 | published-human | engine@d6714e6 | rows | 117 |
| causal-sentence | cessc_ssc | bundle-test | 117 | published-human | engine@d6714e6 | precision | 0.795 |
| causal-sentence | cessc_ssc | bundle-test | 117 | published-human | engine@d6714e6 | recall | 0.554 |
| causal-sentence | cessc_ssc | bundle-test | 117 | published-human | engine@d6714e6 | counts | `{"tp":31,"fp":8,"fn":25,"tn":53}` |
| causal-sentence | cessc_ssc | bundle-test | 117 | published-human | engine@d6714e6 | precision (wide: + correlational) | 0.731 |
| causal-sentence | cessc_ssc | bundle-test | 117 | published-human | engine@d6714e6 | recall (wide: + correlational) | 0.679 |
| causal-sentence | cessc_ssc | model-eligible | 246 | published-human | cessc@42819b2 | f1 | 0.89 |
| causal-sentence | cessc_ssc | model-eligible | 246 | published-human | engine@d6714e6 | f1 | 0.508 |
| causal-sentence | cessc_ssc | model-eligible | 1058 | published-human | unicausal-seq@96ed92b | f1 | 0.609 |
| causal-sentence | cessc_ssc | model-eligible | 1058 | published-human | engine@d6714e6 | f1 | 0.586 |
| causal-sentence | cessc_ssc | model-eligible | 1058 | published-human | unicausal-seq-released@96ed92b | f1 | 0.705 |
| causal-sentence | cessc_ssc | model-eligible | 1058 | published-human | engine@d6714e6 | f1 | 0.586 |

Self-check: 112 metrics, 0 without source, split, rows and label tier.
