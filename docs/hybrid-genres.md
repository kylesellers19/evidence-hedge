# Hybrid genres

Many documents mix genres. A firm publishes a research report. A university press office relays a study. A trade story is built on one firm's survey. A sponsored post wears a news format. Evidence Hedge now finds the mix on its own, judges it as a mix, and shows how.

Everything here is **PROVISIONAL — not ratified**: the constants, the scenario table, the new signals and their severities.

## How a document is read

`profileGenre` (`src/engine/profile/genre.js`) reads four roles. At most one genre fills each role:

| Role | Question | Read from | Genre |
|---|---|---|---|
| Speaker | Who publishes it | provenance kind (host first, then text cues) | firm, press office → corporate · news, trade press → journalism · journal, government, nonprofit → research · individual → general · unknown → none |
| Form | What it presents itself as | text markers and the link's path, in this order: sponsored, press release, research paper (IMRaD), reporting (byline and attributions), column, research-style report (survey vocabulary), marketing, blog | sponsored, press release, marketing → corporate · research paper, research-style report → research · reporting, column → journalism · blog → general |
| Stake | Whose interest the evidence serves when the speaker doesn't announce it | one firm in ≥ 60% of attributing sentences (news, individual or unknown speakers), or ≥ 2 advocacy or industry-membership cues (nonprofit, individual or unknown publishers only; never a journal or government) | corporate |
| Evidence | What study stands behind it | `profileDesign`: the document's own study or one it describes | research |

The genres that fill the roles, in role order (speaker, form, stake, evidence), are the mix. One genre means that rubric applies as written. Two or more makes it a hybrid.

Two guards keep site chrome from creating false hybrids. A weak form (marketing calls to action, reporting without a byline) counts only when nobody known is speaking. A stated non-advocacy policy ("nonadvocacy fact tank") cancels advocacy cues.

## How a hybrid is judged

Scenarios live in `src/rubrics/hybrids.js` as pure config. A scenario matches when the document carries all of its genres and its `when` test on the roles holds.

1. **The first match sets the standard.** The standard is the evidence ladder, tiers and ceilings the claims are held to. It belongs to whoever is accountable for the claims: a firm's own data is self-reported until checked (corporate), a newsroom's claims should trace to documented sources (journalism), and a document in research form gets the research ladder.
2. **Every match adds its audits and frameworks.** A hybrid runs every document signal of its standard rubric plus the scenario's audits, and never drops one. Its score therefore never exceeds the standard rubric's own score (checked).
3. **No match falls back to the speaker's standard.** This usually happens when a genre is added on the branch screen with no role behind it. Each other genre adds its own rubric's audits (never the posture-gate, which is a verdict, not an audit), and the brief says so.

`composeRubric` turns the matches into an ordinary `RubricConfig` (`base`, `genreNote`, `promotional`, `hybrid`). `analyze()` and `scoreDocument()` run unchanged, and the score stays posture-invariant (D1).

| Scenario | Genres | When | Standard | Audits added | Frameworks |
|---|---|---|---|---|---|
| Sponsored content in an editorial format | corporate + journalism | form is sponsored | corporate | sponsorship disclosure, per-claim sourcing, label transparency | FTC deceptive-formats policy (2015), FTC native-advertising guide (2015), Wojdynski & Evans 2016 *(cited)* |
| Press release reporting a study | corporate + research | form is a press release | corporate | limitations absent, abstract outruns body, study traceability | Sumner et al. 2014, Woloshin et al. 2009, Yavchitz et al. 2012, Trust Project References |
| A firm's own content in a news format | corporate + journalism | firm speaker, reporting form | corporate | per-claim sourcing, perspective plurality, sponsorship disclosure | FTC deceptive-formats policy (2015) |
| News built on a firm's own account | corporate + journalism | stake is a firm source | journalism | dependence on the subject firm, platitude density | HealthNewsReview.org criteria, Schwitzer 2008, Lewis, Williams & Franklin 2008 |
| Research published by a firm or interest group | corporate + research | advocacy stake, or firm speaker with its own study or research form | corporate | limitations absent, abstract outruns body, interest disclosure | Lundh et al. 2017, ICMJE §II.B, AAPOR Transparency Initiative, GPP 2022 *(cited)*, ICC/ESOMAR Code 2025 *(cited)*, ISO 20252:2026 *(cited)* |
| A seller citing a study | corporate + research | firm speaker, a study it describes, not a release | corporate | study traceability, limitations absent | FTC substantiation policy (1984) *(cited)*, FTC Health Products Compliance Guidance (2022) *(cited)*, Trust Project References |
| News about a study | journalism + research | — | journalism | limitations absent, abstract outruns body, study traceability | HealthNewsReview.org criteria, Schwitzer 2008, Sumner et al. 2014, Yavchitz et al. 2012, Trust Project References |
| A firm's blog or explainer | corporate + general | firm speaker | corporate | — | FTC substantiation policy (1984) *(cited)*, FTC Endorsement Guides *(cited)* |
| Research by an individual, outside a journal | general + research | research form | research | — | — (each genre's own) |
| An individual explaining a study | general + research | no known speaker other than an individual | general | study traceability, limitations absent | IHC Key Concepts 2022 *(cited)*, Trust Project References |
| Independent reporting outside a newsroom | general + journalism | no known speaker other than an individual | journalism | — | — (each genre's own) |

*Cited* means the framework frames the scenario but no signal measures it yet. Full citations and URLs are in `src/rubrics/frameworks.js`, and each entry's `measures` names the signals it grounds.

**Verification (2026-11-05):**

- **Bibliographic data** was checked against Crossref, PubMed and the doi.org handle API; claims against the official pages.
- **ftc.gov and iso.org** refuse scripts, so their pages were read from Wayback captures of October 2026.
- **HealthNewsReview.org** has been offline since 2022; its entry links the archived criteria page.
- **Current editions** are cited for two standards: ICC/ESOMAR 2025 (which replaced 2016) and ISO 20252:2026 (which replaced 2019).
- **Lewis et al. 2008:** the often-quoted "60% of press articles" figure could not be checked against the full text, so it is not cited.

## New metrics (`src/engine/signals/hybrid.js`)

| Signal | Fires when | Severity | Grounding |
|---|---|---|---|
| `study-traceability` | the document describes someone else's study (inherited design) | note when there is no DOI, journal or volume line, study link or report title; positive when there is | Trust Project References ("When a journalist shows their sources, we can check their reliability for ourselves.") |
| `sponsorship-disclosure` | a sponsorship cue appears anywhere | flag when the cue is not in the first 300 characters; positive when it is | FTC native-advertising guide 2015 (clear and prominent, in front of or above the headline), FTC policy statement 2015 (disclosure before the reader engages) |
| `subject-source-dependence` | stake is a firm source | flag | HealthNewsReview #6 and #10, Lewis et al. 2008 |
| `undisclosed-interest` | firm speaker with its own study, or an advocacy stake | note when no sponsor, funding or conflict-of-interest statement appears; positive when one does | Lundh 2017, ICMJE §II.B, AAPOR §III.A.2 (name the sponsor and who conducted it) |

One cited study cuts against a metric. Wojdynski & Evans 2016 found that mid- and bottom-placed disclosures were recognised *more* often than top-placed ones. The top-of-page rule in `sponsorship-disclosure` therefore rests on the FTC guide alone; the study is listed as cited, not as measuring it.

`undisclosed-interest` overlaps the completeness item *funding or conflicts statement* on purpose. Completeness asks whether a funder is named. This signal asks whether a publisher with a stake in the findings says so. Both fire when neither statement is present.

## Sourced, not yet measured

These would need new detection, and some would need the source document too:

- **Animal-to-human inference** (Sumner 2014's third exaggeration type): needs a reliable animal or cell-study design cue.
- **HealthNewsReview criteria #1–3 and #7–9** (costs, quantified benefits, harms, alternatives, availability, novelty): health-intervention stories only.
- **Fit between study and product** (FTC 2022): whether the cited study tested this product, at this dose, for this claim.
- **Independent expert voice:** needs speaker affiliation, not just a count of distinct names.
- **Text reuse from the source release** (churnalism): needs the release to compare against.
- **Research process requirements** (ISO 20252, ICC/ESOMAR): audit-level, not readable from the published text.
- **Material connections in endorsements** (FTC Endorsement Guides).

## Corpus

| Document | Reads as | Scenario | Standard | Hybrid score | Standard alone |
|---|---|---|---|---|---|
| allen-ehp-2016 | Research | — | research | 8.2 | 8.2 |
| hsph-press-2015 | Corporate × Research | press release reporting a study | corporate | 4.0 | 4.4 |
| sciencedaily-2015 | Corporate × Research | press release reporting a study | corporate | 4.0 | 4.4 |
| gba-news-2015 | Journalism × Research | news about a study | journalism | 3.9 | 4.3 |
| bdc-blog-allen | Journalism × Research | news about a study | journalism | 3.0 | 3.4 |
| naava-allen | Corporate × General web × Research | a seller citing a study + a firm's blog | corporate | 4.7 | 5.1 |
| gensler-gws-2024 | Corporate × Research | research by a firm | corporate | 1.0 | 1.5 |
| gensler-press-2024 | Corporate × Research | press release reporting a study | corporate | 4.0 | 4.4 |
| bdc-gensler-news-2024 | Journalism × Corporate × Research | news built on a firm's account + news about a study | journalism | 1.6 | 3.2 |
| co2meter-plants | Corporate × General web | a firm's blog | corporate | 1.8 | 1.8 |
| fixture-a-cadre | Research × Corporate | research by an interest group | corporate | 1.0 | 1.0 |
| pew (html, report) | Research | — | research | 7.3 | 7.3 |
| jcu-timber-pilot | Research | — | research | 4.9 | 4.9 |

Routing to the evidence standard went from 13/14 to 14/14. CADRE now reads as research by an advocacy coalition with industry members, which matches its working gold label (corporate). `hks-human-potential` is not in `fixtures/cache/`, so synthetic firm-research documents cover it in `checks/hybrid.test.mjs`.

## Provisional constants

`SPEAKER_GENRE`, `FORM_GENRE` and the form order (`profile/genre.js`) · `GENRE_MIN`, `ADVOCACY_MIN`, `SOURCE_MIN_COUNT` (3), `SOURCE_MIN_SHARE` (0.6), `BYLINE_CHARS` (600) (`lexicons/genre-form.js`) · `SPONSOR_HEAD_CHARS` (300) and the four signal severities (`signals/hybrid.js`) · every scenario's `when`, `standard` and `audits` (`rubrics/hybrids.js`).

## Checks

- `checks/hybrid.test.mjs` covers:
  - corpus genres, scenario and standard against `gold.genres` / `gold.hybrid` / `gold.rubric`
  - synthetic documents for the scenarios the corpus lacks, plus false-hybrid guards
  - claims identical to the standard rubric's, every standard signal kept, score ≤ standard, posture-invariant, deterministic
  - ordering under the routed judgment
  - branch-screen overrides
- `checks/validate-rubrics.mjs` validates every scenario composed on its own genres against the `RubricConfig` contract, plus the scenario and framework fields.
