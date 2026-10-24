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

The philosopher layer places each bridge thinker at the |r|-weighted centroid of
the atlas positions they identify with (computed per geometry so the overlay
survives the geometry toggle), with edges to their top-k positions by |r|. It
comes from the resolved empirical bridge; demographic bridge targets (AOS, region)
are not atlas nodes and drop out.
"""

from __future__ import annotations

from collections import defaultdict

from pydantic import BaseModel

from .embedding import embed_survey, signed_pca
from .metric import DEFAULT_DISTANCE, DistanceFn, route_sign
from .scrape import CATEGORY_LABELS
from .store import CorrelationRow, CorrelationStore
from .tradition_map import REGISTRY_LEAF_BY_OPTION

# A position label never carries a demographic/philosopher category prefix.
# ("Philosophical questions" is a category name but never a label prefix.)
NON_POSITION_PREFIXES: tuple[str, ...] = tuple(
    f"{c}: " for c in sorted(CATEGORY_LABELS) if c != "Philosophical questions"
)


def is_position(label: str) -> bool:
    return not label.startswith(NON_POSITION_PREFIXES)


class AtlasNeighbor(BaseModel):
    id: str
    r: float


class AtlasNode(BaseModel):
    id: str
    label: str
    attention: list[float]  # MDS coords (|r| metric)
    polarity: list[float]  # signed-PCA coords (PC1, PC2)
    tradition: str | None = None  # tradition_map leaf id, when curated
    neighbors: list[AtlasNeighbor] = []  # strongest position correlations (hover)


class AtlasEdge(BaseModel):
    source: str
    target: str
    type: str  # EMPIRICAL_OPPOSITION | EMPIRICAL_COBELIEF | ATTACK | COMPATIBILITY
    r: float | None = None  # empirical edges carry the correlation
    about: str | None = None  # curated ATTACK edges carry the contested proposition


class AtlasGeometry(BaseModel):
    name: str  # "attention" | "polarity"
    variance: list[float]  # variance fraction per axis (loadings)


class AtlasTradition(BaseModel):
    id: str  # tradition leaf id
    member_ids: list[str]  # atlas position ids nested under it


class AtlasThinkerEdge(BaseModel):
    position_id: str
    r: float


class AtlasThinker(BaseModel):
    id: str
    label: str
    attention: list[float]  # |r|-weighted centroid in the attention geometry
    polarity: list[float]  # |r|-weighted centroid in the polarity geometry
    edges: list[AtlasThinkerEdge]  # top-k bridged positions by |r|


class AtlasView(BaseModel):
    nodes: list[AtlasNode]
    edges: list[AtlasEdge]
    geometries: list[AtlasGeometry]
    traditions: list[AtlasTradition]
    thinkers: list[AtlasThinker]
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


def _neighbors(rows: list[CorrelationRow], placed: set[str], top_k: int) -> dict[str, list[AtlasNeighbor]]:
    acc: dict[str, list[AtlasNeighbor]] = defaultdict(list)
    for r in rows:
        if r.option_a_id in placed and r.option_b_id in placed:
            acc[r.option_a_id].append(AtlasNeighbor(id=r.option_b_id, r=r.r))
            acc[r.option_b_id].append(AtlasNeighbor(id=r.option_a_id, r=r.r))
    return {
        nid: sorted(ns, key=lambda n: -abs(n.r))[:top_k] for nid, ns in acc.items()
    }


def _thinker_layer(
    bridge_rows,
    coords_attention: dict[str, list[float]],
    coords_polarity: dict[str, list[float]],
    top_k: int,
) -> list[AtlasThinker]:
    """Weighted centroid per thinker over the atlas positions they bridge to."""
    by_thinker: dict[str, list] = defaultdict(list)
    labels: dict[str, str] = {}
    for ev in bridge_rows:
        if ev.position_id in coords_attention:  # only atlas positions (drop AOS/region)
            by_thinker[ev.thinker_id].append(ev)
            labels[ev.thinker_id] = ev.thinker_label

    out: list[AtlasThinker] = []
    for tid, evs in by_thinker.items():
        wsum = sum(abs(e.r) for e in evs) or 1.0

        def centroid(coords: dict[str, list[float]]) -> list[float]:
            cx = sum(abs(e.r) * coords[e.position_id][0] for e in evs) / wsum
            cy = sum(abs(e.r) * coords[e.position_id][1] for e in evs) / wsum
            return [cx, cy]

        top = sorted(evs, key=lambda e: -abs(e.r))[:top_k]
        out.append(
            AtlasThinker(
                id=tid, label=labels[tid],
                attention=centroid(coords_attention), polarity=centroid(coords_polarity),
                edges=[AtlasThinkerEdge(position_id=e.position_id, r=e.r) for e in top],
            )
        )
    return sorted(out, key=lambda t: t.label)


def build_atlas(
    store: CorrelationStore,
    position_ids: set[str] | None = None,
    bridge_rows=None,
    distance_fn: DistanceFn = DEFAULT_DISTANCE,
    neighbor_k: int = 6,
    thinker_k: int = 6,
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
    neigh = _neighbors(rows, placed, neighbor_k)
    coords_attention = {nid: emb.coords_mds[nid] for nid in emb.component}
    coords_polarity = {nid: polarity[nid] for nid in emb.component}
    nodes = [
        AtlasNode(
            id=nid, label=labels[nid],
            attention=coords_attention[nid], polarity=coords_polarity[nid],
            tradition=REGISTRY_LEAF_BY_OPTION.get(nid),
            neighbors=neigh.get(nid, []),
        )
        for nid in emb.component
    ]

    # traditions present among placed nodes
    trad_members: dict[str, list[str]] = defaultdict(list)
    for nid in placed:
        leaf = REGISTRY_LEAF_BY_OPTION.get(nid)
        if leaf:
            trad_members[leaf].append(nid)
    traditions = [AtlasTradition(id=leaf, member_ids=sorted(m)) for leaf, m in sorted(trad_members.items())]

    # only edges between two placed nodes are drawable in either geometry.
    opposition, cobelief = route_sign(rows)  # default OPPOSITION_THRESHOLD
    edges = [
        AtlasEdge(source=e.source, target=e.target, type=e.type.value, r=e.r)
        for e in (*opposition, *cobelief)
        if e.source in placed and e.target in placed
    ]

    thinkers = (
        _thinker_layer(bridge_rows, coords_attention, coords_polarity, thinker_k)
        if bridge_rows is not None else []
    )

    max_pairs = n * (n - 1) // 2
    return AtlasView(
        nodes=nodes,
        edges=edges,
        geometries=[
            AtlasGeometry(name="attention", variance=emb.variance_mds),
            AtlasGeometry(name="polarity", variance=pca.variance),
        ],
        traditions=traditions,
        thinkers=thinkers,
        n_positions=n,
        n_pairs=len(rows),
        density=(len(rows) / max_pairs) if max_pairs else 0.0,
    )


__all__ = [
    "AtlasNode",
    "AtlasNeighbor",
    "AtlasEdge",
    "AtlasGeometry",
    "AtlasTradition",
    "AtlasThinker",
    "AtlasThinkerEdge",
    "AtlasView",
    "is_position",
    "position_rows",
    "build_atlas",
]
