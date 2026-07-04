"""Phase 5 — the evidence multiplexer.

Claims (not edges) are the unit of evidence: a normalized claim is graded ONCE and
its grade compounds across every graph that references it. Retrieval is a set of
source plugins behind one interface (merged on DOI, raw responses cached before
parsing); grading is a third LLM role that emits grade COMPONENTS from which the
evidence_grade is computed; a dual budget meter (source credits + LLM dollars)
gates the whole thing.
"""

from .claims import Citation, ClaimRecord, ClaimStore, claim_hash, normalize_claim

__all__ = ["Citation", "ClaimRecord", "ClaimStore", "claim_hash", "normalize_claim"]
