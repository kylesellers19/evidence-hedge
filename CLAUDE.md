# Evidence Hedge repo

Three independent apps share this repo. Each keeps its own dependencies; nothing is shared or hoisted, and there are no npm workspaces.

| Path | What | Stack |
|---|---|---|
| `/` (root) | Evidence Hedge: client-only document analyzer, deployed to GitHub Pages on every push to `main` | React 18, Vite 5, Tailwind 3, JS |
| `decision-precision/` | Decision Precision (DELIB), relocated here with its full history | `backend/`: Python, uv, FastAPI · `frontend/`: React 19, Vite 6, Tailwind 4, TS |
| `Reference/` | "gigi", a separate reference app (Supabase); not built by CI | React 18, Vite 5 |

## Commands

Evidence Hedge (repo root):
- `npm run check` (20 check scripts) · `npm run build`

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
- The repo is public: anything pushed is published.
- DELIB's `data/cache/` (~440 MB of SQLite) is ignored only by `decision-precision/.gitignore`; the root `.gitignore` does not cover `*.sqlite`, `.env` or `.venv`.
- The relocation spec (`DELIB_MERGE.md`) was not present at relocation time. When added, it belongs at `decision-precision/docs/DELIB_MERGE.md`.
