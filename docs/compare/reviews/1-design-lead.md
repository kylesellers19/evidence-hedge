# Review 1: design lead (screens ef77910)

**Verdict: not ready. The marks are clean, but both cover tests fail in part: the lead and grid show gaps that like-with-like takes back, the text never says which flag each firm leans toward, and phones lose the verdicts.**

## Cover tests (Arup US with Mortenson, WSP and JE Dunn Construction)

Grid only (1440 and 390 answer alike):
- *Who scores higher on each type:* partly. "All chosen types" answers it (1.8, 3.6, 1.8, 3.2). Industry or market reports (Mortenson 124, JE Dunn 111, Arup US 2) are collapsed, so JE Dunn reads "No reports" on every type shown and the source of the gap is hidden.
- *Most common flag:* passes on the printed numbers (cite nothing, 65 to 73 per 100). The bars say otherwise (finding 7).
- *Is any firm changing:* fails. WSP's "1.8 a year" (p 0.80) is set and drawn like Mortenson's "5.2 a year", which passes.

Text only (same at both widths):
- *Score:* partly. Sizes and intervals are there, but the JE Dunn gap is never qualified.
- *Flags:* fails. No sentence says what each firm leans toward.
- *Change:* partly. Mortenson's falling score is there; its cite-nothing rise (5.2 per 100 a year, 3.0 to 7.4, Differs) was cut.

Empty panels: at 1440, yes. Three panels left to right, the live one ruled in ink, "Choose a firm." by the button. At 390, no: the first screen holds step 1 only, and Compare sits near 1,260 px.

## Findings

1. **Fix now. The lead states gaps the text takes back, and the cap cuts the caveats.** The lead says Arup US scores lower than Mortenson and JE Dunn; then the Mortenson gap "narrows to 0.1 points". Uncapped, `narrate()` also writes "Mortenson publishes more industry or market reports, which score higher across The List", the same line for JE Dunn, and "Comparing like with like leaves too few reports of the same types (2 and 111) to tell". `cap()` drops all three and keeps the protected trend-gap sentence, which repeats Mortenson's trend against Arup US's 0.0. Fix: never cut the like-with-like or mix sentence for a firm whose score differs; open the lead with "Across all their report types"; drop a trend-gap sentence when the chosen firm's trend is level. Whether the type-adjusted score should lead is **Open for Kyle**.

2. **Fix now. The grid hides the type behind the headline.** `comparable()` (`Results.jsx`) needs the chosen firm and another to both reach 5, so a type holding 92% of Mortenson's reports and all of JE Dunn's is collapsed. Show every type where any chosen firm has 5; print thin cells as a count, no median.

3. **Fix now. "Can't be told apart" sits beside p < 0.001.** Cite nothing vs Mortenson, 1.1× (1.1 to 1.2); cite too little vs JE Dunn, "2.1 to 3.9 times as many". They fail only the size bar; the reader sees a contradiction. Say so in "In words" ("under the 1.25 times worth stating"). A separate verdict word is **Open for Kyle**.

4. **Fix now. The text skips the flag question.** Add one sentence from the flag rows ("For every firm, most flagged claims cite nothing: 65 to 73 per 100 claims…"). Merge a firm's passing trends into one sentence so Mortenson's cite-nothing rise survives.

5. **Fix now. The time grid doesn't show which trends pass.** Draw the line and bold the slope only when the trend passes; otherwise dots and a grey slope.

6. **Fix now. Phones.** Each grid opens with a stacked list of five names: `.eh-compare .cmp-row { display: block }` follows `.cmp-head { display: none }` at equal specificity; use `.cmp-row.cmp-head`. The forest clips Adjusted p, Reports, Verdict ("Adju") and group names, hidden inside its own scroll region. At ≤600 px, make each row two lines: name and verdict, then plot, estimate, p, reports.

7. **Fix now. Flag bars change scale by row, unlabeled.** `niceMax` gives 0–100, 0–1 and 0–10, so JE Dunn's 0.5 draws about as long as its 67. Keep one scale per row; print each row's end value at the track's right. The unlabeled ink tick (the chosen firm's value) reads as one more report; label the first one "Arup US".

8. **Fix now. Forest details.**
   - No axis: add end values and "lower / higher" per group.
   - "Too few reports" rows still plot an estimate (JE Dunn −1.4, from 2 reports): drop it.
   - Double negatives: "−0.3 to 0.7 points lower", "rising −0.7 to 5.3", and in the text "0.4 points lower (−0.4 to 1.5)". Write "0.7 lower to 0.3 higher".
   - "0.5×" sits beside "Mortenson's 0.9 to 3.3 times as many": orient both the same way.
   - `.eh-data th` (site.css 291) inks every row name's underline, so `tr:target` barely shows; `is-cited` has no style. Use a hairline and mark the 8 cited rows of about 40.

9. **Fix now. Stacked labels.** "Choose a firm" over "Search firms": label inputs by the panel heading. "Per 100 claims weighed" repeats the section head. Four time rows repeat "1999–2026 / 85 undated reports left out": years under the first chart, the count once. The time key runs 12 words; try "A dot for each dated report; the line, its trend."

10. **Fix now. Panels.** The inactive panel 2 shows the full firm list in grey, reading as a repeat of panel 1; Report types shows disabled All and None. Show headings only until a panel is live. On phones, cap the open list at four or five rows.

11. **Open for Kyle.**
    - The "THE LIST" kicker is an eyebrow by your rule, but it's the site's pattern (List, Method, Legal): decide for every page.
    - The page shows two builds, 5b40af6 in the scope line and ef77910 in the footer, with nothing saying why.
