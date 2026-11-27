# Compare firms: session log

Session of Nov. 27, 2026, from 14:09 EST, unattended. Spec: "Evidence Hedge: Compare firms,
under The List (unattended session)", pasted by Kyle. If context is compacted, reread this file
first, then `INVENTORY.md`.

## Where things are

- App worktree `Evidence Hedge/.claude/worktrees/compare`, branch `compare`, baseline tag
  `compare-baseline` (9bde978). `checks/data` links to the main checkout's.
- Milestones are fast-forwarded into `main` with `git push origin compare:main`; the main
  checkout's own `main` is left alone (another session's branch state).
- Live table: Supabase project evidence-hedge, read with the publishable key. No write path
  (`INVENTORY.md`), so SQL goes to `checks/data/list/` for Kyle.

## Timeline (EST)

- 14:09 Baseline tag and worktree; `npm ci`.
- 14:10 Live table read: 1,809 audit entries, three builds, no reader entries; version 3
  columns absent.
- 14:14 Every live row matched to one ledger row; the 90fa8b3 run reproduces all 1,518 5b40af6
  entries. Baseline `npm run check` passes.
- 14:20 `INVENTORY.md` written.
- 14:20 Part A. Version 3 block in `docs/the-list.sql`; `list-load.mjs` writes the counts and
  checks the identity on every row; `--counts-only` and `--restamp` modes. SQL tested on a
  scratch Postgres 17 loaded with the 1,809 live rows: the version 3 block runs twice cleanly;
  the counts update sets all 1,809 (each equal to the ledger row that gave its score), row
  count, scores, builds and fingerprints unchanged, identity and checks hold, safe to rerun;
  readers' inserts: today's row and a row with all three counts pass, one count alone or
  counts that break a check are refused, an audit row from the public key is refused.
- 14:21 WATG's 20 PDFs re-weighed at 90fa8b3 from a `git archive` (ledger `run15w-90fa8b3`):
  identical to 9bde978 on all 20. The optional restamp then puts all 1,809 on 90fa8b3 with no
  score moving (tested on the scratch copy).
- 14:22 The column probe first asked for the version 3 columns, and its 400 showed as a console
  error on every visit; it now reads one row and looks for them.
- 14:23 Milestone 1 pushed: main = 7765977, Pages run 46056374322, live 14:25; `site-smoke`
  passes on https://evidencehedge.org (`/list/compare` shows its one sentence).
- Network: the system resolver stopped finding github.com (api.github.com and the site resolve).
  Git runs with `-c http.curloptResolve=github.com:443:<address from nslookup>`.
- 14:28 Predictions written and committed (dd74d51) before any comparison ran on real data.
- 14:33 List snapshot (`checks/targets/compare/list-rows.json`): the 1,809 public rows with counts
  from the ledgers that gave each score.
- 14:35 Statistics built. The largest selection took 28.7 s on one thread; the trend-gap shuffle
  (Theil–Sen over up to 113,000 pooled pairs per shuffle) was most of it. Work replanned as seeded
  slices for a worker pool: 3.9 s on 9 threads, results identical on any number of threads.
- 14:44 Python reference started in a subagent, from the definitions only, without the JavaScript
  (`scripts/compare-reference.py`, scipy and statsmodels).
- 14:45 to 15:05 Text, page, worker pool, styles, `check:compare`, `compare-browser`.
- 14:55 Reference agreement: estimates, rates and counted p to 1e-9; sampled p within three Monte
  Carlo errors. Interval ends first failed on lumpy bootstrap distributions (Suffolk's 7 reports: the
  97.5% point is 0.225 by 200,000 draws, but a 4,000-draw run lands on 0.225 or 0.05), where batch-
  means errors understate the noise; tolerance changed to order-statistic bands (logged in
  `docs/compare.md`). One end still outside its band was looked into (our end varies 9.36 to 9.40
  over seeds, 100,000 draws give 9.367, the reference 9.330) and recorded in
  `checks/targets/compare/reference-misses.json`.
- 15:05 Milestone 2 pushed: main = c306dc7, Pages run 46061720397 (`check:compare` ran in the
  workflow), live 15:11; `site-smoke` and `compare-browser` pass on https://evidencehedge.org (the
  browser check answers the table's requests with the snapshot; readers see "isn't available yet").
- 15:15 Predictions scored: 18 of 27 (`predictions.md`).
- 15:15 to 15:30 Three reviews in subagents (`reviews/`). Fixed: the text, grid and table items they
  marked "Fix now", and two statistical faults from review 3: city editions counted as reports, and
  the trend-gap shuffle's false positives. Both are logged as decisions in `docs/compare.md`; neither
  moved a constant. The reference was changed the same way for the trend-gap p. Predictions rescored:
  19 of 27.
- 15:28 Coverage study, first run (before editions counted once): score intervals cover 81.0% to
  91.4% at 5 reports; rerun with editions counted once started.
- 15:40 Milestone 3 checks: `npm run check` (31 scripts) and `compare-browser` pass locally.
