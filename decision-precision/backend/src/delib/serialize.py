"""Graph -> renderer-ready view (Phase 3).

Emits positioned nodes, edges with the *semantics* the renderer styles on
(node type, evidence grade, register clashes, coding status, resolution
membership), and the query overlays the UI needs (register clashes, tradition
tensions, loops, resolution set). Styling stays in the renderer — this layer
ships meaning, not colors.
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
    loop_inventory,
    register_clash_points,
    resolution_subgraph,
    tradition_tension_points,
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
    coding_status: str | None = None
    register_clashes: list[tuple[str, str]] = []  # clashing order-of-worth pairs on this node
    on_resolution_path: bool = False
    # full typed payload for the side panel (every field editable in the UI)
    data: dict[str, Any]


class EdgeView(BaseModel):
    id: str
    source: str
    target: str
    type: EdgeType
    evidence_grade: EvidenceGrade | None = None
    evidence_consistency: str | None = None
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
    clashes = register_clash_points(g)
    tensions = tradition_tension_points(g)
    loops: list[Loop] = loop_inventory(g)
    res = resolution_subgraph(g)
    res_nodes = set(res.node_ids)
    res_edge_ids = {
        _edge_id(e) for e in (*res.causal_edges, *res.frames_edges, *res.closure_edges)
    }

    # node -> its clashing register pairs
    node_clashes: dict[str, list[tuple[str, str]]] = {}
    for c in clashes:
        node_clashes.setdefault(c.node_id, []).append((c.register_a.value, c.register_b.value))

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
                coding_status=getattr(getattr(node, "coding_status", None), "value", None),
                register_clashes=node_clashes.get(node.id, []),
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
                evidence_consistency=getattr(e, "evidence_consistency", None),
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
        "register_clashes": [c.model_dump(mode="json") for c in clashes],
        "tradition_tensions": [t.model_dump(mode="json") for t in tensions],
        "burden_index": burden_indices(g),
        "loops": [loop.model_dump(mode="json") for loop in loops],
        "resolution_node_ids": sorted(res_nodes),
        "closures": [
            {"source": c.source, "satisfies": c.satisfies.value} for c in res.closure_edges
        ],
    }

    return GraphView(view=view, nodes=nodes, edges=edges, overlays=overlays)


__all__ = ["NodeView", "EdgeView", "GraphView", "graph_view"]
