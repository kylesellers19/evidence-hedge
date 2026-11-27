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
