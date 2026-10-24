"""Generation interface (Phase 2 seam).

``expand`` and ``intake`` are the two operations the GENERATOR role performs.
Phase 2 supplies a mock implementation; Phase 4 swaps in a LiteLLM-backed one
behind the *same* interface. Both return schema-conformant pydantic objects, so
nothing downstream knows whether a node came from a fixture or a model.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from pydantic import BaseModel

from typing import TYPE_CHECKING

from .graph import DelibGraph
from .models.edges import Edge
from .models.nodes import Node

if TYPE_CHECKING:
    from .dedup import Deduplicator


class GoalStateProposal(BaseModel):
    """Seed intake output: a goal state extracted from the question, returned
    for user confirmation before a SeedNode is committed."""

    question_text: str
    goal_state_text: str
    goal_criteria: list[str] = []


class Candidate(BaseModel):
    """A proposed child node plus the edge that attaches it to the graph.

    ``edge.source``/``edge.target`` reference the parent and this node; the
    engine validates them on insert, so an ill-typed attachment is rejected.
    """

    node: Node
    edge: Edge


class ExpansionResult(BaseModel):
    parent_id: str
    candidates: list[Candidate] = []


class Generator(ABC):
    """The GENERATOR role: seed intake + node expansion."""

    @abstractmethod
    def intake(self, question_text: str) -> GoalStateProposal:
        """Extract a candidate goal state from a seed question."""

    @abstractmethod
    def expand(self, graph: DelibGraph, node_id: str) -> ExpansionResult:
        """Return schema-conformant candidate children for ``node_id``."""


def apply_expansion(
    graph: DelibGraph,
    result: ExpansionResult,
    mark_expanded: bool = True,
    deduplicator: "Deduplicator | None" = None,
) -> list[str]:
    """Insert an expansion's candidates into the graph (idempotent on node id).

    Returns the ids of newly added nodes. Edges are always (re-)validated on
    insert. When ``mark_expanded`` and the parent supports it, flips the
    parent's ``expanded`` flag to True.

    When a ``deduplicator`` is supplied, a *new* candidate that matches an
    existing node is merged: its attaching edge is rewired to the existing node
    (giving that node a second parent → DAG) and no twin is added.
    """
    added: list[str] = []
    for cand in result.candidates:
        node, edge = cand.node, cand.edge

        # Loop-back / closure / otherwise-known targets: attach, don't re-add.
        if node.id in graph:
            graph.add_edge(edge)
            continue

        if deduplicator is not None:
            dup_id = deduplicator.find_duplicate(graph, node)
            if dup_id is not None:
                graph.add_edge(edge.model_copy(update={"target": dup_id}))
                continue

        graph.add_node(node)
        added.append(node.id)
        graph.add_edge(edge)

    if mark_expanded and result.parent_id in graph:
        parent = graph.get_node(result.parent_id)
        if hasattr(parent, "expanded"):
            parent.expanded = True
    return added


__all__ = [
    "GoalStateProposal",
    "Candidate",
    "ExpansionResult",
    "Generator",
    "apply_expansion",
]
