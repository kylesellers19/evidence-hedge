"""Phase 5 — the evidence multiplexer.

Claims (not edges) are the unit of evidence: a normalized claim is graded ONCE and
its grade compounds across every graph that references it. Retrieval is a set of
source plugins behind one interface (merged on DOI, raw responses cached before
parsing); grading is a third LLM role that emits grade COMPONENTS from which the
evidence_grade is computed; a dual budget meter (source credits + LLM dollars)
gates the whole thing.
"""

from .claims import Citation, ClaimRecord, ClaimStore, claim_hash, normalize_claim
from .budget import BudgetConfig, BudgetExceeded, BudgetMeter
from .grading import (
    ClaimDomain,
    Consistency,
    DEFAULT_CUTOFFS,
    DesignTier,
    Directness,
    GradeComponents,
    GradeCutoffs,
    components_from,
    decision_table,
    design_from_pubtypes,
    design_tier_class,
    evidence_grade_from_components,
    grade_from,
    normalized_design_tier,
)
from .retrieve import MultiplexerRetriever
from .sources import (
    EvidenceSource,
    MergedPaper,
    OpenAlexSource,
    PubMedSource,
    RetrievedPaper,
    SemanticScholarSource,
    merge_on_doi,
    normalize_doi,
)

__all__ = [
    "Citation",
    "ClaimRecord",
    "ClaimStore",
    "claim_hash",
    "normalize_claim",
    "EvidenceSource",
    "OpenAlexSource",
    "SemanticScholarSource",
    "PubMedSource",
    "RetrievedPaper",
    "MergedPaper",
    "merge_on_doi",
    "normalize_doi",
    "MultiplexerRetriever",
    "ClaimDomain",
    "Consistency",
    "Directness",
    "DesignTier",
    "GradeComponents",
    "GradeCutoffs",
    "DEFAULT_CUTOFFS",
    "components_from",
    "decision_table",
    "design_tier_class",
    "design_from_pubtypes",
    "normalized_design_tier",
    "grade_from",
    "evidence_grade_from_components",
    "BudgetConfig",
    "BudgetMeter",
    "BudgetExceeded",
]
