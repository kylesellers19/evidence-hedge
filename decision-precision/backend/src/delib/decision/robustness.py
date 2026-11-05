"""Step 11: robustness, after Dewar's Assumption-Based Planning (2002).

An assumption is LOAD-BEARING when the analysis says the choice depends on it:
it touches a decision-sensitive cell, an edge under one, or a weight sitting near
a rank reversal. Load-bearing assumptions that could plausibly fail need a
signpost (what would tell you) and a shaping or hedging action (what you do
about it). This module checks that structure; it does not judge vulnerability.
"""

from __future__ import annotations

from pydantic import BaseModel

from .models import CellRef, ConfounderStatus, DecisionModel, EdgeRef, EvidenceBasis, Transport, WeightRef
from .sensitivity import PrecisionRow, WeightStability


class AssumptionStatus(BaseModel):
    assumption_id: str
    load_bearing: bool
    reasons: list[str]
    gaps: list[str]


class AssumptionCandidate(BaseModel):
    """Generated text (PROVISIONAL template). A prompt to write a real assumption,
    not one in itself."""

    cell: CellRef
    edge: EdgeRef | None
    text: str
    why: list[str]


def _sensitive_cells(precision: list[PrecisionRow]) -> set[CellRef]:
    return {r.cell for r in precision if r.sensitive_groups}


def _sensitive_edges(model: DecisionModel, cells: set[CellRef]) -> set[EdgeRef]:
    out: set[EdgeRef] = set()
    for c in cells:
        cell = model.cell(c.alternative_id, c.objective_id)
        if cell is not None:
            out |= set(cell.basis_edges)
    return out


def assumption_status(
    model: DecisionModel, precision: list[PrecisionRow], stability: list[WeightStability]
) -> list[AssumptionStatus]:
    cells = _sensitive_cells(precision)
    edges = _sensitive_edges(model, cells)
    weights = {WeightRef(group_id=s.group_id, objective_id=s.objective_id) for s in stability if s.sensitive}
    out: list[AssumptionStatus] = []
    for a in model.assumptions:
        reasons: list[str] = []
        reasons += [f"decision-sensitive cell ({c.alternative_id}, {c.objective_id})" for c in a.refs.cells if c in cells]
        reasons += [f"edge {e.key()} under a decision-sensitive cell" for e in a.refs.edges if e in edges]
        reasons += [f"weight ({w.group_id}, {w.objective_id}) near a rank reversal" for w in a.refs.weights if w in weights]
        lb = bool(reasons)
        gaps: list[str] = []
        if lb:
            if a.vulnerable is None:
                gaps.append("load-bearing but vulnerability not assessed")
            elif a.vulnerable:
                if not a.signposts:
                    gaps.append("load-bearing and vulnerable, but no signpost")
                if not (a.shaping_actions or a.hedging_actions):
                    gaps.append("load-bearing and vulnerable, but no shaping or hedging action")
        out.append(AssumptionStatus(assumption_id=a.id, load_bearing=lb, reasons=reasons, gaps=gaps))
    return out


def assumption_candidates(model: DecisionModel, precision: list[PrecisionRow]) -> list[AssumptionCandidate]:
    covered_cells = {c for a in model.assumptions for c in a.refs.cells}
    covered_edges = {e for a in model.assumptions for e in a.refs.edges}
    out: list[AssumptionCandidate] = []
    for row in precision:
        if not row.sensitive_groups or row.cell in covered_cells:
            continue
        cell = model.cell(row.cell.alternative_id, row.cell.objective_id)
        if cell is None:
            continue
        if not cell.basis_edges:
            out.append(AssumptionCandidate(
                cell=row.cell, edge=None,
                text=f"The estimate for ({row.cell.alternative_id}, {row.cell.objective_id}) holds as assumed.",
                why=["decision-sensitive", "no basis edges recorded"],
            ))
            continue
        for e in cell.basis_edges:
            if e in covered_edges:
                continue
            card = model.card(e)
            why: list[str] = []
            if card is None:
                why.append("no evidence card")
            else:
                if card.basis == [EvidenceBasis.ELICITED_BELIEF]:
                    why.append("elicited belief only")
                if EvidenceBasis.LITERATURE in card.basis and card.transport is not Transport.LIKELY_HOLDS:
                    why.append(f"transport {card.transport.value}")
                if any(c.status is ConfounderStatus.UNADDRESSED for c in card.confounders):
                    why.append("unaddressed confounder")
            if row.quadrant.value == "MONITOR":
                why.append("adequate evidence but the choice depends on it: monitor")
            if why:
                out.append(AssumptionCandidate(
                    cell=row.cell, edge=e,
                    text=(f"Edge {e.source} -> {e.target} holds at this site with the direction and size "
                          f"assumed in cell ({row.cell.alternative_id}, {row.cell.objective_id})."),
                    why=["decision-sensitive"] + why,
                ))
    return out


__all__ = ["AssumptionStatus", "AssumptionCandidate", "assumption_status", "assumption_candidates"]
