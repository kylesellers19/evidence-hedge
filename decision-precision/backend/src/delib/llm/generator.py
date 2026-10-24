"""LLM-backed generator — same Generator interface the mock implements."""

from __future__ import annotations

import re

from ..generation import Candidate, ExpansionResult, Generator, GoalStateProposal
from ..graph import DelibGraph
from ..models.edges import CausalEdge, Edge, FramesEdge
from ..models.enums import NodeType
from ..models.nodes import (
    CFIRTags,
    ConsequenceNode,
    DecisionNode,
    Node,
    ProctorScore,
    ProctorScores,
    StateNode,
)
from .interface import LLM
from .schemas import ProposedChild

_PLACEHOLDER = "(uncoded — CODER pending)"


def _slug(label: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")
    return s[:40] or "node"


def _placeholder_proctor() -> ProctorScores:
    # DecisionNode requires proctor scores; the generator role must never fabricate
    # them, so they are obvious placeholders the CODER overwrites (see apply.code_node).
    s = ProctorScore(score=3, justification=_PLACEHOLDER)
    return ProctorScores(acceptability=s, feasibility=s, cost=s, sustainability=s, adoption=s)


def _unique_id(graph: DelibGraph, base: str, taken: set[str]) -> str:
    cid, i = base, 1
    while cid in graph or cid in taken:
        i += 1
        cid = f"{base}-{i}"
    taken.add(cid)
    return cid


def _build_node(child: ProposedChild, node_id: str, ring: int) -> Node:
    if child.type == "DECISION":
        return DecisionNode(
            id=node_id,
            label=child.label,
            ring=ring,
            cfir_tags=CFIRTags(),
            proctor_scores=_placeholder_proctor(),
            unexpanded_child_estimate=child.unexpanded_child_estimate,
        )
    if child.type == "CONSEQUENCE":
        return ConsequenceNode(
            id=node_id,
            label=child.label,
            ring=ring,
            goal_relevance=child.goal_relevance,
            unexpanded_child_estimate=child.unexpanded_child_estimate,
        )
    return StateNode(id=node_id, label=child.label, ring=ring)


def _build_edge(parent: Node, node_id: str, child: ProposedChild) -> Edge:
    if parent.type is NodeType.SEED:
        return FramesEdge(source=parent.id, target=node_id)
    return CausalEdge(
        source=parent.id,
        target=node_id,
        mechanism_text=child.mechanism_text,
        evidence_grade=child.evidence_grade,
        polarity=child.polarity,
    )


def _graph_context(graph: DelibGraph, limit: int = 12) -> str:
    seed = graph.get_node(graph.seed_id) if graph.seed_id else None
    lines = []
    if seed is not None:
        lines.append(f"SEED: {getattr(seed, 'question_text', seed.label)}")
        lines.append(f"GOAL: {getattr(seed, 'goal_state_text', '')}")
    others = [n for n in graph.nodes() if n.type is not NodeType.SEED][:limit]
    for n in others:
        lines.append(f"- {n.type.value} r{n.ring}: {n.label}")
    return "\n".join(lines)


class LLMGenerator(Generator):
    def __init__(self, llm: LLM | None = None) -> None:
        self.llm = llm or LLM()

    def intake(self, question_text: str) -> GoalStateProposal:
        out = self.llm.intake(question_text)
        return GoalStateProposal(
            question_text=question_text,
            goal_state_text=out.goal_state_text,
            goal_criteria=out.goal_criteria,
        )

    def expand(self, graph: DelibGraph, node_id: str) -> ExpansionResult:
        parent = graph.get_node(node_id)
        summary = f"id={parent.id} type={parent.type.value} label={parent.label!r} ring={parent.ring}"
        out = self.llm.generate(summary, _graph_context(graph))

        taken: set[str] = set()
        candidates: list[Candidate] = []
        for child in out.children:
            cid = _unique_id(graph, _slug(child.label), taken)
            node = _build_node(child, cid, parent.ring + 1)
            edge = _build_edge(parent, cid, child)
            candidates.append(Candidate(node=node, edge=edge))
        return ExpansionResult(parent_id=node_id, candidates=candidates)


__all__ = ["LLMGenerator"]
