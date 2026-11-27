# Review 3: as an adversarial data scientist trying to break every number

Map 19ad617a8af2, engine 90fa8b3, window 2023-01-01 to 2026-11-26. For each line of
attack: what breaks, how badly, and what was done. Numbers come from
`reports/record/*-19ad617a8af2.json` in the research repo.

## Denominators

- **New findings is volume-weighted.** The share counts result-stating claims, so a long
  survey report earns more than a short one. One organization holds 38% of the window's
  new findings with 5 documents. *Stated* in the method view's objection; the Claims
  view shows the per-finding rate beside it. Not "fixed": the spec defines contribution as
  a share of the record's new findings.
- **Citation bases were mislabeled.** "0 of 294 earlier documents" summed over an
  organization's documents read as distinct documents. *Fixed:* "possible citations".
- **Coverage is "found in the sources searched".** One discovery source with results
  (Infini-News), so capture-recapture has nothing to work with. *Stated* on the page
  ("a floor") and in Method; coverage is Pending until Gate 1 for the map finishes.

## Censoring and exposure

- **Recent documents have had less time to be cited.** "Cited by later work" divides by
  later documents on a shared sub-question, which handles exposure in count but not in
  time: a December 2025 report has had months, a 2023 report years. With zero
  cross-organization citations anywhere, the bias has nothing to act on today. *Stated.*
- **Staying power is undefined for the five newest documents** (no five successors).
  Those organizations show "Too few to estimate", not zero. *By design.*
- **Half-life is censored** when the last restatement is within a year of the window's
  end; many restatements are a firm's annual edition repeating itself, so the curve is
  lumpy at one year. *Stated* in method.md.

## Small counts

- Rates are pooled (hierarchical beta-binomial). The first version, an empirical Bayes
  plug-in, **collapsed** when every count was zero (a = b = 0; every interval 0 to 0).
  *Fixed:* hyperparameters integrated over a grid.
- Shares use a Dirichlet posterior that treats findings as independent; findings within
  one document are not. Intervals for organizations with one long document are too
  narrow. *Stated* (method.md §2). A document-level bootstrap would widen them; not done.

## Matcher error flowing into every estimate

- No new-or-earlier decision has a gold label yet (sheet of 150 waiting).
- **Sensitivity, measured:** moving both thresholds half a point looser (3.0/3.5) makes
  69% of findings new instead of 92%; half a point stricter (4.0/4.5), 98%. The
  organizations' **order barely moves** (Spearman 0.99 and 1.00 against the thresholds in
  use) and no share moves more than 4.7 points. So levels are fragile, ranks are not.
  *Added* to the method view.

## Validity of the sub-question grouping

- Silhouettes are low (map 0.16; sub-questions chosen by silhouette on a sample).
- Some groups are boilerplate, not questions: award announcements ("score · statements ·
  awarded"), company histories. They take claims away from real groups.
- Membership was too loose (69 of 86 documents "on" one group). *Fixed* at review: a
  document is on a sub-question only when a tenth of its claims are.
- The question cluster itself was chosen after one rule change (gates/map.md): the first
  rule picked a leftover bin.

## Syndication

MinHash (Jaccard 0.8 on word 5-shingles, seed 1) groups wire copies. Separate write-ups
of one press release stay separate, which is the intent. Not testable on this map until
links exist.

## How the corpus was assembled

The strongest threat. The corpus is what AEC firms post on their own websites, collected
over two days in November 2026, plus some form-gated reports. The consultancies, software
vendors' analysts, trade associations, universities and journals that publish most of
this question's research are absent unless a firm posted their report. Every "new" and
"first" verdict is relative to that field. The two-list estimate of earlier literature
(map documents vs works the map cites) found **no overlap**: the map's documents cite a
literature that is not in the map at all. *Stated* on the page (Method, "What these
figures cannot show") and here.

## Simpson's paradox across sub-questions

Organizations write on different sub-questions, and sub-questions differ in how often a
finding repeats an earlier one. Standardizing each organization's new-finding rate to the
map's sub-question mix: rank correlation with the raw rate **0.63**, and **9 of 45** pairs
of organizations swap order. *Stated* in the method view; the headline is the share of
the record's new findings, not this rate.

## How each measure could be gamed

| Measure | Game | Counterweight |
|---|---|---|
| New findings | Publish longer reports with more figures | Claims view shows the per-finding rate; flags shown beside |
| New findings | Reword others' findings | The matcher's anchor rule catches reused figures; reworded ideas count as new (stated) |
| Cited by later work | Cite yourself | Own-organization citations do not count |
| Earlier work cited | Cite everything | Counts only earlier map documents on shared sub-questions |
| Coverage | Wire-release blitz | Syndicated copies count once |
| "First" claims | Claim priority vaguely | A claim stating nothing checkable is "not checkable", never "not contradicted" |
| Staying power | Write on what others will write about next | Not gameable without knowing the future; pooling also mutes it |

## The strongest objection a firm's analyst would send

> "Your 'new findings' share rewards report length and figure density, and 'new' is
> decided by a paraphrase matcher nobody has validated, against a corpus that holds only
> what our competitors post on their websites, not the consultancies and academics who
> actually publish on construction technology. You are ranking us against an incomplete
> field with an unvalidated ruler, and calling the result a record."

**Answer, on the page (Method):** new findings measure contribution to this written
record, not truth or originality of ideas; only result-stating claims count, the engine's
flags sit beside them, and the threshold sensitivity shows ranks hold while levels move.
The field's limits are stated, coverage is labeled a floor, and no organization is named
until every input passes its gate. **Not fixed:** the corpus. Widening it to non-firm
publishers is the single change that would most improve every number.
