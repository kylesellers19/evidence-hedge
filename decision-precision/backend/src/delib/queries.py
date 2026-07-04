"""Graph queries over a DelibGraph.

All queries are pure functions of a :class:`~delib.graph.DelibGraph`. Result
types are pydantic models so they serialize straight to the API/frontend.

Implemented:
- ``path_confidence``          weakest-link confidence of the strongest causal route
- ``register_clash_points``    within-consequence order-of-worth clashes
- ``tradition_tension_points`` adjacent nodes whose traditions attack
- ``resolution_subgraph``      only the seed -> closure-bearing-consequence paths
- ``loop_inventory``           causal cycles classified reinforcing / balancing
"""

from __future__ import annotations

import networkx as nx
from pydantic import BaseModel

from .graph import DelibGraph
from .models.edges import CausalEdge, ClosureEdge, FramesEdge
from .models.enums import EVIDENCE_GRADE_ORDINAL, EdgeType, EvidenceGrade, LoopClass, Register
from .models.nodes import ConsequenceNode
from .models.registers import register_clashes
from .models.traditions import tradition_attacks

_MAX_ORDINAL = max(EVIDENCE_GRADE_ORDINAL.values())


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


# --- tension: register clashes + tradition attacks --------------------------
# Supersedes the old valence divergence. Two distinct tension layers:
#   register clashes  — WITHIN a consequence (two engaged orders of worth clash)
#   tradition tensions — BETWEEN adjacent nodes whose traditions attack


class RegisterClash(BaseModel):
    node_id: str
    register_a: Register
    register_b: Register


class TraditionTension(BaseModel):
    source: str
    target: str
    tradition_a: str
    tradition_b: str
    about: str


def register_clash_points(g: DelibGraph) -> list[RegisterClash]:
    """Per consequence, the clashing register pairs among its engaged registers
    (compromise pairs suppressed by the clash table)."""
    out: list[RegisterClash] = []
    for node in g.nodes():
        if not isinstance(node, ConsequenceNode) or not node.registers:
            continue
        regs = {e.register for e in node.registers}
        for a, b in register_clashes(regs):
            out.append(RegisterClash(node_id=node.id, register_a=a, register_b=b))
    return out


def tradition_tension_points(g: DelibGraph) -> list[TraditionTension]:
    """Adjacent node pairs (any edge) whose attributed traditions attack in the
    curated matrix. Reports each ordered edge once, per attacking tradition pair."""
    out: list[TraditionTension] = []
    for e in g.edges():
        src = g.get_node(e.source)
        tgt = g.get_node(e.target)
        if not isinstance(src, ConsequenceNode) or not isinstance(tgt, ConsequenceNode):
            continue
        for ta in src.traditions:
            for tb in tgt.traditions:
                attack = tradition_attacks(ta.tradition, tb.tradition)
                if attack is not None:
                    out.append(
                        TraditionTension(
                            source=e.source, target=e.target,
                            tradition_a=ta.tradition, tradition_b=tb.tradition,
                            about=attack.about,
                        )
                    )
    return out


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


__all__ = [
    "PathConfidence",
    "path_confidence",
    "RegisterClash",
    "TraditionTension",
    "register_clash_points",
    "tradition_tension_points",
    "ResolutionSubgraph",
    "resolution_subgraph",
    "Loop",
    "loop_inventory",
]
