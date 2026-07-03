"""Type-discipline tests for node models.

The point of the schema is that illegal combinations are *structurally*
impossible. Every illegal combination below must raise ``ValidationError``.
"""

from __future__ import annotations

import pytest
from pydantic import TypeAdapter, ValidationError

from delib.models.nodes import (
    CFIRTags,
    ConsequenceNode,
    DecisionNode,
    Node,
    ProctorScore,
    ProctorScores,
    SeedNode,
    StateNode,
    Valence,
)


def make_proctor() -> ProctorScores:
    s = ProctorScore(score=3, justification="placeholder")
    return ProctorScores(
        acceptability=s, feasibility=s, cost=s, sustainability=s, adoption=s
    )


def a_valence() -> Valence:
    return Valence(stakeholder_id="s1", framework_id="f1", sign=1, justification="j")


# --- Happy paths ------------------------------------------------------------


def test_seed_valid():
    seed = SeedNode(
        id="seed",
        label="seed",
        question_text="What if X?",
        goal_state_text="Y holds.",
        goal_criteria=["a", "b"],
    )
    assert seed.type.value == "SEED"
    assert seed.ring == 0


def test_decision_valid():
    d = DecisionNode(
        id="d1",
        label="Build tall",
        ring=1,
        cfir_tags=CFIRTags(inner_setting=["cost pressure"]),
        proctor_scores=make_proctor(),
    )
    assert d.type.value == "DECISION"


def test_consequence_valid():
    c = ConsequenceNode(
        id="c1",
        label="Rents rise",
        ring=2,
        valences=[a_valence()],
        goal_relevance=0.7,
    )
    assert c.type.value == "CONSEQUENCE"


def test_state_valid():
    s = StateNode(id="st1", label="Housing tight", ring=1)
    assert s.type.value == "STATE"


# --- Illegal combinations must raise ---------------------------------------


def test_valences_on_decision_raises():
    with pytest.raises(ValidationError):
        DecisionNode(
            id="d1",
            label="x",
            ring=1,
            cfir_tags=CFIRTags(),
            proctor_scores=make_proctor(),
            valences=[a_valence()],  # illegal: valences belong to consequences
        )


def test_goal_relevance_on_decision_raises():
    with pytest.raises(ValidationError):
        DecisionNode(
            id="d1",
            label="x",
            ring=1,
            cfir_tags=CFIRTags(),
            proctor_scores=make_proctor(),
            goal_relevance=0.5,  # illegal on a decision
        )


def test_proctor_on_consequence_raises():
    with pytest.raises(ValidationError):
        ConsequenceNode(
            id="c1",
            label="x",
            ring=1,
            goal_relevance=0.5,
            proctor_scores=make_proctor(),  # illegal: decisions only
        )


def test_cfir_on_consequence_raises():
    with pytest.raises(ValidationError):
        ConsequenceNode(
            id="c1",
            label="x",
            ring=1,
            goal_relevance=0.5,
            cfir_tags=CFIRTags(),  # illegal: decisions only
        )


def test_consequence_requires_goal_relevance():
    with pytest.raises(ValidationError):
        ConsequenceNode(id="c1", label="x", ring=1)  # missing goal_relevance


def test_decision_requires_proctor_and_cfir():
    with pytest.raises(ValidationError):
        DecisionNode(id="d1", label="x", ring=1)  # missing required tag blocks


# --- Field-level constraints ------------------------------------------------


def test_valence_sign_out_of_range_raises():
    with pytest.raises(ValidationError):
        Valence(stakeholder_id="s", framework_id="f", sign=3, justification="j")


def test_proctor_score_out_of_range_raises():
    with pytest.raises(ValidationError):
        ProctorScore(score=6, justification="j")


def test_goal_relevance_out_of_range_raises():
    with pytest.raises(ValidationError):
        ConsequenceNode(id="c", label="x", ring=2, goal_relevance=1.5)


def test_negative_ring_raises():
    with pytest.raises(ValidationError):
        StateNode(id="s", label="x", ring=-1)


def test_seed_ring_pinned_to_zero():
    with pytest.raises(ValidationError):
        SeedNode(
            id="seed",
            label="seed",
            ring=1,  # seed is always the center
            question_text="q",
            goal_state_text="g",
        )


# --- Discriminated-union round trip ----------------------------------------


def test_discriminated_union_dispatch():
    adapter = TypeAdapter(Node)
    c = adapter.validate_python(
        {
            "type": "CONSEQUENCE",
            "id": "c1",
            "label": "Rents rise",
            "ring": 2,
            "goal_relevance": 0.7,
            "valences": [
                {
                    "stakeholder_id": "s1",
                    "framework_id": "f1",
                    "sign": -2,
                    "justification": "j",
                }
            ],
        }
    )
    assert isinstance(c, ConsequenceNode)


def test_discriminated_union_rejects_crossed_fields():
    adapter = TypeAdapter(Node)
    with pytest.raises(ValidationError):
        adapter.validate_python(
            {
                "type": "DECISION",
                "id": "d1",
                "label": "x",
                "ring": 1,
                "cfir_tags": {},
                "proctor_scores": {
                    "acceptability": {"score": 3, "justification": "j"},
                    "feasibility": {"score": 3, "justification": "j"},
                    "cost": {"score": 3, "justification": "j"},
                    "sustainability": {"score": 3, "justification": "j"},
                    "adoption": {"score": 3, "justification": "j"},
                },
                "goal_relevance": 0.5,  # illegal on a decision
            }
        )
