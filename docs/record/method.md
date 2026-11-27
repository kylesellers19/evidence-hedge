# The Record: methods

Each method below goes past a descriptive count only because a count failed in a way
the earlier simulation exposed. For each: the weakness it fixes, what it does, the
citation, what it assumes, how it fails, and its state on the first map (digital tools
and data, map build 19ad617a8af2, engine 90fa8b3, window 2023-01-01 to 2026-11-26).
Code: research repo `record/`. Every constant is in `record/config.py`, PROVISIONAL.

## 1. Small counts: hierarchical beta-binomial with partial pooling

- **Weakness.** One-document organizations topped every raw ranking: 3 of 3 beats 40 of 50.
- **Method.** Each organization's rate p_i ~ Beta(μκ, (1−μ)κ), k_i ~ Binomial(n_i, p_i).
  The hyperparameters' posterior is computed on a 160 × 160 grid (μ uniform; log κ
  uniform on [log 0.1, log 10,000]) and integrated over; each organization's value is
  the median of 4,000 seeded posterior draws, with an equal-tailed 95% interval. This
  replaces minimum-count cutoffs.
- **Deviation from the spec's wording.** The spec says empirical Bayes. The plug-in
  version (hyperparameters fixed at their maximum) was built first and collapsed when
  every count was zero (cited by later work: every organization 0, prior a = b = 0, so
  every interval was 0 to 0). Integrating over the hyperparameters is the standard
  repair and keeps the uncertainty the plug-in drops.
- **Citations.** Gelman et al., *Bayesian Data Analysis*, 3rd ed., §5.3; Efron and Morris,
  JASA 1975.
- **Assumes.** Organizations' rates are exchangeable draws from one beta distribution.
- **Fails when.** One organization is unlike the rest (it is pulled toward them); the
  grid's bounds bind (κ at 10,000 means near-complete pooling).

## 2. Shares of a total: Dirichlet-multinomial

- **Weakness.** A share's raw value has no interval.
- **Method.** Shares of new findings and of coverage: Dirichlet(½ + k) over organizations,
  marginal Beta per organization; "coverage minus contribution" is the difference of
  independent posterior draws, in points.
- **Assumes.** Counts are independent multinomial draws. Findings within one document are
  not independent, so the intervals are too narrow for organizations with few, long
  documents.

## 3. Incomplete denominators: multi-list capture-recapture

- **Weakness.** "Found in the sources searched" is not a denominator.
- **Method.** Each independent article's capture history (which discovery sources found
  it); Poisson log-linear models (independence plus each pairwise dependence) chosen by
  AIC; the unseen cell is exp(intercept); 500-draw parametric bootstrap interval. Two
  lists fall back to Chapman's estimator with Chao's log-normal interval.
- **Citations.** Fienberg, Biometrika 1972; International Working Group for Disease
  Monitoring and Forecasting, Am J Epidemiol 1995; Chapman 1951; Chao 1987.
- **Assumes.** A closed population; every article catchable by every list; with two lists,
  independence.
- **Fails when.** Lists index the same outlets (positive dependence, total too small); one
  list only (nothing to say). Gate 1 ran one source with results (Infini-News), so the
  coverage share is over what was found, and the page says so.
- **Earlier literature.** The same method on two lists of earlier works (the map's 54
  pre-window documents; 485 works its documents cite from before the window) found no
  work on both lists: the estimate (about 26,700) has no upper bound worth stating, and
  most cited works are off the question. It is not used. "First" verdicts rest on the
  map's depth in years instead.

## 4. Novelty beyond exact matches: novelty, transience, resonance

- **Weakness.** Exact matching says whether a sentence was said before, not whether a
  document moved the conversation.
- **Method.** Each document's distribution over the 19 sub-questions (claims per
  sub-question + ½, normalized), in time order. Novelty = mean KL divergence from the 5
  documents before; transience = from the 5 after; resonance = novelty − transience,
  shown as "staying power". Organizations' means pooled normal-normal (DerSimonian-Laird τ²).
- **Citation.** Barron, Huang, Spang and DeDeo, PNAS 2018. Labeled staying power because
  later work renamed resonance to avoid implying cause.
- **Assumes.** Sub-question mixes describe content; dates are right.
- **Fails when.** The newest 5 documents have no successors (no value); a poor grouping
  moves every value; same-day documents are ordered by ID.
- **First map.** Organizations barely differ once pooled (τ² near 0.002).

## 4b. Robustness of new findings

- **Threshold sensitivity** (`record/sensitivity.py`): with the matcher's two thresholds
  half a point looser (3.0/3.5) 69% of window findings are new; as used (3.5/4.0) 92%;
  half a point stricter (4.0/4.5) 98%. Organizations' shares keep their order (Spearman
  0.99 and 1.00) and move at most 4.7 points.
- **Sub-question mix** (Simpson's paradox): standardizing each organization's rate of new
  findings to the map's sub-question mix reorders them (rank correlation 0.63; 9 of 45
  pairs swap). The page compares shares of the record's new findings, not rates.

## 5. Disruption: the CD index

- **Method.** CD = mean over later documents citing the focal document or its references
  of (−2·f·b + f) (Funk and Owen-Smith, Management Science 2017; Park, Leahey and Funk,
  Nature 2023), where a document has at least 5 citing documents.
- **First map.** No document reaches 5. Not shown.

## 6. Missing and selective citation

- **Method.** For each document, rank the earlier documents it would be expected to cite:
  pointwise logistic ranker on bibliographic coupling, co-citation, embedding similarity,
  same organization and years apart, trained on citations before the window and
  validated after it (AUC, NDCG@10). "Expected but uncited" = above the median score of
  real citations. Each finding's direction against its sub-question's medoid finding
  (cross-encoder/nli-roberta-base 1be0567: entailment supports, contradiction contradicts,
  else null at 0.5), and a 10,000-draw permutation test of whether expected-but-uncited
  documents lean contrary, permuting within citing document. Reports the pattern,
  never intent.
- **First map.** Needs 30 cross-organization citations in each period; there are 0.
  Neither the ranker nor the stance test runs.

## 7. Authority without evidence

- **Method.** Claim-specific citation networks (Greenberg, BMJ 2009): every path along
  citations from a citing document to a terminal one; the share ending in a document
  with its own data (survey, trial, experiment, telemetry, administrative data); and
  documents cited at least twice that hold no data of their own.
- **First map.** 12 paths, all inside one organization's series. With no citation
  between organizations there is no network to judge.

## 8. Open ground: negative binomial residuals and change points

- **Weakness.** Articles per document is unstable near zero.
- **Method.** Demand: each sub-question's three label terms counted in CC-NEWS by
  Infini-News (exact phrase, lower and capitalized forms), by year; exposure: the count
  of "according to". NB2 regression of demand on log(1 + documents published) with year
  effects and log exposure, 2017 to 2025 (full crawl years). Demand gap = mean Pearson
  residual over the window's full years; interval from 200 parametric-bootstrap refits.
  Saturation: binary-segmentation change points (Poisson likelihood, BIC penalty) on
  exposure-scaled demand; the last change after which demand stops rising.
- **Reading the sign.** The spec asks for a model "of documents against news demand"
  with under-supply as large positive residuals. Positive residuals mean under-supply
  only when demand is the response, so demand is the response here.
- **Citation.** Cameron and Trivedi, *Regression Analysis of Count Data*, 2nd ed.
- **Fails when.** Label words are common English (they count unrelated news); CC-NEWS
  under-holds trade press; nine years is a short series.

## 9. Coverage dynamics: Hawkes process, Kaplan-Meier and Cox

- **Hawkes.** Exponential-kernel self-exciting point process on each report's independent
  article dates, maximum likelihood (Ozaki 1979); branching ratio as organic share. Needs
  20 articles for one report. Gate 1 found none near that.
- **Half-life.** For each finding later restated (the matcher above), time from first
  statement to last restatement; censored when the last restatement falls within a year
  of the window's end. Kaplan-Meier median about 1.1 years over 155 findings. Cox
  proportional hazards, flagged vs not: hazard ratio 0.79 (95% interval 0.57 to 1.10),
  no clear difference. Many restatements are annual editions repeating themselves, so
  the curve is lumpy at one year. lifelines 0.30.0.

## 10. Is overreach rewarded

Written before any outcome: `docs/record/analysis_plan.md`. Conditional logit with
report fixed effects; double machine learning; causal forest by outlet type; E-values.
Minimums: 60 repeated claims in 20 reports. The map has 0. Nothing is estimated.

## 11. Comparison with AI research assistants

`record/assistants.py`: 50 questions from the sub-questions by one fixed template;
scores for organizations found, findings stated correctly (the matcher), a denominator
given and gated reports found; stability across five reruns (Krippendorff's alpha);
question difficulty and system ability by two-parameter item response theory. Not run:
no assistant key is configured, and nothing would be published before Kyle labels the
census.

## Byte-for-byte replay

Every model call is cached by a SHA-256 of its inputs, model and revision; GROBID TEI
by PDF hash; web responses as WARC records. `RECORD_OFFLINE=1` makes any cache miss
fail. Replay check: see `SESSION_LOG.md`.
