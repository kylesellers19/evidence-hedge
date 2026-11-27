# The Record: inventory

Taken 2026-11-27 at the start of the session, before any change. Baseline tags:
`record-baseline` on the app (aabc47f, pushed) and on the research repo (a92fd88,
local branch `propagation`). Work happens on branch `record` in both, each in its own
worktree, so the widened Gate 1 pilot run (pid 22625, `propagation.gate1 --tag pilot-w`,
running in the research checkout since 23:55 on Nov. 26) is never touched.

| Repo | Path | Branch at baseline | Remote | Worktree for this session |
|---|---|---|---|---|
| App (public) | `Evidence Hedge/` | main = aabc47f | github.com/kylesellers19/evidence-hedge (public: anything pushed is published) | `.claude/worktrees/record` |
| Research (private) | `evidence-hedge-research/` | propagation = a92fd88 (10 commits not on origin; origin/main = 642dfcd) | kylesellers19/evidence-hedge-research | `evidence-hedge-research-record/` (links `data/`, `work/`, `vendor/` and each `envs/*/.venv` to the checkout) |

## 1. The shipped app

- **Stack.** React 18.3, Vite 5.4, Tailwind 3.4, react-router-dom 6 with `BrowserRouter`
  (not hash routing), so the page is `/record`. GitHub Pages serves files, so
  `vite.config.js` copies the app shell to `<page>/index.html` for every page in `PAGES`
  and to `404.html`. `/record` must be added to `PAGES`.
- **Routes** (`src/App.jsx`): `/`, `/branch`, `/results`, `/list`, `/conferences/*`
  (lazy), `/method`, `/contact`, `/legal`; everything sits inside `SiteLayout`
  (masthead, footer with the fine print and engine SHA).
- **Deploy** (`.github/workflows/deploy.yml`): every push to `main` runs `npm ci`,
  `npm run check:conferences`, `npm run build` (with the Supabase repository variables)
  and deploys `dist/` to Pages at evidencehedge.org. One deploy at a time.
- **Checks.** `npm run check` runs 27 scripts (node:test style, no framework). There is
  no browser test harness in the repo: no Playwright, no axe-core. Playwright's Chromium
  builds are cached on the machine (`~/Library/Caches/ms-playwright`: chromium 1243 and
  1248, headless shell 1243, 1248 and 1254).
- **Results screen** (`src/pages/ResultsPage.jsx`) and its parts in
  `src/components/results/`: `VerdictMark` (sphere), `EvidenceSection` ("What each claim
  stands on"), `PatternSection`, `DistributionBar`, `DocumentSignals`, `DocumentProfile`,
  `JudgmentBasis`, `RubricProvenance`, `AddToList`, `briefTop.js` (every string at the
  top of the brief). Editorial pages: `ListPage`, `MethodPage` (1,054 lines), `LegalPage`,
  `ContactPage`.
- **Styles.** One token source, `src/index.css` `:root`: paper `#fdfdfc`, ink `#1a1a1a`,
  ink-soft `#565a62`, ink-faint `#656971`, hairline `#e2e3e6`, population grey `#b9bcc3`,
  accent `#1b63a8`; Source Serif 4 and Libre Franklin (variable, @fontsource) and the
  system monospace; prose column 640px, wide 1040px. Site frame and editorial pages:
  `src/styles/site.css` (1,066 lines, `eh-` classes: `.eh-page`, `.eh-col`, masthead,
  footer, tables). No dark mode anywhere: it was skipped because the orbit draws
  ink-black particles. The orbit (`ParticleMark.jsx`) stays as it is.
- **Tension with this spec.** The spec asks for Newsreader, IBM Plex Sans and IBM Plex
  Mono, true white, a deep navy accent, and light and dark screenshots. The site frame
  uses Delgam's faces and has no dark theme. Resolution taken: the Record page scopes its
  own tokens and faces under `.rec-*`, inside the unchanged site frame; dark mode applies
  to the page body only. Logged as a review item for Kyle.
- **The List** (`/list`): Supabase table, or `public/the-list.json` without the build
  variables. It already publishes every corpus firm and title (1,790 audit entries).
  That matters for anonymity: anyone can count a firm's titles there.

## 2. The research repo

- **Layout.** `propagation/` (claim propagation engine, 3,959 lines, EH-Propagation-Pilot-0.1),
  `adapters/`, `annotation/`, `envs/` (one pinned Python 3.11 env per tool, `uv pip compile
  --exclude-newer 2026-11-01`, hashes in `requirements.lock`), `vendor/` (pinned clones),
  `reports/`, gitignored `data/` (4.3 GB) and `work/` (1.7 GB).
- **Envs present:** propagation (duckdb 2.0.0, trafilatura, datasketch, rapidfuzz,
  mediacloud 5.2.0, statsmodels 0.15.0; no scikit-learn), spiced (sentence-transformers
  2.2.2, torch 2.2.2, transformers 4.39.3), grobid, cessc, certainty-estimator, potato,
  unicausal, unscientify, yu2019.
- **Models cached** in `work/hf-home`: `copenlu/spiced` only (revision c32c33a).
- **GROBID** 0.9.1 (CRF) runs natively from `work/grobid-0.9.1-crf/` on 127.0.0.1:8070
  (Docker VM too small; `reports/deviations-cs4.md`). Not running at the start.

## 3. The propagation engine: how much exists

The spec file `claude/evidence-hedge-propagation-engine-prompt.md` is not on this
machine (searched the home folder, both repos and every `claude/` folder). The parts
below are read from the code and the Gate 1 report.

| Part | What | State |
|---|---|---|
| A | Report registry and claim table from the shipped engine; anchors, matchability, coined terms, background counts, publication dates | **Built.** `registry.py`, `anchors.py`, `background.py`, `pubdate.py`. Tables `data/propagation/tables/A-90fa8b3/` |
| B | Press releases | **Not built.** Hooks only (`discover.py` mentions the search; `pubdate.py` can take a release date) |
| C | Discovery | **Partly built.** Infini-News (CC-NEWS, Aug. 2016 to Apr. 2026, exact phrase) and GDELT DOC 2.0 run. Media Cloud client written, **no key**. Web search deferred |
| D | Ingestion, normalization, syndication | **Built.** trafilatura, htmldate, WARC cache, MinHash Jaccard 0.8 on 5-shingles, seed 1 |
| E | Document links L1, L2, L3, X | **Built.** `linking.py` with reason codes |
| F | Claim-level alignment M1, M2, M3 with SPICED | **Constants only.** `spiced.py` reproduces the paper (Table 7) and scores pairs; no alignment code |
| G | What changed on the way (fidelity of a pickup) | **Not built.** Not referenced in code |
| H | Gold set and precision gates (60 labels per cell, Wilson lower bound 0.90) | **Sheet exported, no labels.** `data/propagation/labeling/doclinks-pilot.csv` (137 rows) |
| I | Release (excerpt cap 12 words, 25 per source, canonical URLs) | Constants and checks |
| J | Front matter, outcome model | Plan only |

Gate 1 (pilot of 8 reports, run Nov. 26 to 27): 264 candidates, 5 L1, 0 L2, 23 L3, 109 X;
article-level recall at L1 or L2 against the firms' own lists 0 of 6; CC-NEWS does not hold
the trade press these firms appear in. No precision gate is measurable. A widened run of
11 reports (pilot-w) was in progress at the start of this session.

## 4. The corpus

- **App side.** 1,584 + 267 + 10 PDFs from the websites and gated forms of AEC firms,
  in the gitignored `checks/data/aec/reports/`, listed in 12 `manifest-*.json` files
  (`file, firm, segment, title, published, url, page, bytes`, plus `via` for gated);
  extracted text cached in `checks/data/aec/text-cache/`.
- **Registry** (`A-90fa8b3`): 1,790 reports from 90 organizations, 450,539 engine claims
  (22,953 in front matter), engine build 90fa8b3 (content SHA-256 38d7e9a4…), exported at
  de82a34.
  - Report types (the engine's reading or the title): research report 699, industry or
    market report 382, white paper 262, opinion or commentary 155, other 112, marketing
    material 94, news article 56, survey report 19, press release 10, annual report 1.
  - Segments: design 1,103, construction 507, architecture 101, engineering 41, AEC
    technology 28, construction data 10.
  - Largest organizations: Arup US 351, Burns & McDonnell 162, Mortenson 135, WSP 116,
    JE Dunn 111, Weitz 79, Arcadis North America 75, Gray 66, NV5 57, AECOM 54.
  - Dates: `manifest_published` as collected (source unknown), `list_published_on`, and a
    stated date read from the report for 552 reports. `pub_date` (two agreeing sources)
    is empty until Gate 1 finishes for a report.

## 5. The headless harness and its claim fields

`scripts/export-claims.mjs` and `scripts/measure-sentences.mjs` with
`checks/lib/export-fields.mjs`, on app branch `propagation-plumbing` (a0b574e, de82a34),
**not merged to main**. The research repo runs them from a `git archive` of de82a34 and
refuses to run if the engine content hash differs (`propagation/engine_bridge.py`).

Claim fields in `claims.parquet`: `claim_id, report_id, claim_index, unit_index, start,
end, page, section, text, span_sha256, function, register, tier, rung, rung_rank,
certainty_tier, attribution, evidence_status, flag, flagged, causal_strength,
causal_overreach, overreach_distance, hedges, boosters, platitudes, scope{action_guiding,
generic, present_tense}, recommendation, front_matter, placed, anchors[{key, kind, value,
unit, population, qualifier, raw, start, end, distinctive}], coined_candidates[],
matchability, matchability_reason`.

What the Record needs that the harness does not give: a document's study design and
sample size, and its references. Both are read in `record/` from the engine's own
fields and text, without a harness change, so rule 4 (scoring files untouched) holds
and no corpus score can move.

## 6. Keys and services

- Media Cloud: no key. Web search API: none.
- AI research assistants: none configured for a harness. The shell has the session's own
  `ANTHROPIC_API_KEY`, which is Claude Code's credential, not a configured assistant
  benchmark key; the comparison harness is built but not run.
- GROBID: local only. Infini-News and GDELT: public, cached through `propagation/fetch.py`.
