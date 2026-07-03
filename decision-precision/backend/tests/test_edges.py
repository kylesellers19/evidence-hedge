"""Type-discipline tests for edge models and registries.

Endpoint-*type* rules (deliberative decision->decision, closure
consequence->seed) are enforced at graph-insert time and tested in
test_graph.py; here we prove the edge models themselves reject crossed payloads
and validate their own fields.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import TypeAdapter, ValidationError

from delib.models.edges import (
    CausalEdge,
    Citation,
    ClosureEdge,
    DeliberativeEdge,
    Edge,
)
from delib.models.enums import ClosureSatisfaction, EvidenceGrade
from delib.models.registries import (
    Framework,
    FrameworkRegistry,
    Stakeholder,
    StakeholderRegistry,
)

RUBRICS = Path(__file__).resolve().parents[2] / "rubrics"


# --- Edge happy paths -------------------------------------------------------


def test_causal_edge_valid():
    e = CausalEdge(
        source="a",
        target="b",
        mechanism_text="more development raises desirability",
        evidence_grade=EvidenceGrade.WEAK,
        polarity=1,
        citations=[Citation(doi="10.1/x", title="t")],
    )
    assert e.type.value == "CAUSAL"


def test_causal_edge_defaults_to_speculative():
    e = CausalEdge(source="a", target="b", mechanism_text="m")
    assert e.evidence_grade is EvidenceGrade.SPECULATIVE
    assert e.polarity == 0


def test_closure_edge_valid():
    e = ClosureEdge(
        source="c1",
        target="seed",
        satisfies=ClosureSatisfaction.PARTIAL,
        justification="partially increases housing without net loss",
    )
    assert e.type.value == "CLOSURE"


def test_deliberative_edge_valid():
    e = DeliberativeEdge(source="d1", target="d2")
    assert e.type.value == "DELIBERATIVE"


# --- Crossed payloads must raise -------------------------------------------


def test_evidence_grade_on_deliberative_raises():
    with pytest.raises(ValidationError):
        DeliberativeEdge(source="d1", target="d2", evidence_grade="SUPPORTED")


def test_satisfies_on_causal_raises():
    with pytest.raises(ValidationError):
        CausalEdge(source="a", target="b", mechanism_text="m", satisfies="FULFILLS")


def test_closure_requires_satisfies_and_justification():
    with pytest.raises(ValidationError):
        ClosureEdge(source="c", target="seed")


def test_polarity_out_of_range_raises():
    with pytest.raises(ValidationError):
        CausalEdge(source="a", target="b", mechanism_text="m", polarity=2)


def test_edge_union_dispatch():
    adapter = TypeAdapter(Edge)
    e = adapter.validate_python(
        {
            "type": "CLOSURE",
            "source": "c1",
            "target": "seed",
            "satisfies": "DEFEATS",
            "justification": "net wellbeing loss to incumbents",
        }
    )
    assert isinstance(e, ClosureEdge)


# --- Registries -------------------------------------------------------------


def test_framework_registry_loads_seed_rubrics():
    reg = FrameworkRegistry.from_dir(RUBRICS)
    assert "aggregate_utilitarian" in reg
    assert "prioritarian" in reg
    assert reg.get("prioritarian").name == "Prioritarian"
    assert len(reg.get("aggregate_utilitarian").rubric) > 0


def test_framework_registry_rejects_duplicate():
    reg = FrameworkRegistry()
    reg.register(Framework(id="f", name="F", rubric="r"))
    with pytest.raises(ValueError):
        reg.register(Framework(id="f", name="F2", rubric="r2"))


def test_stakeholder_registry_basic():
    reg = StakeholderRegistry()
    reg.register(Stakeholder(id="incumbents", description="existing residents"))
    assert "incumbents" in reg
    assert reg.ids() == {"incumbents"}
    with pytest.raises(ValueError):
        reg.register(Stakeholder(id="incumbents", description="dup"))
