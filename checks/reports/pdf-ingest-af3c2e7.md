# PDF ingest fix — engine 1c6f4eb → af3c2e7

Two bugs found by change set 4's GROBID comparison:
1. On two-column (in fact three-column) EHP papers, the app's text interleaved the columns.
2. On the JCU report, superscript citation markers were dropped.

A third bug was found while fixing the second: numbered reference entries lost their number.

Predictions were committed before the fix in `checks/pdf-ingest-predictions.json` (`648c44e`, plus an addendum in `d365796`). The fix is commit `af3c2e7`.

- **Label tiers:** GROBID's links are tier predicted (a comparison point, never ground truth). Every engine value is tier predicted.
- **Sources:** the three academic PDFs (substitutes for Kyle's three, gitignored) and Fixtures A–C.

## What changed

| | Before | After |
|---|---|---|
| Gutter detection | one histogram pass, 4 px buckets, 10 px minimum | the same pass, plus a 2 px / 8 px pass and "channels" a table or figure crosses; the new gutters count only with a column of text directly on each side |
| Reading a multi-column page | bands at rows crossing any gutter, columns read in turn | recursive: split at a gutter no row crosses; else band at rows crossing every gutter; else split at the gutter the fewest rows cross, each crossing row going whole to one side |
| Small glyphs | all moved to the page end as captions or credits | those touching body text on their line stay inline, digits as Unicode super/subscripts (`comfort⁷,¹²`, `CO₂`); body-size raised digits on no line of their own too; captions still go to the end |
| Sentence split | after `.`, `!` or `?` followed by a space | also after a superscript marker (`jobs.¹ The`) |
| Reference entries | `1. Kellert, S. R.` split after `1.`, so the number was lost | the number stays with its entry |
| Superscript markers | invisible to the engine | resolved against a numbered reference list (the sentence reads as citing); footnote anchors against a Notes list; otherwise no link and no change to attribution |

## Predicted vs. actual

**GROBID-sentence coverage of the app's text** (development metric; GROBID body sentences of ≥ 60 normalized characters):

| Paper | Sentences | First 60 characters: before → after | Predicted | Match | Whole sentence: before → after | Predicted | Match |
|---|---|---|---|---|---|---|---|
| Allen 2016 | 201 | 0.065 → 0.896 | [0.80–0.98] | yes | 0.035 → 0.861 | [0.70–0.95] | yes |
| Satish 2012 | 189 | 0.037 → 0.926 | [0.80–0.98] | yes | 0.026 → 0.884 | [0.65–0.95] | yes |
| JCU pilot | 242 | 0.971 → 0.992 | [0.97–1.0] | yes | 0.872 → 0.979 | [0.92–1.0] | yes |

**GROBID comparison** (research repo `reports/grobid-agreement-af3c2e7.json`):

| | Allen | Satish | JCU | Predicted | Match |
|---|---|---|---|---|---|
| Callout sentences mapped to an app unit | 1 → 21 of 24 | 0 → 30 of 33 | 22 → 27 of 27 | [15–24], [20–33], [24–27] | yes, yes, yes |
| App reference entries | 11 → 7 | 5 → 2 | 54 → 49 | [25–45], [25–50], [40–60] | **no**, **no**, yes |
| Unit-level agreement | 0 → 0.567 | 0 → 0.903 | 0 → 0.583 | [0.10–0.60], [0.10–0.60], [0.40–0.90] | yes, **no** (higher), yes |
| JCU same targets | — | — | 0 → 8 | [8–22] | yes |
| JCU numbered entries | — | — | 1 → 40 of 49 | [40–54] | yes |

- **JCU, app side:** 69 marker links, 56 resolved to a reference entry (before: 1 marker link, 0 resolved).
- **Allen and Satish:** the app finds most of the same citing sentences (unit agreement 0.567 and 0.903), but resolves none of them. The app reads only 7 and 2 reference entries from these lists, against GROBID's 37 and 43.
- **Why the reference lists still fail:** the EHP lists are set in small type ("Allen JG, MacNaughton P, … 2016.") and do not split into entries. This is a third problem, left for a later change.

**Fixtures** (`checks/reports/benchmark-compare-1c6f4eb-af3c2e7.md`: 110 metrics, 5 changed, all Fixture C counts; no corpus metric changed):

| Fixture | Pages whose text changed | Predicted | Flags (unsupported / overconfident / overreach) | Score | Predicted | Match |
|---|---|---|---|---|---|---|
| A (CADRE) | 2 of 61 | [0–3] | 148 / 3 / 16, unchanged | 1 | flags change ≤ 3 each; score unchanged | yes |
| B (Pew) | 14 of 33 | [1–8] | 9 / 0 / 3, unchanged; claims 231 unchanged | 7.3 | flags, claims and score unchanged | pages **no**; the rest yes |
| C (Gensler) | 15 of 89 | [0–3] | 195 → 212 / 5 / 24 → 23; claims 378 → 397 | 1 | flags, score and brief unchanged | pages **no**; flags **no**; score yes; brief **no** (re-recorded in `af3c2e7`) |

More detail on the fixtures:
- **CADRE column check** (`checks/pdf-column-fix.mjs`): spliced-row rate 3.90% → 3.11%, hyphenation tells 2 → 2, both within limits.
- **Fixture A** reads 1 numbered reference entry, inside the predicted 0–3. Its marker resolution is 0.466, unchanged.
- **Why B and C moved more than predicted:** the finer gutters and the recursive reader fix interleaving on report pages beyond the EHP papers. Examples:
  - Pew p9: "say they rarely or Workers younger than 30…"
  - Gensler p29: "built-in audience. year, and 85% would recommend…"
  - Gensler p49: "revealed the Takeaway dynamics"
- **Fixture C's extra claims** (+19) are sentences that were previously spliced together.
- **Pew** gains its 7 superscript footnote markers inline (`jobs.¹`). It has no numbered reference list or Notes heading, so they make no link, as predicted.
- **Remaining reorderings** are in charts, page navigation strips ("00 01 02") and the order of table cells.

**Checks:** `npm run check` passes (468 PASS) and `npm run build` succeeds. The known-good string is unchanged.
- **New tests:** synthetic reading order (three 10 px-gutter columns), inline superscript, subscript, caption to the page end, bullet kept with its text (`checks/ingest.test.mjs`).
- **New tests:** a numbered entry keeps its number, a superscript marker resolves against a numbered list and reads as cited, the sentence boundary after a superscript, no link without a list (`checks/linkage.test.mjs`).
- **One test changed:** `checks/claim-record.test.mjs` now compares flags with the linkage check's report on the same engine (its frozen change set 4 report would fail on every engine change).

## Ratification items (all PROVISIONAL — not ratified)

| Item | Value | File |
|---|---|---|
| Fine gutter pass | 2 px buckets, 8 px minimum | `src/ingest/extractPdf.js` |
| Channel | ≥ 40% of rows clear beside it, text within 40 px, ≥ 25% of rows with text each side | same |
| Column text beside a new gutter | ≥ 15% of the page's characters directly on each side | same |
| Word gap across a new gutter | < 0.6 × text height, same-size glyphs (±15%) | same |
| Inline super/subscript | touching within 2.5 px; superscript baseline 0.15–0.6 h above, subscript 0.08–0.35 h below; body-size marker text ≤ 8 digits, commas or dashes | same |
| Superscript marker | Unicode superscript digits after a word of ≥ 3 letters or closing punctuation | `src/engine/lexicons/linkage.js` |
| Superscripts cite only with a numbered reference list | — | `src/engine/analyze.js`, `attribution.js`, `linkEvidence.js` |

## Left for later

- **EHP reference lists** split into too few entries (Allen 7, Satish 2), so their author-year markers stay unresolved.
- **Remaining reading-order problems** on Allen (about 10% of GROBID sentences not found) were not diagnosed after the last change. The earlier misses were on pages where a table or the abstract box spans only some of the columns.
