# LAYER 2 MAP SPEC v0.1 — Influence Graph × Co-Belief Geometry
## (Raper/Wikidata edges over Bourget–Chalmers metric space)

> Status: **accepted design**. Implementation lives in `backend/src/delib/layer2/`.
> How it lands in DELIB (added during integration):
> - Layer 2 is a **separate typed graph** (`Layer2Map`) from the Layer-1
>   consequence graph (`DelibGraph`) — different node/edge semantics — but built
>   with the same discipline (distinct pydantic models, `extra="forbid"`,
>   insert-time validation, tests proving illegal combinations raise).
> - Layer-1 **frameworks** (the coding rubrics: `aggregate_utilitarian`,
>   `prioritarian`, …) correspond to Layer-2 **TRADITION** leaves by id — the map
>   is the geometry *those* frameworks live in. The map extends beyond the
>   registry via the automated bridge sources.
> - Build order mirrors DELIB's: **Stage 0 (schema + container + diagnostic
>   queries, no external deps)** first — DONE; then Stage A (survey metric),
>   Stage B (Wikidata edges), Stage C (calibration), Stage D (validation),
>   each behind a checkpoint because they add dependencies / external calls.

## The design in one sentence
Positions get COORDINATES from empirical co-belief structure (Bourget &
Chalmers' PhilPapers Surveys: distance = how rarely the positions are held
together by the same minds), and get EDGES from the influence/descent record
(Raper's method, run against Wikidata) — producing a map where proximity and
lineage are independent structures, which is the whole point: the interesting
regions are where they disagree.

## Why these two combine well
They fail in opposite directions. The survey geometry has no history — it's a
snapshot of which commitments co-occur in living minds, with no record of
where positions came from or who attacked whom. The influence graph has no
metric — "influenced by" is neither agreement nor proximity (Marx ≠ Hegel).
Overlaid, each supplies what the other lacks: coordinates without lineage +
lineage without coordinates = a map where you can SEE that two positions are
near neighbors (metric) descended from a common ancestor (edges) yet mutually
attacking (tension overlay) — the Collins rivalry pattern, rendered.

## The bridge problem (the one real difficulty)
The two sources have different node types. Raper's nodes are THINKERS
(Wikipedia/Wikidata entities). B&C's nodes are POSITIONS on canonical
questions ("moral realism: yes/no", "normative ethics: deontology /
consequentialism / virtue ethics"). Combining them requires a curated
bipartite bridge:

    THINKER --holds/defends--> POSITION --instance-of--> TRADITION (our leaves)

Construction of the bridge, three sources in priority order:
1. Wikidata P135 ("movement") and P737-adjacent school memberships where they
   exist (sparse but free).
2. PhilPapers' own category assignments for each thinker's works (a thinker
   heavily published-in/classified-under a category is evidence of position).
3. Manual assignment for the registry's ~30 leaf traditions — this is a few
   hours of work, not a research project, because the registry is small; the
   automated sources exist to EXTEND the map beyond the registry, not to
   place the registry itself.

Every bridge assignment carries a provenance field (wikidata | philpapers |
manual) and a confidence. The bridge is versioned like the registry.

## PIPELINE

### Stage A — Metric space from the surveys
Data: PhilPapers Survey 2020 (Bourget & Chalmers), public results incl.
correlations among views; 2009 wave for temporal comparison.
1. Assemble the position×position association matrix from response data
   (phi/tetrachoric for the categorical items).
2. Distance transform: d(i,j) = sqrt(1 - |r(i,j)|) (a proper-ish distance
   preserving "held together → near"). Sensitivity-check against
   alternatives; log the choice.
3. Embed to 2D for display and kD (k≈10) for computation: classical MDS for
   interpretability of axes (B&C's own analyses found interpretable
   principal dimensions — expect an anti-naturalist/naturalist-flavored
   first axis), UMAP as the display alternative. Keep BOTH; axes are
   reported with loadings, never reified.
4. COVERAGE HONESTY: the surveys sample contemporary anglophone academic
   philosophers on analytic-canon questions. Positions outside that frame
   (economic schools, non-Western traditions, planning theory, most of
   Layer 2's applied leaves) have NO survey coordinates. They are placed by
   Stage C and drawn differently (see Rendering).

### Stage B — Edge layer from the influence record
Raper's method, upgraded from Wikipedia infobox scraping to Wikidata SPARQL:
1. Pull, for every thinker in the bridge: P737 (influenced by), P1066
   (student of), P802 (student), P135 (movement), plus dates and P106
   occupation filters. One SPARQL query per relation; cache raw results.
2. Project thinker-level edges up to position/tradition level through the
   bridge: an influence edge between traditions is the (log-scaled) count of
   thinker-level influence edges crossing them, direction preserved,
   timestamped by the thinkers' floruit — which makes the edge layer
   TEMPORAL and the map animatable by century for free.
3. Edge types kept distinct, never merged: INFLUENCE (P737 projections),
   DESCENT (curated: tradition B is a refinement/schism of A — prioritarian
   ← utilitarian; this is editorial, small, and versioned), and the existing
   curated ATTACK and COMPATIBILITY matrices from the registry riding on top
   as overlays.
4. Known data caution from Raper's own exercise: infobox/Wikidata influence
   claims are crowd-curated, popularity-biased, and occasionally wrong.
   Edges therefore carry the wikidata provenance tag and are treated as
   claims with a confidence, consistent with the tool's epistemics
   everywhere else.

### Stage C — Filling the coverage gap (embedding calibration)
For leaves with no survey coordinates:
1. Embed canonical corpora per tradition (its SEP/IEP entry, Britannica
   entry, 1-3 primary-text excerpts) with any strong text-embedding model.
2. PROCRUSTES CALIBRATION: for the subset of traditions that have BOTH
   survey coordinates and corpus embeddings, fit the affine map from
   embedding space to survey space; apply that map to place the
   survey-uncovered leaves. The survey geometry is the ground truth; the
   embedding space is bent to fit it, not vice versa.
3. Placed-by-calibration nodes render visually distinct from
   placed-by-survey nodes (see Rendering). Their coordinates are estimates
   and say so.
4. Triangulation check: InPhO relatedness scores and PhilPapers taxonomy
   distances as independent instruments; where all three agree on a node's
   neighborhood, mark PLACEMENT_CORROBORATED; where they conflict, log it —
   conflicts are findings, not noise to average away.

### Stage D — Validation (the map audits itself)
1. Rivalry check (Collins): known canonical rivalries (act/rule
   utilitarians, Kant/Bentham... assemble ~20 pairs) should be METRICALLY
   NEAR with ATTACK edges. If the map puts rivals far apart, the metric is
   broken — genuine disagreement requires shared attention space.
2. Incommensurability check (MacIntyre): pairs known to talk past each
   other should be metrically FAR with NO attack edges; the renderer should
   refuse to imply tension between them.
3. Lineage-drift check: descendants should generally be nearer their
   ancestors than random, but the EXCEPTIONS (a descendant that migrated far
   from its ancestor — e.g., where analytic Marxism sits relative to Marx)
   are the map's most interesting single artifacts. Surface, don't suppress.

## DATA STRUCTURE (slots into DELIB's existing typed-graph discipline)
Node (Position/Tradition): {id, grain: TRADITION|POSITION|CLAIM, parent_id
  (grain nesting: utilitarian → act/rule/negative/prioritarian children),
  coords_survey[k]?, coords_calibrated[k]?, placement: SURVEY | CALIBRATED |
  CORROBORATED, bridge_thinkers[], provenance}
Edge: {source, target, type: INFLUENCE | DESCENT | ATTACK | COMPATIBILITY,
  weight?, about? (ATTACK edges state the proposition contested),
  period? (INFLUENCE edges are dated), provenance, confidence}
Grain rule, same as everywhere in DELIB: distances are computed and reported
AT A STATED GRAIN; a tradition-level distance is not a claim about its
children.

## RENDERING
- Position = metric coordinates; survey-placed nodes solid, calibrated nodes
  stippled/hollow (estimates must look like estimates).
- INFLUENCE edges: thin, directional, time-fadeable (century slider — the
  Raper graph animated over the B&C geometry).
- ATTACK edges: red, labeled with the contested proposition on hover.
- COMPATIBILITY: green, thin.
- The three diagnostic regions get first-class visual treatment:
  (1) near + attack = live rivalry (highlight; these are Collins's engines),
  (2) far + no edges = incommensurable (muted; tooltip warns that reading
      tension here is a category error),
  (3) far + compatibility = surprising alliance (highlight).
- Grain expand/collapse: tradition nodes open into position children with
  local re-layout.

## HONEST LIMITS, STATED IN THE DOCS
1. The survey metric is a 2020 snapshot of one professional community; it
   measures the sociology of current anglophone philosophy, not eternal
   conceptual distance. (This is a feature for detecting CURRENT tensions;
   it is a bias for everything else, and calibrated placement inherits it.)
2. Wikidata influence edges are crowd claims with popularity bias.
3. The bridge is editorial at the registry scale; provenance-tagged so every
   assignment is contestable.
4. Same epistemic posture as the rest of DELIB: no absolute map — a stated-
   grain, stated-instrument, residual-logged map that shows its work.

## BUILD ESTIMATE
Stage A: survey data ingest + MDS/UMAP — 1-2 sessions (data is public, math
is standard scipy/scikit-learn/umap-learn).
Stage B: SPARQL pulls + projection — 1 session (cache everything).
Bridge (registry-scale manual pass): one evening, yours.
Stage C: embeddings + Procrustes — 1 session.
Stage D + rendering: reuses DELIB's existing renderer with a new edge-type
palette — 1-2 sessions.
