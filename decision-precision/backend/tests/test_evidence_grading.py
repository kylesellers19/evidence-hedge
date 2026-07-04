"""Phase 5 step 3 + grade-rules review: named per-domain cutoffs, boundary
tests at each cutoff (both sides, both domains), and the full decision table."""

from __future__ import annotations

import json

from delib.evidence import (
    ClaimDomain,
    ClaimStore,
    Consistency,
    DesignTier,
    Directness,
    components_from,
    decision_table,
    design_from_pubtypes,
    design_tier_class,
    evidence_grade_from_components,
    grade_from,
    normalized_design_tier,
)
from delib.evidence.grader import grade_and_store, grade_claim, summarize_papers
from delib.evidence.sources import MergedPaper
from delib.llm import LLM, LLMSettings

HEALTH, POLICY = ClaimDomain.HEALTH, ClaimDomain.POLICY
SUPPORT, DIRECT = Consistency.CONSISTENT_SUPPORT, Directness.DIRECT


def _grade(domain, designs, consistency=SUPPORT, directness=DIRECT) -> str:
    return evidence_grade_from_components(components_from(domain, designs, consistency, directness)).value


# --- design classification --------------------------------------------------


def test_design_from_pubtypes_picks_strongest():
    assert design_from_pubtypes(["Journal Article", "Meta-Analysis"]) == "meta_analysis"
    assert design_from_pubtypes(["Journal Article"]) is None


def test_class_is_domain_dependent_for_the_same_design():
    # a case report is unevidenced under Melnyk (VI) but counts as very-weak
    # policy evidence (no clinical hierarchy demoting it)
    assert design_tier_class(["case_report"], HEALTH) is DesignTier.INADEQUATE
    assert design_tier_class(["case_report"], POLICY) is DesignTier.MODERATE


def test_normalized_ordinal_is_display_only_not_the_decision():
    # cohort has a higher normalized strength under policy than health, yet BOTH
    # land in the MODERATE class -> the float is not the decision variable
    assert normalized_design_tier(["cohort"], POLICY) > normalized_design_tier(["cohort"], HEALTH)
    assert design_tier_class(["cohort"], POLICY) is design_tier_class(["cohort"], HEALTH) is DesignTier.MODERATE


# --- boundary tests: one design exactly at each cutoff, both sides, both domains


def test_health_supported_weak_boundary():
    assert _grade(HEALTH, ["quasi_experiment"]) == "SUPPORTED"  # Melnyk III (at cutoff)
    assert _grade(HEALTH, ["cohort"]) == "WEAK"                 # Melnyk IV (just below)


def test_health_weak_unevidenced_boundary():
    assert _grade(HEALTH, ["cross_sectional"]) == "WEAK"        # Melnyk V (at cutoff)
    assert _grade(HEALTH, ["case_report"]) == "SPECULATIVE"     # Melnyk VI (just below)


def test_policy_supported_weak_boundary():
    assert _grade(POLICY, ["quasi_experiment"]) == "SUPPORTED"  # SMS 4 (at cutoff)
    assert _grade(POLICY, ["cohort"]) == "WEAK"                 # SMS 3 (just below)


def test_policy_weak_unevidenced_boundary():
    assert _grade(POLICY, ["correlational"]) == "WEAK"          # SMS 1 (at cutoff)
    assert _grade(POLICY, ["expert_opinion"]) == "SPECULATIVE"  # non-empirical (just below)


# --- the universal (tier x consistency x directness) cells ------------------


def test_strong_tier_cells():
    strong = ["rct"]
    assert _grade(POLICY, strong, Consistency.CONSISTENT_SUPPORT, DIRECT) == "SUPPORTED"
    assert _grade(POLICY, strong, Consistency.CONSISTENT_CONTRA, DIRECT) == "CONTRADICTED"
    assert _grade(POLICY, strong, Consistency.MIXED, DIRECT) == "CONTESTED"


def test_moderate_tier_cannot_clinch_either_way():
    mod = ["cohort"]
    assert _grade(POLICY, mod, Consistency.CONSISTENT_SUPPORT, DIRECT) == "WEAK"
    assert _grade(POLICY, mod, Consistency.CONSISTENT_CONTRA, DIRECT) == "CONTESTED"  # not CONTRADICTED


def test_directness_and_none_overrides():
    assert _grade(POLICY, ["rct"], SUPPORT, Directness.ANALOGICAL) == "ANALOGICAL"
    assert _grade(POLICY, ["rct"], SUPPORT, Directness.NONE) == "SPECULATIVE"
    assert _grade(POLICY, ["rct"], Consistency.NONE, DIRECT) == "SPECULATIVE"


def test_decision_table_is_exhaustive_and_matches_the_rule():
    table = decision_table()
    assert len(table) == len(DesignTier) * len(Consistency) * len(Directness) == 36
    for row in table:
        expected = grade_from(
            DesignTier(row["design_tier_class"]),
            Consistency(row["consistency"]),
            Directness(row["directness"]),
        ).value
        assert row["grade"] == expected


# --- grader orchestration (fake LLM) ----------------------------------------


class _Fake:
    def __init__(self, payload: str) -> None:
        self._payload = payload

    def __call__(self, **kw):
        return {"choices": [{"message": {"content": self._payload}}], "usage": {"total_tokens": 100}}


def _llm(payload: str) -> LLM:
    return LLM(settings=LLMSettings(), completion_fn=_Fake(payload))


def _payload(design, consistency="CONSISTENT_SUPPORT", directness="DIRECT"):
    return json.dumps({
        "per_study_designs": [{"ref": "10.1/x", "design": design}],
        "consistency": consistency, "directness": directness, "transfer_note": None,
    })


_PAPERS = [MergedPaper(doi="10.1/x", title="A study", year=2019, sources=["openalex"])]


def test_grade_claim_strong_policy_design_is_supported():
    comps, grade = grade_claim(_llm(_payload("quasi-experiment")), "c", _PAPERS, POLICY)
    assert comps.design_tier_class is DesignTier.STRONG and grade.value == "SUPPORTED"


def test_grade_claim_cohort_policy_caps_at_weak():
    _, grade = grade_claim(_llm(_payload("cohort study")), "c", _PAPERS, POLICY)
    assert grade.value == "WEAK"  # SMS 3 caps at WEAK


def test_grade_claim_no_papers_is_speculative_without_llm_call():
    def boom(**kw):
        raise AssertionError("LLM must not be called with no papers")

    comps, grade = grade_claim(LLM(settings=LLMSettings(), completion_fn=boom), "c", [], HEALTH)
    assert comps.consistency is Consistency.NONE and grade.value == "SPECULATIVE"


def test_grade_and_store_writes_snapshot_with_domain_and_class():
    store = ClaimStore()
    rec = grade_and_store(_llm(_payload("cohort study")), store, "c", _PAPERS, POLICY, graded_at=1_700_000_000.0)
    assert rec.evidence_grade == "WEAK" and rec.graded_at == 1_700_000_000.0
    assert rec.grade_components["domain"] == "POLICY"
    assert rec.grade_components["design_tier_class"] == "MODERATE"


def test_summarize_papers_includes_tags_and_citations():
    p = MergedPaper(doi="10.1/y", title="T", year=2020, publication_types=["Meta-Analysis"],
                    contrasting_citations=3, supporting_citations=5, sources=["s2"])
    s = summarize_papers([p])
    assert "Meta-Analysis" in s and "contrast=3" in s and "support=5" in s
