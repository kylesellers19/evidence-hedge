# The Record: session log

Session of 2026-11-27 (started 01:09 EST), unattended. Spec: "Evidence Hedge: build The
Record, unattended" (pasted by Kyle). If context is compacted, reread this file first.

Worktrees: app `Evidence Hedge/.claude/worktrees/record` (branch `record`), research
`evidence-hedge-research-record/` (branch `record`, pushed; links `data/`, `work/`,
`vendor/`, `envs/*/.venv` to the main research checkout). Baselines: tag
`record-baseline` in both (app aabc47f, research a92fd88).

Preview server for checks: `record-preview` in the main checkout's `.claude/launch.json`
(vite preview of the worktree's `dist/`, port 4174). Browser check:
`node checks/record-browser.mjs http://localhost:4174 docs/record/screens/<short>`.
Rebuild the data: in the research worktree, `envs/record/.venv/bin/python -m record.map`,
then `-m record.analyses`, `PYTHONPATH=. envs/propagation/.venv/bin/python -m record.open_ground`,
then `-m record.export --app <app worktree> [--coverage-tag record-c11]`.

## Done

- Inventory (`INVENTORY.md`), baseline tags, worktrees.
- `envs/record` pinned; models pinned by revision: all-MiniLM-L6-v2 1110a24,
  nli-roberta-base 1be0567 (safetensors only), SPICED c32c33a (already cached).
- Analysis plan for "is overreach rewarded" committed before any outcome (e11aff5).
- Cluster choice. The first rule picked a leftover bin (cluster 4, mean silhouette
  −0.0003); added `CLUSTER_MIN_SILHOUETTE` > 0 before any measure; map = cluster 11
  (digital tools and data, 86 documents, 25 organizations). `gates/map.md`.
- Map built (30639005c5e2): 20,148 claims, 19 sub-questions, 3,738 findings judged,
  3,529 new. Two pre-measure fixes logged in `gates/novelty.md` (reference-list lines
  dropped; a finding is a result-stating claim).
- Citations: GROBID parsed 731 reference-list entries, none resolving to a map document;
  the text channel (firm and title named) found 12, all self-citations of earlier
  editions. No organization cites another's report.
- Rates: hierarchical beta-binomial with hyperparameters integrated over a grid (the
  plug-in empirical Bayes fit collapsed to 0 to 0 when every count was zero).
- Page `/record` (450dfd7): statement table, figure, switch, four views, light and dark;
  `checks/record.test.mjs` and `checks/record-browser.mjs` pass; screens in
  `screens/450dfd7/`.
- Research analyses (`reports/record/analyses-<map>.json`): half-life of restated
  findings (Kaplan-Meier median about 1.1 years; Cox flagged vs not HR 0.79,
  0.57 to 1.10); every citation-network analysis too few; missing literature unbounded.
- AI assistant harness built (`record/assistants.py`, 50 questions); not run: no keys.

## Next

- Open-ground demand counts (running), then rerun Gate 1 for the map (`record-c11`)
  alone against Infini-News.
- Coverage into record.json when Gate 1 finishes; Parts F and G for its links.
- Method write-up, three reviews, merge and deploy.

## Failed

- The widened Gate 1 pilot (`pilot-w`, started by an earlier session) stopped on a GDELT
  429 ("one request every 5 seconds"). Not restarted: not this session's run. The
  spacing fix is on research branch `record` (d6dddcf).
- Gate 1 for the map (`record-c11`) stopped once on an Infini-News 429 ("at most 1 in
  flight per client"), because this session ran the open-ground counts at the same
  time. To rerun alone; responses so far are cached.

## For Kyle

- The propagation spec `claude/evidence-hedge-propagation-engine-prompt.md` is not on
  this machine; Parts were read from the code.
