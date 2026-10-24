# Evidence Hedge repo

Three independent apps share this repo. Each keeps its own dependencies; nothing is shared or hoisted, and there are no npm workspaces.

| Path | What | Stack |
|---|---|---|
| `/` (root) | Evidence Hedge: client-only document analyzer, deployed to GitHub Pages on every push to `main` | React 18, Vite 5, Tailwind 3, JS |
| `decision-precision/` | Decision Precision (DELIB), relocated here with its full history | `backend/`: Python, uv, FastAPI · `frontend/`: React 19, Vite 6, Tailwind 4, TS |
| `Reference/` | "gigi", a separate reference app (Supabase); not built by CI | React 18, Vite 5 |

## Commands

Evidence Hedge (repo root):
- `npm run check` (10 check scripts) · `npm run build`

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

- The repo is public: anything pushed is published.
- DELIB's `data/cache/` (~440 MB of SQLite) is ignored only by `decision-precision/.gitignore`; the root `.gitignore` does not cover `*.sqlite`, `.env` or `.venv`.
- The relocation spec (`DELIB_MERGE.md`) was not present at relocation time. When added, it belongs at `decision-precision/docs/DELIB_MERGE.md`.
