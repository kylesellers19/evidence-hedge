"""DelibGraph — the typed container.

Wraps a ``networkx.MultiDiGraph`` (nodes/edges carry their pydantic model under
the ``data`` attribute) and enforces, at insert time, the constraints that node-
and edge-model types alone cannot express because they depend on *endpoint node
types*:

- deliberative edges are DECISION -> DECISION only, and must stay acyclic;
- closure edges are CONSEQUENCE -> SEED only;
- causal edges may never target the SEED (only closure re-enters the seed);
- the causal subgraph MAY cycle (loops are inventoried, not forbidden);
- at most one SEED per graph;
- every tradition attribution must reference a known tradition leaf.

Edges are keyed by their type, so a given ordered pair holds at most one edge of
each type (a causal and a deliberative edge between two decisions can coexist).
"""

from __future__ import annotations

from typing import Iterator

import networkx as nx

from .models.edges import (
    CausalEdge,
    ClosureEdge,
    DeliberativeEdge,
    Edge,
    FramesEdge,
)
from .models.enums import EdgeType, NodeType
from .models.nodes import ConsequenceNode, Node
from .models.registries import FrameworkRegistry, StakeholderRegistry
from .models.traditions import TRADITION_LEAVES


class GraphConstraintError(ValueError):
    """Raised when an insert would violate a structural graph constraint."""


class DelibGraph:
    def __init__(
        self,
        stakeholders: StakeholderRegistry | None = None,
        frameworks: FrameworkRegistry | None = None,
    ) -> None:
        self._g: nx.MultiDiGraph = nx.MultiDiGraph()
        self.stakeholders = stakeholders or StakeholderRegistry()
        self.frameworks = frameworks or FrameworkRegistry()
        self._seed_id: str | None = None

    # --- Nodes --------------------------------------------------------------

    def add_node(self, node: Node) -> Node:
        if node.id in self._g:
            raise GraphConstraintError(f"duplicate node id: {node.id!r}")

        if node.type is NodeType.SEED:
            if self._seed_id is not None:
                raise GraphConstraintError(
                    f"graph already has a seed ({self._seed_id!r}); "
                    f"cannot add second seed {node.id!r}"
                )
            self._seed_id = node.id

        if isinstance(node, ConsequenceNode):
            self._validate_tradition_refs(node)

        self._g.add_node(node.id, data=node)
        return node

    def _validate_tradition_refs(self, node: ConsequenceNode) -> None:
        # Register engagements are enum-typed (always valid); tradition
        # attributions must reference a known leaf.
        for t in node.traditions:
            if t.tradition not in TRADITION_LEAVES:
                raise GraphConstraintError(
                    f"tradition attribution on {node.id!r} references unknown "
                    f"tradition leaf {t.tradition!r}"
                )

    # --- Edges --------------------------------------------------------------

    def add_edge(self, edge: Edge) -> Edge:
        for endpoint in (edge.source, edge.target):
            if endpoint not in self._g:
                raise GraphConstraintError(f"edge endpoint not in graph: {endpoint!r}")

        s_type = self.node_type(edge.source)
        t_type = self.node_type(edge.target)

        if isinstance(edge, DeliberativeEdge):
            if s_type is not NodeType.DECISION or t_type is not NodeType.DECISION:
                raise GraphConstraintError(
                    "deliberative edge must be DECISION->DECISION, got "
                    f"{s_type.value}->{t_type.value}"
                )
            if self._creates_deliberative_cycle(edge.source, edge.target):
                raise GraphConstraintError(
                    f"deliberative edge {edge.source!r}->{edge.target!r} "
                    "would create a cycle"
                )
        elif isinstance(edge, ClosureEdge):
            if s_type is not NodeType.CONSEQUENCE:
                raise GraphConstraintError(
                    f"closure edge must originate at a CONSEQUENCE, got {s_type.value}"
                )
            if t_type is not NodeType.SEED:
                raise GraphConstraintError(
                    f"closure edge must target the SEED, got {t_type.value}"
                )
        elif isinstance(edge, CausalEdge):
            if t_type is NodeType.SEED:
                raise GraphConstraintError(
                    "causal edge may not target the SEED (only closure re-enters "
                    "the seed)"
                )
        elif isinstance(edge, FramesEdge):
            if s_type is not NodeType.SEED:
                raise GraphConstraintError(
                    f"frames edge must originate at the SEED, got {s_type.value}"
                )
            if t_type is NodeType.SEED:
                raise GraphConstraintError("frames edge may not target the SEED")
            target_ring = self.get_node(edge.target).ring
            if target_ring != 1:
                raise GraphConstraintError(
                    f"frames edge must target a ring-1 node, got ring {target_ring}"
                )
        else:  # pragma: no cover - exhaustive over Edge union
            raise GraphConstraintError(f"unknown edge type: {type(edge).__name__}")

        self._g.add_edge(edge.source, edge.target, key=edge.type.value, data=edge)
        return edge

    def _creates_deliberative_cycle(self, source: str, target: str) -> bool:
        if source == target:
            return True
        # A cycle would form iff target can already reach source via existing
        # deliberative edges.
        delib = self._subgraph_by_type(EdgeType.DELIBERATIVE)
        return target in delib and source in delib and nx.has_path(delib, target, source)

    # --- Accessors ----------------------------------------------------------

    @property
    def seed_id(self) -> str | None:
        return self._seed_id

    def __contains__(self, node_id: str) -> bool:
        return node_id in self._g

    def __len__(self) -> int:
        return self._g.number_of_nodes()

    def get_node(self, node_id: str) -> Node:
        return self._g.nodes[node_id]["data"]

    def node_type(self, node_id: str) -> NodeType:
        return self._g.nodes[node_id]["data"].type

    def nodes(self) -> Iterator[Node]:
        for _, attrs in self._g.nodes(data=True):
            yield attrs["data"]

    def edges(self, edge_type: EdgeType | None = None) -> Iterator[Edge]:
        for _, _, attrs in self._g.edges(data=True):
            e = attrs["data"]
            if edge_type is None or e.type is edge_type:
                yield e

    def raw(self) -> nx.MultiDiGraph:
        """The underlying networkx graph (node/edge ``data`` attrs are models)."""
        return self._g

    def _subgraph_by_type(self, edge_type: EdgeType) -> nx.DiGraph:
        """A simple DiGraph of just the edges of ``edge_type`` (data preserved)."""
        dg: nx.DiGraph = nx.DiGraph()
        dg.add_nodes_from(self._g.nodes)
        for u, v, attrs in self._g.edges(data=True):
            if attrs["data"].type is edge_type:
                dg.add_edge(u, v, data=attrs["data"])
        return dg

    def causal_digraph(self) -> nx.DiGraph:
        return self._subgraph_by_type(EdgeType.CAUSAL)

    def deliberative_digraph(self) -> nx.DiGraph:
        return self._subgraph_by_type(EdgeType.DELIBERATIVE)

    def frames_digraph(self) -> nx.DiGraph:
        return self._subgraph_by_type(EdgeType.FRAMES)

    def structural_digraph(self) -> nx.DiGraph:
        """Causal + framing edges — the connective spine from the seed outward.

        Used by queries that must reach the seed (resolution_subgraph, and
        path_confidence's path-to-seed). Framing edges connect but are
        confidence-neutral; only causal edges carry an evidence grade.
        """
        dg: nx.DiGraph = nx.DiGraph()
        dg.add_nodes_from(self._g.nodes)
        for u, v, attrs in self._g.edges(data=True):
            if attrs["data"].type in (EdgeType.CAUSAL, EdgeType.FRAMES):
                dg.add_edge(u, v, data=attrs["data"])
        return dg


__all__ = ["DelibGraph", "GraphConstraintError"]
