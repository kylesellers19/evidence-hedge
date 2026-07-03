"""Graph queries over a DelibGraph.

All queries are pure functions of a :class:`~delib.graph.DelibGraph`. Result
types are pydantic models so they serialize straight to the API/frontend.

Implemented:
- ``path_confidence``    weakest-link confidence of the strongest causal route
- ``divergence_points``  valence sign-flips (across frameworks / stakeholders)
- ``resolution_subgraph`` only the seed -> closure-bearing-consequence paths
- ``loop_inventory``     causal cycles classified reinforcing / balancing
- ``burden_index``       per-stakeholder negative valence weighted by confidence
"""

from __future__ import annotations

from typing import Literal

import networkx as nx
from pydantic import BaseModel

from .graph import DelibGraph
from .models.edges import CausalEdge, ClosureEdge, FramesEdge
from .models.enums import EVIDENCE_GRADE_ORDINAL, EdgeType, EvidenceGrade, LoopClass
from .models.nodes import ConsequenceNode

_MAX_ORDINAL = max(EVIDENCE_GRADE_ORDINAL.values())


def _signum(x: int) -> int:
    return (x > 0) - (x < 0)


# --- path_confidence --------------------------------------------------------


class PathConfidence(BaseModel):
    """The strongest route source->target, scored by its weakest causal link.

    Routes may traverse the seed's framing edge; framing edges are
    confidence-neutral, so ``weakest_grade`` is None (and ordinal == max) only
    when the route contains no causal edge at all.
    """

    source: str
    target: str
    path: list[str]
    weakest_grade: EvidenceGrade | None
    ordinal: int  # ordinal of weakest_grade; higher == more confident


def _weakest_link(structural: nx.DiGraph, path: list[str]) -> tuple[EvidenceGrade | None, int]:
    # Only causal edges carry a grade; framing edges are confidence-neutral.
    grades = [
        structural[u][v]["data"].evidence_grade
        for u, v in zip(path, path[1:])
        if structural[u][v]["data"].type is EdgeType.CAUSAL
    ]
    if not grades:
        return None, _MAX_ORDINAL
    weakest = min(grades, key=lambda g: EVIDENCE_GRADE_ORDINAL[g])
    return weakest, EVIDENCE_GRADE_ORDINAL[weakest]


def path_confidence(g: DelibGraph, source: str, target: str) -> PathConfidence | None:
    """Confidence of a route = its weakest causal link (min ordinal).

    Traverses the causal+framing spine (so paths from the seed work), and over
    all simple routes returns the one whose weakest link is strongest (max-min).
    Returns None if no route exists.
    """
    structural = g.structural_digraph()
    if source not in structural or target not in structural:
        return None

    best: PathConfidence | None = None
    for path in nx.all_simple_paths(structural, source, target):
        if len(path) < 2:
            continue
        grade, ordinal = _weakest_link(structural, path)
        if best is None or ordinal > best.ordinal:
            best = PathConfidence(
                source=source,
                target=target,
                path=path,
                weakest_grade=grade,
                ordinal=ordinal,
            )
    return best


# --- divergence_points ------------------------------------------------------


class DivergencePoint(BaseModel):
    node_id: str
    kind: Literal["across_frameworks", "across_stakeholders"]
    fixed_id: str  # stakeholder (across_frameworks) or framework (across_stakeholders)
    signs: dict[str, int]  # varying dimension id -> sign


class DivergenceReport(BaseModel):
    across_frameworks: list[DivergencePoint] = []
    across_stakeholders: list[DivergencePoint] = []


def _is_divergent(signs: list[int]) -> bool:
    """True when the group mixes sign classes (e.g. negative vs neutral)."""
    return len({_signum(s) for s in signs}) > 1


def divergence_points(g: DelibGraph) -> DivergenceReport:
    report = DivergenceReport()
    for node in g.nodes():
        if not isinstance(node, ConsequenceNode) or not node.valences:
            continue

        # across frameworks, stakeholder fixed
        by_stakeholder: dict[str, dict[str, int]] = {}
        for v in node.valences:
            by_stakeholder.setdefault(v.stakeholder_id, {})[v.framework_id] = v.sign
        for stakeholder, fw_signs in by_stakeholder.items():
            if _is_divergent(list(fw_signs.values())):
                report.across_frameworks.append(
                    DivergencePoint(
                        node_id=node.id,
                        kind="across_frameworks",
                        fixed_id=stakeholder,
                        signs=fw_signs,
                    )
                )

        # across stakeholders, framework fixed
        by_framework: dict[str, dict[str, int]] = {}
        for v in node.valences:
            by_framework.setdefault(v.framework_id, {})[v.stakeholder_id] = v.sign
        for framework, sh_signs in by_framework.items():
            if _is_divergent(list(sh_signs.values())):
                report.across_stakeholders.append(
                    DivergencePoint(
                        node_id=node.id,
                        kind="across_stakeholders",
                        fixed_id=framework,
                        signs=sh_signs,
                    )
                )
    return report


# --- resolution_subgraph ----------------------------------------------------


class ResolutionSubgraph(BaseModel):
    """Nodes/edges on some simple route from the seed to a closure-bearing
    consequence, plus those closure edges."""

    node_ids: list[str]
    causal_edges: list[CausalEdge]
    frames_edges: list[FramesEdge]
    closure_edges: list[ClosureEdge]


def resolution_subgraph(g: DelibGraph) -> ResolutionSubgraph:
    seed = g.seed_id
    closure_edges = [e for e in g.edges(EdgeType.CLOSURE)]  # type: ignore[misc]
    empty = ResolutionSubgraph(node_ids=[], causal_edges=[], frames_edges=[], closure_edges=[])
    if seed is None or not closure_edges:
        return empty

    structural = g.structural_digraph()  # causal + framing spine
    if seed not in structural:
        return empty

    # Nodes/edges on some SIMPLE route seed -> closure consequence. Simple (not
    # mere reachability) so a reinforcing loop that merely touches the route
    # does not drag its members into the resolution. (all_simple_paths is
    # exponential worst-case; fine at these sizes — cap if graphs grow dense.)
    nodes: set[str] = set()
    edge_pairs: set[tuple[str, str]] = set()
    for ce in closure_edges:
        target = ce.source  # the closure-bearing consequence
        if target not in structural:
            continue
        for path in nx.all_simple_paths(structural, seed, target):
            nodes.update(path)
            edge_pairs.update(zip(path, path[1:]))

    causal_on_path: list[CausalEdge] = []
    frames_on_path: list[FramesEdge] = []
    for u, v in edge_pairs:
        data = structural[u][v]["data"]
        if data.type is EdgeType.CAUSAL:
            causal_on_path.append(data)
        else:
            frames_on_path.append(data)
    closure_on_path = [ce for ce in closure_edges if ce.source in nodes]
    return ResolutionSubgraph(
        node_ids=sorted(nodes),
        causal_edges=causal_on_path,
        frames_edges=frames_on_path,
        closure_edges=closure_on_path,
    )


# --- loop_inventory ---------------------------------------------------------


class Loop(BaseModel):
    nodes: list[str]  # cycle order (does not repeat the first node)
    loop_class: LoopClass
    polarity_product: int  # 0 => at least one uncoded edge => UNDETERMINED


def loop_inventory(g: DelibGraph) -> list[Loop]:
    causal = g.causal_digraph()
    loops: list[Loop] = []
    for cycle in nx.simple_cycles(causal):
        product = 1
        undetermined = False
        for u, v in zip(cycle, cycle[1:] + cycle[:1]):
            pol = causal[u][v]["data"].polarity
            if pol == 0:
                undetermined = True
                break
            product *= pol
        if undetermined:
            loops.append(Loop(nodes=cycle, loop_class=LoopClass.UNDETERMINED, polarity_product=0))
        elif product > 0:
            loops.append(Loop(nodes=cycle, loop_class=LoopClass.REINFORCING, polarity_product=product))
        else:
            loops.append(Loop(nodes=cycle, loop_class=LoopClass.BALANCING, polarity_product=product))
    return loops


# --- burden_index -----------------------------------------------------------


def burden_index(g: DelibGraph, stakeholder_id: str) -> float:
    """Sum of a stakeholder's negative valences, each weighted by the confidence
    of the causal path from the seed to the bearing consequence.

    weight = path_confidence(seed -> node).ordinal / max_ordinal  (0 if no path)
    contribution = |sign| * weight   for every valence with sign < 0
    """
    seed = g.seed_id
    total = 0.0
    for node in g.nodes():
        if not isinstance(node, ConsequenceNode):
            continue
        negatives = [v for v in node.valences if v.stakeholder_id == stakeholder_id and v.sign < 0]
        if not negatives:
            continue
        weight = 0.0
        if seed is not None:
            pc = path_confidence(g, seed, node.id)
            if pc is not None:
                weight = pc.ordinal / _MAX_ORDINAL
        total += sum(abs(v.sign) for v in negatives) * weight
    return total


def burden_indices(g: DelibGraph) -> dict[str, float]:
    return {s.id: burden_index(g, s.id) for s in g.stakeholders}


__all__ = [
    "PathConfidence",
    "path_confidence",
    "DivergencePoint",
    "DivergenceReport",
    "divergence_points",
    "ResolutionSubgraph",
    "resolution_subgraph",
    "Loop",
    "loop_inventory",
    "burden_index",
    "burden_indices",
]
