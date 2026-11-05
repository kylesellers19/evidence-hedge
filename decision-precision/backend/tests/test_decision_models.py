"""Decision layer: model validation, question typing, steps 1-5 structure."""

from __future__ import annotations

import re
from pathlib import Path

import pytest
from pydantic import ValidationError

from delib.decision.config import ratification_table
from delib.decision.graphcheck import graph_issues
from delib.decision.models import (
    Attribute,
    DecisionModel,
    EdgeEvidenceCard,
    Objective,
    QuestionKind,
    Statement,
    SwingWeights,
)
from delib.decision.structure import (
    elicitation_gaps,
    objectives_report,
    partition,
    strategy_table,
    suggest_question_kind,
)
from delib.fixtures.brooklyn import SEED_QUESTION
from delib.models.enums import Register

from _decision_builders import attr, est, toy_graph, toy_model, toy_model_dict


# --- field-level validation ---------------------------------------------------


def test_attribute_direction_must_match_range():
    with pytest.raises(ValidationError, match="MAXIMIZE needs best > worst"):
        Attribute(name="a", unit="u", kind="NATURAL", direction="MAXIMIZE", worst=10, best=0)
    Attribute(name="a", unit="u", kind="NATURAL", direction="MINIMIZE", worst=10, best=0)


def test_value_points_must_span_range_and_be_monotone():
    with pytest.raises(ValidationError, match="span worst..best"):
        Attribute(**attr(value_points=[(0, 0), (50, 1)]))
    with pytest.raises(ValidationError, match="monotone"):
        Attribute(**attr(value_points=[(0, 0), (50, 0.8), (70, 0.6), (100, 1)]))
    with pytest.raises(ValidationError, match="worst->0 and best->1"):
        Attribute(**attr(value_points=[(0, 0.1), (100, 1)]))
    Attribute(**attr(value_points=[(0, 0), (50, 0.8), (100, 1)]))


def test_means_objective_must_serve_and_cannot_be_constraint():
    with pytest.raises(ValidationError, match="must serve"):
        Objective(id="m", label="m", kind="MEANS")
    with pytest.raises(ValidationError, match="only FUNDAMENTAL"):
        Objective(id="m", label="m", kind="MEANS", serves=["o"], role="CONSTRAINT", threshold=1,
                  attribute=Attribute(**attr()))


def test_constraint_needs_threshold_inside_range():
    with pytest.raises(ValidationError, match="needs an attribute and a threshold"):
        Objective(id="c", label="c", kind="FUNDAMENTAL", role="CONSTRAINT", attribute=Attribute(**attr()))
    with pytest.raises(ValidationError, match="within the attribute range"):
        Objective(id="c", label="c", kind="FUNDAMENTAL", role="CONSTRAINT", threshold=150,
                  attribute=Attribute(**attr()))


def test_causal_belief_needs_edge_and_polarity_and_others_cannot_carry_polarity():
    with pytest.raises(ValidationError, match="must reference a causal edge"):
        Statement(id="s", interview_id="i", quote="q", type="CAUSAL_BELIEF", polarity=1)
    with pytest.raises(ValidationError, match="must state polarity"):
        Statement(id="s", interview_id="i", quote="q", type="CAUSAL_BELIEF", edge={"source": "a", "target": "b"})
    with pytest.raises(ValidationError, match="apply only to CAUSAL_BELIEF"):
        Statement(id="s", interview_id="i", quote="q", type="OBJECTIVE", polarity=1)


def test_transport_cannot_hold_with_an_absent_support_factor():
    with pytest.raises(ValidationError, match="ABSENT support factor"):
        EdgeEvidenceCard(edge={"source": "a", "target": "b"}, basis=["LITERATURE"], transport="LIKELY_HOLDS",
                         support_factors=[{"factor": "f", "status": "ABSENT"}])


def test_swing_weights_top_swing_scores_100():
    with pytest.raises(ValidationError, match="exactly 100"):
        SwingWeights(group_id="g", points={"a": 90, "b": 40})
    w = SwingWeights(group_id="g", points={"a": 100, "b": 50})
    assert w.normalized() == pytest.approx({"a": 2 / 3, "b": 1 / 3})


# --- container integrity -------------------------------------------------------


def test_toy_model_is_valid():
    m = toy_model()
    assert [o.id for o in m.leaf_objectives()] == ["o1", "o2"]


def test_integrity_errors_are_aggregated():
    d = toy_model_dict()
    d["interviews"][0]["group_id"] = "nobody"
    d["statements"][0]["objective_id"] = "nothing"
    with pytest.raises(ValidationError) as exc:
        DecisionModel.model_validate(d)
    msg = str(exc.value)
    assert "unknown group 'nobody'" in msg and "unknown objective 'nothing'" in msg


def test_weights_must_cover_every_compensatory_objective():
    d = toy_model_dict()
    d["weights"][0]["points"] = {"o1": 100}
    with pytest.raises(ValidationError, match="missing objectives"):
        DecisionModel.model_validate(d)


def test_estimate_outside_attribute_range_demands_reelicitation():
    d = toy_model_dict()
    d["cells"][2]["estimate"] = est(70, 90, 120)
    with pytest.raises(ValidationError, match="re-elicit"):
        DecisionModel.model_validate(d)


def test_duplicate_cells_and_ids_rejected():
    d = toy_model_dict()
    d["cells"].append(dict(d["cells"][0]))
    d["statements"].append(dict(d["statements"][0]))
    with pytest.raises(ValidationError) as exc:
        DecisionModel.model_validate(d)
    assert "duplicate consequence cell" in str(exc.value) and "duplicate statement id" in str(exc.value)


def test_parent_objectives_cannot_carry_attributes():
    d = toy_model_dict()
    d["objectives"].append({"id": "top", "label": "top", "kind": "FUNDAMENTAL", "attribute": attr()})
    d["objectives"][0]["parent_id"] = "top"
    with pytest.raises(ValidationError, match="only leaf fundamental objectives carry an attribute"):
        DecisionModel.model_validate(d)


# --- step 1: question typing ---------------------------------------------------


@pytest.mark.parametrize("text,kind", [
    (SEED_QUESTION, QuestionKind.ALTERNATIVE),
    ("Should we consolidate onto two floors?", QuestionKind.ALTERNATIVE),
    ("Will utilization recover by next year?", QuestionKind.UNCERTAINTY),
    ("How much will rents rise?", QuestionKind.UNCERTAINTY),
    ("How do we keep incumbent residents housed?", QuestionKind.OBJECTIVE),
    ("How can we make sure focus work stays possible?", QuestionKind.OBJECTIVE),
])
def test_question_kind_suggestions(text, kind):
    s = suggest_question_kind(text)
    assert s.kind is kind and s.matched


def test_unmatched_question_gets_no_suggestion():
    assert suggest_question_kind("Density and the neighborhood").kind is None


# --- steps 2-5 ------------------------------------------------------------------


def test_partition_and_unlinked_statements():
    d = toy_model_dict()
    d["statements"].append({"id": "s9", "interview_id": "i2", "quote": "q", "type": "FACT_CLAIM"})
    p = partition(DecisionModel.model_validate(d))
    assert p.values == ["s1", "s2"] and set(p.facts) == {"s3", "s9"} and p.unlinked == ["s9"]


def test_elicitation_gaps():
    d = toy_model_dict()
    d["groups"].append({"id": "g3", "label": "g3"})
    d["interviews"][1].update(redaction_confirmed=False, mode="GROUP")
    gaps = elicitation_gaps(DecisionModel.model_validate(d))
    assert any("'g3' has no interviews" in g for g in gaps)
    assert any("'i2': redaction not confirmed" in g for g in gaps)
    assert any("'i2': group format without recorded individual-first" in g for g in gaps)


def test_orders_of_worth_completeness_check():
    rep = objectives_report(toy_model(), toy_graph())
    # A engages CIVIC and DOMESTIC, B engages MARKET; objectives ground only CIVIC and MARKET
    assert [g.register for g in rep.register_gaps] == [Register.DOMESTIC]
    assert rep.register_gaps[0].consequence_ids == ["A"]
    assert rep.raised_by == {"o1": ["g1"], "o2": ["g2"]}


def test_strategy_table_gaps():
    st = strategy_table(toy_model(), toy_graph())
    assert st.dimensions[0].options == ["d1", "d2", "d3"]
    assert any("DEFER" in g for g in st.gaps)
    d = toy_model_dict()
    d["alternatives"][2]["choices"] = {"D": "d1"}
    st2 = strategy_table(DecisionModel.model_validate(d), toy_graph())
    assert any("identical choices" in g for g in st2.gaps)


def test_graph_issues_report_bad_references():
    d = toy_model_dict()
    d["frame"]["focus"] = ["D", "A"]
    d["alternatives"][1]["choices"] = {"D": "d9"}
    d["cells"][2]["basis_edges"] = [{"source": "A", "target": "D"}]
    issues = graph_issues(DecisionModel.model_validate(d), toy_graph())
    msgs = {(i.step, i.message.split(":")[0]) for i in issues}
    assert (1, "focus entry is not a DECISION node in the graph") in msgs
    assert any(i.step == 5 and "'d9'" in i.message for i in issues)
    assert any(i.step == 8 and "A->D" in i.message for i in issues)


# --- ratification ------------------------------------------------------------------


def test_every_provisional_constant_is_in_the_ratification_table():
    src = (Path(__file__).resolve().parents[1] / "src/delib/decision/config.py").read_text()
    marked = re.findall(r"^([A-Z_]+)\s*:.*# PROVISIONAL — not ratified", src, flags=re.M)
    listed = {r.constant for r in ratification_table()}
    assert marked and set(marked) <= listed
    assert all(r.status == "PROVISIONAL — not ratified" for r in ratification_table())


def test_published_schema_and_spec_match_the_code():
    import json

    docs = Path(__file__).resolve().parents[2] / "docs"
    schema = json.loads((docs / "decision-model.schema.json").read_text())
    assert schema == DecisionModel.model_json_schema(), "regenerate docs/decision-model.schema.json"
    spec = (docs / "decision-layer.md").read_text()
    missing = [r.constant for r in ratification_table() if f"`{r.constant}`" not in spec]
    assert not missing, f"docs/decision-layer.md ratification table is stale: {missing}"
