# Review 2: three readers (screens ef77910)

Sources: the 1440 and 390 px screens, the recorded texts, `checks/scratch/verdicts.txt`, the Method section, `list-rows.json` and a scratch run of `narrate.js` with no cap. Where review 1 has a finding, I cite its number.

## 1. Arup US's communications lead

**Worked.** The closing line keeps the firm's work out of it. The "All firms" column shows 73 "cite nothing" per 100 claims is close to the norm (71). "Can't be told apart from WSP's" is safe to quote.

**Failed.**

1. **Fix now. The heading reads as a verdict on Arup US, and nothing near it says why.** On every type row shown, Arup US is above Mortenson (research reports 1.9 against 1.4), and JE Dunn has no reports. The answer, industry or market reports, is collapsed, and the sentences that give it are cut (review 1, #1 and #2). Here a comms lead gets stuck.
2. **Open for Kyle. "Comparing like with like" turns on 2 reports.** scoretype-1 (243 and 135) pools three types. Research reports alone (228 and 10) put Arup US 0.2 higher. Arup US's 2 market reports against Mortenson's 124 put it 2.2 lower and drag the result to −0.1. The test applies the 5-report minimum to totals; the grid applies it per type. Apply it per type here too, and give the sentence its report counts.

## 2. A business-development lead at Mortenson or JE Dunn

They would lift the heading, "351 and 135 reports" and "Arup US's 1.4 times as many" claims that claim more cause than the study shows.

**Worked.** Every sentence carries its interval. Where nothing differs (Arcadis, Suffolk), one sentence says so, and no banned word appears.

**Failed.**

1. **Open for Kyle, first. City editions count as separate reports.** Mortenson's 124 market reports are 16 quarterly editions of its Construction Cost Index, one copy per city, with near-identical scores in each (Q3 2022: seven copies, all 4.1). JE Dunn's 111 are 7 editions of "The Look Ahead". The intervals and p values treat every copy as independent, so "0.9 points lower than JE Dunn Construction's (0.6 to 1.1; 351 and 111 reports)" rests on about 7 documents. Decide what a report is: resample and shuffle editions, or count a series once. Until then, the scope line should say how many are city editions.
2. **Fix now. The flag difference skips the like-with-like check.** With report type accounted for, "1.4 times as many" becomes 0.9 the other way, p 1.00 (flagtype-overreach-1), and the text never says so. Give flags the score's rule. Whether "Differs" needs both tests is Open for Kyle.
3. **Fix now. The forest hands out p values the verdict disowns.** 14 of the 33 "Can't be told apart" rows in largest-four have an adjusted p under 0.05, so "p < 0.001" on Arup US's cite-nothing rate is easy to quote (review 1, #3). Too-few rows also print numbers: −1.4, 1.3× and −0.5 per 100 for JE Dunn, from 2 Arup US reports. Print a dash.
4. **Open for Kyle. The ratio band hides large gaps in common flags.** SmithGroup against Mortenson on cite nothing, 79 and 65 per 100 (p 0.001), can't be told apart because 0.82 is inside 0.8 to 1.25. Near 70 per 100, gaps of about 15 pass without a word. Consider a floor in claims per 100 for flags that common.

## 3. A journalist checking two sentences

**"Across all their report types, Arup US's reports score a typical 1.7 points lower than Mortenson's (95% interval 1.4 to 1.9; 351 and 135 reports)."** "Numbers" lands on score-1: −1.7, "1.4 to 1.9 points lower", p < 0.001, 351 and 135, Differs. It checks, with four snags:

- **Fix now. The row reads backwards.** "Mortenson, −1.7, 1.4 to 1.9 points lower" reads as Mortenson lower. Ratio rows name the firm ("Arup US's 1.2 to 1.8 times as many"); score, trend and gap rows should too ("Arup US 1.4 to 1.9 lower").
- **Fix now. Counts don't reach the reports.** Forest counts aren't links. The grid's links open `/list?firm=…` with no `show=audit` and no chosen types, so The List shows another count when types were left out or a firm has reports on another build. A build filter on The List is Open for Kyle.
- **Fix now. Adjusted for what?** Put the family size in each group label ("Score, points: 3 tests").
- **Fix now. On a phone, no interval number is visible** (review 1, #6).

**"Since 2016, Mortenson's scores have fallen by about 0.5 points a year (0.2 to 0.6)."** trend-score-1 matches (−0.5, p 0.001, 135 reports), but the sentence misleads. A reader multiplies it out to 5 points; Mortenson's 2016 median is 2.5 and its 2026 median 1.8. Scores rose to 4.7 in 2024 and fell after; the slope comes from the 2021 to 2026 Cost Index editions. "2016" is in no row, and the charts span 1999 to 2026 with no year marks. The cut line "risen by about 5.2 per 100 claims a year" (cite nothing) has the same flaw: yearly medians fall from the 80s (2017 to 2020) to 43 (2024), then return to 80.
- **Fix now.** Drop "Since {first year}". Give the span and where the reports sit ("2016 to 2026, most from 2021"), and mark the first and last years under the charts.
- **Open for Kyle.** Call a trend a rise or fall only when a straight line fits.
- **Fix now.** Give the trend-gap sentence a direction: "Mortenson's scores fall about 0.5 points a year faster than Arup US's."

**Fix now. Rechecking later.** The scope line names the build but not the date, and the address recomputes on today's List, so a quoted figure can't be found again. Add "The List as of Nov. 27, 2026".
