"""Expansion prioritization (Phase 2d).

Ranks unexpanded nodes for a future auto-explore mode by a weighted blend of
three normalized signals:

- **divergence**: how much frameworks/stakeholders disagree at the node
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
from .queries import divergence_points, path_confidence

_MAX_ORDINAL = max(EVIDENCE_GRADE_ORDINAL.values())


class PriorityWeights(BaseModel):
    divergence: float = 1.0
    evidence: float = 1.0
    goal_relevance: float = 1.0


class PriorityItem(BaseModel):
    node_id: str
    score: float
    divergence: float  # normalized components, each in [0, 1]
    evidence: float
    goal_relevance: float


def prioritize_expansions(
    g: DelibGraph, weights: PriorityWeights | None = None
) -> list[PriorityItem]:
    weights = weights or PriorityWeights()

    report = divergence_points(g)
    div_count: dict[str, int] = {}
    for d in report.across_frameworks + report.across_stakeholders:
        div_count[d.node_id] = div_count.get(d.node_id, 0) + 1
    max_div = max(div_count.values(), default=0)

    seed = g.seed_id
    items: list[PriorityItem] = []
    for node in g.nodes():
        expanded = getattr(node, "expanded", None)
        if expanded is None or expanded is True:
            continue  # skip seed/state and already-expanded nodes

        div = (div_count.get(node.id, 0) / max_div) if max_div else 0.0

        evidence = 0.0
        if seed is not None:
            pc = path_confidence(g, seed, node.id)
            if pc is not None:
                evidence = pc.ordinal / _MAX_ORDINAL

        goal_relevance = float(getattr(node, "goal_relevance", 0.0))

        score = (
            weights.divergence * div
            + weights.evidence * evidence
            + weights.goal_relevance * goal_relevance
        )
        items.append(
            PriorityItem(
                node_id=node.id,
                score=score,
                divergence=div,
                evidence=evidence,
                goal_relevance=goal_relevance,
            )
        )

    items.sort(key=lambda i: (i.score, i.node_id), reverse=True)
    return items


__all__ = ["PriorityWeights", "PriorityItem", "prioritize_expansions"]
