"""Grader orchestration — turn retrieved papers into a graded claim snapshot.

Ties the pieces together: format the merged papers for the grader, run the
grader LLM (COMPONENTS out), compute the design tier (domain-aware) and the
evidence_grade (deterministic rules), and — optionally — write the snapshot into
the ClaimStore. The LLM stays independent of the evidence layer; the string
consistency/directness it returns are converted to the typed enums here.
"""

from __future__ import annotations

from ..llm.interface import LLM
from ..models.enums import EvidenceGrade
from .claims import Citation, ClaimRecord, ClaimStore
from .grading import (
    ClaimDomain,
    Consistency,
    Directness,
    GradeComponents,
    canonical_design,
    evidence_grade_from_components,
    normalized_design_tier,
)
from .sources import MergedPaper


def summarize_papers(papers: list[MergedPaper]) -> str:
    """A compact, grader-facing rendering: title/year, publication-type tags (the
    design hint), citation-intent counts, and an abstract snippet."""
    lines: list[str] = []
    for i, p in enumerate(papers, 1):
        tags = ", ".join(p.publication_types) or "—"
        cites = ""
        if p.contrasting_citations is not None or p.supporting_citations is not None:
            cites = f" | citations support={p.supporting_citations or 0} contrast={p.contrasting_citations or 0}"
        abstract = (p.abstract or "").strip().replace("\n", " ")
        if len(abstract) > 400:
            abstract = abstract[:400] + "…"
        ref = p.doi or p.title
        lines.append(f"[{i}] {p.title} ({p.year or 'n.d.'}) | types: {tags}{cites}\n    ref={ref}\n    {abstract}")
    return "\n".join(lines)


def grade_claim(
    llm: LLM, claim_text: str, papers: list[MergedPaper], domain: ClaimDomain
) -> tuple[GradeComponents, EvidenceGrade]:
    """Grade one claim. With no papers, the components record NONE consistency
    (=> SPECULATIVE) without spending an LLM call."""
    if not papers:
        comps = GradeComponents(
            design_tier=0.0, consistency=Consistency.NONE, directness=Directness.NONE, per_study_designs=[]
        )
        return comps, evidence_grade_from_components(comps)

    out = llm.grade_components(claim_text, summarize_papers(papers))
    designs = [canonical_design(d.design) for d in out.per_study_designs]
    comps = GradeComponents(
        design_tier=normalized_design_tier(designs, domain),
        consistency=Consistency(out.consistency),
        directness=Directness(out.directness),
        per_study_designs=designs,
    )
    return comps, evidence_grade_from_components(comps)


def _citations(papers: list[MergedPaper]) -> list[Citation]:
    return [
        Citation(
            source=",".join(p.sources) or "unknown",
            doi=p.doi, title=p.title, year=p.year, venue=p.venue, url=p.url,
            study_design=(p.publication_types[0] if p.publication_types else None),
        )
        for p in papers
    ]


def grade_and_store(
    llm: LLM,
    store: ClaimStore,
    claim_text: str,
    papers: list[MergedPaper],
    domain: ClaimDomain,
    *,
    graded_at: float,
) -> ClaimRecord:
    """Grade a claim and persist the snapshot (interning the claim first)."""
    comps, grade = grade_claim(llm, claim_text, papers, domain)
    h = store.intern(claim_text)
    return store.set_grade(
        h,
        grade_components=comps.model_dump(mode="json"),
        evidence_grade=grade.value,
        citations=_citations(papers),
        graded_at=graded_at,
    )


__all__ = ["summarize_papers", "grade_claim", "grade_and_store"]
