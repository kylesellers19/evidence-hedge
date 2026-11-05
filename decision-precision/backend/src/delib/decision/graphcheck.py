"""References from a DecisionModel into a DelibGraph.

Reported as issues rather than raised: the live graph grows by progressive
disclosure, so a reference can be valid against the full map and still be
absent from the graph currently on screen. Each issue names the step it blocks.
"""

from __future__ import annotations

from pydantic import BaseModel

from ..graph import DelibGraph
from ..models.edges import CausalEdge
from ..models.enums import EdgeType, NodeType
from ..models.nodes import DecisionNode
from .models import DecisionModel, EdgeRef


class GraphIssue(BaseModel):
    step: int
    ref: str
    message: str


def causal_edge(graph: DelibGraph, ref: EdgeRef) -> CausalEdge | None:
    g = graph.raw()
    if g.has_edge(ref.source, ref.target, key=EdgeType.CAUSAL.value):
        return g[ref.source][ref.target][EdgeType.CAUSAL.value]["data"]
    return None


def graph_issues(model: DecisionModel, graph: DelibGraph) -> list[GraphIssue]:
    out: list[GraphIssue] = []

    def node_is(nid: str, *types: NodeType) -> bool:
        return nid in graph and graph.node_type(nid) in types

    f = model.frame
    if f.seed_id is not None and not node_is(f.seed_id, NodeType.SEED):
        out.append(GraphIssue(step=1, ref=f.seed_id, message="frame seed_id is not the graph's SEED"))
    for d in f.focus:
        if not node_is(d, NodeType.DECISION):
            out.append(GraphIssue(step=1, ref=d, message="focus entry is not a DECISION node in the graph"))

    focus = set(f.focus)
    for a in model.alternatives:
        for dim, option in a.choices.items():
            if dim not in focus:
                out.append(GraphIssue(step=5, ref=f"{a.id}:{dim}", message="choice made for a decision outside the frame's focus"))
            if not node_is(dim, NodeType.DECISION):
                out.append(GraphIssue(step=5, ref=f"{a.id}:{dim}", message="choice references a node that is not a DECISION in the graph"))
                continue
            node: DecisionNode = graph.get_node(dim)  # type: ignore[assignment]
            if node.alternatives and option not in node.alternatives:
                out.append(GraphIssue(
                    step=5, ref=f"{a.id}:{dim}",
                    message=f"option {option!r} is not one of the decision node's alternatives {node.alternatives}",
                ))

    for o in model.objectives:
        for cid in o.consequence_ids:
            if not node_is(cid, NodeType.CONSEQUENCE, NodeType.STATE):
                out.append(GraphIssue(step=4, ref=f"{o.id}:{cid}", message="objective measures a node that is not a CONSEQUENCE/STATE in the graph"))

    for s in model.statements:
        if s.node_id is not None and s.node_id not in graph:
            out.append(GraphIssue(step=3, ref=s.id, message=f"statement links node {s.node_id!r}, not in the graph"))
        if s.edge is not None and causal_edge(graph, s.edge) is None:
            out.append(GraphIssue(step=3, ref=s.id, message=f"statement links edge {s.edge.key()}, not a causal edge in the graph"))

    for c in model.edge_cards:
        if causal_edge(graph, c.edge) is None:
            out.append(GraphIssue(step=7, ref=c.edge.key(), message="evidence card for an edge that is not a causal edge in the graph"))
        for nc in c.confounders:
            if nc.node_id is not None and nc.node_id not in graph:
                out.append(GraphIssue(step=7, ref=c.edge.key(), message=f"confounder node {nc.node_id!r} not in the graph"))

    for cell in model.cells:
        for e in cell.basis_edges:
            if causal_edge(graph, e) is None:
                out.append(GraphIssue(step=8, ref=f"{cell.alternative_id}|{cell.objective_id}", message=f"basis edge {e.key()} is not a causal edge in the graph"))

    for a in model.assumptions:
        for e in a.refs.edges:
            if causal_edge(graph, e) is None:
                out.append(GraphIssue(step=11, ref=a.id, message=f"assumption references edge {e.key()}, not in the graph"))

    for lt in model.loop_treatments:
        for n in lt.nodes:
            if n not in graph:
                out.append(GraphIssue(step=6, ref=",".join(lt.nodes), message=f"loop treatment node {n!r} not in the graph"))
        if lt.cut_edge is not None and causal_edge(graph, lt.cut_edge) is None:
            out.append(GraphIssue(step=6, ref=lt.cut_edge.key(), message="cut edge is not a causal edge in the graph"))

    for g in model.groups:
        if g.stakeholder_id is not None and len(graph.stakeholders) and g.stakeholder_id not in graph.stakeholders:
            out.append(GraphIssue(step=2, ref=g.id, message=f"stakeholder {g.stakeholder_id!r} not in the graph's registry"))

    return out


__all__ = ["GraphIssue", "graph_issues", "causal_edge"]
