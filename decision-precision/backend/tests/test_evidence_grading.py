"""Phase 5 step 3: grade components -> computed evidence_grade + grader."""

from __future__ import annotations

import json

from delib.evidence import (
    ClaimDomain,
    ClaimStore,
    Consistency,
    Directness,
    GradeComponents,
    design_from_pubtypes,
    evidence_grade_from_components,
    normalized_design_tier,
)
from delib.evidence.grader import grade_and_store, grade_claim, summarize_papers
from delib.evidence.sources import MergedPaper
from delib.llm import LLM, LLMSettings


# --- design tiers (domain-aware) --------------------------------------------


def test_design_from_pubtypes_picks_strongest():
    assert design_from_pubtypes(["Journal Article", "Meta-Analysis"]) == "meta_analysis"
    assert design_from_pubtypes(["Journal Article"]) is None  # no design signal


def test_health_vs_policy_tier_differ_for_same_design():
    # a cohort study is mid-tier under Melnyk but strong under Maryland SMS
    health = normalized_design_tier(["cohort"], ClaimDomain.HEALTH)
    policy = normalized_design_tier(["cohort"], ClaimDomain.POLICY)
    assert policy > health


def test_empty_designs_tier_zero():
    assert normalized_design_tier([], ClaimDomain.HEALTH) == 0.0


# --- the deterministic component -> grade rule ------------------------------


def _c(tier, consistency, directness):
    return GradeComponents(design_tier=tier, consistency=consistency, directness=directness)


def test_rules_map_components_to_grade():
    assert evidence_grade_from_components(_c(0.9, Consistency.CONSISTENT_CONTRA, Directness.DIRECT)).value == "CONTRADICTED"
    assert evidence_grade_from_components(_c(0.9, Consistency.MIXED, Directness.DIRECT)).value == "CONTESTED"
    assert evidence_grade_from_components(_c(0.0, Consistency.NONE, Directness.NONE)).value == "SPECULATIVE"
    assert evidence_grade_from_components(_c(0.9, Consistency.CONSISTENT_SUPPORT, Directness.DIRECT)).value == "SUPPORTED"
    assert evidence_grade_from_components(_c(0.3, Consistency.CONSISTENT_SUPPORT, Directness.DIRECT)).value == "WEAK"
    assert evidence_grade_from_components(_c(0.9, Consistency.CONSISTENT_SUPPORT, Directness.ANALOGICAL)).value == "ANALOGICAL"


# --- grader orchestration (fake LLM) ----------------------------------------


class _Fake:
    def __init__(self, payload: str) -> None:
        self._payload = payload

    def __call__(self, *, model, messages, temperature, max_tokens, **kw):
        return {"choices": [{"message": {"content": self._payload}}]}


def _llm(payload: str) -> LLM:
    return LLM(settings=LLMSettings(), completion_fn=_Fake(payload))


_PAPERS = [
    MergedPaper(doi="10.1/x", title="Cohort study of supply and rent", year=2019,
                publication_types=["Cohort Study"], abstract="a", sources=["openalex"]),
]


def test_grade_claim_computes_grade_from_llm_components():
    payload = json.dumps({
        "per_study_designs": [{"ref": "10.1/x", "design": "cohort study"}],
        "consistency": "CONSISTENT_SUPPORT",
        "directness": "DIRECT",
        "transfer_note": None,
    })
    comps, grade = grade_claim(_llm(payload), "more supply lowers rent", _PAPERS, ClaimDomain.POLICY)
    assert comps.consistency is Consistency.CONSISTENT_SUPPORT
    assert comps.per_study_designs == ["cohort"]
    # cohort is strong under Maryland SMS (0.8) -> SUPPORTED
    assert grade.value == "SUPPORTED"


def test_grade_claim_no_papers_is_speculative_without_llm_call():
    # completion_fn that raises if called -> proves no LLM call happens
    def boom(**kw):
        raise AssertionError("LLM must not be called when there are no papers")

    comps, grade = grade_claim(LLM(settings=LLMSettings(), completion_fn=boom),
                               "claim", [], ClaimDomain.HEALTH)
    assert comps.consistency is Consistency.NONE and grade.value == "SPECULATIVE"


def test_grade_and_store_writes_snapshot():
    payload = json.dumps({
        "per_study_designs": [{"ref": "10.1/x", "design": "cohort study"}],
        "consistency": "MIXED", "directness": "DIRECT", "transfer_note": "t",
    })
    store = ClaimStore()
    rec = grade_and_store(_llm(payload), store, "more supply lowers rent", _PAPERS,
                          ClaimDomain.POLICY, graded_at=1_700_000_000.0)
    assert rec.evidence_grade == "CONTESTED" and rec.graded_at == 1_700_000_000.0
    assert rec.grade_components["consistency"] == "MIXED"
    assert rec.citations[0].doi == "10.1/x"


def test_summarize_papers_includes_tags_and_citations():
    p = MergedPaper(doi="10.1/y", title="T", year=2020, publication_types=["Meta-Analysis"],
                    contrasting_citations=3, supporting_citations=5, sources=["s2"])
    s = summarize_papers([p])
    assert "Meta-Analysis" in s and "contrast=3" in s and "support=5" in s
