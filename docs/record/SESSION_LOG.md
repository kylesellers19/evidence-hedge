# The Record: session log

Session of 2026-11-27, unattended. Spec: "Evidence Hedge: build The Record, unattended"
(pasted by Kyle). If context is compacted, reread this file first.

Worktrees: app `Evidence Hedge/.claude/worktrees/record` (branch `record`), research
`evidence-hedge-research-record/` (branch `record`, pushed; links `data/`, `work/`,
`vendor/`, `envs/*/.venv` to the main research checkout). Baselines: tag
`record-baseline` in both (app aabc47f, research a92fd88).

Background jobs to check: map build (`work/record/map.log`), Gate 1 run for the map
(`work/propagation/logs/record-c11.log`, tag `record-c11`), GROBID on 127.0.0.1:8070
(`work/record/grobid.log`).

## Done

- 01:10 Inventory (`INVENTORY.md`), baseline tags, worktrees.
- 01:40 `envs/record` pinned; models pinned by revision: all-MiniLM-L6-v2 1110a24,
  nli-roberta-base 1be0567 (safetensors only), SPICED c32c33a (already cached).
- 01:55 Analysis plan for "is overreach rewarded" committed before any outcome (e11aff5).
- 02:20 Cluster choice. First rule picked a leftover bin (cluster 4, mean silhouette
  −0.0003); added `CLUSTER_MIN_SILHOUETTE` > 0 before any measure; map = cluster 11
  (digital tools and data, 86 documents, 25 organizations). `gates/map.md`.
- 02:45 Research commits d6dddcf (GDELT 5-second spacing), 68bee53 (record/ package),
  f363b4a (predictions for the map's 30 in-window reports), all pushed.
- 02:50 Gate 1 discovery started for the map's 30 in-window reports (`record-c11`).

## Next

- Map build finishes → measures and record.json → page checks with Playwright.

## Failed

- The widened Gate 1 pilot (`pilot-w`, started by an earlier session at 23:55 Nov. 26)
  stopped on a GDELT 429 ("one request every 5 seconds"). Not restarted: it is not this
  session's run. The spacing fix is on research branch `record` (d6dddcf); Kyle can
  rerun pilot-w from there.

## For Kyle

- The propagation spec `claude/evidence-hedge-propagation-engine-prompt.md` is not on
  this machine; Parts were read from the code.
