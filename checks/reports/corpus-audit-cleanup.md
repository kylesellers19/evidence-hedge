# The engine cleanup and the 1-to-10 scale

Nov. 9, 2026. Branch `engine-cleanup`, engine `8a2154f`. This follows the [corpus audit](corpus-audit-5160fcd.md), which read every one of 1,603 documents and found where the engine went wrong. Documents appear here by id and link only. Every judgment call is in the [decision log](corpus-audit-decisions.md), rows 37 on.

## 1. What changed, and why

Each rule answers a problem the audit's reviewers found, and each was checked against the corpus before it counted.

### Page furniture is not claims

- **Headings.** The PDF reader starts a new block where the text size changes, or where a short line with no closing punctuation is set in another face. Those are a heading's two marks. A heading still fused to its sentence ("MARKET OVERVIEW The economy grew…") is cut off the claim. (`src/ingest/extractPdf.js: blockBreak`, `src/engine/extractClaims.js: stripHeadingPrefix`)
- **Running headers and footers.** Stripped by where they sit: a line in a page's top or bottom three lines that recurs on at least 15% of pages, or on three. Roman page numbers no longer make a header look new on each page. (`src/ingest/normalizer.js: stripHeadersFooters`)
- **Not claims:** captions and credits ("Figure 3: …", "Photo courtesy of …"), copyright lines, signposting about the document itself ("This report explores …"), calls to action ("Contact us …"), verbless title lines, chart and table rows read as sentences, and the publisher describing itself ("About Arup …"). (`src/engine/nonClaimFilter.js`, `extractClaims.js: isSelfDescription`)
- **References.** Footnotes and endnotes count as references, so a note marker in the text can link to its source. Lists headed "Notes", "Endnotes", "Sources" and "Citations" are set aside like "References". (`src/engine/measure/segment.js: isNoteEntry`, `lexicons/front-matter.js`)

### Evidence that is there now links

- **Bracket citations.** Citations written "[ 73 ]" and "[ 3 – 10 ]" are read. (`extractClaims.js`)
- **Named sources.** "Reuters notes …", "a study by the National Renewable Energy Laboratory …" and "the latest CBRE figures show …" count as attributions, as "according to" does. "Research shows" and "experts say" name no one and still count as nothing. (`extractClaims.js`)
- **A document's own results.** In a document that reports its own survey, model, index or project, the study's own results count as its own: "46% of owners …", "the model predicts …", "the index rose …", "the facility cut …". In a document that reports no study, an uncited figure still counts as citing nothing. Firm reports' own words for their studies are read as designs ("findings from over 1,100 responses", "the Mortenson Construction Cost Index"). (`lexicons/claim-function.js: OWN_STUDY_RESULT`, `lexicons/design.js`, `profile/design.js`)
- **Reported speech.** It is graded as attributed to its speaker. That covers interview transcripts ("BERNSTEIN: …") and sentences inside a quotation that runs over several sentences. (`attribution.js`, `analyze.js`)
- **Rule summaries.** In a document that cites a rule's sections again and again, "must" and "shall" report the rule; they are not the firm's own advice. (`measure/claimFunction.js`, `analyze.js`)

### Readings

- **Government.** A government publisher is read from the front of a document, not from the agencies it cites. 56 documents were read as government; 8 are now.
- **Firms.** Engineering, design and construction firms are recognized by how they speak of their own work ("our team", "our experts", "contact us"). 1,043 documents are now read as firm documents, up from 957.
- **Nouns.** A firm's own-evidence document is a "report", not a "research report". A document whose genres match no defined scenario reads as "A mix of corporate and research writing", not as a label. (`profile/provenance.js`, `rubrics/hybrids.js`)

### Certainty words in context

"Established in 1970", "establish a framework", "future-proof", "proof of concept", "100% renewable", "as always", "the best way to", "one of the best" and "government guarantees" assert no certainty, so they no longer read as strong. "Established that", "well established" and "100% confident" still do. (`lexicons/hyland.js: NOT_CERTAINTY`)

### Measured on the whole corpus

The 1,580 documents the site's gates pass, before (`run4`, baseline) and after (`run9`):

| | Before | After |
|---|---:|---:|
| Claims | 436,546 | 428,231 |
| Unsupported or overconfident, at the strictest setting | 304,809 | 291,172 |
| Read as strong | 14,462 | 10,988 |
| Reference entries set aside | 10,626 | 17,791 |
| Read as reporting no study of their own | 1,151 | 917 |
| Held to the corporate standard | 986 | 1,068 |
| Held to the general web standard | 212 | 188 |

**Precision.** On a seeded sample of 60 documents, nearly every sentence removed was a reference entry, a caption, a signpost, a call to action, a chart row or a running header. The one real claim found dropped (a named person's statement after a colon) was fixed before the final run.

## 2. The scale

**The score is ten times the share of a document's claims that hold.**
- **A claim holds** when it carries no flag: it is stated no more firmly than its evidence allows at its standard's strictest setting, and it claims no more cause, or firmer advice, than the design of the study behind it supports. A claim with two flags counts once.
- **Whole-document problems.** Each check on the document as a whole that comes back as a flag takes one point off, at most two. A note costs nothing.
- **The ends.** The floor is 1 and the cap is 10. A document with fewer than 10 claims gets no score.

| Score | Band | Share of claims that hold (no whole-document problem) |
|---:|---|---|
| 10 | Strong | 95% or more |
| 9 | Strong | 85–95% |
| 8 | Carried | 75–85% |
| 7 | Carried | 65–75% |
| 6 | Mixed | 55–65% |
| 5 | Mixed | 45–55% |
| 4 | Weak | 35–45% |
| 3 | Weak | 25–35% |
| 2 | Failing | 15–25% |
| 1 | Failing | under 15% |

Bands sit at half points, so each whole number a brief shows has one verdict; before, a 3 or a 5 could fall in either of two.

**One reading.** Every claim is judged once, at its standard's strictest setting. The brief's counts are therefore the counts the score is made from, and the brief shows the sum ("77 of 194 claims hold, which gives 4.0 of 10, less 1 for a problem with the document as a whole"). What a document is read as changes the wording of its brief, never its flags or its score. A check holds that the score follows from the headline's counts.

**Why this rule.** The candidate rules were measured against what the audit's reviewers judged fair, on 1,500 documents: the fair score they gave, or the shown score where they did not call it too low or too high (`scripts/score-calibrate.mjs`).

| Rule | Typical miss | Bias | Within 1 point |
|---|---:|---:|---:|
| The old formula (10 minus weighted losses) | 1.19 | −1.03 | 57% |
| **Share that holds (adopted), final engine** | **1.11** | **−0.49** | **58%** |
| Share that holds, a plain uncited statement counted as ¾ | 1.36 | +0.92 | 47% |
| Share that holds, counted as ½ | 2.59 | +2.53 | 15% |
| Share that holds, not counted | 5.72 | +5.72 | 1% |

All rows but the adopted rule's were measured on the cleaned engine before the attribution fix in section 3; the adopted rule's row is the final engine. The reviewers' fair scores were given against the old scale, which pulls the targets toward it; even so, the adopted rule lands nearer them.

Counting a plain statement that cites nothing as only part of a problem looks more balanced, but scores most documents above what the reviewers judged fair. The adopted rule fits best and is also the plainest. The documents the reviewers called too low rose 0.73 points on average (333 up, 72 down). Those they called too high fell 0.52; 7 of the 16 now have too few claims to score.

**Where the corpus lands** (1,580 documents):

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | No score |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Documents | 405 | 503 | 319 | 171 | 61 | 33 | 16 | 14 | 7 | 1 | 38 |

Most of this corpus scores low because most of what these firm reports state is stated plainly with nothing cited: 70% of their claims carry a flag. That is a finding about the corpus, not a quirk of the scale.

## 3. Found and fixed along the way

- **Attribution lost its place.** Attribution matched each claim to its body sentence by exact text. A claim that lost a fused heading no longer matched, and every later claim in that document went "undetermined". Claims now carry their source sentence (`8a2154f`). This was found by the check that a linked claim keeps its evidence row under every standard.
- **The evidence map's limits.** It read each claim's limit at the document's own setting while the flags used the strictest. It now reads the strictest too.

## 4. Still open

- **Two columns read across as one sentence.** Some layouts still interleave their columns. Column detection was not changed.
- **The reviewers' bias.** Scores still sit about half a point below what the reviewers judged fair. That gap is mostly documents whose own data or references are still not linked.
- **Report types and industries on The List.** Report types come from titles, and otherwise from what the engine read the document as. Industries come from the firm's segment in the collection. Neither was read by hand.

## 5. The List

1,523 reports from the corpus, every AEC report the site scores as an upload (three duplicate texts listed once), go on The List as "Corpus audit" entries. Each entry carries:
- the firm, an industry, a report type, the title and the date as the firm published it (a month or a year when that is all it gives);
- the score and the engine build;
- a link to the report;
- its claim counts;
- a fingerprint of its text, never the text.

The table gains these columns in `docs/the-list.sql` (version 2); the public key may add only readers' own entries. The rows are generated by `scripts/list-load.mjs` and loaded from the Supabase dashboard. The page asks the table for 50 entries at a time, sorted and filtered there.

## 6. Ratification

Every row is PROVISIONAL — not ratified.

| # | Item | Value | Where |
|---|---|---|---|
| C1 | The score | 10 × share of claims that hold; −1 per whole-document problem flagged, at most −2; floor 1 | `scoreDocument.js: SCORE_WEIGHTS` |
| C2 | Minimum claims for a score | 10 | `SCORE_WEIGHTS.MIN_CLAIMS` |
| C3 | Bands | strong ≥ 8.5, carried ≥ 6.5, mixed ≥ 4.5, weak ≥ 2.5 | `BAND_THRESHOLDS` |
| C4 | One reading | every claim judged at the strictest setting; firm and press-office own data one rung lower | `analyze.js` |
| C5 | Block breaks in PDFs | text size changes by more than 15%; a heading-like row (≤ 12 words, no closing punctuation) in another face | `extractPdf.js: SIZE_SHIFT, HEADING_ROW_WORDS` |
| C6 | Running headers | top or bottom 3 lines, on ≥ 15% of pages and at least 3; lines up to 160 characters | `normalizer.js: EDGE_LINES, EDGE_PAGE_FRACTION` |
| C7 | Non-claims | captions, copyright, signposting, calls to action (advice-guarded), verbless title lines, data rows (≥ 5 numbers, ≥ 40% of tokens with no verb, or ≥ 60%), the publisher's self-description | `nonClaimFilter.js`, `extractClaims.js` |
| C8 | Notes as references | a note number, then a quoted title, a locator, or an author or list of parts ending on a year | `segment.js: isNoteEntry` |
| C9 | Named sources | an organization reporting it, or a study by one | `extractClaims.js` |
| C10 | Own results | survey, model, index and project result cues, only where the document reports its own study | `lexicons/claim-function.js`, `lexicons/design.js` |
| C11 | Reported speech | graded as attributed | `analyze.js`, `attribution.js` |
| C12 | Rule summaries | at least 3 rule citations; "must" and "shall" sentences report the rule | `analyze.js: REGULATORY_MIN`, `claimFunction.js` |
| C13 | Certainty in context | the `NOT_CERTAINTY` list | `lexicons/hyland.js` |
| C14 | Readings | firm cues; government from the front only; "report" as the firm-research noun; "A mix of … writing" | `provenance.js`, `hybrids.js` |
| C15 | The List, version 2 | link, origin, date precision, claim counts; readers add only their own entries | `docs/the-list.sql` |
| C16 | Audit entries' industry and report type | the firm's segment; title cues, else the engine's reading | `scripts/list-load.mjs` |
