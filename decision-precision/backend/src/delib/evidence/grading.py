"""Grade components + the rules that compute an evidence_grade from them.

The grader (LLM) emits COMPONENTS; the evidence_grade is a pure function of them,
so grades are reproducible and auditable rather than a single opaque LLM verdict:

  grade_components = {design_tier, consistency, directness, per_study_designs}
  evidence_grade   = evidence_grade_from_components(...)   # deterministic

design_tier is normalized to a common 0..1 strength via a DOMAIN-AWARE mapping —
Melnyk levels for health-typed claims, Maryland SMS for policy/economic — so the
same 6-grade ordinal (delib.models.enums.EVIDENCE_GRADE_ORDINAL) is the target
for both literatures.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from ..models.enums import EvidenceGrade

_STRICT = ConfigDict(extra="forbid")


class ClaimDomain(str, Enum):
    HEALTH = "HEALTH"
    POLICY = "POLICY"  # policy / economic / social — the Maryland SMS literatures


class Consistency(str, Enum):
    CONSISTENT_SUPPORT = "CONSISTENT_SUPPORT"
    MIXED = "MIXED"
    CONSISTENT_CONTRA = "CONSISTENT_CONTRA"
    NONE = "NONE"  # no empirical evidence retrieved


class Directness(str, Enum):
    DIRECT = "DIRECT"
    ANALOGICAL = "ANALOGICAL"
    NONE = "NONE"


# --- canonical study designs + domain strength tiers ------------------------
# Raw labels (PubMed publication types, S2 types, LLM strings) canonicalize to
# these; each maps to a 0..1 strength per domain (higher == stronger design).

_CANON = {
    "meta-analysis": "meta_analysis", "meta analysis": "meta_analysis",
    "systematic review": "systematic_review", "systematic-review": "systematic_review",
    "randomized controlled trial": "rct", "rct": "rct", "randomised controlled trial": "rct",
    "clinical trial": "rct",
    "cohort study": "cohort", "cohort": "cohort",
    "case-control study": "case_control", "case-control": "case_control", "case control": "case_control",
    "cross-sectional study": "cross_sectional", "cross-sectional": "cross_sectional",
    "case reports": "case_report", "case report": "case_report",
    "quasi-experiment": "quasi_experiment", "quasi-experimental": "quasi_experiment",
    "difference-in-differences": "difference_in_differences", "difference in differences": "difference_in_differences",
    "natural experiment": "quasi_experiment",
    "correlational": "correlational", "observational study": "cohort",
    "review": "systematic_review", "journalarticle": "unknown", "journal article": "unknown",
    "modeling": "modeling", "simulation": "modeling", "expert opinion": "expert_opinion",
    "editorial": "expert_opinion", "comment": "expert_opinion",
}

_HEALTH_STRENGTH = {  # Melnyk levels I (1.0) .. VII (0.14)
    "meta_analysis": 1.0, "systematic_review": 0.86, "rct": 0.86,
    "quasi_experiment": 0.71, "cohort": 0.57, "case_control": 0.57,
    "cross_sectional": 0.29, "case_report": 0.29, "modeling": 0.29,
    "correlational": 0.29, "expert_opinion": 0.14, "unknown": 0.3,
}

_POLICY_STRENGTH = {  # Maryland SMS 5 (1.0) .. 1 (0.2)
    "meta_analysis": 1.0, "systematic_review": 0.9, "rct": 1.0,
    "difference_in_differences": 0.8, "quasi_experiment": 0.8, "cohort": 0.8,
    "case_control": 0.6, "cross_sectional": 0.4, "correlational": 0.4,
    "case_report": 0.2, "modeling": 0.4, "expert_opinion": 0.2, "unknown": 0.3,
}


def canonical_design(label: str) -> str:
    return _CANON.get(label.strip().lower(), "unknown")


def design_from_pubtypes(pubtypes: list[str]) -> str | None:
    """The strongest canonical design implied by PubMed/S2 publication-type tags,
    or None when tags carry no design signal (LLM classification then applies)."""
    designs = [canonical_design(t) for t in pubtypes]
    designs = [d for d in designs if d != "unknown"]
    if not designs:
        return None
    return max(designs, key=lambda d: _HEALTH_STRENGTH.get(d, 0.0))


def normalized_design_tier(designs: list[str], domain: ClaimDomain) -> float:
    """The strongest design available, on the domain's 0..1 strength scale.
    Empty -> 0.0 (no design => no empirical footing)."""
    table = _HEALTH_STRENGTH if domain is ClaimDomain.HEALTH else _POLICY_STRENGTH
    strengths = [table.get(canonical_design(d), table["unknown"]) for d in designs]
    return max(strengths) if strengths else 0.0


class GradeComponents(BaseModel):
    model_config = _STRICT
    design_tier: float = Field(ge=0.0, le=1.0)
    consistency: Consistency
    directness: Directness
    per_study_designs: list[str] = Field(default_factory=list)


# Above this normalized design strength, consistent+direct support is SUPPORTED;
# below it, WEAK. ~0.57 = cohort-and-up in the health mapping.
STRONG_DESIGN_THRESHOLD = 0.55


def evidence_grade_from_components(c: GradeComponents) -> EvidenceGrade:
    """The deterministic component -> grade rule."""
    if c.consistency is Consistency.CONSISTENT_CONTRA:
        return EvidenceGrade.CONTRADICTED
    if c.consistency is Consistency.MIXED:
        return EvidenceGrade.CONTESTED
    if c.consistency is Consistency.NONE:
        return EvidenceGrade.SPECULATIVE  # no empirical evidence -> mechanism only
    # CONSISTENT_SUPPORT:
    if c.directness is Directness.ANALOGICAL:
        return EvidenceGrade.ANALOGICAL
    if c.directness is Directness.NONE:
        return EvidenceGrade.SPECULATIVE
    return EvidenceGrade.SUPPORTED if c.design_tier >= STRONG_DESIGN_THRESHOLD else EvidenceGrade.WEAK


__all__ = [
    "ClaimDomain",
    "Consistency",
    "Directness",
    "GradeComponents",
    "canonical_design",
    "design_from_pubtypes",
    "normalized_design_tier",
    "evidence_grade_from_components",
    "STRONG_DESIGN_THRESHOLD",
]
