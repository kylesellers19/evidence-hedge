"""Layer2Map — the typed container for the co-belief / influence map.

Separate from Layer-1's DelibGraph (different node/edge semantics) but built the
same way: a networkx MultiDiGraph wrapper that validates on insert.

Enforced:
- unique node ids; a node's ``parent_id`` must exist and be same-or-coarser grain
  (TRADITION can parent POSITION/CLAIM; a CLAIM can't parent a TRADITION);
- edges connect existing MAP nodes (not thinkers);
- DESCENT is a lineage — it must stay acyclic;
- INFLUENCE/ATTACK/COMPATIBILITY may form any pattern (mutual influence, etc.);
- bridge assignments reference an existing thinker and an existing map node.
"""

from __future__ import annotations

from typing import Iterator

import networkx as nx

from .bridge import BridgeAssignment, Thinker
from .edges import DescentEdge, Layer2Edge
from .enums import GRAIN_ORDER, Layer2EdgeType
from .nodes import MapNode


class Layer2ConstraintError(ValueError):
    """Raised when an insert would violate a Layer 2 structural constraint."""


class Layer2Map:
    def __init__(self) -> None:
        self._g: nx.MultiDiGraph = nx.MultiDiGraph()
        self._thinkers: dict[str, Thinker] = {}
        self._bridge: list[BridgeAssignment] = []

    # --- nodes --------------------------------------------------------------

    def add_node(self, node: MapNode) -> MapNode:
        if node.id in self._g:
            raise Layer2ConstraintError(f"duplicate node id: {node.id!r}")
        if node.parent_id is not None:
            if node.parent_id not in self._g:
                raise Layer2ConstraintError(f"unknown parent_id: {node.parent_id!r}")
            parent = self.get_node(node.parent_id)
            if GRAIN_ORDER[parent.grain] > GRAIN_ORDER[node.grain]:
                raise Layer2ConstraintError(
                    f"parent {parent.grain.value} is finer than child {node.grain.value}"
                )
        self._g.add_node(node.id, data=node)
        return node

    def get_node(self, node_id: str) -> MapNode:
        return self._g.nodes[node_id]["data"]

    def nodes(self) -> Iterator[MapNode]:
        for _, attrs in self._g.nodes(data=True):
            yield attrs["data"]

    def __contains__(self, node_id: str) -> bool:
        return node_id in self._g

    def __len__(self) -> int:
        return self._g.number_of_nodes()

    # --- edges --------------------------------------------------------------

    def add_edge(self, edge: Layer2Edge) -> Layer2Edge:  # type: ignore[valid-type]
        for endpoint in (edge.source, edge.target):
            if endpoint not in self._g:
                raise Layer2ConstraintError(f"edge endpoint not a map node: {endpoint!r}")
        if isinstance(edge, DescentEdge) and self._creates_descent_cycle(edge.source, edge.target):
            raise Layer2ConstraintError(
                f"descent edge {edge.source!r}->{edge.target!r} would create a cycle"
            )
        self._g.add_edge(edge.source, edge.target, key=edge.type.value, data=edge)
        return edge

    def edges(self, edge_type: Layer2EdgeType | None = None) -> Iterator[Layer2Edge]:
        for _, _, attrs in self._g.edges(data=True):
            e = attrs["data"]
            if edge_type is None or e.type is edge_type:
                yield e

    def edges_between(self, a: str, b: str) -> list[Layer2Edge]:
        """All edges in either direction between two nodes."""
        out: list[Layer2Edge] = []
        for u, v in ((a, b), (b, a)):
            if self._g.has_edge(u, v):
                for _, attrs in self._g.get_edge_data(u, v).items():
                    out.append(attrs["data"])
        return out

    def descent_digraph(self) -> nx.DiGraph:
        dg: nx.DiGraph = nx.DiGraph()
        dg.add_nodes_from(self._g.nodes)
        for u, v, attrs in self._g.edges(data=True):
            if attrs["data"].type is Layer2EdgeType.DESCENT:
                dg.add_edge(u, v)
        return dg

    def _creates_descent_cycle(self, source: str, target: str) -> bool:
        if source == target:
            return True
        dg = self.descent_digraph()
        return target in dg and source in dg and nx.has_path(dg, target, source)

    # --- bridge -------------------------------------------------------------

    def add_thinker(self, thinker: Thinker) -> Thinker:
        if thinker.id in self._thinkers:
            raise Layer2ConstraintError(f"duplicate thinker id: {thinker.id!r}")
        self._thinkers[thinker.id] = thinker
        return thinker

    def add_bridge(self, assignment: BridgeAssignment) -> BridgeAssignment:
        if assignment.thinker_id not in self._thinkers:
            raise Layer2ConstraintError(f"unknown thinker: {assignment.thinker_id!r}")
        if assignment.target_id not in self._g:
            raise Layer2ConstraintError(f"bridge target not a map node: {assignment.target_id!r}")
        self._bridge.append(assignment)
        return assignment

    def thinkers(self) -> Iterator[Thinker]:
        return iter(self._thinkers.values())

    def bridge(self) -> list[BridgeAssignment]:
        return list(self._bridge)

    def raw(self) -> nx.MultiDiGraph:
        return self._g


__all__ = ["Layer2Map", "Layer2ConstraintError"]
