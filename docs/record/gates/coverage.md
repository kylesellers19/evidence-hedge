# Gate: news coverage and claims repeated in it

Status: **pending** for the map until Gate 1 for its reports (`record-c11`) finishes;
**provisional** after, because no L1 or L2 link has a gold label (the propagation
precision gate needs 60 labeled links per tier with a Wilson lower bound of 0.90).

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

## Results for the map

(Filled in when `record-c11` finishes.)
