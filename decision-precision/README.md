# DELIB (working title)

A typed causal-deliberative graph tool for consequence mapping in planning and
policy decisions — a "charette prosthetic". Given a seed question, it generates a
branching radial graph of decisions and consequences, codes them against ethical
frameworks and implementation-science vocabularies, and grades causal claims
against empirical literature.

## Architectural principles (non-negotiable)

1. **One LLM interface.** Every LLM call goes through a single internal interface
   (`generate` / `code` / `grade`) via LiteLLM. Model choice is config, never
   hardcoded.
2. **Log everything.** Every LLM request/response pair and every human correction
   is appended to a training-data store. That dataset is a first-class product.
3. **Evidence retrieval is a multiplexer.** Each source (OpenAlex, Semantic
   Scholar, PubMed) is a plugin behind one interface; results merge on DOI;
   everything is cached locally. Nothing external is load-bearing except the cache.
4. **Rendering and layout are decoupled.** Layout is computed server-side/in a
   worker; the renderer consumes positioned nodes. React Flow now, WebGL swap later
   without touching semantics.

## Layout

```
backend/    FastAPI + networkx + pydantic + SQLite (Python 3.12)
frontend/   Vite + React + React Flow          (added in Phase 3)
```

## Build order

- **Phase 1** — Data model (no LLM calls): pydantic schema with hard validation,
  graph container, graph queries. Type discipline is the point.
- **Phase 2** — Graph engine with mock generation + dedup + expansion prioritization.
- **Phase 3** — Frontend: radial-concentric layout, progressive disclosure.
- **Phase 4** — Real LLM integration (generator / coder / grader).
- **Phase 5** — Evidence multiplexer.

## Backend dev

```bash
cd backend
uv sync
uv run pytest
uv run uvicorn delib.api:app --reload --port 8000   # API on :8000
```

## Frontend dev

```bash
cd frontend
npm install
npm run dev          # Vite on :5173, proxies /api -> :8000
```

Run the backend first, then the frontend. The app opens on the Brooklyn mock:
seed + ring-1, click a node to expand it, hover to trace its path to the seed
(weakest-link confidence shown), edit fields in the side panel (writes to the
correction log), toggle full/resolution view, and zoom out for semantic
(label-suppressed, valence-colored) rendering.
