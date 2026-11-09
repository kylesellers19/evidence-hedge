# Evidence Hedge repo

Three independent apps share this repo. Each keeps its own dependencies; nothing is shared or hoisted, and there are no npm workspaces.

| Path | What | Stack |
|---|---|---|
| `/` (root) | Evidence Hedge: client-only document analyzer, deployed to GitHub Pages on every push to `main` | React 18, Vite 5, Tailwind 3, JS |
| `decision-precision/` | Decision Precision (DELIB), relocated here with its full history | `backend/`: Python, uv, FastAPI · `frontend/`: React 19, Vite 6, Tailwind 4, TS |
| `Reference/` | "gigi", a separate reference app (Supabase); not built by CI | React 18, Vite 5 |

## Commands

Evidence Hedge (repo root):
- `npm run check` (27 check scripts) · `npm run build`
- `node scripts/weigh-folder.mjs <dir>`: weighs a folder of PDFs (manifest-*.json plus reports/) linked and uploaded, as the AEC corpus in the gitignored `checks/data/aec/`; it caches extracted text in `<dir>/text-cache`. When another session is editing the engine, run it from a `git archive` of the commit with `ENGINE_SHA=<sha>`.

DELIB, `decision-precision/backend/`:
- `uv sync --all-extras` (plain `uv sync` removes the `api`/`llm` extras the tests need)
- `uv run pytest -q`
- `uv run uvicorn delib.api:app --reload --port 8000`

DELIB, `decision-precision/frontend/`:
- `npm ci` · `npx tsc --noEmit` · `npm run build` · `npm run dev`

## Ports

Every Vite config sets `strictPort: true`, so a busy port fails instead of moving.

| Server | Dev | Preview |
|---|---|---|
| DELIB frontend (proxies `/api` to 8000) | 5173 | 4173 |
| DELIB API | 8000 | — |
| Evidence Hedge | 5174 | 4174 |
| Reference | 5175 | 4175 |

## Notes

- DELIB's decision layer (`decision-precision/backend/src/delib/decision/`) is specified in `decision-precision/docs/decision-layer.md`. Its judgment constants live in `decision/config.py`, are marked `PROVISIONAL — not ratified`, and are listed by `ratification_table()`; a test fails if the spec's table drifts from the code.

- Evidence Hedge judges mixed-genre documents (a firm's research report, a press release about a study, news built on one firm's survey) as hybrids, with no manual choice. `src/engine/profile/genre.js` reads four roles (speaker, form, stake, evidence), and `src/rubrics/hybrids.js` maps the mix to a scenario: one evidence standard, added audits, frameworks (`src/rubrics/frameworks.js`). Spec: `docs/hybrid-genres.md`. Corpus gold carries `genres` and `hybrid`; `npm run check:hybrid` holds them.
- `checks/targets/<fixture>.brief.json` records what the evidence brief showed for a benchmark fixture, every field of the page (`checks/lib/brief.mjs`); `npm run check:targets` fails on any field that moves. Quotes from the document are stored as hashes, since fixture text stays out of the public repo. A change that moves a brief on purpose re-records it in the same commit with `node checks/brief-targets.test.mjs --write <fixture-id>`. Fixture C's PDF lives in the gitignored `checks/data/`, so without it the check skips.
- The checks read every PDF as an upload: the corpus loader extracts committed and cached PDFs at load (`checks/lib/corpus.mjs`), as it runs reader bodies through the reader pipeline, so no check holds text a reader never sees. `npm run check:pdfupload` holds that, and holds Node's legacy pdf.js build to the browser's per-page text and claim counts, recorded in `checks/targets/pdf-upload.json` (`checks/lib/upload-record.mjs` re-records it in the browser). `fixtures/cadre-neuroarchitecture-normalized.txt` is kept only as the text the evidence section's design brief was recorded on.
- The brief's evidence section ("What each claim stands on") follows `docs/evidence-section.md`: four plain verdicts, reason lines from templates, a list of words never shown to readers, and the decisions taken where the design brief was open. `src/engine/evidenceSection.js` reads it from the analysis (and `evidenceMap.js`'s grounds); `npm run check:evidencesection` holds it, Fixture A against the design brief's recorded numbers. A PDF upload keeps its per-page text in `meta.pages` so claims show on their page (`src/engine/pages.js`).
- Evidence Hedge's look follows Delgam (delgam.org): its typefaces (Source Serif 4, Libre Franklin), tokens in `src/index.css`, the site frame and editorial pages in `src/styles/site.css`, and Delgam's copy rules on the new pages. The orbit (`src/components/ParticleMark.jsx`) stays as it is.
- The List (`/list`, `src/list/`) reads and writes a Supabase table (`docs/the-list.sql`) when the build has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (repository variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` in CI); without them it reads `public/the-list.json` and the add form on the evidence brief is hidden. Entries never carry the document text; `npm run check:list` holds that.
- The repo is public: anything pushed is published.
- DELIB's `data/cache/` (~440 MB of SQLite) is ignored only by `decision-precision/.gitignore`; the root `.gitignore` does not cover `*.sqlite`, `.env` or `.venv`.
- The relocation spec (`DELIB_MERGE.md`) was not present at relocation time. When added, it belongs at `decision-precision/docs/DELIB_MERGE.md`.
