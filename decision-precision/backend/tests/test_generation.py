"""Contract tests for the generation seam (no LLM, no fixture content yet)."""

from __future__ import annotations

import pytest

from delib.generation import (
    Candidate,
    ExpansionResult,
    Generator,
    GoalStateProposal,
    apply_expansion,
)
from delib.graph import DelibGraph
from delib.models.edges import CausalEdge
from delib.models.nodes import SeedNode
from conftest import consequence, decision


class StubGenerator(Generator):
    def intake(self, question_text: str) -> GoalStateProposal:
        return GoalStateProposal(
            question_text=question_text,
            goal_state_text="a goal",
            goal_criteria=["c1"],
        )

    def expand(self, graph: DelibGraph, node_id: str) -> ExpansionResult:
        child = consequence("kid", "a consequence", ring=2, goal_relevance=0.4)
        return ExpansionResult(
            parent_id=node_id,
            candidates=[
                Candidate(
                    node=child,
                    edge=CausalEdge(source=node_id, target="kid", mechanism_text="m"),
                )
            ],
        )


def _graph_with_ring1() -> DelibGraph:
    g = DelibGraph()
    g.add_node(SeedNode(id="seed", label="s", question_text="q", goal_state_text="g"))
    g.add_node(decision("build", "Build", 1))
    return g


def test_intake_returns_goal_proposal():
    gen = StubGenerator()
    prop = gen.intake("What if X?")
    assert isinstance(prop, GoalStateProposal)
    assert prop.question_text == "What if X?"


def test_apply_expansion_inserts_and_marks_expanded():
    g = _graph_with_ring1()
    gen = StubGenerator()
    result = gen.expand(g, "build")
    added = apply_expansion(g, result)
    assert added == ["kid"]
    assert "kid" in g
    assert g.get_node("build").expanded is True


def test_apply_expansion_idempotent_on_node_id():
    g = _graph_with_ring1()
    gen = StubGenerator()
    apply_expansion(g, gen.expand(g, "build"))
    # second application: node already present, no duplicate-id error, no new ids
    added = apply_expansion(g, ExpansionResult(parent_id="build", candidates=[]))
    assert added == []


def test_candidate_edge_validated_on_apply():
    g = _graph_with_ring1()
    # a candidate whose edge targets the seed via causal must be rejected
    bad = ExpansionResult(
        parent_id="build",
        candidates=[
            Candidate(
                node=consequence("k2", "x", 2, 0.5),
                edge=CausalEdge(source="k2", target="seed", mechanism_text="m"),
            )
        ],
    )
    with pytest.raises(Exception):
        apply_expansion(g, bad)
