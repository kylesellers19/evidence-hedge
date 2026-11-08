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

