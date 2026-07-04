"""Embedding machinery (A3).

With only 127 published pairs the matrix is far too sparse for a global
embedding — so this is a runnable SMOKE PATH, not the metric space. We take the
largest connected component of the pair graph, fill a dense dissimilarity via
graph shortest-paths (Isomap-style) over the sqrt(1-|r|) edge distances, then:
  - classical (Torgerson) MDS for interpretable axes + variance loadings,
  - UMAP for display.
All resulting coordinates are marked placement=PARTIAL. They are NOT presented
as the metric space.

Heavy imports (numpy/umap) are local so importing the survey package stays cheap.
"""

from __future__ import annotations

import networkx as nx
from pydantic import BaseModel

from ..enums import Placement
from ..map import Layer2Map
from .metric import DEFAULT_DISTANCE, DistanceFn
from .store import CorrelationRow


class EmbeddingResult(BaseModel):
    component: list[str]  # node ids in the largest connected component
    k: int
    coords_mds: dict[str, list[float]]
    variance_mds: list[float]  # fraction of variance per MDS axis (loadings)
    coords_umap: dict[str, list[float]] | None = None


def build_distance_graph(rows: list[CorrelationRow], distance_fn: DistanceFn = DEFAULT_DISTANCE) -> nx.Graph:
    g: nx.Graph = nx.Graph()
    for row in rows:
        g.add_edge(row.option_a_id, row.option_b_id, weight=distance_fn(row.r))
    return g


def largest_component(g: nx.Graph) -> list[str]:
    if g.number_of_nodes() == 0:
        return []
    return sorted(max(nx.connected_components(g), key=len))


def _graph_distance_matrix(g: nx.Graph, nodes: list[str]):
    import numpy as np

    idx = {n: i for i, n in enumerate(nodes)}
    D = np.zeros((len(nodes), len(nodes)))
    for src, lengths in nx.all_pairs_dijkstra_path_length(g, weight="weight"):
        if src not in idx:
            continue
        for dst, d in lengths.items():
            if dst in idx:
                D[idx[src], idx[dst]] = d
    return D


def classical_mds(D, k: int):
    """Torgerson classical MDS. Returns (coords[n,k], variance_fraction[k])."""
    import numpy as np

    n = D.shape[0]
    D2 = D ** 2
    J = np.eye(n) - np.ones((n, n)) / n
    B = -0.5 * J @ D2 @ J
    evals, evecs = np.linalg.eigh(B)
    order = np.argsort(evals)[::-1]
    evals, evecs = evals[order], evecs[:, order]
    pos = evals > 1e-9
    pos_evals = evals[pos]
    L = np.sqrt(pos_evals[:k])
    V = evecs[:, pos][:, :k]
    coords = V * L
    total = pos_evals.sum() if pos_evals.size else 1.0
    variance = (pos_evals[:k] / total).tolist()
    return coords, variance


def umap_embed(D, k: int):
    import numpy as np
    import umap

    n = D.shape[0]
    reducer = umap.UMAP(
        n_components=k, metric="precomputed",
        n_neighbors=min(15, max(2, n - 1)), random_state=42,
    )
    return np.asarray(reducer.fit_transform(D))


def embed_survey(
    rows: list[CorrelationRow],
    k: int = 2,
    distance_fn: DistanceFn = DEFAULT_DISTANCE,
    compute_umap: bool = True,
) -> EmbeddingResult:
    g = build_distance_graph(rows, distance_fn)
    component = largest_component(g)
    if len(component) < 3:
        return EmbeddingResult(component=component, k=k, coords_mds={}, variance_mds=[])

    sub = g.subgraph(component)
    D = _graph_distance_matrix(sub, component)
    coords, variance = classical_mds(D, k)
    coords_mds = {node: coords[i].tolist() for i, node in enumerate(component)}

    coords_umap = None
    if compute_umap:
        u = umap_embed(D, k)
        coords_umap = {node: u[i].tolist() for i, node in enumerate(component)}

    return EmbeddingResult(
        component=component, k=k, coords_mds=coords_mds,
        variance_mds=variance, coords_umap=coords_umap,
    )


def apply_partial_coords(m: Layer2Map, result: EmbeddingResult, which: str = "mds") -> list[str]:
    """Write the smoke-test coordinates onto matching POSITION nodes as PARTIAL.
    Only nodes present in the map and currently UNPLACED are touched."""
    coords = result.coords_umap if which == "umap" else result.coords_mds
    if not coords:
        return []
    updated: list[str] = []
    for node_id, c in coords.items():
        if node_id not in m:
            continue
        node = m.get_node(node_id)
        if node.placement is not Placement.UNPLACED:
            continue
        m.raw().nodes[node_id]["data"] = node.model_copy(
            update={"coords_partial": list(c), "placement": Placement.PARTIAL}
        )
        updated.append(node_id)
    return updated


__all__ = [
    "EmbeddingResult",
    "build_distance_graph",
    "largest_component",
    "classical_mds",
    "umap_embed",
    "embed_survey",
    "apply_partial_coords",
]
