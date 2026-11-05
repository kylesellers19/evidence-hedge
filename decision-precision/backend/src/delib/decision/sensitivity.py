"""Step 10: sensitivity and value of information.

The precision report is the decision layer's version of Evidence Hedge's
question. Evidence Hedge asks whether a document's confidence is proportionate
to its evidence. Here the question is whether the evidence a decision demands is
proportionate to how much the decision depends on it (Howard 1966): investigate
where the choice is sensitive and the evidence is weak; tolerate weak evidence
where the choice does not move.

Uncertainty model: each cell's P05/P50/P95 with extended Pearson-Tukey weights
(Keefer & Bodily 1983), cells independent (PROVISIONAL; see config). Values are
on the 0-100 scale, so EVPI is in value points, not money.
"""

from __future__ import annotations

import bisect
from enum import Enum

from pydantic import BaseModel

from ..graph import DelibGraph
from .causal import evidence_floor, value_of
from .config import (
    ADEQUATE_ORDINAL,
    EVPI_MAX_CELLS_PER_ALTERNATIVE,
    EVPPI_MIN_POINTS,
    NARROW_INTERVAL_FRACTION,
    PT_WEIGHTS,
    REQUIRE_TRANSPORT_FOR_LITERATURE,
    WEIGHT_MARGIN,
)
from .models import CellRef, DecisionModel, Estimate, EstimateMethod, Objective
from .tradeoffs import Feasibility, constraint_screen, group_ranking, value_matrix


def _argmax(values: dict[str, float]) -> str:
    """Highest value; ties broken alphabetically (matches tradeoffs.rank_with)."""
    return min(values, key=lambda k: (-values[k], k))


def _ev(obj: Objective, e: Estimate) -> float:
    assert obj.attribute is not None
    xs = (e.p05, e.p50, e.p95)
    return sum(p * value_of(obj.attribute, x) for p, x in zip(PT_WEIGHTS, xs))


# --- weight stability --------------------------------------------------------


class WeightStability(BaseModel):
    group_id: str
    objective_id: str
    current: float
    lo: float  # top alternative unchanged for weights in [lo, hi]
    hi: float
    takeover_at_lo: str | None
    takeover_at_hi: str | None
    sensitive: bool


def weight_stability(model: DecisionModel, group_id: str) -> list[WeightStability]:
    """One-way: vary one normalized weight, rescale the others proportionally,
    and find the interval over which the group's top alternative stays on top."""
    r = group_ranking(model, group_id)
    vm = value_matrix(model)
    if r is None or vm is None or len(vm) < 2:
        return []
    w = r.weights
    top = r.top
    out: list[WeightStability] = []
    for i, wi in w.items():
        others = {j: wj for j, wj in w.items() if j != i}
        rest = sum(others.values())
        if rest <= 1e-12:
            share = {j: 1.0 / len(others) for j in others} if others else {}
        else:
            share = {j: wj / rest for j, wj in others.items()}
        lo, hi = 0.0, 1.0
        t_lo: str | None = None
        t_hi: str | None = None
        R = {a: sum(share[j] * vm[a][j] for j in share) for a in vm}
        for b in vm:
            if b == top:
                continue
            # diff(t) = t*(v_top,i - v_b,i) + (1-t)*(R_top - R_b)
            di = vm[top][i] - vm[b][i]
            dr = R[top] - R[b]
            slope = di - dr
            if abs(slope) < 1e-12:
                continue  # parallel: b never overtakes along this direction
            root = -dr / slope
            if slope < 0 and wi < root < hi:
                hi, t_hi = root, b
            elif slope > 0 and lo < root < wi:
                lo, t_lo = root, b
        sensitive = (wi - lo < WEIGHT_MARGIN and t_lo is not None) or (hi - wi < WEIGHT_MARGIN and t_hi is not None)
        out.append(WeightStability(
            group_id=group_id, objective_id=i, current=wi, lo=lo, hi=hi,
            takeover_at_lo=t_lo, takeover_at_hi=t_hi, sensitive=sensitive,
        ))
    return out


# --- tornado ------------------------------------------------------------------


class TornadoEntry(BaseModel):
    group_id: str
    cell: CellRef
    kind: str  # COMPENSATORY | CONSTRAINT
    value_low: float | None  # the cell's alternative's total value at the cell's P05/P95
    value_high: float | None
    swing: float
    top_at_low: str | None
    top_at_high: str | None
    flips: bool


def tornado(model: DecisionModel, group_id: str) -> list[TornadoEntry]:
    r = group_ranking(model, group_id)
    vm = value_matrix(model)
    if r is None or vm is None:
        return []
    w = r.weights
    base = {a: 100 * sum(w[o] * vm[a][o] for o in w) for a in vm}
    top = r.top
    out: list[TornadoEntry] = []
    comp = {o.id: o for o in model.compensatory_leaves()}
    for a in vm:
        for oid, o in comp.items():
            c = model.cell(a, oid)
            assert c is not None and c.estimate is not None and o.attribute is not None
            vals = []
            tops = []
            for x in (c.estimate.p05, c.estimate.p95):
                va = base[a] - 100 * w[oid] * vm[a][oid] + 100 * w[oid] * value_of(o.attribute, x)
                scen = dict(base)
                scen[a] = va
                vals.append(va)
                tops.append(_argmax(scen))
            lo_v, hi_v = min(vals), max(vals)
            out.append(TornadoEntry(
                group_id=group_id, cell=c.ref(), kind="COMPENSATORY",
                value_low=vals[0], value_high=vals[1], swing=hi_v - lo_v,
                top_at_low=tops[0], top_at_high=tops[1], flips=(tops[0] != top or tops[1] != top),
            ))
    # constraints: a feasibility change at either tail that would change the top
    screen = {s.alternative_id: s for s in constraint_screen(model)}
    for a, s in screen.items():
        for chk in s.checks:
            if chk.status is Feasibility.AT_RISK and a == top:
                out.append(TornadoEntry(
                    group_id=group_id, cell=CellRef(alternative_id=a, objective_id=chk.objective_id),
                    kind="CONSTRAINT", value_low=None, value_high=None, swing=0.0,
                    top_at_low=None, top_at_high=None, flips=True,
                ))
    out.sort(key=lambda e: (-int(e.flips), -e.swing))
    return out


# --- value of information ----------------------------------------------------


class CellVOI(BaseModel):
    group_id: str
    cell: CellRef
    evppi: float  # value points


class GroupVOI(BaseModel):
    group_id: str
    evpi: float | None  # None when too many uncertain cells to enumerate exactly
    expected_values: dict[str, float]
    top_under_expectation: str
    cells: list[CellVOI]


def _expected_matrix(model: DecisionModel) -> dict[str, dict[str, float]] | None:
    vm = value_matrix(model)
    if vm is None:
        return None
    comp = {o.id: o for o in model.compensatory_leaves()}
    out: dict[str, dict[str, float]] = {}
    for a in vm:
        out[a] = {}
        for oid, o in comp.items():
            c = model.cell(a, oid)
            assert c is not None and c.estimate is not None
            out[a][oid] = _ev(o, c.estimate)
    return out


def _dist(model: DecisionModel, a: str, w: dict[str, float]) -> list[tuple[float, float]] | None:
    """Discrete distribution of V_a (value, prob) over its uncertain cells."""
    comp = {o.id: o for o in model.compensatory_leaves()}
    support: dict[float, float] = {0.0: 1.0}
    n_uncertain = 0
    for oid, o in comp.items():
        c = model.cell(a, oid)
        assert c is not None and c.estimate is not None and o.attribute is not None
        e = c.estimate
        if e.uncertain:
            n_uncertain += 1
            if n_uncertain > EVPI_MAX_CELLS_PER_ALTERNATIVE:
                return None
            pts = [(100 * w[oid] * value_of(o.attribute, x), p) for x, p in zip((e.p05, e.p50, e.p95), PT_WEIGHTS)]
        else:
            pts = [(100 * w[oid] * value_of(o.attribute, e.p50), 1.0)]
        nxt: dict[float, float] = {}
        for v0, p0 in support.items():
            for v1, p1 in pts:
                k = round(v0 + v1, 9)
                nxt[k] = nxt.get(k, 0.0) + p0 * p1
        support = nxt
    return sorted(support.items())


def _expected_max(dists: list[list[tuple[float, float]]]) -> float:
    xs = sorted({v for d in dists for v, _ in d})
    cums = []
    for d in dists:
        vals = [v for v, _ in d]
        acc, c = 0.0, []
        for _, p in d:
            acc += p
            c.append(acc)
        cums.append((vals, c))

    def F(i: int, x: float) -> float:
        vals, c = cums[i]
        k = bisect.bisect_right(vals, x + 1e-12)
        return c[k - 1] if k else 0.0

    prev = 0.0
    total = 0.0
    for x in xs:
        g = 1.0
        for i in range(len(dists)):
            g *= F(i, x)
        total += x * (g - prev)
        prev = g
    return total


def value_of_information(model: DecisionModel, group_id: str) -> GroupVOI | None:
    r = group_ranking(model, group_id)
    em = _expected_matrix(model)
    if r is None or em is None or not em:
        return None
    w = r.weights
    EV = {a: 100 * sum(w[o] * em[a][o] for o in w) for a in em}
    top = _argmax(EV)
    best = EV[top]
    comp = {o.id: o for o in model.compensatory_leaves()}
    cells: list[CellVOI] = []
    for a in em:
        others = max((EV[b] for b in EV if b != a), default=float("-inf"))
        for oid, o in comp.items():
            c = model.cell(a, oid)
            assert c is not None and c.estimate is not None and o.attribute is not None
            e = c.estimate
            if not e.uncertain:
                cells.append(CellVOI(group_id=group_id, cell=c.ref(), evppi=0.0))
                continue
            acc = 0.0
            for x, p in zip((e.p05, e.p50, e.p95), PT_WEIGHTS):
                va = EV[a] - 100 * w[oid] * em[a][oid] + 100 * w[oid] * value_of(o.attribute, x)
                acc += p * max(va, others)
            cells.append(CellVOI(group_id=group_id, cell=c.ref(), evppi=max(0.0, acc - best)))
    dists = [_dist(model, a, w) for a in em]
    evpi = None
    if all(d is not None for d in dists):
        evpi = max(0.0, _expected_max([d for d in dists if d is not None]) - best)
    cells.sort(key=lambda c: -c.evppi)
    return GroupVOI(group_id=group_id, evpi=evpi, expected_values=EV, top_under_expectation=top, cells=cells)


# --- precision report ------------------------------------------------------------


class Quadrant(str, Enum):
    INVESTIGATE = "INVESTIGATE"  # decision-sensitive, evidence below adequate
    MONITOR = "MONITOR"          # decision-sensitive, evidence adequate -> signposts
    TOLERATE = "TOLERATE"        # not sensitive, evidence weak: leave it
    SETTLED = "SETTLED"          # not sensitive, evidence adequate


class PrecisionRow(BaseModel):
    cell: CellRef
    kind: str
    sensitive_groups: list[str]
    max_evppi: float
    floor_grade: str | None
    adequate: bool
    quadrant: Quadrant
    flags: list[str]


def precision_report(model: DecisionModel, graph: DelibGraph | None) -> list[PrecisionRow]:
    vois = {w.group_id: value_of_information(model, w.group_id) for w in model.weights}
    tors = {w.group_id: tornado(model, w.group_id) for w in model.weights}
    rows: dict[CellRef, PrecisionRow] = {}
    leaves = {o.id: o for o in model.leaf_objectives()}

    def adequacy(cref: CellRef) -> tuple[bool, str | None, list[str]]:
        c = model.cell(cref.alternative_id, cref.objective_id)
        flags: list[str] = []
        if c is None:
            return False, None, ["no cell"]
        if c.estimate is not None and c.estimate.method is EstimateMethod.MEASURED:
            # an observed value, not a predicted effect: it needs no causal basis
            return True, None, ["measured, not predicted"]
        f = evidence_floor(model, graph, c)
        if f.untraced:
            flags.append("untraced: no basis edges recorded")
        if f.missing_edges:
            flags.append(f"basis edges not in graph: {f.missing_edges}")
        if f.elicited_only:
            flags.append(f"rests on elicited belief only: {f.elicited_only}")
        if f.transport_gaps:
            flags.append(f"literature not shown to transport here: {f.transport_gaps}")
        ok = f.ordinal is not None and f.ordinal >= ADEQUATE_ORDINAL
        if REQUIRE_TRANSPORT_FOR_LITERATURE and f.transport_gaps:
            ok = False
        o = leaves.get(cref.objective_id)
        if c.estimate is not None and o is not None and o.attribute is not None and not ok:
            width = c.estimate.p95 - c.estimate.p05
            if width < NARROW_INTERVAL_FRACTION * (o.attribute.hi - o.attribute.lo):
                flags.append("overconfident interval: narrow P05-P95 on evidence below adequate")
        return ok, (f.grade.value if f.grade else None), flags

    for gid, v in vois.items():
        if v is None:
            continue
        for cv in v.cells:
            row = rows.get(cv.cell)
            if row is None:
                ok, grade, flags = adequacy(cv.cell)
                row = PrecisionRow(cell=cv.cell, kind="COMPENSATORY", sensitive_groups=[], max_evppi=0.0,
                                   floor_grade=grade, adequate=ok, quadrant=Quadrant.SETTLED, flags=flags)
                rows[cv.cell] = row
            row.max_evppi = max(row.max_evppi, cv.evppi)
            if cv.evppi >= EVPPI_MIN_POINTS and gid not in row.sensitive_groups:
                row.sensitive_groups.append(gid)
    for gid, ts in tors.items():
        for t in ts:
            if t.kind != "CONSTRAINT" or not t.flips:
                continue
            row = rows.get(t.cell)
            if row is None:
                ok, grade, flags = adequacy(t.cell)
                row = PrecisionRow(cell=t.cell, kind="CONSTRAINT", sensitive_groups=[], max_evppi=0.0,
                                   floor_grade=grade, adequate=ok, quadrant=Quadrant.SETTLED, flags=flags)
                rows[t.cell] = row
            if gid not in row.sensitive_groups:
                row.sensitive_groups.append(gid)

    # correlation note: sensitive cells sharing a basis edge are not independent
    sensitive = [r for r in rows.values() if r.sensitive_groups]
    basis = {
        r.cell: {e.key() for e in (model.cell(r.cell.alternative_id, r.cell.objective_id).basis_edges)}  # type: ignore[union-attr]
        for r in sensitive
    }
    for r in sensitive:
        shared = [
            f"{o.alternative_id}|{o.objective_id}" for o in basis
            if o != r.cell and basis[o] & basis[r.cell]
        ]
        if shared:
            r.flags.append(f"shares basis edges with {shared}: EVPI treats them as independent")

    for r in rows.values():
        s = bool(r.sensitive_groups)
        r.quadrant = (
            Quadrant.INVESTIGATE if s and not r.adequate else
            Quadrant.MONITOR if s else
            Quadrant.TOLERATE if not r.adequate else
            Quadrant.SETTLED
        )
    order = list(Quadrant)
    return sorted(rows.values(), key=lambda r: (order.index(r.quadrant), -r.max_evppi))


__all__ = [
    "WeightStability", "weight_stability",
    "TornadoEntry", "tornado",
    "CellVOI", "GroupVOI", "value_of_information",
    "Quadrant", "PrecisionRow", "precision_report",
]
