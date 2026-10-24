"""Grade components + the rules that compute an evidence_grade from them.

The grader (LLM) emits COMPONENTS; the evidence_grade is a PURE, auditable
function of them. The decision variable is the study design's DOMAIN-SPECIFIC
hierarchy level (Melnyk for health, Maryland SMS for policy) collapsed to a
three-way adequacy CLASS — never the normalized float, which exists only for
cross-domain display. This module is the tool's epistemology; every cell of the
decision table (see ``decision_table``) is meant to be defensible on its own.

Named cutoffs (config, editable):
  HEALTH  — SUPPORTED needs Melnyk level III or better (controlled trials & up);
            IV–V (cohort, case-control, cross-sectional) caps at WEAK;
            VI–VII (qualitative, expert opinion) alone leaves the claim
            effectively unevidenced for grading.
  POLICY  — SUPPORTED needs Maryland SMS 4+ (a credible comparison / natural
            experiment); SMS 3 caps at WEAK; SMS 1–2 (correlation, case study,
            before-after without comparison) are treated as very weak (still
            WEAK, not zero).

Synthesis rule (meta-analysis / systematic review): a synthesis is NOT strong by
being a synthesis — its tier is the tier of the strongest constituent design it
synthesizes (recorded as ``synthesis_of``). A review of RCTs takes the STRONG
path; a review of observational-only evidence is MODERATE, never STRONG.

MODERATE-as-floor for unspecified syntheses: when the grader cannot say what a
review pooled, ``synthesis_of`` is the explicit sentinel ``UNSPECIFIED`` and
``defaulted_tier`` is set. Such a review defaults to MODERATE — never INADEQUATE,
never STRONG. It pools real empirical studies (so it cannot be unevidenced), but
we cannot presume they are RCTs (so it cannot be presumed strong). The error
direction is conservative-only, and the default is SURFACED (not silent) so a
human can resolve it by reading the full text the grader could not — the re-grade
button is that path.

Ratified asymmetries (methods-paper text, defensible cells):
  * MODERATE + CONSISTENT_CONTRA → CONTESTED, not CONTRADICTED. Refutation is
    reserved for STRONG designs: moderate designs (cohort, cross-sectional) can
    lean against a claim but cannot clinch its falsity, exactly as they cannot
    clinch its truth (their consistent support is only WEAK). The rule is
    symmetric in design strength, not in rhetorical direction.
  * INADEQUATE designs → SPECULATIVE for ALL directness, analogical included.
    Transport cannot manufacture weight: expert opinion or a single qualitative
    study, even if analogically on-point, has no causal-design footing to
    transport, so the claim remains speculative rather than analogically graded.
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


class DesignTier(str, Enum):
    """The design's adequacy for grading — the actual decision variable.
    STRONG can carry a definitive grade (SUPPORTED / CONTRADICTED); MODERATE can
    carry only a weak/contested one; INADEQUATE cannot ground a causal grade."""

    STRONG = "STRONG"
    MODERATE = "MODERATE"
    INADEQUATE = "INADEQUATE"


# --- canonical study designs ------------------------------------------------
# Raw labels (PubMed publication types, S2 types, LLM strings) canonicalize here.

_CANON = {
    "meta-analysis": "meta_analysis", "meta analysis": "meta_analysis",
    "systematic review": "systematic_review", "systematic-review": "systematic_review", "review": "systematic_review",
    "randomized controlled trial": "rct", "rct": "rct", "randomised controlled trial": "rct", "clinical trial": "rct",
    "controlled trial": "quasi_experiment", "quasi-experiment": "quasi_experiment", "quasi-experimental": "quasi_experiment",
    "natural experiment": "quasi_experiment",
    "difference-in-differences": "difference_in_differences", "difference in differences": "difference_in_differences",
    "cohort study": "cohort", "cohort": "cohort", "observational study": "cohort", "panel study": "cohort",
    "case-control study": "case_control", "case-control": "case_control", "case control": "case_control",
    "cross-sectional study": "cross_sectional", "cross-sectional": "cross_sectional", "survey": "cross_sectional",
    "correlational": "correlational", "correlation": "correlational",
    "case reports": "case_report", "case report": "case_report", "case series": "case_report", "case study": "case_report",
    "qualitative study": "qualitative", "qualitative": "qualitative", "ethnography": "qualitative",
    "modeling": "modeling", "simulation": "modeling", "model": "modeling",
    "expert opinion": "expert_opinion", "editorial": "expert_opinion", "comment": "expert_opinion",
    "journalarticle": "unknown", "journal article": "unknown",
}

_SYNTHESIS = {"meta_analysis", "systematic_review"}

# explicit marker for a synthesis whose constituent designs the grader could not
# determine — recorded in synthesis_of instead of a silent empty list.
UNSPECIFIED = "UNSPECIFIED"


# --- domain design-band tables ----------------------------------------------
# Higher band == stronger design. The band -> hierarchy-level annotations are
# the methods-paper text; the cutoffs below turn bands into an adequacy class.

_HEALTH_BAND = {
    "meta_analysis": 6, "systematic_review": 6,   # Melnyk I  — SR/MA (tier via synthesis_of)
    "rct": 5,                                      # Melnyk II — RCT
    "quasi_experiment": 4, "difference_in_differences": 4,  # Melnyk III — controlled, non-randomized
    "cohort": 3, "case_control": 3,                # Melnyk IV — cohort / case-control
    "cross_sectional": 2, "correlational": 2,      # Melnyk V  — descriptive / cross-sectional
    "case_report": 1, "qualitative": 1,            # Melnyk VI — single descriptive / qualitative
    "expert_opinion": 0, "modeling": 0,            # Melnyk VII — expert opinion (non-empirical)
    "unknown": 2,
}

_POLICY_BAND = {
    "rct": 5,                                      # SMS 5 — randomized
    "meta_analysis": 5, "systematic_review": 5,    # SMS 5-equiv (tier via synthesis_of)
    "quasi_experiment": 4, "difference_in_differences": 4,  # SMS 4 — credible comparison / natural experiment
    "cohort": 3, "case_control": 3,                # SMS 3 — comparison without full control of selection
    "cross_sectional": 2,                          # SMS 2 — cross-sectional correlation
    "correlational": 1, "case_report": 1, "qualitative": 1,  # SMS 1 — correlation / single case, no comparison
    "modeling": 0, "expert_opinion": 0,            # non-empirical for causal grading
    "unknown": 1,
}

# canonical design ids (band-table keys) — used to keep canonical_design idempotent
_CANONICAL = set(_HEALTH_BAND) | set(_POLICY_BAND)

# a review with unspecified constituents is treated as an observational review
# (MODERATE, never STRONG): the cohort band in each domain.
_REVIEW_UNKNOWN_BAND = {ClaimDomain.HEALTH: 3, ClaimDomain.POLICY: 3}


def canonical_design(label: str) -> str:
    """Map a raw design label to a canonical id. Idempotent: an already-canonical
    id (a band-table key) maps to itself, so re-canonicalizing is safe."""
    k = label.strip().lower()
    if k in _CANONICAL:
        return k
    return _CANON.get(k, "unknown")


class StudyDesign(BaseModel):
    """One retrieved study's classified design. For a synthesis (meta-analysis /
    systematic review) ``synthesis_of`` records the constituent design classes,
    which set the synthesis's effective tier."""

    model_config = _STRICT
    design: str
    synthesis_of: list[str] = Field(default_factory=list)


def _as_study(d: "StudyDesign | str") -> StudyDesign:
    if isinstance(d, StudyDesign):
        return StudyDesign(
            design=canonical_design(d.design),
            synthesis_of=[c if c == UNSPECIFIED else canonical_design(c) for c in d.synthesis_of],
        )
    return StudyDesign(design=canonical_design(d))


class GradeCutoffs(BaseModel):
    """Per-domain named cutoffs on the design band. These are the load-bearing
    numbers; the normalized ordinal is display-only and never decides a grade."""

    model_config = _STRICT
    # HEALTH — Melnyk levels
    health_supported_min_band: int = 4  # rationale: Melnyk III+ (controlled trials & above) supports a causal grade
    health_weak_min_band: int = 2       # rationale: Melnyk IV–V (cohort/case-control/cross-sectional) is weak-only
    # POLICY — Maryland SMS
    policy_supported_min_band: int = 4  # rationale: Maryland SMS 4 (credible comparison group) supports a causal grade
    policy_weak_min_band: int = 1       # rationale: Maryland SMS 1–2 (correlation / case study) is very weak but still evidence

    def bands_for(self, domain: ClaimDomain) -> tuple[int, int]:
        if domain is ClaimDomain.HEALTH:
            return self.health_supported_min_band, self.health_weak_min_band
        return self.policy_supported_min_band, self.policy_weak_min_band


DEFAULT_CUTOFFS = GradeCutoffs()


def _band_table(domain: ClaimDomain) -> dict[str, int]:
    return _HEALTH_BAND if domain is ClaimDomain.HEALTH else _POLICY_BAND


def effective_band(study: "StudyDesign | str", domain: ClaimDomain) -> int:
    """The design's band, resolving syntheses to their strongest constituent."""
    sd = _as_study(study)
    table = _band_table(domain)
    if sd.design in _SYNTHESIS:
        consts = [c for c in sd.synthesis_of if c not in _SYNTHESIS and c != UNSPECIFIED]
        if consts:
            return max(table.get(c, table["unknown"]) for c in consts)
        return _REVIEW_UNKNOWN_BAND[domain]  # empty OR [UNSPECIFIED] -> observational-review floor
    return table.get(sd.design, table["unknown"])


def best_design_band(studies: "list[StudyDesign | str]", domain: ClaimDomain) -> int:
    """The strongest study present, on the domain's band scale (-1 if none)."""
    bands = [effective_band(s, domain) for s in studies]
    return max(bands) if bands else -1


def design_tier_class(
    studies: "list[StudyDesign | str]", domain: ClaimDomain, cutoffs: GradeCutoffs = DEFAULT_CUTOFFS
) -> DesignTier:
    """The adequacy CLASS the grade decision uses (STRONG / MODERATE / INADEQUATE)."""
    supported_min, weak_min = cutoffs.bands_for(domain)
    band = best_design_band(studies, domain)
    if band >= supported_min:
        return DesignTier.STRONG
    if band >= weak_min:
        return DesignTier.MODERATE
    return DesignTier.INADEQUATE


def normalized_design_tier(studies: "list[StudyDesign | str]", domain: ClaimDomain) -> float:
    """normalized 0..1 strength, DISPLAY ONLY (cross-domain comparison) — never decides."""
    table = _band_table(domain)
    top = max(table.values())
    bands = [effective_band(s, domain) for s in studies]
    return (max(bands) / top) if bands else 0.0


def design_from_pubtypes(pubtypes: list[str]) -> str | None:
    """The strongest canonical design implied by PubMed/S2 publication-type tags,
    or None when tags carry no design signal (LLM classification then applies)."""
    designs = [canonical_design(t) for t in pubtypes]
    designs = [d for d in designs if d != "unknown"]
    if not designs:
        return None
    return max(designs, key=lambda d: _HEALTH_BAND.get(d, 0))


class GradeComponents(BaseModel):
    model_config = _STRICT
    domain: ClaimDomain
    design_tier: float = Field(ge=0.0, le=1.0)   # normalized, DISPLAY ONLY
    design_tier_class: DesignTier                 # the decision variable
    consistency: Consistency
    directness: Directness
    per_study_designs: list[StudyDesign] = Field(default_factory=list)
    # True when a synthesis's tier fell back to the MODERATE floor because its
    # constituent designs were unspecified (surfaced, never silent).
    defaulted_tier: bool = False


def components_from(
    domain: ClaimDomain,
    designs: "list[StudyDesign | str]",
    consistency: Consistency,
    directness: Directness,
    cutoffs: GradeCutoffs = DEFAULT_CUTOFFS,
) -> GradeComponents:
    studies: list[StudyDesign] = []
    defaulted = False
    for sd in (_as_study(d) for d in designs):
        if sd.design in _SYNTHESIS:
            consts = [c for c in sd.synthesis_of if c not in _SYNTHESIS and c != UNSPECIFIED]
            if not consts:
                # unspecified synthesis constituents -> explicit marker, tier defaulted
                sd = StudyDesign(design=sd.design, synthesis_of=[UNSPECIFIED])
                defaulted = True
        studies.append(sd)
    return GradeComponents(
        domain=domain,
        design_tier=normalized_design_tier(studies, domain),
        design_tier_class=design_tier_class(studies, domain, cutoffs),
        consistency=consistency,
        directness=directness,
        per_study_designs=studies,
        defaulted_tier=defaulted,
    )


def grade_from(tier: DesignTier, consistency: Consistency, directness: Directness) -> EvidenceGrade:
    """The UNIVERSAL cell (domain-independent given the design tier). See
    decision_table() for the full enumeration and the module docstring for the
    two ratified asymmetries."""
    if consistency is Consistency.NONE:
        return EvidenceGrade.SPECULATIVE           # no empirical evidence -> mechanism only
    if directness is Directness.NONE:
        return EvidenceGrade.SPECULATIVE           # evidence not on-point for this claim
    if tier is DesignTier.INADEQUATE:
        return EvidenceGrade.SPECULATIVE           # inadequate designs ground nothing (direct OR analogical)
    if directness is Directness.ANALOGICAL:
        return EvidenceGrade.ANALOGICAL            # transported evidence (from a real design) is never escalated
    # directness DIRECT, tier MODERATE or STRONG:
    if tier is DesignTier.MODERATE:
        # moderate designs can weakly support, but can only contest (not clinch) either way
        return EvidenceGrade.WEAK if consistency is Consistency.CONSISTENT_SUPPORT else EvidenceGrade.CONTESTED
    # tier STRONG:
    if consistency is Consistency.CONSISTENT_SUPPORT:
        return EvidenceGrade.SUPPORTED
    if consistency is Consistency.CONSISTENT_CONTRA:
        return EvidenceGrade.CONTRADICTED
    return EvidenceGrade.CONTESTED                 # MIXED


def evidence_grade_from_components(c: GradeComponents) -> EvidenceGrade:
    """The deterministic component -> grade rule (self-contained: c carries its
    domain + design tier class)."""
    return grade_from(c.design_tier_class, c.consistency, c.directness)


def decision_table(cutoffs: GradeCutoffs = DEFAULT_CUTOFFS) -> list[dict]:
    """Every cell of the tool's epistemology, exhaustively. The (tier, consistency,
    directness) -> grade map is domain-independent; the domain-specific part is the
    design -> tier mapping (see design_tier_class / the band tables)."""
    rows: list[dict] = []
    for tier in DesignTier:
        for consistency in Consistency:
            for directness in Directness:
                rows.append({
                    "design_tier_class": tier.value,
                    "consistency": consistency.value,
                    "directness": directness.value,
                    "grade": grade_from(tier, consistency, directness).value,
                })
    return rows


__all__ = [
    "ClaimDomain",
    "Consistency",
    "Directness",
    "DesignTier",
    "StudyDesign",
    "UNSPECIFIED",
    "GradeComponents",
    "GradeCutoffs",
    "DEFAULT_CUTOFFS",
    "canonical_design",
    "effective_band",
    "best_design_band",
    "design_tier_class",
    "design_from_pubtypes",
    "normalized_design_tier",
    "components_from",
    "grade_from",
    "evidence_grade_from_components",
    "decision_table",
]
