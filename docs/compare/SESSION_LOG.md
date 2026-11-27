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
