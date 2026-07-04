"""Expansion prioritization (Phase 2d).

Ranks unexpanded nodes for a future auto-explore mode by a weighted blend of
three normalized signals:

- **tension**: register clashes on the node + tradition tensions touching it
  (chase contested territory)
- **evidence**: confidence of the causal route from the seed to the node
  (expand where the chain is solid)
- **goal_relevance**: how much the node bears on the goal state

Weights are configurable and default to equal (1/1/1). Only nodes that carry an
``expanded`` flag and are still unexpanded (decisions, consequences) are ranked;
the seed and states are skipped.
"""

from __future__ import annotations

from pydantic import BaseModel

from .graph import DelibGraph
from .models.enums import EVIDENCE_GRADE_ORDINAL
from .queries import path_confidence, register_clash_points, tradition_tension_points

_MAX_ORDINAL = max(EVIDENCE_GRADE_ORDINAL.values())


class PriorityWeights(BaseModel):
    tension: float = 1.0
    evidence: float = 1.0
    goal_relevance: float = 1.0


class PriorityItem(BaseModel):
    node_id: str
    score: float
    tension: float  # normalized components, each in [0, 1]
    evidence: float
    goal_relevance: float


def prioritize_expansions(
    g: DelibGraph, weights: PriorityWeights | None = None
) -> list[PriorityItem]:
    weights = weights or PriorityWeights()

    # tension per node: register clashes on the node + tradition tensions on
    # either endpoint of an edge it participates in.
    tension_count: dict[str, int] = {}
    for c in register_clash_points(g):
        tension_count[c.node_id] = tension_count.get(c.node_id, 0) + 1
    for t in tradition_tension_points(g):
        for nid in (t.source, t.target):
            tension_count[nid] = tension_count.get(nid, 0) + 1
    max_tension = max(tension_count.values(), default=0)

    seed = g.seed_id
    items: list[PriorityItem] = []
    for node in g.nodes():
        expanded = getattr(node, "expanded", None)
        if expanded is None or expanded is True:
            continue  # skip seed/state and already-expanded nodes

        tension = (tension_count.get(node.id, 0) / max_tension) if max_tension else 0.0

        evidence = 0.0
        if seed is not None:
            pc = path_confidence(g, seed, node.id)
            if pc is not None:
                evidence = pc.ordinal / _MAX_ORDINAL

        goal_relevance = float(getattr(node, "goal_relevance", 0.0))

        score = (
            weights.tension * tension
            + weights.evidence * evidence
            + weights.goal_relevance * goal_relevance
        )
        items.append(
            PriorityItem(
                node_id=node.id,
                score=score,
                tension=tension,
                evidence=evidence,
                goal_relevance=goal_relevance,
            )
        )

    items.sort(key=lambda i: (i.score, i.node_id), reverse=True)
    return items


__all__ = ["PriorityWeights", "PriorityItem", "prioritize_expansions"]
