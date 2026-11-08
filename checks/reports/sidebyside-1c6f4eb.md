# Published models beside the engine — engine 1c6f4eb

Change set 2, app side. Predictions: `checks/cs2-predictions.json` (commit 6c16743, before this run).
Numbers from `checks/reports/benchmark-1c6f4eb.json` and `checks/reports/pairs-1c6f4eb.json`.
Prediction files: research repo `evidence-hedge-research` b5f4216, copied to `checks/data/predictions/`.
Every row a model trained on is dropped first (`checks/lib/predictions.mjs`); both systems are scored on the same rows.
Label tier of the gold labels: published-human. Every model and engine value: predicted.

## Fixes made before the run

1. **yu2020_eureka decoding.** Eureka is decoded by the encoding the bundle declares (`labels.encoding: yu2020-ordinal`) and no longer assumed to share yu2019's codes. Before the fix, 1 (correlational) and 3 (direct causal) were swapped. Engine on Eureka, all 2,073 rows: macro-F1 0.371 → **0.626**, accuracy 0.331 → **0.630**. Both are now inside the change set 1 predictions (0.58 [0.50–0.66]; 0.65 [0.57–0.72]). No other engine metric changed (104 compared).
2. **`covers()` reads the published split.** It now understands `original-<split>` and `original-aspect-<split>`, and a row with no published split counts as covered.
3. **Label check in `sideBySide()`.** A model is scored only on rows where it supplies the label being compared. Seven model × check combinations had no such label and are left out (listed in the benchmark report).
4. **Pair comparison found no Yu file.** `checks/pair-comparison.mjs` looked for `yu-*`; the file is `yu2019-causal-84abecc.jsonl`.

## Side by side (rows the model never trained on)

| Check | Source | Rows | Model | Model | Engine | Predicted | Match |
|---|---|---|---|---|---|---|---|
| causal register, macro-F1 | yu2019_pubmed | 3,045 | yu2019-causal@84abecc (out-of-fold) | 0.873 | 0.708 | model 0.87 [0.85–0.89], engine 0.71 [0.68–0.73], model > engine | yes |
| causal register, macro-F1 | yu2020_eureka | 2,073 | yu2019-causal@84abecc | 0.831 | 0.626 | model 0.83 [0.81–0.85], model > engine | yes |
| certainty, Spearman | pei2021 (published test + ext) | 331 | certainty-estimator-sentence@97a130c | 0.616 | 0.635 | model 0.67 [0.60–0.74], engine 0.58 [0.50–0.65], model > engine | values yes; **order no**: the engine is 0.019 higher |
| causal sentence, F1 | cessc_ssc (published test) | 246 | cessc@42819b2 | 0.890 | 0.508 | model 0.88 [0.82–0.93], model > engine | yes |
| causal sentence, F1 | cessc_ssc (all) | 1,058 | unicausal-seq@96ed92b (reproduction) | 0.609 | 0.586 | model 0.60 [0.50–0.70], engine 0.60 [0.52–0.68], model > engine | yes |
| causal sentence, F1 | cessc_ssc (all) | 1,058 | unicausal-seq-released@96ed92b | 0.705 | 0.586 | model 0.70 [0.60–0.78], model > engine | yes |

Left out of the comparison:
- certainty-estimator-aspect: gives aspects only, no 1–6 certainty.
- certainty-estimator-sentence and CESSC on the Yu sources: no causal register.
- UnScientify: gives none of the three labels. It is cross-checked on attribution in the research repo instead.

## Press release vs. abstract pairs (`checks/pair-comparison.mjs`)

| Split | Pairs | Engine macro-F1 | Yu model macro-F1 (rows) | Predicted | Match |
|---|---|---|---|---|---|
| Wright & Augenstein's own test split | 563 | 0.450 | 0.577 (562; 1 had no prediction because a side is in yu2019 and was dropped upstream) | Yu 0.55 [0.45–0.65] on 560–563 rows, engine 0.45, Yu > engine | yes |
| bundle test split (regrouped) | 50 | 0.483 | 0.507 (50) | Yu 0.55 [0.40–0.70] on 49–50 rows | yes |

The pair label is the sign of the causal-strength change from the abstract to the press release (`compareClaims`). For both systems it is `same`, `exaggerates` or `downplays` (PROVISIONAL mapping, `checks/lib/mapping.mjs`).

## Mismatches

- pei2021: the engine's four tiers rank-correlate slightly better than certainty-estimator's continuous score (0.635 vs 0.616 Spearman on 331 rows). The model's Pearson r on the same rows is 0.678 (research repo). Spearman on a 4-value engine scale has many ties, so the difference is not evidence that the engine is better.
