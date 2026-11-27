# Is overreach rewarded? Analysis plan

Written 2026-11-27, before any pickup outcome was computed for any claim in the map,
and committed before the first coverage join. Any later change is a deviation, logged
in the table at the end with its date and reason. The result is a research finding for
the method view at full-corpus scale. It is never a measure of one organization.

## Question

Within a report, is a claim that says more than its evidence supports more likely to be
repeated in the news than the report's other claims?

## Units and data

- **Unit:** one engine claim (Part A claim table, engine build 90fa8b3), in a report that
  has at least one linked article (propagation tiers L1 or L2).
- **Outcome `picked_up`:** 1 if any linked article holds a sentence aligned to the claim
  at M1 or M2 (propagation Part F), else 0. M3 alignments are excluded from the main
  estimate and used in a sensitivity run.
- **Exposure `overreach`:** 1 if the engine flags the claim `overconfident`, or marks
  `causal_overreach`, else 0. Taken as the engine gives it; no re-reading.
- **Covariates (pre-specified):** the claim has a numeric anchor; the claim's function
  (own result, interpretation, other); certainty tier; claim length in words (log);
  position (share of the way through the document); front matter or not; matchability.

## Main estimate

Conditional logistic regression of `picked_up` on `overreach` and the covariates,
grouped by report (report fixed effects). Conditioning on the report removes everything
a report shares: the firm's prominence, its press push, the topic's news value, the
season. The estimate is the within-report odds ratio with a 95% Wald interval and a
two-sided test at 0.05. Software: statsmodels 0.15.0 `ConditionalLogit`.

Reports where every claim has the same outcome add nothing to the conditional
likelihood and drop out; their number is reported.

## Checks of the main estimate

1. **Double machine learning** (Chernozhukov et al. 2018). Partially linear model with
   report-level covariates and the claim covariates. Outcome and exposure models are
   gradient-boosted trees (scikit-learn 1.9.1, `HistGradientBoostingClassifier`,
   default settings, seed 20261127), five-fold cross-fitting grouped by report, so no
   report is in its own training fold. Reported: the average effect on the probability
   of pickup, with its standard error.
2. **Causal forest** (Wager and Athey 2018), exploratory only: how the effect varies by
   outlet type (wire, general news, trade, aggregator), from the outlet field of each
   linked article. Reported as a table of conditional effects with intervals. No
   heterogeneity claim is made unless the omnibus calibration test passes.
3. **E-value** (VanderWeele and Ding 2017) for the main odds ratio and for its interval
   bound nearest 1. If pickup is common (over 15% of claims), the odds ratio is first
   converted to a risk ratio by the square-root rule.
4. **Sensitivity:** M3 alignments counted as pickups; L3 links excluded throughout;
   reports with a press release found (Part B) analyzed apart.

## When nothing is reported

The analysis runs only when all of these hold. Below them the method view says "too few
to estimate" and shows the counts.

- at least 60 picked-up claims;
- in at least 20 reports with both outcomes present;
- at least 30 overreaching claims in those reports;
- every input tier (L1, L2, M1, M2) has passed its precision gate.

The pilot cannot meet these: Gate 1 found 5 L1 links and no L2. The code is written,
tested on the corpus's real claims, and run as a dry run that reports its counts only.

## What would change the reading

- An odds ratio above 1 with an interval excluding 1 and an E-value above 2 would be
  read as "overreaching claims are repeated more, and only a strong unmeasured cause
  could explain it away." Not as proof that overreach causes pickup.
- An interval spanning 1: no evidence either way at this scale.
- Disagreement between the conditional logit and double machine learning in sign: both
  reported, no headline.

## Threats named in advance

- **Matcher error.** Missed alignments are not random: a paraphrase that drops a hedge
  may still align, while a garbled number may not. Precision is gated; recall is not,
  so a lower recall for one kind of claim biases the estimate.
- **Selection of linked reports.** Only reports with coverage enter. The estimate is
  conditional on a report being covered at all.
- **Exposure is the engine's flag.** Flag error flows into the estimate. The engine's
  flag rate is high (most claims carry `unsupported-assertion`), so `overreach` uses only
  the two narrow flags.

## Deviations

| Date | Change | Reason |
|---|---|---|
| (none) | | |
