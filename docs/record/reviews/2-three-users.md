# Review 2: three users working in the browser

Run 2026-11-27 in the app's built-in browser (Chromium, 1024 px, dark theme) against
the local preview of the build at 28f54b0, map 19ad617a8af2. Each step is a real action
on the page; hesitations are marked ⏸ with what caused them.

## A communications lead building a board slide on coverage and fidelity

| # | Action | What happened |
|---|---|---|
| 1 | Open /record | Question, provisional line, selector on Organization 1 (most documents in the window). |
| 2 | ⏸ Look for "our" organization in the selector | 18 options, Organization 1 to 18, no names. **Cannot tell which is theirs.** |
| 3 | Read the sentence | "...Its news coverage is not measured yet." Clear. |
| 4 | Hover "Share of coverage" | Definition appears: share of independent news articles, wire copies once. |
| 5 | Read the row | Pending, "discovery not run". |
| 6 | Read "Pickups kept intact" | Pending, "matching not run". The fidelity number the slide needs does not exist yet. |
| 7 | Scroll to the figure | "Share of coverage is not measured yet, so this figure ... waits for it." |
| 8 | Open Method | Gates table: News links Pending, Claims repeated in articles Pending. |
| | **Outcome** | Nothing for the slide. The page is honest about why, in three places. |

Fix taken: none possible on the page; coverage arrives with Gate 1 for the map, and
naming is Kyle's decision. Open item: a communications lead will only use this page once
it names organizations.

## A research director choosing next year's study

| # | Action | What happened |
|---|---|---|
| 1 | Scroll past the statement | The four view names under the figure. |
| 2 | ⏸ Choose a view | "Open ground" is the right one, but nothing on the page says so until it is open. |
| 3 | Click Open ground | The table opens in place: every sub-question with its documents and years of past. Demand gap Pending (counts not in yet). |
| 4 | ⏸ Read the labels | "fi · scheduled maintenance · workflow" and "ap · republic · proud" were unreadable. **Fixed:** label words now need three letters or more. Some labels stay hard ("score · statements · awarded" is award boilerplate). |
| 5 | ⏸ Read document counts | 69 of 86 documents were "on" one sub-question, so every sub-question looked crowded. **Fixed:** a document is on a sub-question only when a tenth of its claims fall there (now 2 to 26 documents each). |
| 6 | Look for what kind of evidence exists | Not shown per sub-question. **Fixed:** each row's basis now lists its documents' designs ("6 documents (4 cross-sectional survey, 1 case study, 1 forecast)"). |
| 7 | Open Claims for one organization | Claims, findings judged, new, made earlier, flagged; designs with median stated sample size. Useful for "who already surveyed this". |
| | **Outcome** | With demand counted, the sorted table answers the question. Until then, the design mix and depth already show which sub-questions have no measured work. |

## A journalist checking one "first" claim

| # | Action | What happened |
|---|---|---|
| 1 | Click "First" claims | One row: Organization 13, "nothing stated", Not checkable, "It states no method, population or setting". |
| 2 | ⏸ Read the summary | "1 claims to be first..." **Fixed:** "1 claim". |
| 3 | ⏸ Try to find the claim | The row gives "Claim 7ed832cb", a hash. No document, no text: the anonymity rule. |
| 4 | Select Organization 13 | Its row on "First" claims contradicted says "1 not checkable"; the Claims view shows one cross-sectional survey of 200. |
| | **Outcome** | The journalist learns the method was applied and why the verdict is "not checkable", but cannot check the claim themselves. |

Open item: the "first" check found one claim in 32 window documents. Grey literature in
this field rarely claims priority in the words the check reads ("the first survey of
..."). The check is narrow by design (exact matching); Kyle may want to see the 186
sentences with "first" that it set aside, in the labeling sheets.

## Across the three

- Every control was reachable by keyboard and showed focus (`checks/record-browser.mjs`).
- No one used the figure, because it is empty until coverage exists.
- The provisional line was read by all three; none of them mistook a pending value for a zero.
