"""Shared builders for Phase-1 tests.

A compact graph that exercises the query surface: a reinforcing causal loop, a
framework-divergence point, and a PARTIAL closure edge. The full named
18-node Brooklyn fixture is a Phase-2 artifact; this is the minimal version the
query tests need.
"""

from __future__ import annotations

import pytest

from delib.graph import DelibGraph
from delib.models.edges import CausalEdge, ClosureEdge, FramesEdge
from delib.models.enums import ClosureSatisfaction, EvidenceGrade
from delib.models.nodes import (
    CFIRTags,
    ConsequenceNode,
    DecisionNode,
    ProctorScore,
    ProctorScores,
    SeedNode,
    Valence,
)
from delib.models.registries import (
    Framework,
    FrameworkRegistry,
    Stakeholder,
    StakeholderRegistry,
)


def proctor(n: int = 3) -> ProctorScores:
    s = ProctorScore(score=n, justification="placeholder")
    return ProctorScores(
        acceptability=s, feasibility=s, cost=s, sustainability=s, adoption=s
    )


def decision(nid: str, label: str, ring: int) -> DecisionNode:
    return DecisionNode(
        id=nid, label=label, ring=ring, cfir_tags=CFIRTags(), proctor_scores=proctor()
    )


def consequence(
    nid: str, label: str, ring: int, goal_relevance: float, valences=None
) -> ConsequenceNode:
    return ConsequenceNode(
        id=nid,
        label=label,
        ring=ring,
        goal_relevance=goal_relevance,
        valences=valences or [],
    )


def val(stakeholder: str, framework: str, sign: int) -> Valence:
    return Valence(
        stakeholder_id=stakeholder,
        framework_id=framework,
        sign=sign,
        justification="j",
    )


@pytest.fixture
def registries() -> tuple[StakeholderRegistry, FrameworkRegistry]:
    sh = StakeholderRegistry()
    sh.register(Stakeholder(id="incumbents", description="existing residents"))
    sh.register(Stakeholder(id="newcomers", description="new residents"))
    fw = FrameworkRegistry()
    fw.register(Framework(id="aggregate_utilitarian", name="Aggregate Utilitarian", rubric="r"))
    fw.register(Framework(id="prioritarian", name="Prioritarian", rubric="r"))
    return sh, fw


@pytest.fixture
def small_graph(registries) -> DelibGraph:
    """seed -> decision -> {desirability, displacement, rent} with:
    - reinforcing loop: build -> desirability -> rent -> build
    - divergence point: displacement (prioritarian -2, utilitarian 0)
    - PARTIAL closure: capacity -> seed
    """
    sh, fw = registries
    g = DelibGraph(stakeholders=sh, frameworks=fw)

    g.add_node(
        SeedNode(
            id="seed",
            label="Brooklyn tower",
            question_text="What happens if a developer builds a 40-story tower?",
            goal_state_text="housing capacity increases without net wellbeing loss to incumbents",
            goal_criteria=["capacity up", "no net incumbent wellbeing loss"],
        )
    )
    g.add_node(decision("build", "Build 40-story tower", 1))
    g.add_node(consequence("desirability", "Neighborhood more desirable", 2, 0.3))
    g.add_node(consequence("rent", "Rents rise", 2, 0.5))
    g.add_node(
        consequence(
            "displacement",
            "Incumbent displacement",
            3,
            0.9,
            valences=[
                val("incumbents", "prioritarian", -2),
                val("incumbents", "aggregate_utilitarian", 0),
            ],
        )
    )
    g.add_node(consequence("capacity", "Housing capacity increases", 2, 0.85))

    # Seed roots the graph via a FRAMES edge to ring-1 (not an empirical causal
    # claim; confidence-neutral in path_confidence).
    g.add_edge(FramesEdge(source="seed", target="build"))

    # Reinforcing loop: all same-direction (+1) polarities.
    g.add_edge(CausalEdge(source="build", target="desirability", mechanism_text="m",
                          evidence_grade=EvidenceGrade.SUPPORTED, polarity=1))
    g.add_edge(CausalEdge(source="desirability", target="rent", mechanism_text="m",
                          evidence_grade=EvidenceGrade.WEAK, polarity=1))
    g.add_edge(CausalEdge(source="rent", target="build", mechanism_text="m",
                          evidence_grade=EvidenceGrade.ANALOGICAL, polarity=1))

    g.add_edge(CausalEdge(source="rent", target="displacement", mechanism_text="m",
                          evidence_grade=EvidenceGrade.CONTESTED, polarity=1))
    g.add_edge(CausalEdge(source="build", target="capacity", mechanism_text="m",
                          evidence_grade=EvidenceGrade.SUPPORTED, polarity=1))

    g.add_edge(
        ClosureEdge(
            source="capacity",
            target="seed",
            satisfies=ClosureSatisfaction.PARTIAL,
            justification="capacity rises but incumbent wellbeing is at risk",
        )
    )
    return g
