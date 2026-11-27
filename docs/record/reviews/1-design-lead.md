# Review 1: as a design lead who knows this audience

Reviewed 2026-11-27 on map 19ad617a8af2, screens `docs/record/screens/28f54b0/` (1440,
1024, 768, 390 px, light and dark) and the live page after the first deploy.

## Can each reader find their answer in ten seconds?

| Reader | Their question | Where the page answers | Time | Verdict |
|---|---|---|---|---|
| Communications or marketing leader | "How much were we heard, and did they get us right?" | Rows 1, 6, 7 and 8 of the statement, and the figure | 3 s to find, 0 s to an answer | **Fails today, by state, not by design.** Every coverage row says Pending with "discovery not run", and the figure says why it waits. The reader also cannot find their own organization while names are withheld. |
| Research director | "Where is the open ground for next year's study?" | The Open ground view | 8 to 12 s: the view is below the fold, behind a label a newcomer may not read as "under-studied" | **Borderline.** Once open, the sorted table with the design mix of each sub-question answers it. Several labels are hard to read ("republic · proud · design build"). |
| Skeptical decision-maker | "Should I believe any of this?" | The provisional line under the title; intervals and counts on every row; Method | 2 s | **Passes.** The basis line under every measure ("0 of 50 possible citations") is the page's strongest trust signal. |
| Journalist | "Is this firm's 'first' claim true?" | "First" claims view | 6 s to the table | **Fails by rule.** One claim, not checkable, with no name and no text. The anonymity rule makes the task impossible until Kyle decides naming. |

## Decoration or information?

- **Information:** every mark is data (dot, interval, median tick), the basis lines, the
  sentence, the figure's equality line.
- **Close to decoration:**
  - The staying-power marks. After pooling every organization sits near +0.12 with
    near-identical intervals, so the row's marks repeat one shape. Keep the row (the
    sameness is the finding) but it reads as ornament.
  - The "Heard and added" heading over an empty figure. A heading for one sentence of
    status. Acceptable as the designed pending state; it disappears as a problem once
    coverage arrives.
- **Line under the title** ("Who asked, who added, who was heard."): the spec's line,
  kept. It works as a dek, not decoration.

## Does it still feel like Evidence Hedge?

Yes. One column, hairline rules, no cards, no fills, square corners, the navy accent
only on the selected organization's marks, the site frame unchanged. Two departures,
both from the spec:

- **Typefaces.** IBM Plex Sans and Mono with Newsreader for the question, where the
  rest of the site is Source Serif 4 and Libre Franklin. Moving from The List to The
  Record changes voice. Kyle should decide whether the Record keeps its own faces or the
  site moves.
- **Dark mode.** The Record follows the system theme, and while it is open it darkens
  the site frame too. Every other page stays light (the orbit draws black particles).
  Navigating from a dark Record to a light List is a jolt.

## Fixed after this review

- The organization selector names each organization's documents in the window
  ("Organization 7 · 3 documents"), so a reader can pick a full row without trying each.
- Citation bases say "possible citations", not "later documents", because a count summed
  over an organization's documents is not a count of documents.
- Shares under 0.1% print as "<0.1%" instead of "0.0%".
- "1 claims" now reads "1 claim".

## Open items for Kyle

1. Typefaces and dark mode across the site (above).
2. The masthead's "Method" (the evidence brief's method) and the Record's "Method" view
   share a word. Readers may expect the masthead link to explain the Record.
3. Sub-question labels are machine terms. Readable labels need a person: the labeling
   sheet has a column for them.
