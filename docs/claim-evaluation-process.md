# How Evidence Hedge evaluates claims: the process so far

As of Nov. 9, 2026. `main` is at `9970e4a`; the last commit that changed the engine is `d6714e6`. This document covers the whole of it: what the engine does to a document, the code that does it, how the work has been tested and measured, and what is still open. It summarizes the specs and reports already in the repo and points to them; where they go deeper, they are the source.

Every constant, weight, threshold, ladder and template named below is **PROVISIONAL — not ratified**. Nothing has been ratified yet.

## Contents

1. [The idea](#1-the-idea)
2. [How we got here](#2-how-we-got-here)
3. [The pipeline, step by step](#3-the-pipeline-step-by-step)
4. [A worked example](#4-a-worked-example)
5. [How the work is checked](#5-how-the-work-is-checked)
6. [Where it stands](#6-where-it-stands)
7. [Open questions and known gaps](#7-open-questions-and-known-gaps)
8. [Appendix A: file map](#appendix-a-file-map)
9. [Appendix B: DELIB](#appendix-b-delib)

---

## 1. The idea

Evidence Hedge looks for the gap between **how firmly a claim is stated** and **what evidence the document shows for it**. It reads a document one sentence at a time, measures how sure each claim sounds, finds what the claim leans on, and flags the claims whose confidence the evidence cannot carry. A document scores well by stating its findings as firmly as its evidence allows, and no more.

It does not check facts, rate a publisher's reputation or decide whether a conclusion is right. A careful report on thin evidence can score well because it says so.

Five rules shape everything else:

- **Measurement is separate from judgment.** What a sentence *says* (is it a claim, how certain, how causal, how firm its advice, whose finding it is, what it links to) is measured the same way under every rubric. Only judgment (the evidence ladder, the ceilings, the severities, the weights, the verdict wording) belongs to the rubric. `checks/rubric-invariance.mjs` enforces the split.
- **The genre sets the standard, never the reading.** A research paper, a press release, a news story and a marketing page are each held to the evidence their genre can be expected to show. Mixed documents are judged as a mix (section 3.3).
- **Fixed rules, no model.** Lexicons, patterns and structure only. No LLM, no randomness, no clock. The same text always gets the same result. It all runs in the browser; the one outside service is Jina Reader, which fetches a linked web page when the browser can't download it directly.
- **Every number names its population.** A count in the verdict refers to the set it describes (`buildVerdict` in `analyze.js`; `checks/verdict-binding.test.mjs`).
- **Views never move judgments.** Claim records, the evidence map and the evidence section are built after `analyze()` finishes and read its output only. `analyze()` never imports them.

## 2. How we got here

| When | What changed | Commits |
|---|---|---|
| July 6 | **Rubric expansion.** The `RubricConfig` contract with posture-keyed ceilings and a `nullSeverity` function; a posture classifier; 13 document-level signals and disclosed-absence handling; the 1–10 `scoreDocument`; the results page's signals layer and verdict mark. | `b7f8788` baseline, `b6ff5b0`, `70976be`, `b4fad94`, `c304ceb`, `c547102`, `e483cd4`, `8947f15` |
| July 9 | **Input and deployment.** Link fetch through Jina Reader and a GitHub Pages deploy; the verdict-binding fix (flag counts bound to all claims, not the strong subset); the non-claim filter; PDF and DOCX upload with a shared normalizer. | `45ea018`, `ab6217f`, `8448b0a`, `fad9df7` |
| July 16 | **Column-aware PDF reading.** On the 61-page CADRE PDF, rows spliced across columns fell from 36.3% to 3.9%. | `1d9f402` |
| Oct. 28 | Link fetch fixed (reader host; PDF and DOCX links downloaded directly). The site moved to evidencehedge.org. | `617fd9d`, `7ade225` |
| Nov. 5 | **Measurement validity.** A 17-document gold corpus; ingestion validation; rubric-invariant measurement (certainty, claim function, causal register, advice strength); the document profile, design ceilings and causal overreach; a genre-invariant score (D1); hybrid genres. | `642afae`, `fc4bc3c`, `1964d1b`, `d6e0df8`, `cbf5b25`, `dc34856` |
| Nov. 7 | **Change set 1.** The frozen engine benchmarked against published human labels and three fixtures. No engine change. | `e3fc8a7` |
| Nov. 8 | **Change sets 2–5.** Published models scored beside the engine; attribution (whose finding each claim is); evidence linkage (explicit links from claims to evidence); claim records and claim comparison. Then the PDF ingest fix (two-column order, inline superscript markers), the Delgam site frame, The List and the Method page. | `6c16743`, `77588cf`, `ba7854a`, `513f33d`, `1c6f4eb`, `af3c2e7`, `9bc2011` |
| Nov. 8–9 | **The brief's evidence section.** First an evidence map (From / Via / To), then the four-verdict section that replaced it. The verdict headline now names advice as well as cause. | `4549f66`, `519810d`, `7178387` |
| Nov. 9 | **AEC corpus.** 1,584 research PDFs from architecture, engineering and construction firms, weighed on every commit; four fixes (A, B, C, D plus D2). | `d9b9820`, `7041657`, `2b773d2`, `070850f`, `852e7b8`, `2db51c4`, `d6714e6`, `0bb8cc6` |

From Nov. 7 on, each round of engine work has followed the same pattern: findings and predictions first, committed before any code; then the code; then a report on the new engine commit, side by side with the last one (section 5.1).

---

## 3. The pipeline, step by step

```
paste | upload | link
  └─ ingest: extract, strip chrome, normalize, validate          src/ingest/
       └─ profile: who speaks, what study, which genres           src/engine/profile/
            └─ route: rubric or hybrid judgment, posture          src/rubrics/route.js, hybrids.js
                 └─ analyze(document, rubric, posture)            src/engine/analyze.js
                      segment → extract claims → attribute → link evidence
                      → measure each claim → grade on the ladder → flag
                      → document signals → verdict → score → claim records
                           └─ read-only views: evidence map, evidence section, brief
```

The Method page (`src/pages/MethodPage.jsx`) describes the same process to readers as eight steps: read the text; decide what kind of document it is; find the claims; decide whose finding each claim is; find and grade the evidence; measure how strongly each claim is stated; flag claims that outrun their evidence; check the document as a whole, then score it. The genre changes the standard in steps 5, 7 and 8 only.

### 3.1 Reading the text (`src/ingest/`)

Three ways in, one code path out. Every path ends in the same normalizer, so an upload reads "as if pasted".

- **Upload** (`extractFile.js`): .pdf, .docx, .txt, .md. Legacy .doc is refused with a re-save hint. PDF and DOCX readers are lazy-loaded so paste-only users never download them.
- **PDF** (`extractPdf.js`, pdfjs-dist, worker bundled locally): column-aware reading order, detected per page. It finds gutters from an x-coverage histogram, reads bands column by column, and splits recursively where tables or figures cross a gutter. Small glyphs touching body text (citation markers, subscripts) stay inline as Unicode super- and subscripts (`comfort⁷,¹²`, `CO₂`); captions and image credits move to the end of the page instead of splicing sentences. An upload keeps its per-page text in `meta.pages`, so claims can be shown on their page (`src/engine/pages.js`).
  - July 16: spliced rows on CADRE 36.3% → 3.9%.
  - Nov. 8: share of GROBID's sentences found in the app's text: Allen 0.065 → 0.896, Satish 0.037 → 0.926, JCU 0.971 → 0.992.
- **Link** (`fetchLink.js`): if the host allows cross-origin reads and serves a document, the browser downloads it and runs the same extractors as an upload. Otherwise Jina Reader (r.jina.ai) returns plain text, and short, verbless, unpunctuated lines in the site-chrome lexicon are stripped (`chromeLines.js`).
- **Normalizer** (`normalizer.js`): rejoins end-of-line hyphenation (keeping true compounds such as "evidence-based"), strips running headers and footers (lines on 40% or more of pages), strips page numbers, collapses soft line breaks and un-splices URLs a margin column wedged into a word.
- **Gate** (`validateText.js`): nothing reaches `analyze()` that is a reader error, a bot-check wall, a linked page under 150 words, empty, or not English. The gate exists because a "Making sure you're not a bot!" page once scored 8/10. Every failure has one plain sentence telling the reader what to do (`failureCopy.js`).

### 3.2 Who is speaking and what study (`src/engine/profile/`)

`profileDocument(text, { sourceUrl })` runs once per document and is identical under every rubric.

- **Provenance** (`provenance.js`): one of peer-reviewed journal, academic press office, government, nonprofit research, firm or vendor, news outlet, trade press, individual or unknown. Read in order from the document's own venue block (DOI, journal line, received and accepted dates, never the reference list), then the link's host, or, with no link, the web address the document gives as its own (copyright line or contact email; AEC fix B), then text cues. It also records the publisher's host, so a URL on the publisher's own site counts as self-reported evidence (`url-own`), and a self-citation counter.
- **Design** (`design.js`): the study behind the text, one of 12: RCT, controlled experiment, quasi-experimental, cohort or longitudinal, repeated cross-sectional, cross-sectional, uncontrolled pre-post, case or qualitative, modeling, systematic review, narrative review, none reported. Only sentences that frame the document's own study count, never a design named to deny it ("unlike an RCT"). A derivative document (press office, news, trade press, firm, individual) inherits the design of the study it describes. A disclosed limitation never changes the design.
- **Design ceiling**: GRADE's start-low principle sets the strongest causal language and advice a design can license.

| Designs | Strongest causal register | Strongest advice |
|---|---|---|
| RCT, controlled experiment | direct causal | strong |
| Quasi-experimental, cohort, modeling, systematic review | conditional causal (hedged cause) | weak |
| Everything else, including none reported | correlational | weak |

- **Genre** (`genre.js`): four roles, each filled by at most one genre.

| Role | Question | Genre it can add |
|---|---|---|
| Speaker | Who publishes it | from provenance: firm or press office → corporate; news or trade press → journalism; journal, government or nonprofit → research; individual → general |
| Form | What it presents itself as | sponsored, press release, marketing → corporate; research paper, research-style report → research; reporting, column → journalism; blog → general |
| Stake | Whose interest the evidence serves, when unannounced | one firm in 60% or more of a story's attributions, or advocacy and industry-membership cues → corporate |
| Evidence | What study stands behind it | the document's own study or one it describes → research |

### 3.3 Routing to a standard (`src/rubrics/`)

`routeDocument` reads the genre roles. One genre routes to that rubric. Two or more make a **hybrid**: scenarios in `src/rubrics/hybrids.js` (11 of them, pure config) decide how it is judged.

1. The first matching scenario sets the **standard**: the ladder, tiers and ceilings the claims are held to. It belongs to whoever is accountable for the claims (a firm's own data is self-reported until checked; a newsroom's claims should trace to documented sources).
2. Every matching scenario **adds** its audits (extra document signals) and frameworks. A hybrid never drops a standard audit, so its score never exceeds the standard rubric's own score.
3. No match falls back to the speaker's standard, plus each other genre's audits.

`composeRubric` turns that into an ordinary `RubricConfig`, so `analyze()` and `scoreDocument()` need no special cases. Spec: `docs/hybrid-genres.md`.

The **posture** is the document's register within its genre (`classifyPosture.js`, lexicon and structure only, with every match recorded as an auditable span). A document with no posture signal is held to the rubric's **strictest** posture, never the most lenient. The branch screen (`src/pages/RubricBranch.jsx`) shows the reading and lets the user override genres and posture.

The four rubrics (`src/rubrics/*.config.js`):

| Rubric | Postures (default first) | Strictest | Ladder, rank 0 → 4 | Own results reach |
|---|---|---|---|---|
| Research | standard | standard | unsourced · anecdotal or opinion · secondary source · primary study · peer-reviewed or meta-analysis | primary |
| Corporate | marketing, thought leadership, research-like, press release | research-like | unsourced · internal assertion · self-reported metric · third-party or analyst · audited or verified | self-reported |
| Journalism | news, opinion, sponsored, unlabeled | unlabeled | unsourced · anonymous source · named attribution · documented record · independently verified | documented |
| General | experiential, authoritative | authoritative | unsourced · bare assertion · linked source · cited reference · primary or verified | primary |

### 3.4 Finding the claims (`extractClaims.js`, `nonClaimFilter.js`, `measure/segment.js`)

- **Apparatus out.** Everything after a References, Bibliography or Works Cited heading is the reference list, if the heading sits past 40% of the text and what follows reads as references. Anywhere in the body, affiliations, correspondence, received and accepted dates, licence and copyright lines and contributor blocks are dropped, and reference entries move to `analysis.references`.
- **Non-claims dropped**: disclosure and legal boilerplate, bylines and datelines, contents lines with dot leaders, navigation chrome (guarded so short real advice such as "Never mix bleach and ammonia" survives).
- **Non-claims demoted**: title-case headings (except under journalism, where headlines are claims) and figure and table captions.
- **Sentences**: split on terminal punctuation, keeping abbreviations and superscript markers intact. A short paragraph (12 words or fewer) that neither ends a sentence nor leads into the next ends at its paragraph break, so a heading no longer runs into the sentence below it (AEC fix D). A fragment with no verb and no closing punctuation is a label, not a claim (fix D2).
- **One extraction setting for every rubric**: sensitivity 0.55, minimum length 30 characters.

### 3.5 Whose finding is it (`attribution.js`, change set 3)

Every claim gets one label, with its cue spans and a confidence (high or low):

| Label | Meaning |
|---|---|
| own-current | the authors reporting their own data or analysis ("we surveyed", "our analysis", "Pew Research Center surveyed") |
| own-prior | the authors or publisher citing their own earlier work; the only label the self-citation count reads |
| cited-other | a finding attributed to another source (markers, "et al.", "according to X", a named organization with a research verb); unnamed appeals ("research shows") are low confidence |
| quoted | a direct quotation with a speech verb, or reported speech |
| unattributed | no source and no first-person method language |
| undetermined | cues conflict, or a pronoun subject has no antecedent; recorded with a reason, never escalates a flag |

Context counts: the section a sentence sits in, and the paragraph (a pronoun subject or "the study" takes the attribution of the previous attributed sentence). UnScientify's authorial-reference word lists are used verbatim (BSD 3-Clause, in `THIRD_PARTY_NOTICES.md`).

### 3.6 What each claim leans on (`linkEvidence.js`, `references.js`, change set 4)

Before change set 4, a claim met its evidence only if a citation sat in the same sentence. Now each claim gets explicit links, and every link records how it was made:

| Link | What it is |
|---|---|
| marker | numbered `[12]` and author-year citations, resolved to reference entries; a marker no entry matches is an unresolved-marker link, never a silent miss |
| footnote | a note number resolved to its note |
| caption | a "Source:" line covering the claims of its block, or a figure the claim points to |
| hyperlink | a URL or DOI in the sentence |
| section-scope | an own-current claim in a results or key-findings section inherits the document's own study |
| proximity | a same-sentence token the attribution doesn't route through; kept and labeled so reliance on it can be measured |
| speaker | a quoted claim links to its speaker |

Attribution decides the routes: cited-other and own-prior link through markers, footnotes and hyperlinks; own-current through section scope and captions; quoted to the speaker; unattributed through captions and footnotes. Each claim ends **linked**, **unlinked** (with the reason, instead of silently reading as unsourced) or **undetermined** (links point at both the document's own study and another source).

### 3.7 Measuring each claim (`src/engine/measure/`)

All four measures are identical under every rubric.

- **Certainty** (`certainty.js`): Hyland's (2005) hedges, boosters and absolutes only, never copulas or auxiliaries. Four tiers: hedged (weight 1), measured (2, the default for a plain declarative), assertive (3, a booster), absolute (4). A hedge with a booster cancels to measured. A negated booster ("does not prove") counts as a hedge.
- **Claim function** (`claimFunction.js`): method, own result, background, interpretation, recommendation or other. Method statements are never flagged. Own results rest on the document's own evidence and reach the rubric's in-document rung. In own-study documents, a sentence no cue claims takes its IMRaD section's function.
- **Causal register** (`causalRegister.js`): Yu, Li and Wang's (2019) four levels: none, correlational, conditional causal (cause under a hedge), direct causal. Causal force comes from Haber et al.'s (2022) rated linking words; a root rated 2.0 or higher (of 3) is causal. Change verbs (reduce, increase) count as causal only as verbs.
- **Recommendation strength** (`recommendation.js`): none, weak or strong (Li, Wang and Yu 2021). Respondents' reported advice ("62% say employers should…") is not the document's advice.

### 3.8 Grading and flags (`gradeEvidence.js`, `detectMismatch.js`, `analyze.js`)

**Grading.** The claim's linked citation tokens and evidence keywords are matched against the rubric's ladder, top rung first. No match puts it on rung 0 (unsourced). An own-result claim, or one with an own-study link, reaches at least the rubric's in-document rung.

**Ceilings.** Each rubric has a table per posture: for each rung, the strongest certainty tier that evidence may carry. Research, for example, is `[1, 2, 3, 4, 4]`: unsourced text may only be hedged; anecdotal evidence may be stated plainly; a secondary source may carry a booster; a primary study or better may carry an absolute. Corporate marketing is looser (`[2, 3, 4, 4, 4]`), corporate research-like is stricter (`[1, 2, 2, 3, 4]`).

**Three flags:**

| Flag | Fires when | Reader's words |
|---|---|---|
| unsupported-assertion | the tier exceeds the ceiling and the claim sits on rung 0 | "Stated as fact, nothing cited" |
| overconfident | the tier exceeds the ceiling and a source is cited, just too weak | "Overstates its source" |
| causal-overreach | an own result, interpretation or recommendation claims more cause, or gives firmer advice, than the design ceiling licenses | "Overstates its source" |

Exceptions and adjustments:

- **Method statements** are never flagged.
- **Disclosed absence.** A hedge, or an explicit absence ("declined to comment", "we did not verify", "in my experience"), lowers the null severity one step; if it falls below "flag", the unsupported-assertion flag is withdrawn.
- **Causal overreach is disclosure-invariant.** A limitations paragraph does not suppress it. A quoted, attributed statement is the source's claim, not the document's, and is not checked.
- **Posture gate** (general rubric): confident first-person experiential writing with no authority markers makes no expert claims, so every flag is cleared and the verdict says there is no evidence obligation.

### 3.9 Checking the document as a whole (`src/engine/signals/`)

Document signals never attach to a sentence; they feed the verdict, the score and their own section. Each rubric lists the ones it runs.

| From | Signals |
|---|---|
| Research | limitations absent · abstract outruns the body · secondary evidence dominates |
| Corporate | platitude density · self-citation dominance · register mismatch |
| Journalism | per-claim sourcing · label transparency · method disclosure · perspective plurality · right of reply (positive) · anonymous sourcing |
| General | posture gate |
| Shared (every rubric) | completeness gaps (nine reporting items from STROBE, AXIS, CHERRIES, AAPOR: confidence intervals, fieldwork dates, sample source, response rate, weighting, missing data, preregistration, data availability, funding or conflicts) · equivalence from non-significance · subgroup selection · covariate inconsistency · self-disclaimed causality (zero weight) |
| Hybrid scenarios only | study traceability · sponsorship disclosure · subject-source dependence · undisclosed interest |

### 3.10 The score (`scoreDocument.js`)

A deterministic 1–10 score of **evidential support**. It starts from a budget of 10 and subtracts:

| Component | Arithmetic |
|---|---|
| Claim flags | each flag's weight (unsupported 1.4, overconfident 0.9) × how many tiers it sits above its ceiling, summed, **divided by the number of claims**, × 5.5 |
| Causal overreach | 0.3 per step past the design ceiling, summed; capped at 2.5; not divided by claims |
| Document signals | 1.2 per flag-severity signal, 0.4 per note |
| Completeness | 0.15 per unreported item, capped at 0.9; 0.4 per reporting pattern |
| Platitudes | 0.15 each |
| Self-citation | 1.5 × the share of references and links naming the publisher (pool of 5 or more) |

It floors at 1 and caps at 10. Bands: strong 8.5+, carried 6.5+, mixed 5.0+, weak 3.0+, failing below.

- **Genre-invariant (D1).** The score never reads the selected posture. Claims are re-judged at the rubric's strictest posture. The posture sets only the verdict sentence and a one-line genre note. Marketing and press-release verdicts never say "The evidence supports…" below the strong band.
- **Provenance discount.** On a firm or press-office document, evidence from the document itself counts one rung lower.
- **No claims, no score.** A document with no claims is unscored instead of starting at a full 10 (AEC fix C).
- **Posture gate** gives 7.5, band carried.

### 3.11 What the reader sees

- **Verdict** (`buildVerdict`): "This research paper makes N claims, M of them strongly stated; of these, X rest on no cited evidence…". Every count is over all claims.
- **Evidence section** (`evidenceSection.js`, spec `docs/evidence-section.md`): "What each claim stands on". Four plain verdicts per claim (backed by a source; overstates its source; stated as fact, nothing cited; said cautiously, nothing cited), a bar, three claims to check first with a 12-word reason line from a template, where they are (by PDF page or twelfth of pasted text), and what the claims lean on. A list of words never shown to readers (rung, tier, ceiling, posture…).
- **Document profile and "How it was judged"**: provenance, design, genre roles, the standard and why, added audits, frameworks, and a provenance footer citing the standards behind each criterion (`src/engine/profile/standards.js`, `src/rubrics/frameworks.js`).
- **Claim records** (`claimRecord.js`, change set 5): every claim as a comparable record (causal strength 0–3, certainty, attribution, evidence links, scope markers, identification strategy, document stage) with each field marked resolved or unresolved and its source span. Six fields (population, exposure, comparator, outcome, timeframe, setting) wait for human coding. `compareClaims.js` reports how a restatement differs from its source, dimension by dimension, with no overall verdict.
- **The List** (`/list`, `src/list/`): readers can add a scored report. Only the listing's fields (company, industry, report type, report name, publication date), the score, the engine build and a SHA-256 of the text are sent, never the text (`checks/list.test.mjs`).

---

## 4. A worked example

The paragraph on the Method page, run through the engine at `d6714e6`:

> Hybrid work is transforming how companies grow. In our survey of 412 office workers, 61% said they were more productive at home. These results show that hybrid work causes higher productivity. According to industry commentary, hybrid schedules clearly improve retention. Employees who work from home two days a week may report less burnout (Bloom et al. 2024). Companies should adopt a hybrid policy now.

Routed to **research** (the evidence role, from its own survey; single genre), design **cross-sectional**, so the ceiling is correlational language and weak advice.

| Claim | Function | Certainty | Causal / advice | Whose | Rung | Result |
|---|---|---|---|---|---|---|
| Hybrid work is transforming how companies grow. | other | measured | none | unattributed | unsourced | unsupported assertion |
| In our survey of 412 office workers, 61% said… | own result | measured | none | own-current | primary | none |
| These results show that hybrid work causes higher productivity. | own result | assertive | direct causal | unattributed | primary | causal overreach, 2 steps |
| According to industry commentary, hybrid schedules clearly improve retention. | background | assertive | correlational | unattributed | anecdotal | overconfident |
| Employees who work from home… may report less burnout (Bloom et al. 2024). | background | hedged | none | cited-other | primary | none |
| Companies should adopt a hybrid policy now. | recommendation | measured | strong advice | unattributed | unsourced | unsupported assertion, and advice overreach 1 step |

Verdict: "This research paper makes 6 claims, 2 of them strongly stated; of these, 2 rest on no cited evidence, 1 cites sources too weak to carry them, and 2 claim more cause, or give firmer advice, than the study design supports."

Score: 10 − 3.39 (flags: 3.7 ÷ 6 claims × 5.5) − 0.90 (overreach: 3 steps × 0.3) − 0.40 (limitations absent) − 0.90 (eight completeness gaps, capped) = **4.4, weak**.

---

## 5. How the work is checked

### 5.1 The working method

- **Predictions before code.** Each change set starts with a "Step 0" commit of findings and predicted numbers (`checks/*-predictions.json`), before any code. When a first run shows something the predictions didn't cover, an addendum is committed before the next piece of code (for example `2db51c4`, `d365796`).
- **Reports on every engine commit.** `checks/reports/` holds a benchmark per engine commit (`benchmark-<sha>.{json,md}`) and a side-by-side comparison with the previous one (`benchmark-compare-<old>-<new>.md`), plus topic reports (attribution, links, records, pairs, PDF ingest, AEC fixes).
- **Nothing adjusted to force a match.** Misses stay in the reports as misses, with the reason.
- **Every number carries its provenance**: source, split, row count and label tier. Tiers are *predicted* (the engine's own expectation), *published-human* (labels from a published dataset) and *gold* (Kyle's hand labels). The benchmark fails if a metric lacks one.
- **Provisional until ratified.** Every judgment constant is marked in code and listed in a ratification table (`checks/reports/completion-cs2-5.md` §3).
- **Scope checks.** Reports state which files changed and confirm nothing outside scope moved (for example, change set 1 changed no file under `src/`).

### 5.2 The check suite

`npm run check` runs 26 scripts. All pass at `9970e4a` (run Nov. 9, 2026).

| Area | Checks |
|---|---|
| Contract and config | `validate-rubrics` (every rubric and hybrid scenario against the `RubricConfig` contract), `nullseverity-invariants` |
| Regression and score | `regression-baseline` (frozen known-good output), `score-invariants` (determinism, monotonicity), `score-ordering` (Allen above CADRE, Naava and HSPH; blocked text never scored), `verdict-binding` |
| Ingestion | `normalizer`, `pdf-column-fix` (real-fixture check on CADRE), `fetch-link` (mocked network), `ingest` |
| Extraction and measurement | `nonclaim-filter`, `rubric-invariance`, `register` (causal register, advice, certainty predicates), `posture-classifier`, `right-of-reply` |
| Profile and routing | `design`, `routing` (against corpus gold), `corpus` (integrity), `hybrid` |
| Attribution, linkage, records | `attribution`, `linkage`, `claim-record` |
| The brief | `brief-targets` (every field of Fixture C's brief, quotes stored as hashes), `evidence-map`, `evidence-section` (Fixture A against the design brief's recorded numbers), `list` |

### 5.3 The gold corpus (`fixtures/corpus.json`)

17 documents with working gold labels (rubric, posture, provenance, design, genres, hybrid scenario). Nine of them form two **restatement chains** that follow one study through the documents that repeat it:

- **Allen et al. 2016** (a controlled experiment on office air, *EHP*) → Harvard press release → ScienceDaily → GBA news → BD+C blog → Naava vendor page.
- **Gensler Global Workplace Survey 2024** (cross-sectional, a firm's own) → Gensler press release → BD+C news.

The rest: CADRE (Fixture A), Pew (Fixture B, as HTML and as the report), JCU timber pilot, CO2Meter on plants, HKS, Reading Jones 2025, ScienceAlert. Fourteen are cached locally; three supplied files are absent, so checks skip them. On those 14, routing gets the rubric right 14 of 14, rubric and posture 12 of 14 (BD+C's blog reads as unlabeled rather than opinion; Naava reads as research-like rather than marketing), provenance 14 of 14 and design 14 of 14.

### 5.4 Fixtures A–C and brief targets

| Fixture | Document | Read as |
|---|---|---|
| A | CADRE neuroarchitecture (a 61-page narrative review by an advocacy coalition) | research by an interest group, held to the corporate standard |
| B | Pew Research Center report on AI in the workplace | research |
| C | Gensler, *The Fandom Effect* 2026 (PDF, local only) | research by a firm, held to the corporate standard |

`checks/targets/` records what the brief showed for each fixture, field by field; a change that moves a brief on purpose re-records it in the same commit.

### 5.5 Benchmark against published human labels (`checks/benchmark.mjs`)

The engine is scored on sentences humans labeled in published datasets, assembled into one bundle by the research repo. Published models are scored beside it on identical rows, after dropping every row a model trained on. Values at engine `d6714e6`:

| What is measured | Dataset | Engine | Published model, same rows |
|---|---|---|---|
| Causal register | Yu 2019, PubMed findings (3,051 rows) | macro-F1 0.708 | Yu 2019's model 0.873 (3,045 rows it didn't train on) |
| Causal register, never-seen rows | Yu 2019 (610 rows) | macro-F1 0.689 | — |
| Causal register, press releases | Yu 2020, EurekAlert (2,073 rows) | macro-F1 0.626 | Yu 2019's model 0.831 |
| Certainty | Pei 2021 (1,551 rows) | Spearman 0.599 | certainty-estimator 0.616 vs. engine 0.635 on 331 eligible rows |
| Press release vs. abstract strength | Wright & Augenstein 2021 pairs (663) | macro-F1 0.454 | Yu 2019's model 0.577 vs. engine 0.450 on their 563-pair test split |
| Causal sentence detection | CESSC social-science sentences (1,058) | precision 0.772, recall 0.473 | CESSC's BERT 0.890 vs. engine 0.508 macro-F1 on its test split |

The side-by-side values with no other date are from `checks/reports/sidebyside-1c6f4eb.md` (engine `1c6f4eb`); the engine's sentence-level numbers have not moved since. The Yu 2019 rows are split into those the causal lexicon was tuned on, held out, and never seen, so tuning can't flatter the result. SPICED (paraphrase consistency) is skipped until Kyle reviews its fields.

Standing misses against change set 1's predictions: Fixture C's unsupported share (predicted 0.65–0.85, now 0.537, moved by linkage); Pei's row count (615 rows carry only aspect labels) and its Spearman (predicted 0.25, actual 0.599, far better than predicted); Wright macro-F1 above its range (0.454 vs. 0.25–0.45) and both strength accuracies below theirs. The predicted-exact Yu numbers miss by 0.001–0.002. Fixtures A and B no longer match their exact predictions because later fixes moved them on purpose.

### 5.6 The research repo (`evidence-hedge-research`, private, GPL-3.0)

It is GPL-3.0, like several of the tools it runs, and holds the Python environments the app doesn't need. It holds:

- **Reproductions** of the published tools, each in its own pinned environment (change set 2): Yu 2019 0.873 vs. 0.883 reported (match); CESSC 0.890 vs. 0.8855 (match); certainty-estimator r 0.678 vs. 0.70 (0.002 outside tolerance, but inside the paper's own 5-seed range); UniCausal 0.745 vs. 0.701 (not comparable: the paper's figure includes a paid corpus); UnScientify runs cleanly.
- **The unified evaluation bundle** (`build_unified_eval.py`): sentence matching, 80/10/10 splits, seed 20261108.
- **GROBID 0.9.1** as an independent PDF reader to measure the app's text coverage and reference parsing (run natively; see `reports/deviations-cs4.md`).
- **UnScientify cross-check** of attribution: 0.753 agreement on the 251 units the app attributes, 0.179 on all 1,053 (no prediction was registered).
- **POTATO annotation setup** for gold claim records: 20% double-coded, 20% blind holdout, seed 20261108.

### 5.7 The AEC corpus (`checks/data/aec/`, gitignored)

1,584 freely downloadable research reports from architecture, engineering and construction firms (from the BD+C 2026 Giants 400 top 100), collected Nov. 8 to look for inconsistencies at scale. `scripts/weigh-folder.mjs` weighs each PDF twice, as a link and as an upload, and a third time to confirm the result repeats exactly. Report: `checks/reports/aec-fixes-d6714e6.md`.

| Measure | Before (`519810d`) | After (`d6714e6`) |
|---|---:|---:|
| Weighed | 1,555 | 1,552 (3 refused, not English) |
| Repeat exactly | all | all |
| Read as a press release (linked) | 295 | 33 |
| Publisher unknown (uploaded) | 985 | 433 |
| Judgment differs, linked vs. uploaded | 1,048 | 510 |
| No claims, yet scored | 6 | 0 |
| Claims | 419,316 | 426,027 |
| Score exactly 1.0 (linked) | 720 | 699 |

The four fixes: A, a dateline cue counts once and only near the top; B, an upload's own web address comes from its copyright line or contact email; C, refuse non-English and give no score for no claims; D and D2, headings end at their paragraph break, contents lines drop, and fragments with no verb and no closing punctuation are labels. Of 37 predictions, 32 hit, one hit partly and four missed. Fix D's misses (Fixture C's claim counts and the corpus claim total, both too high, and a contact block in Fixture B still led by its heading) led to the D2 addendum; the Fixture B example still misses after D2.

---

## 6. Where it stands

Fixtures at engine `d6714e6`:

| Fixture | Standard (judgment) | Posture | Claims | Unsupported | Overconfident | Overreach | Score | Signals |
|---|---|---|---|---|---|---|---|---|
| A, CADRE | corporate (firm research) | research-like | 240 | 150 | 3 | 14 | 1.0 | register mismatch, undisclosed interest |
| B, Pew | research | standard | 237 | 7 | 0 | 3 | 7.4 | limitations absent, completeness gaps |
| C, Gensler | corporate (firm research) | research-like | 417 | 224 | 4 | 21 | 1.0 | register mismatch, completeness gaps, limitations absent, undisclosed interest |

- All 26 checks pass at `9970e4a`. The AEC fixes report records `npm run build` and the benchmark guards passing on `d6714e6`.
- `main` matches `origin/main` at `9970e4a`; GitHub Pages deploys `main` to evidencehedge.org on every push.
- On Fixtures A–C at `1c6f4eb` (851 claims), the engine abstained openly where it could not tell: 559 claims unlinked (522 because nothing in or around them was a source), 2 attributions undetermined, 100 attributions at low confidence.

---

## 7. Open questions and known gaps

### Waiting on Kyle's labels

Nothing below has gold yet, so precision is unmeasured:

- Attribution precision: a 100-claim sample (`checks/attribution-review.mjs`, seed 20261108).
- Link precision: a 50-link sample (`checks/link-review.mjs`).
- Fixture reviews: per-flag precision, miss rate and non-claim leakage (`checks/fixture-review.mjs`, then `fixture-review-score.mjs`).
- Gold claim records from POTATO (`checks/gold-records.mjs`).
- The SPICED loader, after its fields are reviewed.
- The review sheets in `checks/data/review/` are stale after the AEC fixes and need re-exporting before anyone labels them.

### Calibration decisions (Kyle's call)

- **The floor.** 699 of 1,548 scored AEC reports sit at exactly 1.0. The flag rate dominates, and a firm's report usually states a finding with the evidence in a chart beside it. Recalibrating the flag rate, or crediting chart-backed figures, changes what the score means.
- **Few claims, firm scores.** The score is a rate, so a report with a handful of claims can land anywhere; four AEC reports score 6.5 or higher on 15 claims or fewer.
- **Ratification.** Every constant in the ratification table, the ladders, the ceiling tables, the band thresholds and the templates.

### Known engine gaps

- **Garbled PDF text** goes through unnoticed: bold printed by overprinting (every letter tripled), fonts with no text mapping (control characters).
- **Links on file hosts** (CloudFront, Contentful, Autodesk's asset host) read the host as the publisher; the own-address rule runs only without a link. 22 linked AEC reports read as unknown.
- **"Foundation"** reads as a nonprofit cue: 78 firm reports read as nonprofit research when uploaded, 71 of them because of it (in AEC it is usually a building's foundation).
- **Claim function outside the overreach check.** "Hybrid work causes higher productivity across every industry", on its own, now reads as *other* (it read as a method statement at `1c6f4eb`), and overreach checks only own results, interpretations and recommendations, so its direct causal language goes unchecked.
- **An overreaching source, echoed.** A quoted, attributed claim is the source's, so a document that repeats a source's overreach in quotes is not flagged for it.
- **Grading by link target.** A marker's resolved reference entry is recorded but not graded; grading by what the target actually is would be a ladder change (planned as change set 6).
- **Sourced, not yet measured** (`docs/hybrid-genres.md`): animal-to-human inference, health-story criteria (costs, harms, alternatives), fit between a cited study and the product, independent expert voices, text reused from a press release, research-process standards, material connections in endorsements.

### Work not on `main`

- **EHP reference lists** (branch `claude/vibrant-easley-52c5bf`, in a worktree): five commits on Nov. 8 with predictions, two addenda, the code (engine `63124ff`: small-caps headings, dated entry heads, Vancouver surnames) and a report. Not merged.

---

## Appendix A: file map

| Path | What |
|---|---|
| `src/ingest/` | extraction (PDF, DOCX, link), chrome stripping, normalizer, the validation gate, failure copy |
| `src/engine/analyze.js` | the entry point; orchestrates every step, builds the verdict |
| `src/engine/profile/` | provenance, design and ceilings, genre roles, shared standards |
| `src/engine/measure/` | certainty, claim function, causal register, recommendation, segmentation |
| `src/engine/extractClaims.js`, `nonClaimFilter.js` | sentences and non-claims |
| `src/engine/attribution.js`, `linkEvidence.js`, `references.js` | whose finding; links to evidence; reference parsing |
| `src/engine/gradeEvidence.js`, `detectMismatch.js`, `disclosure.js`, `nullSeverity.js` | grading and flags |
| `src/engine/signals/` | document signals by origin |
| `src/engine/scoreDocument.js` | the 1–10 score |
| `src/engine/claimRecord.js`, `compareClaims.js` | claim records and comparison |
| `src/engine/evidenceMap.js`, `evidenceSection.js`, `pages.js` | read-only views for the brief |
| `src/engine/lexicons/` | every word list, each in its own file |
| `src/rubrics/` | four rubric configs, hybrid scenarios, frameworks, routing |
| `src/pages/MethodPage.jsx` | the public explanation; its figures come from the engine and the committed benchmark |
| `docs/` | specs: hybrid genres, evidence section, The List's table |
| `checks/` | the suite, the benchmark, review exporters, predictions |
| `checks/reports/` | every report since change set 1 |
| `checks/targets/` | recorded briefs and evidence-section targets |
| `fixtures/` | the gold corpus list and lock; cached text is gitignored |
| `scripts/` | corpus fetcher, folder weigher, causal-register evaluator |

## Appendix B: DELIB

`decision-precision/` holds DELIB, a separate app that shares only this repo: a causal-deliberative graph tool for planning and policy decisions. It generates branching graphs of decisions and consequences and grades causal claims against literature through an LLM interface, with a decision layer specified in `decision-precision/docs/decision-layer.md`. Its evidence grades and LLM grading are not connected to Evidence Hedge's engine, which uses no model.
