"""SYNTHETIC structural builders for decision-layer tests.

These exist to check invariants and hand-computed arithmetic (dominance, swing
weights, EVPPI, rank-reversal breakpoints). They are not calibration data, not a
pilot, and not a demo: every number is chosen so the expected value can be
worked out by hand in the test that uses it. No ratified constant is tuned
against them.
"""

from __future__ import annotations

from typing import Any

from delib.graph import DelibGraph
from delib.models.edges import CausalEdge
from delib.models.enums import EvidenceGrade, Register
from delib.models.nodes import (
    CFIRTags,
    ConsequenceNode,
    DecisionNode,
    ProctorScore,
    ProctorScores,
    RegisterEngagement,
    StateNode,
)
from delib.decision.models import DecisionModel


def _proctor() -> ProctorScores:
    p = ProctorScore(score=3, justification="synthetic")
    return ProctorScores(acceptability=p, feasibility=p, cost=p, sustainability=p, adoption=p)


def _reg(r: Register) -> RegisterEngagement:
    return RegisterEngagement(register=r, signature_marker="synthetic", justification="synthetic")


def toy_graph(*, cycle: bool = False) -> DelibGraph:
    """D -> A -> B -> C, D -> B, and a common cause E -> A, E -> B.
    With ``cycle``, adds C -> A, closing the loop A -> B -> C -> A."""
    g = DelibGraph()
    g.add_node(DecisionNode(id="D", label="decision D", ring=1, alternatives=["d1", "d2", "d3"],
                            cfir_tags=CFIRTags(), proctor_scores=_proctor()))
    g.add_node(ConsequenceNode(id="A", label="consequence A", ring=2, goal_relevance=0.5,
                               registers=[_reg(Register.CIVIC), _reg(Register.DOMESTIC)]))
    g.add_node(ConsequenceNode(id="B", label="consequence B", ring=2, goal_relevance=0.5,
                               registers=[_reg(Register.MARKET)]))
    g.add_node(ConsequenceNode(id="C", label="consequence C", ring=3, goal_relevance=0.5))
    g.add_node(StateNode(id="E", label="state E", ring=2))
    grades = {
        ("D", "A"): EvidenceGrade.SUPPORTED,
        ("D", "B"): EvidenceGrade.SPECULATIVE,
        ("A", "B"): EvidenceGrade.WEAK,
        ("B", "C"): EvidenceGrade.WEAK,
        ("E", "A"): EvidenceGrade.WEAK,
        ("E", "B"): EvidenceGrade.WEAK,
    }
    for (s, t), gr in grades.items():
        g.add_edge(CausalEdge(source=s, target=t, mechanism_text=f"{s} affects {t}", evidence_grade=gr, polarity=1))
    if cycle:
        g.add_edge(CausalEdge(source="C", target="A", mechanism_text="C feeds back to A",
                              evidence_grade=EvidenceGrade.SPECULATIVE, polarity=1))
    return g


def attr(lo: float = 0, hi: float = 100, direction: str = "MAXIMIZE", **kw: Any) -> dict:
    worst, best = (lo, hi) if direction == "MAXIMIZE" else (hi, lo)
    return {"name": "measure", "unit": "points", "kind": "CONSTRUCTED", "direction": direction,
            "worst": worst, "best": best, **kw}


def est(p05: float, p50: float, p95: float, method: str = "ELICITED") -> dict:
    return {"p05": p05, "p50": p50, "p95": p95, "method": method}


def toy_model_dict() -> dict:
    """Two groups whose weights pick different alternatives on the same table.

    p50 values (linear 0-100 -> v = x/100):
                o1   o2
        sq      40   40
        x       90   30
        y       50   80
    g1 points o1=100, o2=50  -> w=(2/3, 1/3): sq 40, x 70.0, y 60.0  -> top x
    g2 points o1=40,  o2=100 -> w=(2/7, 5/7): sq 40, x 47.1, y 71.4  -> top y

    (x, o1) has a wide interval (P05 40) so it is decision-sensitive for g1:
    at its P05, x falls below y.
    """
    return {
        "frame": {
            "decision_statement": "Choose an option for decision D",
            "owner": "owner",
            "focus": ["D"],
            "affected_not_involved": ["party not interviewed"],
            "questions": [{"text": "What happens if we choose d1?", "kind": "ALTERNATIVE", "confirmed": True}],
        },
        "groups": [{"id": "g1", "label": "group one"}, {"id": "g2", "label": "group two"}],
        "interviews": [
            {"id": "i1", "group_id": "g1", "mode": "INDIVIDUAL", "redaction_confirmed": True},
            {"id": "i2", "group_id": "g2", "mode": "INDIVIDUAL", "redaction_confirmed": True},
        ],
        "statements": [
            {"id": "s1", "interview_id": "i1", "quote": "synthetic quote one", "type": "OBJECTIVE", "objective_id": "o1"},
            {"id": "s2", "interview_id": "i2", "quote": "synthetic quote two", "type": "OBJECTIVE", "objective_id": "o2"},
            {"id": "s3", "interview_id": "i1", "quote": "synthetic quote three", "type": "CAUSAL_BELIEF",
             "edge": {"source": "D", "target": "A"}, "polarity": 1, "population": "ALL"},
        ],
        "objectives": [
            {"id": "o1", "label": "objective one", "kind": "FUNDAMENTAL", "attribute": attr(),
             "consequence_ids": ["A"], "registers": ["CIVIC"], "statement_ids": ["s1"]},
            {"id": "o2", "label": "objective two", "kind": "FUNDAMENTAL", "attribute": attr(),
             "consequence_ids": ["C"], "registers": ["MARKET"], "statement_ids": ["s2"]},
        ],
        "alternatives": [
            {"id": "sq", "label": "status quo", "kind": "STATUS_QUO"},
            {"id": "x", "label": "option x", "choices": {"D": "d1"}},
            {"id": "y", "label": "option y", "choices": {"D": "d2"}},
        ],
        "edge_cards": [
            {"edge": {"source": "D", "target": "A"}, "basis": ["LITERATURE"], "transport": "LIKELY_HOLDS",
             "confounder_prompt_answered": True,
             "confounders": [{"name": "E", "node_id": "E", "status": "ADDRESSED"}], "statement_ids": ["s3"]},
            {"edge": {"source": "D", "target": "B"}, "basis": ["ELICITED_BELIEF"]},
        ],
        "cells": [
            {"alternative_id": "sq", "objective_id": "o1", "estimate": est(40, 40, 40, "MEASURED")},
            {"alternative_id": "sq", "objective_id": "o2", "estimate": est(40, 40, 40, "MEASURED")},
            {"alternative_id": "x", "objective_id": "o1", "estimate": est(40, 90, 100),
             "basis_edges": [{"source": "D", "target": "A"}]},
            {"alternative_id": "x", "objective_id": "o2", "estimate": est(20, 30, 45),
             "basis_edges": [{"source": "D", "target": "B"}, {"source": "B", "target": "C"}]},
            {"alternative_id": "y", "objective_id": "o1", "estimate": est(40, 50, 60),
             "basis_edges": [{"source": "D", "target": "A"}]},
            {"alternative_id": "y", "objective_id": "o2", "estimate": est(50, 80, 95),
             "basis_edges": [{"source": "D", "target": "B"}, {"source": "B", "target": "C"}]},
        ],
        "weights": [
            {"group_id": "g1", "points": {"o1": 100, "o2": 50}, "preferential_independence_checked": True},
            {"group_id": "g2", "points": {"o1": 40, "o2": 100}, "preferential_independence_checked": True},
        ],
    }


def toy_model(**patch: Any) -> DecisionModel:
    d = toy_model_dict()
    d.update(patch)
    return DecisionModel.model_validate(d)


def single_objective_model(cells: dict[str, tuple[float, float, float]], basis: dict[str, list] | None = None) -> DecisionModel:
    """One compensatory objective o (0-100, linear), one group with all weight on
    it, so total value = 100 * v = x and EVPPI can be computed by hand."""
    alts = [{"id": a, "label": a, "kind": "STATUS_QUO" if i == 0 else "ACTION"} for i, a in enumerate(cells)]
    return DecisionModel.model_validate({
        "frame": {"decision_statement": "single objective", "owner": "owner"},
        "groups": [{"id": "g", "label": "g"}],
        "objectives": [{"id": "o", "label": "o", "kind": "FUNDAMENTAL", "attribute": attr()}],
        "alternatives": alts,
        "cells": [
            {"alternative_id": a, "objective_id": "o", "estimate": est(*q),
             "basis_edges": (basis or {}).get(a, [])}
            for a, q in cells.items()
        ],
        "weights": [{"group_id": "g", "points": {"o": 100}}],
    })
