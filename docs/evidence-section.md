# Evidence section

The section of the evidence brief under the verdict: "What each claim stands on". It replaced the From / Via / To figure. Built in `src/engine/evidenceSection.js` (the reading) and `src/components/results/EvidenceSection.jsx` (the page); held by `npm run check:evidencesection` (`checks/evidence-section.test.mjs`).

The rules below are the design brief's, word for word, and they override design defaults. Where the brief left something open, or where its build target and its rules disagreed, the decision taken is recorded under **Decisions**.

## What the section is for

A reader has just read the verdict. This section answers four questions, in this order, each in one glance:

1. **How much of this stands on anything?** The bar.
2. **Which claims should I check?** Three, ranked, with a "Show 3 more" control.
3. **Where are they?** The pages, or twelfths of pasted text, with the lines that need checking in blue.
4. **What do the claims lean on, when they lean on something?** One row per kind of source, with a bar.

Nothing else goes in the section.

## Words

Use these four verdicts, word for word, everywhere: on the bar, in lists, in reasons and in the brief recorder.

| Verdict | Engine rule |
|---|---|
| Backed by a source | no flag, no causal overreach, rung rank > 0, not a method statement |
| Overstates its source | flag `overconfident`, or causal overreach |
| Stated as fact, nothing cited | flag `unsupported-assertion` |
| Said cautiously, nothing cited | no flag, rung rank 0, not a method statement |

- **The two that need checking together are "need checking".** That is overstates its source, plus stated as fact with nothing cited.
- **Method statements are counted, not shown.** They get one line under the bar, and only when there are any: "N more sentences describe its methods and aren't judged."
- **If the posture gate fired,** the whole section is one sentence: "Written from experience, so no claim here owes a source."

Each claim shown gets one reason line of 12 words or fewer, in plain words, from a template:

- Stated as fact, with a booster ("demonstrates", "proves", "clearly"): "Stated as proven. Nothing is cited."
- Stated as fact, in direct causal language: "States a cause. Nothing is cited."
- Stated as fact otherwise: "Stated as fact. Nothing is cited."
- Overconfident: "Cites {short source}, but says more than it can show."
- Causal overreach: "Claims a cause; {design in plain words} can only show a link."
- Advice overreach: "Turns {short source} into advice it can't support."

**Underline the words that make the claim firm.** These are the certainty boosters and causal cue words the engine already records on the claim. Underline nothing else.

**Never use these words in anything a reader sees:** reach, reaches, carry, carries, rung, tier, ground, grade, ceiling, posture, outrun, outruns, "past its reach", "whose finding", "the engine", From / Via / To, linked / loose / presumed (as labels), "stated past", ditto marks.

## Layout

- **Labels sit on or beside the mark they name.** The only key allowed is one line of 10 words or fewer next to a graphic ("— a claim that needs checking"). No legend paragraphs.
- **Never more than three claims by default.** "Show 3 more" stops at six. After that, one opt-in "Show all N that need checking" opens a list in document order, 20 at a time. There is no pager.
- **Sentence case.** No all-caps labels, no middle-dot meta strings, no monospace, no arrows appended to buttons.
- **Typefaces:** Source Serif 4 for the section title, the one-sentence dek, quoted claims and big numbers. Libre Franklin for everything else.
- **Color:** only the tokens in `src/index.css :root`.
  - Blue (`--eh-accent`) means needs checking.
  - Grey (`--eh-dot`) means backed.
  - An outline means overstates (blue) or said cautiously (grey).
  - No other color carries meaning.
- **Shape:** square corners, hairline rules, no shadows, no fills behind text.
- **Phones (≤ 600px):** bar labels go to a two-by-two grid, the pages to six columns, and each source row stacks its name over its bar.

## The quality bar

Before you call any screen done, cover everything except the graphics and their own labels. Then answer the four questions from the screenshot alone. If any answer needs a paragraph you wrote, the screen fails.

## Decisions

Taken while building, 2026-11-09. Constants marked PROVISIONAL in the code are not ratified.

- **Reason lines follow the templates**, not the build target's hand-written lines ("Cites one review (Nanda, 2024), then turns it into a rule for designers." was 13 words and needed judgment no rule has). Lines the brief gave no template for:
  - Backed: "Backed by {short source}."; with a citation missing from its references, "Backed by {marker}, which isn't in its references."
  - Said cautiously: "Said cautiously ("{hedge}"), so it stands without a source."
  - Stated as fact, but citing an (Author, year) missing from its references: "Cites {marker}, which isn't in its references." The label stays; the reason says what is true.
  - Stated as fact with a citation nearby, not tied to it: "Stated as fact. The citation nearby isn't tied to it."
  - Causal overreach on a design that licenses hedged causes (cohort, quasi-experiment, model, systematic review): "States a cause outright; {design} can only suggest one." With no reported design: "Claims a cause, but no study is reported."
  - Causal overreach on a claim that cites nothing keeps the label "Overstates its source" (13 corpus claims at this writing); the reason names the design.
- **Underlines** are the boosters and causal cue words, plus the advice words when advice is what overstates (claim 88 in Fixture A, "need to"). Their positions come from the matchers themselves (`termSpans` in `measure/certainty.js`, `causalCueSpans` in `measure/causalRegister.js`), which analyze() does not call.
- **Precedence:** a claim flagged `unsupported-assertion` that also overreaches is "Stated as fact, nothing cited" (the build target's counts put it there).
- **Check these first** is ranked by rule: claims that need checking and read as one clean sentence (`quotable()`: not spliced across PDF columns, not a heading), taken in turn from each kind of problem (stated as proven, states a cause, overstates, cites a missing entry, citation nearby, stated as fact), firmest first, then the most underlined words, then the shortest. With fewer than three quotable, sentences of the right shape fill in. Some column splices read as grammar and still pass.
- **Where they are:** for a PDF, one box per page; claims are found on their page by `src/engine/pages.js`, the locator the checks' sentence units already used, from the per-page text the upload keeps in `meta.pages`. Pasted text, DOCX and pages fetched as text are cut into twelfths by paragraph. Each part opens on its best-ranked quotable claim.
- **What they lean on:** rows in the build target's order (what it cites, what it only names, its own work, research it never names, nothing). "Its own review" reads from the design (a review); otherwise "Its own data or figures". Over eight kinds, the smallest gather into "Other sources", before "Nothing". Method statements are left out of the rows.
- **Said cautiously** is outlined in `--eh-ink-soft`, as the build target draws it; `--eh-dot` would not reach 3:1 against the paper.
- Fixture A's numbers in `checks/targets/evidence-section-fixture-a.json` are the build target's recorded engine output; the check holds the counts, the claim-by-claim verdicts, the dek and the source rows to them.
