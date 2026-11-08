# Benchmark — engine ba7854a

Generated 2026-11-08 by `node checks/benchmark.mjs`. Baseline dc34856. Predictions approved 2026-11-07 (`checks/benchmark-predictions.json`).

## Predicted vs. actual

| Check | Source | Split | Rows | Label tier | Metric | Predicted | Actual | Match |
|---|---|---|---|---|---|---|---|---|
| fixture-counts | fixture-a-cadre | fixture | 292 | predicted | claims | 242 (exact) | 242 | yes |
| fixture-counts | fixture-a-cadre | fixture | 242 | predicted | unsupported-assertion | 148 (exact) | 148 | yes |
| fixture-counts | fixture-a-cadre | fixture | 242 | predicted | overconfident | 3 (exact) | 3 | yes |
| fixture-counts | fixture-a-cadre | fixture | 242 | predicted | causal-overreach | 16 (exact) | 16 | yes |
| fixture-counts | fixture-a-cadre | fixture | 242 | predicted | flagRows | 167 (exact) | 167 | yes |
| fixture-counts | fixture-b-pew-report | fixture | 289 | predicted | claims | 231 (exact) | 231 | yes |
| fixture-counts | fixture-b-pew-report | fixture | 231 | predicted | unsupported-assertion | 9 (exact) | 9 | yes |
| fixture-counts | fixture-b-pew-report | fixture | 231 | predicted | overconfident | 0 (exact) | 0 | yes |
| fixture-counts | fixture-b-pew-report | fixture | 231 | predicted | causal-overreach | 3 (exact) | 3 | yes |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 495 | predicted | claims | 300 [180–450] | 378 | yes |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 | predicted | overconfident | 2 [0–5] | 2 | yes |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 | predicted | causal-overreach | 10 [4–25] | 24 | yes |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 | predicted | unsupportedShare | 0.75 [0.65–0.85] | 0.624 | **no** |
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
| causal-register | yu2020_eureka | all | 2073 | published-human | macroF1 | 0.58 [0.5–0.66] | 0.371 | **no** |
| causal-register | yu2020_eureka | all | 2073 | published-human | accuracy | 0.65 [0.57–0.72] | 0.331 | **no** |
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

## Fixtures

| Fixture | Standard | Rubric | Posture | Units (on a page) | Claims | Unsupported | Overconfident | Causal overreach | Score | Signals |
|---|---|---|---|---|---|---|---|---|---|---|
| fixture-a-cadre | corporate | hybrid:firm-research | research-like | 292 (282) | 242 | 148 | 3 | 16 | 1 | register-mismatch, undisclosed-interest |
| fixture-b-pew-report | research | research | standard | 289 (289) | 231 | 9 | 0 | 3 | 7.3 | limitations-absent, completeness-gaps |
| fixture-c-gensler-fandom-2026 | corporate | hybrid:firm-research | press-release | 495 (495) | 378 | 236 | 2 | 24 | 1 | register-mismatch, completeness-gaps, limitations-absent, undisclosed-interest |

## All metrics

| Check | Source | Split | Rows | Label tier | System | Metric | Value |
|---|---|---|---|---|---|---|---|
| fixture-counts | fixture-a-cadre | fixture | 292 | predicted | engine@ba7854a | claims | 242 |
| fixture-counts | fixture-a-cadre | fixture | 242 | predicted | engine@ba7854a | unsupported-assertion | 148 |
| fixture-counts | fixture-a-cadre | fixture | 242 | predicted | engine@ba7854a | overconfident | 3 |
| fixture-counts | fixture-a-cadre | fixture | 242 | predicted | engine@ba7854a | causal-overreach | 16 |
| fixture-counts | fixture-a-cadre | fixture | 242 | predicted | engine@ba7854a | flagRows | 167 |
| fixture-counts | fixture-a-cadre | fixture | 242 | predicted | engine@ba7854a | unsupportedShare | 0.612 |
| fixture-review | fixture-a-cadre | fixture | 0 | gold | engine@ba7854a | precision:causal-overreach | — |
| fixture-review | fixture-a-cadre | fixture | 0 | gold | engine@ba7854a | precision:overconfident | — |
| fixture-review | fixture-a-cadre | fixture | 0 | gold | engine@ba7854a | precision:unsupported-assertion | — |
| fixture-review | fixture-a-cadre | fixture-sample | 0 | gold | engine@ba7854a | missRate | — |
| fixture-review | fixture-a-cadre | fixture | 0 | gold | engine@ba7854a | nonClaimLeakage | — |
| fixture-counts | fixture-b-pew-report | fixture | 289 | predicted | engine@ba7854a | claims | 231 |
| fixture-counts | fixture-b-pew-report | fixture | 231 | predicted | engine@ba7854a | unsupported-assertion | 9 |
| fixture-counts | fixture-b-pew-report | fixture | 231 | predicted | engine@ba7854a | overconfident | 0 |
| fixture-counts | fixture-b-pew-report | fixture | 231 | predicted | engine@ba7854a | causal-overreach | 3 |
| fixture-counts | fixture-b-pew-report | fixture | 231 | predicted | engine@ba7854a | flagRows | 12 |
| fixture-counts | fixture-b-pew-report | fixture | 231 | predicted | engine@ba7854a | unsupportedShare | 0.039 |
| fixture-review | fixture-b-pew-report | fixture | 0 | gold | engine@ba7854a | precision:causal-overreach | — |
| fixture-review | fixture-b-pew-report | fixture | 0 | gold | engine@ba7854a | precision:unsupported-assertion | — |
| fixture-review | fixture-b-pew-report | fixture-sample | 0 | gold | engine@ba7854a | missRate | — |
| fixture-review | fixture-b-pew-report | fixture | 0 | gold | engine@ba7854a | nonClaimLeakage | — |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 495 | predicted | engine@ba7854a | claims | 378 |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 | predicted | engine@ba7854a | unsupported-assertion | 236 |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 | predicted | engine@ba7854a | overconfident | 2 |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 | predicted | engine@ba7854a | causal-overreach | 24 |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 | predicted | engine@ba7854a | flagRows | 262 |
| fixture-counts | fixture-c-gensler-fandom-2026 | fixture | 378 | predicted | engine@ba7854a | unsupportedShare | 0.624 |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | 0 | gold | engine@ba7854a | precision:causal-overreach | — |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | 0 | gold | engine@ba7854a | precision:overconfident | — |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | 0 | gold | engine@ba7854a | precision:unsupported-assertion | — |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture-sample | 0 | gold | engine@ba7854a | missRate | — |
| fixture-review | fixture-c-gensler-fandom-2026 | fixture | 0 | gold | engine@ba7854a | nonClaimLeakage | — |
| causal-register | yu2019_pubmed | all | 3051 | published-human | engine@ba7854a | rows | 3051 |
| causal-register | yu2019_pubmed | all | 3051 | published-human | engine@ba7854a | macroF1 | 0.708 |
| causal-register | yu2019_pubmed | all | 3051 | published-human | engine@ba7854a | accuracy | 0.758 |
| causal-register | yu2019_pubmed | bundle-test | 342 | published-human | engine@ba7854a | rows | 342 |
| causal-register | yu2019_pubmed | bundle-test | 342 | published-human | engine@ba7854a | macroF1 | 0.681 |
| causal-register | yu2019_pubmed | bundle-test | 342 | published-human | engine@ba7854a | accuracy | 0.722 |
| causal-register | yu2019_pubmed | engine-tuning | 1707 | published-human | engine@ba7854a | rows | 1707 |
| causal-register | yu2019_pubmed | engine-tuning | 1707 | published-human | engine@ba7854a | macroF1 | 0.717 |
| causal-register | yu2019_pubmed | engine-tuning | 1707 | published-human | engine@ba7854a | accuracy | 0.764 |
| causal-register | yu2019_pubmed | engine-held-out | 734 | published-human | engine@ba7854a | rows | 734 |
| causal-register | yu2019_pubmed | engine-held-out | 734 | published-human | engine@ba7854a | macroF1 | 0.701 |
| causal-register | yu2019_pubmed | engine-held-out | 734 | published-human | engine@ba7854a | accuracy | 0.753 |
| causal-register | yu2019_pubmed | never-seen | 610 | published-human | engine@ba7854a | rows | 610 |
| causal-register | yu2019_pubmed | never-seen | 610 | published-human | engine@ba7854a | macroF1 | 0.689 |
| causal-register | yu2019_pubmed | never-seen | 610 | published-human | engine@ba7854a | accuracy | 0.746 |
| causal-register | yu2019_pubmed | never-seen | 610 | published-human | engine@ba7854a | perClassF1Order | `["none","correlational","direct-causal","conditional-causal"]` |
| causal-register | yu2020_eureka | all | 2073 | published-human | engine@ba7854a | rows | 2073 |
| causal-register | yu2020_eureka | all | 2073 | published-human | engine@ba7854a | macroF1 | 0.371 |
| causal-register | yu2020_eureka | all | 2073 | published-human | engine@ba7854a | accuracy | 0.331 |
| causal-register | yu2020_eureka | bundle-test | 193 | published-human | engine@ba7854a | rows | 193 |
| causal-register | yu2020_eureka | bundle-test | 193 | published-human | engine@ba7854a | macroF1 | 0.349 |
| causal-register | yu2020_eureka | bundle-test | 193 | published-human | engine@ba7854a | accuracy | 0.301 |
| certainty | pei2021 | all | 1551 | published-human | engine@ba7854a | rows | 1551 |
| certainty | pei2021 | all | 1551 | published-human | engine@ba7854a | spearman | 0.599 |
| certainty | pei2021 | all | 1551 | published-human | engine@ba7854a | measuredShare | 0.647 |
| certainty | pei2021 | all | 1551 | published-human | engine@ba7854a | tierCounts | `{"hedged":498,"measured":1004,"assertive":36,"absolute":13}` |
| certainty | pei2021 | bundle-test | 164 | published-human | engine@ba7854a | rows | 164 |
| certainty | pei2021 | bundle-test | 164 | published-human | engine@ba7854a | spearman | 0.558 |
| certainty | pei2021 | bundle-test | 164 | published-human | engine@ba7854a | measuredShare | 0.634 |
| certainty | pei2021 | bundle-test | 164 | published-human | engine@ba7854a | tierCounts | `{"hedged":53,"measured":104,"assertive":5,"absolute":2}` |
| restatement-gap | wright2021_pairs | all | 663 | published-human | engine@ba7854a | rows | 663 |
| restatement-gap | wright2021_pairs | all | 663 | published-human | engine@ba7854a | agreement | 0.511 |
| restatement-gap | wright2021_pairs | all | 663 | published-human | engine@ba7854a | macroF1 | 0.454 |
| restatement-gap | wright2021_pairs | all | 663 | published-human | engine@ba7854a | abstractStrengthAccuracy | 0.59 |
| restatement-gap | wright2021_pairs | all | 663 | published-human | engine@ba7854a | pressStrengthAccuracy | 0.504 |
| restatement-gap | wright2021_pairs | bundle-test | 50 | published-human | engine@ba7854a | rows | 50 |
| restatement-gap | wright2021_pairs | bundle-test | 50 | published-human | engine@ba7854a | agreement | 0.54 |
| restatement-gap | wright2021_pairs | bundle-test | 50 | published-human | engine@ba7854a | macroF1 | 0.483 |
| restatement-gap | wright2021_pairs | bundle-test | 50 | published-human | engine@ba7854a | abstractStrengthAccuracy | 0.6 |
| restatement-gap | wright2021_pairs | bundle-test | 50 | published-human | engine@ba7854a | pressStrengthAccuracy | 0.42 |
| causal-sentence | cessc_ssc | all | 1058 | published-human | engine@ba7854a | rows | 1058 |
| causal-sentence | cessc_ssc | all | 1058 | published-human | engine@ba7854a | precision | 0.772 |
| causal-sentence | cessc_ssc | all | 1058 | published-human | engine@ba7854a | recall | 0.473 |
| causal-sentence | cessc_ssc | all | 1058 | published-human | engine@ba7854a | counts | `{"tp":250,"fp":74,"fn":279,"tn":455}` |
| causal-sentence | cessc_ssc | all | 1058 | published-human | engine@ba7854a | precision (wide: + correlational) | 0.714 |
| causal-sentence | cessc_ssc | all | 1058 | published-human | engine@ba7854a | recall (wide: + correlational) | 0.656 |
| causal-sentence | cessc_ssc | bundle-test | 117 | published-human | engine@ba7854a | rows | 117 |
| causal-sentence | cessc_ssc | bundle-test | 117 | published-human | engine@ba7854a | precision | 0.795 |
| causal-sentence | cessc_ssc | bundle-test | 117 | published-human | engine@ba7854a | recall | 0.554 |
| causal-sentence | cessc_ssc | bundle-test | 117 | published-human | engine@ba7854a | counts | `{"tp":31,"fp":8,"fn":25,"tn":53}` |
| causal-sentence | cessc_ssc | bundle-test | 117 | published-human | engine@ba7854a | precision (wide: + correlational) | 0.731 |
| causal-sentence | cessc_ssc | bundle-test | 117 | published-human | engine@ba7854a | recall (wide: + correlational) | 0.679 |

Self-check: 100 metrics, 0 without source, split, rows and label tier.
