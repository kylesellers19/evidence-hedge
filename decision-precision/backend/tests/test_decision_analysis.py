"""Decision layer: steps 6-12. Expected values are worked by hand in comments."""

from __future__ import annotations

import pytest

from delib.decision.analysis import StepState, analysis_hash, analyze
from delib.decision.causal import (
    backdoor_set,
    candidate_confounders,
    edge_evidence_gaps,
    evidence_floor,
    influence_diagram,
    trace,
    value_of,
)
from delib.decision.disagreement import DisagreementKind, disagreements
from delib.decision.models import Attribute, CellRef, DecisionModel, EdgeRef, WeightRef
from delib.decision.robustness import assumption_candidates, assumption_status
from delib.decision.sensitivity import (
    Quadrant,
    precision_report,
    tornado,
    value_of_information,
    weight_stability,
)
from delib.decision.tradeoffs import (
    Feasibility,
    all_rankings,
    constraint_screen,
    dominance,
    even_swap_tracks,
    group_ranking,
    pooled_ranking,
)
from delib.fixtures.brooklyn import build_brooklyn_master

from _decision_builders import attr, est, single_objective_model, toy_graph, toy_model, toy_model_dict

E = EdgeRef


# --- step 6: influence diagram ------------------------------------------------


def test_influence_diagram_relevant_subgraph():
    idg = influence_diagram(toy_model(), toy_graph())
    # D reaches A, B, C; objectives measure A and C; E is upstream but not reachable from D
    assert idg.relevant_nodes == ["A", "B", "C", "D"]
    assert idg.value_nodes == ["o1", "o2"]
    assert idg.gaps == [] and idg.cycles == []


def test_untreated_loop_is_a_gap_and_treatment_clears_it():
    g = toy_graph(cycle=True)
    idg = influence_diagram(toy_model(), g)
    assert len(idg.cycles) == 1 and idg.cycles[0].treatment is None
    assert any("feedback loop" in x for x in idg.gaps)
    treated = toy_model(loop_treatments=[{"nodes": ["A", "B", "C"], "treatment": "QUALITATIVE_ONLY"}])
    assert influence_diagram(treated, g).cycles[0].treatment == "QUALITATIVE_ONLY"


def test_brooklyn_reinforcing_loop_surfaces_in_decision_relevant_subgraph():
    g = build_brooklyn_master()
    m = DecisionModel.model_validate({
        "frame": {"decision_statement": "tower", "owner": "o", "focus": ["build"]},
        "objectives": [{"id": "disp", "label": "displacement", "kind": "FUNDAMENTAL",
                        "attribute": attr(direction="MINIMIZE"), "consequence_ids": ["displacement"]}],
    })
    idg = influence_diagram(m, g)
    assert any(set(c.nodes) == {"build", "desirability", "rent"} for c in idg.cycles)
    assert "capacity" in idg.unmeasured_consequences


# --- step 7: causal-inference checks ------------------------------------------


def test_candidate_confounders_are_common_ancestors():
    # A -> B with D -> A, D -> B, E -> A, E -> B: both D and E are common causes
    assert candidate_confounders(toy_model(), toy_graph(), E(source="A", target="B")) == ["D", "E"]
    # decisions have no parents: nothing confounds D -> A in this graph
    assert candidate_confounders(toy_model(), toy_graph(), E(source="D", target="A")) == []


def test_backdoor_sets():
    r = backdoor_set(toy_model(), toy_graph(), E(source="A", target="B"))
    assert r.computable and r.adjustment_set == ["D", "E"]
    r2 = backdoor_set(toy_model(), toy_graph(), E(source="D", target="B"))
    assert r2.computable and r2.adjustment_set == []


def test_backdoor_needs_loop_treatment_first():
    g = toy_graph(cycle=True)
    assert backdoor_set(toy_model(), g, E(source="A", target="B")).computable is False
    cut = toy_model(loop_treatments=[{"nodes": ["A", "B", "C"], "treatment": "CUT_EDGE_FOR_ANALYSIS",
                                      "cut_edge": {"source": "C", "target": "A"}}])
    assert backdoor_set(cut, g, E(source="A", target="B")).adjustment_set == ["D", "E"]


def test_edge_evidence_gaps():
    gaps = {g.edge.key(): g.gaps for g in edge_evidence_gaps(
        toy_model(), toy_graph(), [E(source="D", target="A"), E(source="D", target="B"), E(source="B", target="C")]
    )}
    assert "D->A" not in gaps  # literature, transported, prompt answered, confounder addressed
    assert any("not asked" in x for x in gaps["D->B"])
    assert any("no linked statements" in x for x in gaps["D->B"])
    assert gaps["B->C"] == ["no evidence card"]


# --- step 8: value functions, floors, traces ------------------------------------


def test_value_functions():
    a = Attribute(**attr())
    assert value_of(a, 25) == 0.25
    m = Attribute(**attr(direction="MINIMIZE"))
    assert value_of(m, 25) == 0.75
    p = Attribute(**attr(value_points=[(0, 0), (50, 0.8), (100, 1)]))
    assert value_of(p, 25) == pytest.approx(0.4) and value_of(p, 75) == pytest.approx(0.9)


def test_evidence_floor_is_weakest_link():
    m = toy_model()
    f = evidence_floor(m, toy_graph(), m.cell("x", "o2"))  # D->B SPECULATIVE, B->C WEAK
    assert f.grade.value == "SPECULATIVE" and f.elicited_only == ["D->B"]
    assert evidence_floor(m, toy_graph(), m.cell("sq", "o1")).untraced


def test_trace_runs_from_quote_to_value():
    t = trace(toy_model(), toy_graph(), "x", "o1")
    assert t.value_p50 == 0.9
    assert t.edges[0].evidence_grade == "SUPPORTED"
    assert t.edges[0].statements[0].quote == "synthetic quote three"
    assert t.statements[0].group_id == "g1"


# --- step 9: tradeoffs -------------------------------------------------------------


def test_group_rankings_by_hand():
    r1 = group_ranking(toy_model(), "g1")
    assert r1.top == "x" and r1.ranked[0].value == pytest.approx(70.0)
    assert r1.ranked[1].alternative_id == "y" and r1.ranked[1].value == pytest.approx(60.0)
    r2 = group_ranking(toy_model(), "g2")
    assert r2.top == "y" and r2.ranked[0].value == pytest.approx(100 * (2 / 7 * 0.5 + 5 / 7 * 0.8))


def test_dominance_point_and_robust():
    # y (0.5, 0.8) vs sq (0.4, 0.4); y's worst values (0.4, 0.5) still match or beat sq's best (0.4, 0.4)
    assert [(d.dominated, d.by, d.kind) for d in dominance(toy_model())] == [("sq", "y", "ROBUST")]


def test_dominated_alternatives_never_rank_first():
    m = toy_model()
    dominated = {d.dominated for d in dominance(m)}
    assert all(r.top not in dominated for r in all_rankings(m))


def test_constraint_screen():
    d = toy_model_dict()
    d["objectives"].append({"id": "c", "label": "c", "kind": "FUNDAMENTAL", "role": "CONSTRAINT",
                            "threshold": 50, "attribute": attr()})
    d["cells"] += [
        {"alternative_id": "x", "objective_id": "c", "estimate": est(60, 70, 80)},
        {"alternative_id": "y", "objective_id": "c", "estimate": est(40, 55, 70)},
        {"alternative_id": "sq", "objective_id": "c", "estimate": est(20, 30, 40)},
    ]
    m = DecisionModel.model_validate(d)
    status = {s.alternative_id: s.status for s in constraint_screen(m)}
    assert status == {"x": Feasibility.PASS, "y": Feasibility.AT_RISK, "sq": Feasibility.FAIL}
    r = group_ranking(m, "g2")
    assert [a.alternative_id for a in r.ranked] == ["y", "x"] and r.ranked[0].at_risk


def test_pooling_is_explicit_and_labeled():
    p = pooled_ranking(toy_model())
    assert p.label.startswith("POOLED") and p.rule.startswith("equal")
    # equal shares: o1 = (2/3 + 2/7)/2, o2 = (1/3 + 5/7)/2
    assert p.weights["o1"] == pytest.approx((2 / 3 + 2 / 7) / 2)
    assert p.ranked[0].alternative_id == "y"
    with pytest.raises(ValueError):
        pooled_ranking(toy_model(), {"nobody": 1})


def test_even_swaps_and_consistency_with_swing_weights():
    swaps = [
        # x: give o1 90 -> 70 (dv -0.2), get o2 30 -> 70 (dv +0.4): implied w1/w2 = 2 = g1's 100/50
        {"id": "w1", "group_id": "g1", "alternative_id": "x",
         "give": {"objective_id": "o1", "new_value": 70}, "get": {"objective_id": "o2", "new_value": 70}},
        # y: give o2 80 -> 70 (dv -0.1), get o1 50 -> 55 (dv +0.05): implied w2/w1... ratio 0.5 vs 0.5
        {"id": "w2", "group_id": "g1", "alternative_id": "y",
         "give": {"objective_id": "o2", "new_value": 70}, "get": {"objective_id": "o1", "new_value": 55}},
    ]
    t = even_swap_tracks(toy_model(even_swaps=swaps))[0]
    assert [c.consistent for c in t.checks] == [True, True]
    assert t.checks[0].implied_ratio == pytest.approx(2.0)
    assert {(d.dominated, d.by) for d in t.dominated_after} >= {("y", "x")}


def test_inconsistent_even_swap_is_flagged():
    swaps = [{"id": "w", "group_id": "g1", "alternative_id": "x",
              "give": {"objective_id": "o1", "new_value": 80}, "get": {"objective_id": "o2", "new_value": 80}}]
    c = even_swap_tracks(toy_model(even_swaps=swaps))[0].checks[0]
    assert c.implied_ratio == pytest.approx(5.0) and c.consistent is False


# --- step 10: sensitivity and value of information ----------------------------------


def test_weight_stability_breakpoint_by_hand():
    # g1 on o1 (w=2/3): x = 0.3 + 0.6t, y = 0.8 - 0.3t -> y takes over below t = 5/9
    s = {r.objective_id: r for r in weight_stability(toy_model(), "g1")}["o1"]
    assert s.current == pytest.approx(2 / 3)
    assert s.lo == pytest.approx(5 / 9) and s.takeover_at_lo == "y"
    assert s.hi == 1.0 and s.takeover_at_hi is None and not s.sensitive
    assert s.lo <= s.current <= s.hi


def test_evppi_by_hand():
    # a certain at 50. b at (0, 40, 100): E[V_b] = 100*(0.63*0.4 + 0.185*1.0) = 43.7 -> choose a.
    # Perfect information on b: 0.185*max(0,50) + 0.63*max(40,50) + 0.185*max(100,50) - 50 = 9.25
    m = single_objective_model({"a": (50, 50, 50), "b": (0, 40, 100)})
    v = value_of_information(m, "g")
    assert v.top_under_expectation == "a"
    assert v.expected_values["b"] == pytest.approx(43.7)
    cells = {c.cell.alternative_id: c.evppi for c in v.cells}
    assert cells["b"] == pytest.approx(9.25) and cells["a"] == 0.0
    assert v.evpi == pytest.approx(9.25)


@pytest.mark.parametrize("gid", ["g1", "g2"])
def test_evpi_bounds_every_evppi(gid):
    v = value_of_information(toy_model(), gid)
    assert v.evpi is not None and v.evpi >= max(c.evppi for c in v.cells) - 1e-9 >= -1e-9


def test_tornado_flags_flip():
    m = single_objective_model({"a": (50, 50, 50), "b": (0, 40, 100)})
    entries = {e.cell.alternative_id: e for e in tornado(m, "g")}
    assert entries["b"].flips and entries["b"].top_at_high == "b"
    assert not entries["a"].flips


def test_precision_quadrants():
    g = toy_graph()
    # b is decision-sensitive (EVPPI 9.25). On D->B (SPECULATIVE) it must be investigated.
    weak = single_objective_model({"a": (50, 50, 50), "b": (0, 40, 100)}, basis={"b": [{"source": "D", "target": "B"}]})
    rows = {r.cell.alternative_id: r for r in precision_report(weak, g)}
    assert rows["b"].quadrant is Quadrant.INVESTIGATE
    # a: not sensitive, untraced, zero-width interval -> TOLERATE, flagged as overconfident
    assert rows["a"].quadrant is Quadrant.TOLERATE
    assert any("overconfident interval" in f for f in rows["a"].flags)
    # On D->A (SUPPORTED, no card) the same cell is adequate: MONITOR
    strong = single_objective_model({"a": (50, 50, 50), "b": (0, 40, 100)}, basis={"b": [{"source": "D", "target": "A"}]})
    assert {r.cell.alternative_id: r for r in precision_report(strong, g)}["b"].quadrant is Quadrant.MONITOR


def test_untransported_literature_is_not_adequate():
    g = toy_graph()
    m = single_objective_model({"a": (50, 50, 50), "b": (0, 40, 100)}, basis={"b": [{"source": "D", "target": "A"}]})
    d = m.model_dump(mode="json")
    d["edge_cards"] = [{"edge": {"source": "D", "target": "A"}, "basis": ["LITERATURE"]}]
    row = {r.cell.alternative_id: r for r in precision_report(DecisionModel.model_validate(d), g)}["b"]
    assert row.quadrant is Quadrant.INVESTIGATE
    assert any("transport" in f for f in row.flags)


# --- disagreements ----------------------------------------------------------------------


def _dis(m: DecisionModel):
    ranks = all_rankings(m)
    prec = precision_report(m, toy_graph())
    idg = influence_diagram(m, toy_graph())
    return disagreements(m, ranks, prec, {e.key() for e in idg.relevant_edges})


def test_value_disagreement_when_weights_pick_different_alternatives():
    v = [d for d in _dis(toy_model()) if d.kind is DisagreementKind.VALUE]
    assert len(v) == 1 and v[0].decision_relevant and v[0].route_to_step == 9


def test_factual_vs_heterogeneity():
    d = toy_model_dict()
    d["statements"].append({"id": "s4", "interview_id": "i2", "quote": "q", "type": "CAUSAL_BELIEF",
                            "edge": {"source": "D", "target": "A"}, "polarity": -1, "population": "ALL"})
    kinds = {x.kind for x in _dis(DecisionModel.model_validate(d)) if x.edge == E(source="D", target="A")}
    assert kinds == {DisagreementKind.FACTUAL}
    d["statements"][2]["population"] = "g1"
    d["statements"][3]["population"] = "g2"
    kinds = {x.kind for x in _dis(DecisionModel.model_validate(d)) if x.edge == E(source="D", target="A")}
    assert kinds == {DisagreementKind.HETEROGENEITY}


def test_group_estimate_conflict_relevance():
    d = toy_model_dict()
    # substituting g2's estimate for (x, o1) drops x to 40 -> g1's top becomes y: decision-relevant
    d["cells"][2]["group_estimates"] = {"g1": est(85, 90, 100), "g2": est(30, 40, 50)}
    f = [x for x in _dis(DecisionModel.model_validate(d)) if x.cell == CellRef(alternative_id="x", objective_id="o1")]
    assert len(f) == 1 and f[0].kind is DisagreementKind.FACTUAL and f[0].decision_relevant is True
    d["cells"][2]["group_estimates"] = {"g1": est(85, 90, 100), "g2": est(70, 75, 80)}
    f = [x for x in _dis(DecisionModel.model_validate(d)) if x.cell == CellRef(alternative_id="x", objective_id="o1")]
    assert f[0].decision_relevant is False


def test_latent_value_disagreement_and_frame():
    d = toy_model_dict()
    d["groups"].append({"id": "g3", "label": "g3"})
    d["interviews"].append({"id": "i3", "group_id": "g3", "mode": "INDIVIDUAL", "redaction_confirmed": True})
    d["statements"].append({"id": "s5", "interview_id": "i3", "quote": "q", "type": "OBJECTIVE"})
    d["weights"].append({"group_id": "g3", "points": {"o1": 100, "o2": 20}})
    out = _dis(DecisionModel.model_validate(d))
    latent = [x for x in out if x.kind is DisagreementKind.VALUE and x.decision_relevant is False]
    assert latent and set(latent[0].groups) == {"g1", "g3"}
    frame = [x for x in out if x.kind is DisagreementKind.FRAME]
    assert frame[0].groups == ["g3"] and frame[0].route_to_step == 4 and frame[0].statement_ids == ["s5"]


# --- step 11: robustness ----------------------------------------------------------------


def test_load_bearing_assumption_needs_signpost_and_action():
    m0 = toy_model()
    prec = precision_report(m0, toy_graph())
    hot = next(r.cell for r in prec if r.sensitive_groups)
    m = toy_model(assumptions=[
        {"id": "a1", "text": "t", "refs": {"cells": [hot.model_dump()]}, "vulnerable": True},
        {"id": "a2", "text": "t", "refs": {"weights": [WeightRef(group_id="g1", objective_id="o2").model_dump()]}},
    ])
    st = {s.assumption_id: s for s in assumption_status(m, precision_report(m, toy_graph()),
                                                         weight_stability(m, "g1"))}
    assert st["a1"].load_bearing
    assert any("no signpost" in g for g in st["a1"].gaps) and any("hedging" in g for g in st["a1"].gaps)
    assert not st["a2"].load_bearing and st["a2"].gaps == []


def test_assumption_candidates_target_sensitive_cells_on_soft_edges():
    m = toy_model()
    cands = assumption_candidates(m, precision_report(m, toy_graph()))
    # (x, o1) is sensitive for g1 and rests on D->A, which is adequate: monitor it
    assert [(c.cell.alternative_id, c.cell.objective_id, c.edge.key()) for c in cands] == [("x", "o1", "D->A")]
    assert any("monitor" in w for w in cands[0].why)
    d = single_objective_model({"a": (50, 50, 50), "b": (0, 40, 100)},
                               basis={"b": [{"source": "D", "target": "B"}]}).model_dump(mode="json")
    d["edge_cards"] = [{"edge": {"source": "D", "target": "B"}, "basis": ["ELICITED_BELIEF"]}]
    m2 = DecisionModel.model_validate(d)
    c2 = assumption_candidates(m2, precision_report(m2, toy_graph()))
    assert c2 and "elicited belief only" in c2[0].why
    covered = d | {"assumptions": [{"id": "a", "text": "t", "refs": {"edges": [{"source": "D", "target": "B"}]}}]}
    m3 = DecisionModel.model_validate(covered)
    assert assumption_candidates(m3, precision_report(m3, toy_graph())) == []


# --- the twelve steps --------------------------------------------------------------------


def test_analyze_returns_twelve_grounded_steps():
    a = analyze(toy_model(), toy_graph())
    assert [s.number for s in a.steps] == list(range(1, 13))
    assert all(s.grounding for s in a.steps)
    st = {s.number: s for s in a.steps}
    assert st[8].state is StepState.COMPLETE
    assert st[12].state is StepState.EMPTY
    assert a.ratification


def test_frame_only_model_is_mostly_empty():
    m = DecisionModel.model_validate({"frame": {"decision_statement": "s", "owner": "o"}})
    st = {s.number: s.state for s in analyze(m, toy_graph()).steps}
    assert st[1] is StepState.PARTIAL
    assert all(st[n] is StepState.EMPTY for n in range(2, 13))


def test_record_is_tied_to_the_analysis_it_was_made_on():
    m = toy_model()
    h = analysis_hash(m)
    rec = {"chosen_alternative_id": "x", "decided_by": "owner", "rationale": "r", "analysis_hash": h,
           "positions": [{"group_id": "g1"}, {"group_id": "g2"}],
           "premortem": [{"failure_story": "f"}]}
    recorded = toy_model(record=rec)
    assert analysis_hash(recorded) == h  # the record itself does not change the hash
    dq = {e.element: e for e in analyze(recorded, toy_graph()).decision_quality}
    assert next(c for c in dq["Commitment to action"].checks if c.check.startswith("recorded against")).ok
    d = recorded.model_dump(mode="json")
    d["weights"][0]["points"]["o2"] = 60
    changed = DecisionModel.model_validate(d)
    dq2 = {e.element: e for e in analyze(changed, toy_graph()).decision_quality}
    assert not next(c for c in dq2["Commitment to action"].checks if c.check.startswith("recorded against")).ok


def test_measured_values_need_no_causal_basis():
    m = single_objective_model({"a": (50, 50, 50), "b": (0, 40, 100)})
    d = m.model_dump(mode="json")
    d["cells"][0]["estimate"]["method"] = "MEASURED"
    rows = {r.cell.alternative_id: r for r in precision_report(DecisionModel.model_validate(d), toy_graph())}
    assert rows["a"].adequate and rows["a"].quadrant is Quadrant.SETTLED
    assert rows["a"].flags == ["measured, not predicted"]


def test_estimate_disputes_route_to_value_of_information():
    d = toy_model_dict()
    d["cells"][2]["group_estimates"] = {"g1": est(85, 90, 100), "g2": est(30, 40, 50)}
    f = [x for x in _dis(DecisionModel.model_validate(d)) if x.cell is not None]
    assert f[0].route_to_step == 10
