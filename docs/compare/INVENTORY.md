# Compare firms: inventory and baseline

Taken Nov. 27, 2026, 14:10 EST, before any change. Baseline: tag `compare-baseline` on
`origin/main` = 9bde978 ("The Record: session summary"). Work is on branch `compare` in
`.claude/worktrees/compare`; `checks/data` there is a link to the main checkout's (ignored by
`.git/info/exclude`, as in the other worktrees).

`npm run check` passes at baseline (30 scripts). The worktree has no `fixtures/cache`, so
documents read from it skip, as they do in CI; `checks/data` is linked, so Fixture C runs.

## The live table

Read with the publishable key (`gh variable get SUPABASE_URL`, `SUPABASE_ANON_KEY`), paged 1,000
rows at a time with `Range` headers; 1,809 rows fetched, and `count=exact` says 1,809. Highest
id 3340. A select of `unsupported` answers 400 ("column list_entries.unsupported does not
exist"): the version 3 columns are not there yet.

### Entries by origin and engine build

| Origin | Entries | Engine builds |
|---|---|---|
| Corpus audit | 1,809 | 5b40af6: 1,518 · 90fa8b3: 272 · 9bde978: 19 |
| Readers | 0 | none |

Which firms sit on which build:

| Build | Entries | Firms | Firms with 5 or more | Firm × type cells with 5 or more | Firms that can show a trend |
|---|---|---|---|---|---|
| 5b40af6 | 1,518 | 88 | 39 | 56 of 219 | 25 |
| 90fa8b3 | 272 | 7 | 4 | 6 of 20 | 3 |
| 9bde978 | 19 | 1 (WATG) | 1 | 2 of 6 | 1 |

90fa8b3 holds Burns & McDonnell 161 (of 162), Weitz Company 73 (of 79), HKS 20 (of 22),
Gensler 14 (of 19), Procore 2 (of 4), Levelset (Procore) 1 and HLW 1: the reports added Nov. 10
and 11 and the five fix H rescored. 9bde978 holds WATG's 19, added today.

**What the builds mean for the comparison.** Between 5b40af6 and 90fa8b3 the engine changed in
one file (`src/engine/profile/provenance.js`, fix H). Between 90fa8b3 and 9bde978 nothing the
engine reads changed (`src/engine`, `src/rubrics`, `src/ingest`, `src/list`, `briefTop.js`, the
pdf.js version). The audit's full run at 90fa8b3 (`ledger-prop-base-90fa8b3`, 1,880 documents)
reproduces every one of the 1,518 entries still marked 5b40af6: the same score, claims, flagged
and all four flag counts, 1,518 of 1,518.

Rule 3 says compare only entries scored by the same build, so the tool does that literally (see
"Decisions" below), and the one-build fix is left to Kyle as an optional SQL file.

### Firms

91 firms have at least one audit entry. Report counts, largest first:

Arup US 351, Burns & McDonnell 162, Mortenson 135, WSP 116, JE Dunn Construction 111, Weitz
Company 79, Arcadis North America 75, Gray 66, NV5 Global 57, AECOM 54, Jacobs 43, SmithGroup 33,
Perkins&Will 32, HOK 31, DPR Construction 30, Terracon Consultants 26, Perkins Eastman 26, Jensen
Hughes 23, HKS 22, Gensler 19, WATG 19, STO Building Group 18, SSOE 18, Kimley-Horn 14, Corgan 13,
Walter P Moore 13, Skidmore, Owings & Merrill (SOM) 11, KPF 10, DLR Group 9, Turner Construction 9,
Swinerton 8, Salas O'Brien 8, Suffolk 7, Arcadis 6, Arup 6, Deltek 6, CannonDesign 5, Autodesk 5,
ConstructConnect 5, Dodge Construction Network 5, Trimble 5, Gilbane Building Company 5, and 49
firms with 1 to 4 (33 with 2 to 4, 16 with 1).

| Reports per firm | Firms |
|---|---|
| 50 or more | 10 |
| 20 to 49 | 9 |
| 10 to 19 | 9 |
| 5 to 9 | 14 |
| 2 to 4 | 33 |
| 1 | 16 |

### Report types

From the title rules in `scripts/list-load.mjs` (first match wins; with no cue, the engine's
reading of the document). Not changed here.

| Report type | Entries | Share | Firms | Firms with 5 or more |
|---|---|---|---|---|
| Research report | 707 | 39.1% | 68 | 25 |
| Industry or market report | 382 | 21.1% | 26 | 9 |
| White paper | 263 | 14.5% | 31 | 6 |
| Opinion or commentary | 160 | 8.8% | 22 | 6 |
| Other | 113 | 6.2% | 34 | 8 |
| Marketing material | 96 | 5.3% | 23 | 5 |
| News article | 58 | 3.2% | 16 | 3 |
| Survey report | 19 | 1.1% | 11 | 1 |
| Press release | 10 | 0.6% | 6 | 1 |
| Annual or impact report | 1 | 0.1% | 1 | 0 |

238 firm × type cells; 64 reach 5 reports (34 reach 10). Those 64 cells hold 1,499 of the 1,809
reports, but most cells (174 of 238) are below the minimum.

### Dates

| Precision | Entries |
|---|---|
| Day | 0 |
| Month | 672 |
| Year | 686 |
| Unknown | 451 |

Per firm (10 or more reports):

| Firm | Reports | Day | Month | Year | Unknown |
|---|---|---|---|---|---|
| Arup US | 351 | 0 | 294 | 56 | 1 |
| Burns & McDonnell | 162 | 0 | 2 | 1 | 159 |
| Mortenson | 135 | 0 | 2 | 133 | 0 |
| WSP | 116 | 0 | 2 | 30 | 84 |
| JE Dunn Construction | 111 | 0 | 0 | 111 | 0 |
| Weitz Company | 79 | 0 | 6 | 45 | 28 |
| Arcadis North America | 75 | 0 | 0 | 71 | 4 |
| Gray | 66 | 0 | 1 | 18 | 47 |
| NV5 Global | 57 | 0 | 57 | 0 | 0 |
| AECOM | 54 | 0 | 10 | 34 | 10 |
| Jacobs | 43 | 0 | 15 | 11 | 17 |
| SmithGroup | 33 | 0 | 31 | 2 | 0 |
| Perkins&Will | 32 | 0 | 2 | 28 | 2 |
| HOK | 31 | 0 | 5 | 20 | 6 |
| DPR Construction | 30 | 0 | 14 | 13 | 3 |
| Terracon Consultants | 26 | 0 | 4 | 1 | 21 |
| Perkins Eastman | 26 | 0 | 24 | 2 | 0 |
| Jensen Hughes | 23 | 0 | 0 | 5 | 18 |
| HKS | 22 | 0 | 2 | 8 | 12 |
| Gensler | 19 | 0 | 0 | 18 | 1 |
| WATG | 19 | 0 | 19 | 0 | 0 |
| STO Building Group | 18 | 0 | 15 | 3 | 0 |
| SSOE | 18 | 0 | 9 | 6 | 3 |
| Kimley-Horn | 14 | 0 | 7 | 5 | 2 |
| Corgan | 13 | 0 | 0 | 12 | 1 |
| Walter P Moore | 13 | 0 | 11 | 2 | 0 |
| Skidmore, Owings & Merrill (SOM) | 11 | 0 | 3 | 8 | 0 |
| KPF | 10 | 0 | 4 | 2 | 4 |

28 firms have at least 6 dated reports across at least 3 years (25 of them on 5b40af6).
Publication years run from 1999 to 2026; 1,154 of the 1,358 dated reports are from 2019 on.

### Names that look like one firm spelled two ways

Listed, not merged:

- Arup US (351) and Arup (6)
- Arcadis North America (75) and Arcadis (6)
- Suffolk (7) and Suffolk Construction (1)
- Gilbane Building Company (5) and Gilbane (2)
- Skidmore, Owings & Merrill (SOM) (11) and SOM (3)

Subsidiaries named with their parent, also left apart: Levelset (Procore) and Procore; PlanGrid
(Autodesk) and Autodesk.

## The ledger behind the live entries

Every live row matches exactly one ledger row by its link, build, score, claims and flagged
(`checks/data/audit/ledger-<tag>.jsonl`), with none left over and no link listed twice:

| Build | Ledger | Entries |
|---|---|---|
| 5b40af6 | run10 | 1,518 |
| 90fa8b3 | run11h (fix H's five) | 5 |
| 90fa8b3 | run12new | 257 |
| 90fa8b3 | run13g (Gensler's ten) | 10 |
| 9bde978 | run14x (WATG) | 19 |

Each ledger row holds the brief's stats (`rendered.stats`, from `statsOf`), so the three counts
come from the run that gave the score. `unsupported + overconfident + overreach − twoFlags =
flagged` holds on every scored upload row of all five ledgers, and so do the four table checks
Part A adds.

The ledger's `textSha` is not the List's `doc_hash` (the List hashes the text as
`scripts/list-load.mjs` reads it), so the counts-only update matches on `doc_hash` computed the
same way, and also on build, score, claims and flagged, so a row takes counts only from the run
that gave its score.

## A way to write to the database

| Place | Found |
|---|---|
| Linked Supabase CLI project | No. The CLI is installed and signed in, and lists the evidence-hedge project, but nothing is linked to it; `Reference/supabase` is linked to a different project (the reference app's). Linking would need the database password, which no file here holds. |
| Database URL or service-role key in a gitignored env file | No. There is no `.env` file in the main checkout or the worktrees (searched five levels deep). |
| Supabase MCP server | No. None configured. |

So there is no write path: Part A writes its SQL to `checks/data/list/` for Kyle.

## Decisions taken from the inventory

1. **One build per comparison, chosen by the chosen firm.** The build is the one that scored
   most of the chosen firm's reports (ties go to the build with more entries on The List). Other
   firms come in with their reports from that build only, and firms with none aren't offered.
   The scope line says how many of the chosen firms' reports another build scored and were left
   out. Today that splits the List into 5b40af6 (88 firms) and 90fa8b3 (Burns & McDonnell,
   Weitz, HKS, Gensler and three small ones); WATG can't be compared with anyone.
2. **Kyle's optional SQL:** stamping the 1,518 5b40af6 entries and WATG's 19 (re-weighed at
   90fa8b3 from a `git archive`: identical on all 20) as 90fa8b3, guarded on every value that run
   reproduces, puts all 1,809 entries on one build with no score changing. It is written, not run
   (`checks/data/list/list-restamp-to-90fa8b3.sql`), since it changes the engine column.
3. **The page leads with "All chosen types".** Most firm × type cells are below 5 reports, so
   the first row of the grid pools the chosen types, and type rows in which no pair of firms
   reaches the minimum collapse behind one control. The minimums stay as written.
4. **Report types** come from titles. The Method section says so; the rules are not changed.
