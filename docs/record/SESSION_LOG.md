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
Rebuild the data, in the research worktree:
`envs/record/.venv/bin/python -m record.map`, `-m record.analyses`,
`-m record.sensitivity`, `PYTHONPATH=. envs/propagation/.venv/bin/python -m record.open_ground`,
then `envs/record/.venv/bin/python -m record.export --app <app worktree> [--coverage-tag record-c11]`.

**Shared services.** The propagation session ("Evidence Hedge claim propagation engine")
runs Gate 1 from the main research checkout. Infini-News allows one request in flight
per client and archive.org about 15 a minute: never run two Infini-News jobs at once;
message that session before and after each run.

## Done

- 01:10 Inventory (`INVENTORY.md`), baseline tags, worktrees.
- 01:20 `envs/record` pinned; models pinned by revision: all-MiniLM-L6-v2 1110a24,
  nli-roberta-base 1be0567 (safetensors only), SPICED c32c33a (already cached).
- 01:30 Analysis plan for "is overreach rewarded" committed before any outcome (e11aff5).
- 01:35 Cluster choice. The first rule picked a leftover bin (cluster 4, mean silhouette
  −0.0003); added `CLUSTER_MIN_SILHOUETTE` > 0 before any measure; map = cluster 11
  (digital tools and data, 86 documents, 25 organizations). `gates/map.md`.
- 01:50 Map built; two pre-measure fixes (reference-list lines dropped; a finding is a
  result-stating claim), `gates/novelty.md`.
- 01:55 Citations: GROBID parsed 731 reference-list entries, none resolving to a map
  document; the text channel found 12, all self-citations. `gates/citations.md`.
- 02:00 Rates: hierarchical beta-binomial with hyperparameters integrated over a grid (the
  plug-in empirical Bayes fit collapsed when every count was zero).
- 02:05 Page `/record` (450dfd7); `checks/record.test.mjs`, `checks/record-browser.mjs`.
- 02:12 First deploy: main fast-forwarded to fc48893 (no force); Pages run 45956792897
  passed; live `/record` passes the browser check (`screens/live-fc48893/`); the other
  pages load with no errors (`checks/site-smoke.mjs`). The main checkout's local `main`
  was left at aabc47f (another session uses that checkout).
- 02:20 Three reviews (`reviews/`) and their fixes: sub-question membership needs a tenth
  of a document's claims (map 19ad617a8af2), label words of three letters or more,
  citation bases in possible citations, `<0.1%`, selector shows documents, robustness
  notes (threshold sensitivity: ranks stable, Spearman ≥ 0.99; sub-question
  standardization: 9 of 45 pairs swap).
- 02:30 `gates/ratification.md` generated from the code: 42 constants, all PROVISIONAL.
- 02:35 Offline replay (`RECORD_OFFLINE=1` map, analyses, export) byte-identical on map
  19ad617a8af2: 8 files. Not tested: a cold rerun that recomputes embeddings.
- Research analyses (`reports/record/analyses-<map>.json`): half-life of restated findings
  (Kaplan-Meier median 1.1 years; Cox flagged vs not HR 0.79, 0.57 to 1.10); every
  citation-network method too few; missing earlier literature unbounded.
- AI assistant harness built (`record/assistants.py`, 50 questions); not run: no keys.

## Next

- Gate 1 for the map (`record-c11`, started 02:25): when it exits, message the
  propagation session; export with `--coverage-tag record-c11` (coverage, pickups by
  Parts F and G, Hawkes, overreach dry run); then recount open-ground demand for map
  19ad617a8af2's labels (Infini-News, alone); export; browser check; final merge.

## Failed

- The widened Gate 1 pilot (`pilot-w`, the propagation session's run) stopped on a GDELT
  429; that session fixed the spacing and restarted it at 02:05. Its fixes are on
  research `record` too (cherry-picked).
- `record-c11` stopped once (01:53) on an Infini-News 429 ("at most 1 in flight per
  client") because this session ran the open-ground counts at the same time. Rerun alone
  from 02:25.
- Open-ground counts, first try: Infini-News matches bytes, so "ai" matched inside "said"
  (6.3 billion hits). Fixed: space-padded whole words (`OPEN_FORMS`).
- A wait loop matched its own command line in `pgrep` and never ended; stopped.

## For Kyle

- The propagation spec `claude/evidence-hedge-propagation-engine-prompt.md` is not on
  this machine; Parts were read from the code.
