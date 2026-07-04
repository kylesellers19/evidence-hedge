"""Atlas view — the position map served in TWO honest geometries over one node set.

- "attention" : classical MDS on the DELIB metric d=sqrt(1-|r|). Sign is stripped
  (it rides on the edges), so same-topic rivals sit NEAR — this is the shared
  attention space where reading tension is legitimate (the Collins geometry).
- "polarity"  : signed PCA (PC1/PC2 of the signed correlation matrix). Opposed
  positions sit at OPPOSITE poles — this recovers B&C's bipolar naturalism factor.

Same nodes, two coordinate sets, both provenance-honest. Positions only. The
authoritative position set is the index inventory (pass ``position_ids``); a
label-prefix heuristic is the offline fallback, but it is only a heuristic — it
collides on 'Gender:' (the metaphysics-of-gender QUESTION 'Gender: biological'
vs the DEMOGRAPHIC 'Gender: Woman'), so the exact id set is preferred.
"""

from __future__ import annotations

from pydantic import BaseModel

from .embedding import embed_survey, signed_pca
from .metric import DEFAULT_DISTANCE, DistanceFn, route_sign
from .scrape import CATEGORY_LABELS
from .store import CorrelationRow, CorrelationStore

# A position label never carries a demographic/philosopher category prefix.
# ("Philosophical questions" is a category name but never a label prefix.)
NON_POSITION_PREFIXES: tuple[str, ...] = tuple(
    f"{c}: " for c in sorted(CATEGORY_LABELS) if c != "Philosophical questions"
)


def is_position(label: str) -> bool:
    return not label.startswith(NON_POSITION_PREFIXES)


class AtlasNode(BaseModel):
    id: str
    label: str
    attention: list[float]  # MDS coords (|r| metric)
    polarity: list[float]  # signed-PCA coords (PC1, PC2)


class AtlasEdge(BaseModel):
    source: str
    target: str
    type: str  # EMPIRICAL_OPPOSITION | EMPIRICAL_COBELIEF
    r: float


class AtlasGeometry(BaseModel):
    name: str  # "attention" | "polarity"
    variance: list[float]  # variance fraction per axis (loadings)


class AtlasView(BaseModel):
    nodes: list[AtlasNode]
    edges: list[AtlasEdge]
    geometries: list[AtlasGeometry]
    n_positions: int
    n_pairs: int
    density: float


def position_rows(
    store: CorrelationStore, position_ids: set[str] | None = None
) -> list[CorrelationRow]:
    """Every position x position correlation (demographics/philosophers dropped).
    With ``position_ids`` (the authoritative index inventory) membership is exact;
    without it, the label-prefix heuristic is used (collides on 'Gender:')."""
    if position_ids is not None:
        return [r for r in store.all() if r.option_a_id in position_ids and r.option_b_id in position_ids]
    return [r for r in store.all() if is_position(r.label_a) and is_position(r.label_b)]


def build_atlas(
    store: CorrelationStore,
    position_ids: set[str] | None = None,
    distance_fn: DistanceFn = DEFAULT_DISTANCE,
) -> AtlasView:
    rows = position_rows(store, position_ids)
    labels: dict[str, str] = {}
    for r in rows:
        labels.setdefault(r.option_a_id, r.label_a)
        labels.setdefault(r.option_b_id, r.label_b)
    node_ids = sorted(labels)
    n = len(node_ids)

    emb = embed_survey(rows, k=2, distance_fn=distance_fn, compute_umap=False)
    pca = signed_pca(rows, node_ids, k=2)
    polarity = {nid: [pca.components[0][i], pca.components[1][i]] for i, nid in enumerate(node_ids)}

    # nodes are those MDS placed (the largest metric component); polarity coords
    # exist for every id, so the same node carries both geometries.
    placed = set(emb.component)
    nodes = [
        AtlasNode(id=nid, label=labels[nid], attention=emb.coords_mds[nid], polarity=polarity[nid])
        for nid in emb.component
    ]

    # only edges between two placed nodes are drawable in either geometry.
    opposition, cobelief = route_sign(rows)  # default OPPOSITION_THRESHOLD
    edges = [
        AtlasEdge(source=e.source, target=e.target, type=e.type.value, r=e.r)
        for e in (*opposition, *cobelief)
        if e.source in placed and e.target in placed
    ]

    max_pairs = n * (n - 1) // 2
    return AtlasView(
        nodes=nodes,
        edges=edges,
        geometries=[
            AtlasGeometry(name="attention", variance=emb.variance_mds),
            AtlasGeometry(name="polarity", variance=pca.variance),
        ],
        n_positions=n,
        n_pairs=len(rows),
        density=(len(rows) / max_pairs) if max_pairs else 0.0,
    )


__all__ = [
    "AtlasNode",
    "AtlasEdge",
    "AtlasGeometry",
    "AtlasView",
    "is_position",
    "position_rows",
    "build_atlas",
]
