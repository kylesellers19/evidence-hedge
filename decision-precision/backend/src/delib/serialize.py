"""Graph -> renderer-ready view (Phase 3).

Emits positioned nodes, edges with the *semantics* the renderer styles on
(node type, evidence grade, divergence, resolution membership), and the query
overlays the UI needs (divergence points, loops, burden index, resolution set).
Styling itself stays in the renderer — this layer ships meaning, not colors.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from .graph import DelibGraph
from .layout import radial_layout
from .models.enums import EdgeType, EvidenceGrade, NodeType
from .queries import (
    Loop,
    burden_indices,
    divergence_points,
    loop_inventory,
    resolution_subgraph,
)


class NodeView(BaseModel):
    id: str
    type: NodeType
    label: str
    ring: int
    x: float
    y: float
    angle: float
    # progressive disclosure
    expanded: bool | None = None
    unexpanded_child_estimate: int | None = None
    halo: bool = False  # unexpanded with hidden children -> dotted halo + badge
    # semantics the renderer highlights on
    goal_relevance: float | None = None
    is_divergence: bool = False
    divergence_kinds: list[str] = []
    on_resolution_path: bool = False
    # full typed payload for the side panel (every field editable in the UI)
    data: dict[str, Any]


class EdgeView(BaseModel):
    id: str
    source: str
    target: str
    type: EdgeType
    evidence_grade: EvidenceGrade | None = None
    polarity: int | None = None
    satisfies: str | None = None
    justification: str | None = None
    mechanism_text: str | None = None
    contradicted: bool = False  # renderer draws these red
    on_resolution_path: bool = False


class GraphView(BaseModel):
    view: str  # "full" | "resolution"
    nodes: list[NodeView]
    edges: list[EdgeView]
    overlays: dict[str, Any]


def _edge_id(e: Any) -> str:
    return f"{e.type.value}:{e.source}->{e.target}"


def graph_view(g: DelibGraph, view: str = "full") -> GraphView:
    positions = radial_layout(g)
    div = divergence_points(g)
    loops: list[Loop] = loop_inventory(g)
    res = resolution_subgraph(g)
    res_nodes = set(res.node_ids)
    res_edge_ids = {
        _edge_id(e) for e in (*res.causal_edges, *res.frames_edges, *res.closure_edges)
    }

    # divergence node -> kinds
    div_kinds: dict[str, set[str]] = {}
    for d in div.across_frameworks:
        div_kinds.setdefault(d.node_id, set()).add("across_frameworks")
    for d in div.across_stakeholders:
        div_kinds.setdefault(d.node_id, set()).add("across_stakeholders")

    keep_node = (lambda nid: nid in res_nodes) if view == "resolution" else (lambda nid: True)

    nodes: list[NodeView] = []
    for node in g.nodes():
        if not keep_node(node.id):
            continue
        pos = positions[node.id]
        expanded = getattr(node, "expanded", None)
        estimate = getattr(node, "unexpanded_child_estimate", None)
        halo = bool(expanded is False and (estimate or 0) > 0)
        nodes.append(
            NodeView(
                id=node.id,
                type=node.type,
                label=node.label,
                ring=node.ring,
                x=pos.x,
                y=pos.y,
                angle=pos.angle,
                expanded=expanded,
                unexpanded_child_estimate=estimate,
                halo=halo,
                goal_relevance=getattr(node, "goal_relevance", None),
                is_divergence=node.id in div_kinds,
                divergence_kinds=sorted(div_kinds.get(node.id, set())),
                on_resolution_path=node.id in res_nodes,
                data=node.model_dump(mode="json"),
            )
        )

    edges: list[EdgeView] = []
    for e in g.edges():
        if view == "resolution" and (e.source not in res_nodes or e.target not in res_nodes):
            continue
        grade = getattr(e, "evidence_grade", None)
        edges.append(
            EdgeView(
                id=_edge_id(e),
                source=e.source,
                target=e.target,
                type=e.type,
                evidence_grade=grade,
                polarity=getattr(e, "polarity", None),
                satisfies=getattr(e, "satisfies", None).value
                if getattr(e, "satisfies", None) is not None
                else None,
                justification=getattr(e, "justification", None),
                mechanism_text=getattr(e, "mechanism_text", None),
                contradicted=grade is EvidenceGrade.CONTRADICTED,
                on_resolution_path=_edge_id(e) in res_edge_ids,
            )
        )

    overlays: dict[str, Any] = {
        "divergence": div.model_dump(mode="json"),
        "loops": [loop.model_dump(mode="json") for loop in loops],
        "burden_index": burden_indices(g),
        "resolution_node_ids": sorted(res_nodes),
        "closures": [
            {"source": c.source, "satisfies": c.satisfies.value} for c in res.closure_edges
        ],
    }

    return GraphView(view=view, nodes=nodes, edges=edges, overlays=overlays)


__all__ = ["NodeView", "EdgeView", "GraphView", "graph_view"]
