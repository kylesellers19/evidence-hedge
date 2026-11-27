# Gate: news coverage and claims repeated in it

Status: **too few** for 16 of the 18 organizations (no independent article found) and
**pending** for 2 (their window documents are dated only by the file's creation date, so
they were not in the run). No L1 or L2 link has a gold label; the propagation precision
gate needs 60 labeled links per tier with a Wilson lower bound of 0.90.

## Where coverage comes from

The propagation engine, unchanged (research repo `propagation/`): Part A registry and
anchors, Part C discovery (Infini-News over CC-NEWS; GDELT DOC 2.0 for reports in its
three-month window; Media Cloud needs a key and has none), Part D ingestion and MinHash
syndication groups, Part E document links (L1, L2, L3, X). The Record counts L1 and L2
only, one per syndication group.

The map's 30 documents dated in the reporting window by the Record's date rule were run
through Gate 1 as `record-c11`, with predictions written first
(`reports/propagation/predictions.md`, R1 to R6). Two window documents dated only by
their file's creation date were not in the run, so their organizations' coverage is
pending.

## Parts F and G on the pilot reports

Run on the propagation session's Gate 1 pilot (8 reports), whose only links are 5 L1
articles (`reports/record/pickups-G1-pilot.json`):

| | Count |
|---|---|
| Claims picked up (M1 or M2), one per claim per independent article | 4, all M1 (near-verbatim) |
| Kept intact (figures, hedges, causal strength unchanged) | 3 |
| Repeated with a stronger causal claim than the report made | 1 |
| Only M3 (high similarity, no anchor; never a pickup) | 1 |

All four come from one report (two articles that linked to its PDF). Far too few to
estimate any rate; they show the matcher and the fidelity checks run end to end on real
articles.

## Capture-recapture

Needs at least two discovery sources with results for the same reports. Gate 1 runs
Infini-News for every report and GDELT only for recent ones, so for most reports there is
one list and the share is over what was found. Stated on the page.

## Results for the map (`record-c11`)

Run 02:25 to 09:35 on research branch `record` (propagation code at a92fd88 plus the
GDELT spacing fixes and the manifest fix 4144ae6), linking rules **E2**: the rules of the
propagation session's first pilot run (`pilot`); its widened run (`pilot-w`) used E3. The
manifest was written by an offline replay from cache (the live run crashed on the last
line, the manifest's index-version list; fixed by 4144ae6).

| | Count |
|---|---|
| Reports | 30 |
| Discovery queries | 2,074 |
| Candidates | 754, for 23 reports |
| Article texts the engine read | 547 |
| L1 links | 7, for 2 reports |
| L2, L3 | 0, 0 |
| X | 489: edition_anchor 323, undated 137, edition_title 20, upstream 8, predates 1 |
| none | 258 |

**All 7 L1 links are the firms speaking, not being heard.** Three of one firm's press
releases on wire services and two copies of one of them, and another firm's release and
its own web page. The Record counts an article as coverage only when it is independent:
not the firm's own release (Part B), not a wire copy of one (same syndication group), not
a page on the firm's own site. **Independent articles: 0.** Coverage share, coverage minus
contribution, and both pickup rows are "too few to estimate"; the figure says it has
nothing to plot. Claim matching ran and had nothing to match.

## Predictions (written before discovery)

| # | Prediction | Result |
|---|---|---|
| R1 | Infini-News yields a candidate for at most half of the 30 reports | **Miss**: 23 of 30 |
| R2 | No L2 link for any report | Hit |
| R3 | At most 3 L1 links across all 30, each a hyperlink or firm and title | **Miss on count**: 7, each by firm and title |
| R4 | Firm queries for Autodesk, Trimble, Arup and Bentley Systems too broad to resolve | **Miss**: with the cap at 250,000 every firm query resolved (Autodesk 242,081 occurrences) |
| R5 | Reports dated after April 2026 get no Infini-News candidate | **Miss**: one got 3 (earlier articles matching its phrases) |
| R6 | Every L3 candidate comes from a rare phrase | Hit, vacuously: no L3 |

Nothing was changed because of a miss.
