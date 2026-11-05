"""The disagreement map: the main deliverable of user-group work.

Every conflict between groups is classified by what would resolve it, following
Structured Decision Making's separation of facts from values (Gregory et al. 2012):

  FACTUAL  groups believe different things about the same effect on the same
           people. Resolved by evidence: edge disputes -> step 7; estimate
           disputes -> step 10, which says whether resolving them is worth it.
  VALUE    groups weigh objectives differently. Resolved by deliberation over
           tradeoffs, never by more data -> step 9.
  FRAME    groups are solving different problems: an objective or option one
           group raised is not in the model. Resolved by reframing -> steps 1/4/5.

HETEROGENEITY is reported alongside but is not a disagreement: two groups can
both be right that the same change helps one and hurts the other. Treating that
as a factual dispute is a common way user-group findings get flattened.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel

from .config import LATENT_WEIGHT_GAP
from .models import CellRef, DecisionModel, EdgeRef, StatementType
from .sensitivity import PrecisionRow
from .structure import VALUE_TYPES, statement_group
from .tradeoffs import GroupRanking, all_rankings


class DisagreementKind(str, Enum):
    FACTUAL = "FACTUAL"
    VALUE = "VALUE"
    FRAME = "FRAME"
    HETEROGENEITY = "HETEROGENEITY"


ROUTE = {
    DisagreementKind.FACTUAL: 7,
    DisagreementKind.VALUE: 9,
    DisagreementKind.FRAME: 1,
    DisagreementKind.HETEROGENEITY: 7,
}


class Disagreement(BaseModel):
    kind: DisagreementKind
    subject: str
    groups: list[str]
    route_to_step: int
    decision_relevant: bool | None  # None = cannot tell yet (no complete analysis)
    detail: str
    statement_ids: list[str] = []
    edge: EdgeRef | None = None
    cell: CellRef | None = None


def _tops(model: DecisionModel) -> dict[str, str]:
    return {r.group_id: r.top for r in all_rankings(model)}


def disagreements(
    model: DecisionModel,
    rankings: list[GroupRanking],
    precision: list[PrecisionRow],
    relevant_edge_keys: set[str],
) -> list[Disagreement]:
    out: list[Disagreement] = []
    sg = statement_group(model)
    analysed = bool(rankings)
    sensitive_edges: set[str] = set()
    for row in precision:
        if row.sensitive_groups:
            c = model.cell(row.cell.alternative_id, row.cell.objective_id)
            if c is not None:
                sensitive_edges |= {e.key() for e in c.basis_edges}

    def edge_relevance(key: str) -> tuple[bool | None, str]:
        if not analysed:
            return None, "no complete ranking yet"
        if key in sensitive_edges:
            return True, "edge underlies a decision-sensitive cell"
        if key in relevant_edge_keys:
            return False, "edge is in the decision-relevant subgraph but no sensitive cell rests on it"
        return False, "edge is outside the decision-relevant subgraph"

    # --- FACTUAL / HETEROGENEITY from causal-belief statements ---------------
    beliefs: dict[str, list] = {}
    edge_of: dict[str, EdgeRef] = {}
    for s in model.statements:
        if s.type is StatementType.CAUSAL_BELIEF and s.edge is not None:
            beliefs.setdefault(s.edge.key(), []).append(s)
            edge_of[s.edge.key()] = s.edge
    for key, ss in beliefs.items():
        factual: set[str] = set()
        hetero: set[str] = set()
        unspecified = False
        for i, a in enumerate(ss):
            for b in ss[i + 1:]:
                if sg[a.id] == sg[b.id] or a.polarity == b.polarity:
                    continue
                pa, pb = a.population or "ALL", b.population or "ALL"
                if pa == pb:
                    factual |= {a.id, b.id}
                elif a.population is None or b.population is None:
                    factual |= {a.id, b.id}
                    unspecified = True
                elif "ALL" in (pa, pb):
                    factual |= {a.id, b.id}
                else:
                    hetero |= {a.id, b.id}
        if factual:
            rel, why = edge_relevance(key)
            note = " One side did not say whom the effect falls on; this may be heterogeneity." if unspecified else ""
            out.append(Disagreement(
                kind=DisagreementKind.FACTUAL, subject=f"edge {key}",
                groups=sorted({sg[x] for x in factual}), route_to_step=7, decision_relevant=rel,
                detail=f"Groups assert different effects on the same population ({why}).{note}",
                statement_ids=sorted(factual), edge=edge_of[key],
            ))
        if hetero:
            out.append(Disagreement(
                kind=DisagreementKind.HETEROGENEITY, subject=f"edge {key}",
                groups=sorted({sg[x] for x in hetero}), route_to_step=7, decision_relevant=None,
                detail="Opposite effects reported for different groups: record as group effects on the edge "
                       "card (a moderator), not as a dispute.",
                statement_ids=sorted(hetero), edge=edge_of[key],
            ))

    # heterogeneity already recorded on cards
    for card in model.edge_cards:
        dirs = {g.direction for g in card.group_effects if g.direction != 0}
        if len(dirs) > 1:
            out.append(Disagreement(
                kind=DisagreementKind.HETEROGENEITY, subject=f"edge {card.edge.key()}",
                groups=sorted(g.group_id for g in card.group_effects), route_to_step=7,
                decision_relevant=edge_relevance(card.edge.key())[0],
                detail="Edge card records opposite effects by group.", edge=card.edge,
            ))

    # --- FACTUAL from per-group estimates ------------------------------------
    base_tops = _tops(model) if analysed else {}
    for cell in model.cells:
        ge = cell.group_estimates
        gids = sorted(ge)
        conflicts: set[str] = set()
        for i, a in enumerate(gids):
            for b in gids[i + 1:]:
                if ge[a].p95 < ge[b].p05 or ge[b].p95 < ge[a].p05:
                    conflicts |= {a, b}
        if not conflicts:
            continue
        rel: bool | None = None
        if analysed:
            rel = False
            for g in sorted(conflicts):
                alt = model.model_copy(deep=True)
                c2 = alt.cell(cell.alternative_id, cell.objective_id)
                assert c2 is not None
                c2.estimate = ge[g]
                if _tops(alt) != base_tops:
                    rel = True
                    break
        out.append(Disagreement(
            kind=DisagreementKind.FACTUAL, subject=f"cell ({cell.alternative_id}, {cell.objective_id})",
            groups=sorted(conflicts), route_to_step=10, decision_relevant=rel,
            detail="Group estimates have non-overlapping P05-P95 intervals"
                   + (" and substituting one group's estimate changes a group's top choice." if rel else "."),
            cell=cell.ref(),
        ))

    # --- VALUE ----------------------------------------------------------------
    tops = {r.group_id: r.top for r in rankings}
    if len(set(tops.values())) > 1:
        detail = "; ".join(f"{g} -> {t}" for g, t in sorted(tops.items()))
        out.append(Disagreement(
            kind=DisagreementKind.VALUE, subject="top alternative", groups=sorted(tops),
            route_to_step=9, decision_relevant=True,
            detail=f"Same consequence table, different weights, different choices: {detail}",
        ))
    for i, a in enumerate(rankings):
        for b in rankings[i + 1:]:
            if a.top != b.top:
                continue
            gaps = {o: abs(a.weights[o] - b.weights.get(o, 0.0)) for o in a.weights}
            o, gap = max(gaps.items(), key=lambda t: t[1])
            if gap >= LATENT_WEIGHT_GAP:
                out.append(Disagreement(
                    kind=DisagreementKind.VALUE, subject=f"weight on {o}", groups=[a.group_id, b.group_id],
                    route_to_step=9, decision_relevant=False,
                    detail=f"Latent: weights differ by {gap:.2f} but both groups pick {a.top}. "
                           "It can surface if the alternative set changes.",
                ))

    # --- FRAME ------------------------------------------------------------------
    by_group: dict[str, list[str]] = {}
    for s in model.statements:
        if s.type in VALUE_TYPES and s.objective_id is None:
            by_group.setdefault(sg[s.id], []).append(s.id)
    for g, sids in sorted(by_group.items()):
        out.append(Disagreement(
            kind=DisagreementKind.FRAME, subject="objectives", groups=[g], route_to_step=4,
            decision_relevant=None,
            detail=f"{len(sids)} value statement(s) from this group match no objective: add them to the "
                   "objectives (step 4) or record them as out of frame (step 1).",
            statement_ids=sids,
        ))
    alt_unlinked: dict[str, list[str]] = {}
    for s in model.statements:
        if s.type is StatementType.ALTERNATIVE and s.alternative_id is None:
            alt_unlinked.setdefault(sg[s.id], []).append(s.id)
    for g, sids in sorted(alt_unlinked.items()):
        out.append(Disagreement(
            kind=DisagreementKind.FRAME, subject="alternatives", groups=[g], route_to_step=5,
            decision_relevant=None,
            detail=f"{len(sids)} option(s) this group proposed are not in the alternative set.",
            statement_ids=sids,
        ))
    oof: dict[str, list[str]] = {}
    for s in model.statements:
        if s.type is StatementType.OUT_OF_FRAME:
            oof.setdefault(sg[s.id], []).append(s.id)
    for g, sids in sorted(oof.items()):
        out.append(Disagreement(
            kind=DisagreementKind.FRAME, subject="scope", groups=[g], route_to_step=1,
            decision_relevant=None,
            detail=f"{len(sids)} statement(s) coded out of frame: this group may be answering a different "
                   "question. Decide explicitly whether the frame should move.",
            statement_ids=sids,
        ))
    return out


__all__ = ["DisagreementKind", "ROUTE", "Disagreement", "disagreements"]
