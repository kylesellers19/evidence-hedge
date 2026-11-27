# Gate: new findings and the claims behind them

Status: **provisional**. Every "new" or "made earlier" decision waits for Kyle's labels
(`newness-<map>.csv`, 150 decisions, 75 of each, seeded). No precision is claimed.

## The matcher

The propagation engine's matcher, applied between documents instead of between a
report and an article (`record/novelty.py`):

1. Candidates for a finding in a document dated d: the 20 earlier claims nearest it by
   the grouping embedding (MiniLM), plus every earlier claim sharing a distinctive
   anchor. Earlier means dated strictly before d.
2. Each candidate scored with SPICED (copenlu/spiced c32c33a): IMS = 1 + 4 × max(0, cosine).
3. Made earlier if a candidate shares an anchor and has IMS ≥ 3.5 (propagation M2), or
   has IMS ≥ 4.0 without one (M3). Otherwise new.

## Two changes after the first build, before any organization was measured

The first map build (hash 27f0ad30451d) was inspected for what it counted, not for
what any organization scored; no organization-level number had been computed.

| What the first build showed | Change | Constant |
|---|---|---|
| 519 claims were reference-list entries (URLs, "Accessed ..."), grouped into a sub-question of their own | A line with a URL or an access date is a citation, not a claim the document makes; it is left out of the map | `REFERENCE_LINE` |
| 13,804 of the 15,553 judged claims had the engine function "other": descriptions, marketing lines, boilerplate. With them, "new findings" counted length | A finding is a claim the engine reads as a result or a reading of one (own result, interpretation), or any claim with a distinctive numeric anchor | `NEW_CLAIM_FUNCTIONS`, `NEW_ANCHORED` |

The share of findings judged new did not move with the change (95% before and after
restricting functions, measured on the first build), so the change was not chosen for
its effect on that rate.

## What the rate means

About 95% of findings are judged new. The matcher is built for precision: it calls a
finding old only when an earlier document holds a near-paraphrase, or the same figure
with mostly the same information. An idea restated in new words counts as new. So:

- "New findings" measures what an organization added to the written record in its
  own words, weighted by how many result-stating claims it published. It is not a
  measure of originality of ideas, and not of truth.
- The labeling sheet will show how often "new" is wrong (recall of the matcher).

## Ratification table

| Constant | Value | Status |
|---|---|---|
| NEW_IMS | 3.5 (with a shared anchor) | PROVISIONAL |
| NEW_IMS_NO_ANCHOR | 4.0 | PROVISIONAL |
| NEW_CANDIDATES | 20 nearest earlier claims | PROVISIONAL |
| NEW_CLAIM_FUNCTIONS | own-result, interpretation | PROVISIONAL |
| NEW_ANCHORED | yes | PROVISIONAL |
| REFERENCE_LINE | URL, www., Accessed, Retrieved, doi | PROVISIONAL |
| BACKFILL_YEARS | 5 | PROVISIONAL |
| REPORT_WINDOW | 2023-01-01 to 2026-11-26 | PROVISIONAL |
