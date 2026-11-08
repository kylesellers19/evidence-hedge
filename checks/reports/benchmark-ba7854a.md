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

## Checks not run

- **yu2019_pubmed**: skip — checks/data/foundations-v2/unified_eval.jsonl absent
- **yu2020_eureka**: skip — checks/data/foundations-v2/unified_eval.jsonl absent
- **pei2021**: skip — checks/data/foundations-v2/unified_eval.jsonl absent
- **wright2021_pairs**: skip — checks/data/foundations-v2/unified_eval.jsonl absent
- **cessc_ssc**: skip — checks/data/foundations-v2/unified_eval.jsonl absent
- **spiced**: skip — copenlu/spiced not downloaded (expected at checks/data/spiced/)

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

Self-check: 32 metrics, 0 without source, split, rows and label tier.
