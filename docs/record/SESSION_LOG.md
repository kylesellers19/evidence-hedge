# The Record: session log and summary

Session of 2026-11-27, 01:09 to 06:50 EST, unattended. Spec: "Evidence Hedge: build The
Record, unattended" (pasted by Kyle). If context is compacted, reread this file first.

## Summary

**Shipped and live** at https://evidencehedge.org/record (main = c08b176, Pages run
45992856510; first deploy fc48893). The page maps one question, digital tools and data
in how places are designed, built and run, from 86 corpus documents by 25
organizations, and measures the 18 with documents in the reporting window
(2023-01-01 to 2026-11-26). Every organization is unnamed (Organization 1 to 18) and
every figure is provisional.

| Part | State |
|---|---|
| Inventory | `INVENTORY.md` |
| Map (research `record/`) | Built, map 19ad617a8af2: 20,148 engine claims, 19 sub-questions, dates with sources, designs, stated sample sizes |
| New findings (anchors + SPICED) | 3,738 findings judged, 3,529 new; ranks robust to the thresholds, levels not |
| References (GROBID) | 731 entries parsed, none resolve to a map document; 12 text citations, all self-citations |
| News coverage (propagation Gate 1) | **Running** for the map's 30 window reports (`record-c11`, started 02:25, in GDELT at 06:42); Pending on the page |
| Parts F and G | Built; run on the propagation pilot's 5 L1 links: 4 pickups, 3 intact, 1 causal upgrade |
| Measures and models | All nine measure rows; pooled rates; shares; staying power; open ground; "first" claims |
| Research analyses | Half-life (Kaplan-Meier, Cox) run; citation-network methods too few; overreach plan written first, too few |
| AI assistant comparison | Harness and 50 questions built; **not run**: no assistant key configured |
| Page | Statement table, figure (waits for coverage), switch with four views, light and dark, 360 px up |
| Checks | `npm run check` (28 scripts) pass; `checks/record-browser.mjs` passes at 1440, 1024, 768, 390 px, light and dark, locally and live; `checks/site-smoke.mjs` live |
| Replay | Offline rebuild of map, analyses and export byte-identical; cold recompute of embeddings byte-identical |
| Reviews | `reviews/1-design-lead.md`, `2-three-users.md`, `3-adversarial-data-scientist.md` |

## What is provisional, and why

Every figure: no input has a gold label yet.

- The question cluster and the sub-questions were chosen by rules (embeddings, k-means,
  silhouette); the first cluster rule picked a leftover bin and was amended before any
  measure (`gates/map.md`).
- New-or-earlier decisions, designs, sample sizes and "first" verdicts are rules and a
  matcher, not yet checked by a person (`gates/novelty.md`).
- Citations rest on GROBID and title matching (`gates/citations.md`).
- Coverage rests on propagation links whose precision gate (60 labels per tier, Wilson
  lower bound 0.90) cannot yet be measured (`gates/coverage.md`).

## Gates

| Gate | Status | Report |
|---|---|---|
| Map: question and sub-questions | Provisional | `gates/map.md` |
| Dates | Provisional (60 collection records, 13 stated, 13 PDF creation dates) | `gates/map.md` |
| Designs and sample sizes | Provisional | sheet |
| New or made earlier | Provisional | `gates/novelty.md` |
| Citations | Provisional for the two rates (0 everywhere); too few for every network method | `gates/citations.md` |
| News links | Pending (Gate 1 running) | `gates/coverage.md` |
| Claims repeated in articles | Pending for the map; ran on the pilot | `gates/coverage.md` |
| Is overreach rewarded | Too few (needs 60 repeated claims in 20 reports; has 0) | `analysis_plan.md` |
| Assistant comparison | Not run (no keys) | `method.md` §11 |
| Naming organizations | Not passed: Kyle decides | — |

## Ratification tables

- The Record: `gates/ratification.md`, 42 constants, all PROVISIONAL, generated from
  `record/config.py` and the modules that register constants.
- Changed after a first look at the data, before any organization was measured, each
  logged with its reason: `CLUSTER_MIN_SILHOUETTE`, `NEW_CLAIM_FUNCTIONS` and
  `NEW_ANCHORED`, `REFERENCE_LINE`. Changed at review: `SUBQ_MIN_SHARE`, label words of
  three letters or more, `OPEN_FORMS` (whole-word demand counts). Set before values:
  `RESONANCE_WINDOW` 5.
- Propagation constants the Record reuses: research `reports/propagation/gate1-pilot.md`.

## Labeling sheets waiting for Kyle

Research repo, gitignored `data/record/labeling/` (they hold claim text):

- `designs-19ad617a8af2.csv`: 86 documents, design, sample size with a short excerpt, and
  whether each belongs on the question.
- `subq-19ad617a8af2.csv`: 12 claims from each of 19 sub-questions; confirm and relabel.
- `newness-19ad617a8af2.csv`: 150 decisions (75 new, 75 made earlier), both claims side
  by side.
- `first-19ad617a8af2.csv`: every window claim with "first", and whether the check took it.
- The question's wording ("What are digital tools and data changing in how places are
  designed, built and run?") is proposed; reword freely.
- Older builds' sheets are in `labeling/superseded/`.
- The propagation pilot's own sheet (`data/propagation/labeling/doclinks-pilot.csv`)
  gates every coverage figure.

## Open items from the reviews

1. **Naming.** A communications lead cannot find their own organization and a journalist
   cannot check a claim while names and text are withheld. Kyle decides.
2. **The corpus.** It holds only what firms post on their own sites. The map's documents
   cite a literature entirely outside it (no overlap in 485 cited earlier works). Widening
   to consultancies, vendors' analysts, associations and journals would improve every
   number.
3. **Open ground's demand words.** Common label words ("net", "score", "awarded") count
   unrelated news, so boilerplate sub-questions lead the demand gap. Using only multi-word
   terms, or Kyle's labels, would fix it; left as written rather than tuned after seeing
   results.
4. **Typefaces and dark mode.** The Record uses IBM Plex and Newsreader and follows dark
   mode; the rest of the site uses Source Serif 4 and Libre Franklin and stays light.
5. **Two "Method"s.** The masthead's Method page and the Record's Method view share a
   word; the view now says which is which.
6. **Rates vs shares.** New-finding rates reorder when standardized to one sub-question
   mix (9 of 45 pairs); the page compares shares.
7. **Volume.** New findings weight long, figure-dense reports.
8. **Pooled shares' intervals** treat findings as independent; a document-level bootstrap
   would widen them.

## When `record-c11` finishes

1. Tell the propagation session ("Evidence Hedge claim propagation engine"); its
   coverage-matrix probes wait for this run.
2. In the research worktree: `envs/record/.venv/bin/python -m record.export --app
   "<app worktree>" --coverage-tag record-c11` (coverage, pickups by Parts F and G,
   Hawkes, overreach counts), then `-m record.analyses`, and check the predictions R1 to
   R6 in `reports/propagation/predictions.md` against the tables.
3. In the app worktree: `npm run check:record`, build, browser check, fast-forward main.

## Session record

Worktrees: app `Evidence Hedge/.claude/worktrees/record` (branch `record`); research
`evidence-hedge-research-record/` (branch `record`, pushed). Baselines: tag
`record-baseline` in both (app aabc47f, research a92fd88). Preview server
`record-preview` (main checkout's `.claude/launch.json`, port 4174).

Times are EST.

- 01:10 Inventory, baseline tags, worktrees.
- 01:20 `envs/record` pinned; models pinned by revision: all-MiniLM-L6-v2 1110a24,
  nli-roberta-base 1be0567 (safetensors only), SPICED c32c33a.
- 01:30 Analysis plan written before any outcome (e11aff5).
- 01:35 Cluster choice; first rule picked a leftover bin; coherence rule added.
- 01:50 Map built; reference lines dropped; findings defined.
- 02:00 Pooled rates fixed (plug-in collapsed on all-zero counts).
- 02:05 Page built (450dfd7) and checked.
- 02:12 First deploy (fc48893), verified live.
- 02:20 Reviews and fixes (map 19ad617a8af2).
- 02:25 `record-c11` started, alone against Infini-News, coordinated with the
  propagation session by message; still running at 06:50.
- 02:35 Ratification table; offline replay byte-identical; cold embeddings identical.
- 02:40 Parts F and G on the pilot.
- 06:45 Open-ground demand recounted for the current labels during Gate 1's GDELT stage;
  second deploy (c08b176), verified live.

## Failed, and what was done

- `pilot-w` (the propagation session's run) stopped on a GDELT 429; that session fixed the
  spacing; its fixes are on research `record` too.
- `record-c11` stopped once (01:53) on an Infini-News 429 because this session ran
  open-ground counts at the same time; rerun alone from 02:25.
- Open-ground counts, first try: byte substrings ("ai" inside "said"); fixed with
  whole-word forms.
- Killing a queued job by process ID was refused by the permission classifier; stopped
  the task through the tool instead.
- A wait loop matched its own command line and never ended; stopped.
- The propagation spec (`claude/evidence-hedge-propagation-engine-prompt.md`) is not on
  this machine; Parts were read from the code.
