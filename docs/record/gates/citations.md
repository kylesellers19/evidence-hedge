# Gate: citations among the map's documents

Status: **too few** for every citation-network method; **provisional** for the two rate
measures, which report zero with intervals.

## How citations are found

1. **Reference lists.** GROBID 0.9.1 (CRF, native, 127.0.0.1) parsed every map PDF's
   references with `consolidateCitations=0`: 731 entries in 24 of 86 documents. Each
   was resolved to a map document by URL, or by title (rapidfuzz ratio 90 or more) with
   the target's organization named and the year within one. **None resolved.**
2. **Text.** A later document names an earlier one's firm and title within two
   sentences (the propagation engine's L1-by-name rule): **12** citations, every one an
   organization naming its own earlier edition (three series).

## What it means

No organization in this map cites another organization's report, in a reference list or
in prose. They cite news, government statistics, research outside the map, and their own
past editions. So:

| Measure or method | State |
|---|---|
| Cited by later work (others only) | 0 for every organization, with intervals |
| Earlier work cited (others only) | 0 for every organization, with intervals |
| CD index | No document has 5 citing documents |
| Expected but uncited, and the stance test | Needs 30 cross-organization citations in each period; there are 0 |
| Authority without evidence | 12 paths, all inside one series; no network |
| Earlier literature missing (capture-recapture) | 54 map documents vs 485 cited earlier works, no overlap: unbounded |

## Ratification table

| Constant | Value | Status |
|---|---|---|
| REF_TITLE_MATCH | 90 | PROVISIONAL |
| REF_YEAR_SLACK | 1 year | PROVISIONAL |
| TITLE_MATCH_THRESHOLD (propagation) | 90, partial_ratio | PROVISIONAL |
| ATTRIBUTION_WINDOW_K (propagation) | 2 sentences | PROVISIONAL |
| CD_MIN_CITING | 5 | PROVISIONAL |
| L2R_MIN_POSITIVES | 30 per period | PROVISIONAL |
| STANCE_MIN_PROB | 0.5 | PROVISIONAL |
| PERMUTATIONS | 10,000 | PROVISIONAL |
