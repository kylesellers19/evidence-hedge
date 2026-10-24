# DELIB frontend

Vite + React 19 + Tailwind v4. Two routes (dependency-free hash routing):

- **Deliberation** (`#/`) — the consequence-mapping canvas (React Flow). Its
  geometry is *organizational*, so it computes its own layout.
- **Atlas** (`#/atlas`) — the co-belief position map from `/api/atlas`, shown in
  two geometries with an animated toggle between them.

## HARD RULE — the Atlas never runs layout

**The Atlas receives coordinates precomputed by the backend and NEVER runs a
force simulation or any layout that moves nodes.** The geometry is a
*measurement* (classical MDS on the survey |r|-metric, and signed PCA), and the
renderer does not improvise evidence. The only motion the Atlas produces is:

1. **fitting** the measured coordinates into the viewport (uniform scale, aspect
   preserved — `layout.ts:normalize`), and
2. **interpolating between the two measured geometries** on a toggle
   (`layout.ts:lerp`, driven by `useTween`) — a transition between two findings,
   not a new position for any node.

Pan/zoom is a viewport transform, not layout. If you ever reach for d3-force,
cola, dagre, or elk in the Atlas: stop — that would be the renderer inventing
evidence. (The deliberation canvas is different: its geometry is merely
organizational, so it *does* compute layout.)

## Atlas controls

- **Geometry toggle** (first-class): *Attention* (|r|-metric MDS — rivals near,
  the shared attention space) vs *Polarity* (signed PCA — rivals antipodal). The
  difference between the two views is the point.
- **Edge layers** (toggleable): empirical opposition/co-belief (tinted, thin),
  curated attack/compatibility (bold, hover-labeled with the contested
  proposition). Default: opposition + attack on, co-belief off.
- **Rivalry highlight** (Attention only): pairs metrically near (threshold
  slider) *and* joined by a negative edge — the Collins live-rivalry pattern, the
  Atlas's signature visual. Disabled in Polarity, where rivals are antipodal by
  construction.
- **Philosophers**: the bridge thinkers at the |r|-weighted centroid of their
  positions, edges to their top-k identifications.
- **Traditions**: cluster tint (register tokens) + click-to-focus.
- **Search** and **hover → detail** (a node's strongest correlations).

## Projection contract

`atlasApi.project(graphId)` → `POST /api/atlas/project`, returning the atlas node
ids a deliberation graph's attributions touch (currently stubbed to `[]`). The
renderer already dims non-touched nodes when the set is non-empty, so wiring the
convergence demo later is a data change, not a rebuild.

## Dev

```
npm run dev      # Vite on :5173, proxies /api -> :8000
npm run build    # tsc + vite build
```
