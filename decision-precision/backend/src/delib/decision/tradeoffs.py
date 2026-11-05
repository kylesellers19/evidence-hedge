"""Step 9: tradeoffs.

Order of operations follows practice (Hammond, Keeney & Raiffa 1999): screen on
constraints, remove dominated alternatives, then weigh what is left — per group.
Groups are never pooled unless :func:`pooled_ranking` is called explicitly.

Values are on a 0-100 scale: V_g(a) = 100 * sum_i w_gi * v_i(x_ai), with v_i the
single-attribute value function and w_g the group's normalized swing weights.
The additive form assumes preferential independence; whether each group was
checked is recorded on its SwingWeights, not inferred.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel

from .causal import value_of
from .config import SWAP_INCONSISTENCY_FACTOR
from .models import DecisionModel, Direction, Estimate, Objective


class Feasibility(str, Enum):
    PASS = "PASS"
    AT_RISK = "AT_RISK"
    FAIL = "FAIL"
    UNKNOWN = "UNKNOWN"


class ConstraintCheck(BaseModel):
    objective_id: str
    threshold: float
    p05: float | None
    p50: float | None
    p95: float | None
    status: Feasibility


class AlternativeScreen(BaseModel):
    alternative_id: str
    status: Feasibility
    checks: list[ConstraintCheck]


def _meets(obj: Objective, x: float) -> bool:
    assert obj.attribute is not None and obj.threshold is not None
    if obj.attribute.direction is Direction.MAXIMIZE:
        return x >= obj.threshold
    return x <= obj.threshold


def constraint_screen(model: DecisionModel) -> list[AlternativeScreen]:
    """Thresholds evaluated at P50; an interval that crosses the threshold marks
    the alternative AT_RISK (PROVISIONAL — see config.ratification_table)."""
    out: list[AlternativeScreen] = []
    cons = model.constraint_leaves()
    for a in model.alternatives:
        checks: list[ConstraintCheck] = []
        for o in cons:
            c = model.cell(a.id, o.id)
            e = c.estimate if c else None
            if e is None:
                st = Feasibility.UNKNOWN
            elif not _meets(o, e.p50):
                st = Feasibility.FAIL
            elif _meets(o, e.p05) and _meets(o, e.p95):
                st = Feasibility.PASS
            else:
                st = Feasibility.AT_RISK
            checks.append(ConstraintCheck(
                objective_id=o.id, threshold=o.threshold or 0.0,
                p05=e.p05 if e else None, p50=e.p50 if e else None, p95=e.p95 if e else None, status=st,
            ))
        order = [Feasibility.FAIL, Feasibility.UNKNOWN, Feasibility.AT_RISK, Feasibility.PASS]
        status = min((c.status for c in checks), key=order.index, default=Feasibility.PASS)
        out.append(AlternativeScreen(alternative_id=a.id, status=status, checks=checks))
    return out


def feasible_ids(model: DecisionModel) -> list[str]:
    return [
        s.alternative_id for s in constraint_screen(model)
        if s.status in (Feasibility.PASS, Feasibility.AT_RISK)
    ]


# --- value matrix -----------------------------------------------------------


def value_matrix(model: DecisionModel, quantile: str = "p50") -> dict[str, dict[str, float]] | None:
    """alternative -> compensatory objective -> value in [0, 1] at a quantile.
    None if any feasible alternative lacks an estimate for a compensatory leaf."""
    out: dict[str, dict[str, float]] = {}
    for aid in feasible_ids(model):
        row: dict[str, float] = {}
        for o in model.compensatory_leaves():
            c = model.cell(aid, o.id)
            if c is None or c.estimate is None or o.attribute is None:
                return None
            row[o.id] = value_of(o.attribute, getattr(c.estimate, quantile))
        out[aid] = row
    return out


def value_bounds(obj: Objective, e: Estimate) -> tuple[float, float]:
    assert obj.attribute is not None
    a, b = value_of(obj.attribute, e.p05), value_of(obj.attribute, e.p95)
    return min(a, b), max(a, b)


# --- dominance --------------------------------------------------------------


class Dominance(BaseModel):
    dominated: str
    by: str
    kind: str  # POINT | ROBUST


def dominance(model: DecisionModel) -> list[Dominance]:
    """Among feasible alternatives, over compensatory objectives. POINT uses P50
    values; ROBUST requires the dominator's worst value to match or beat the
    other's best on every objective."""
    vm = value_matrix(model)
    if vm is None:
        return []
    objs = model.compensatory_leaves()
    bounds: dict[str, dict[str, tuple[float, float]]] = {}
    for aid in vm:
        bounds[aid] = {}
        for o in objs:
            c = model.cell(aid, o.id)
            assert c is not None and c.estimate is not None
            bounds[aid][o.id] = value_bounds(o, c.estimate)
    out: list[Dominance] = []
    ids = list(vm)
    for a in ids:
        for b in ids:
            if a == b:
                continue
            ge = all(vm[a][o.id] >= vm[b][o.id] - 1e-12 for o in objs)
            gt = any(vm[a][o.id] > vm[b][o.id] + 1e-12 for o in objs)
            if ge and gt:
                robust_ge = all(bounds[a][o.id][0] >= bounds[b][o.id][1] - 1e-12 for o in objs)
                robust_gt = any(bounds[a][o.id][0] > bounds[b][o.id][1] + 1e-12 for o in objs)
                out.append(Dominance(dominated=b, by=a, kind="ROBUST" if (robust_ge and robust_gt) else "POINT"))
    return out


# --- per-group rankings ------------------------------------------------------


class RankedAlternative(BaseModel):
    alternative_id: str
    value: float  # 0-100
    rank: int
    at_risk: bool


class GroupRanking(BaseModel):
    group_id: str
    weights: dict[str, float]
    ranked: list[RankedAlternative]
    top: str
    margin: float  # value gap between first and second (0-100 points)
    preferential_independence_checked: bool


def _score(weights: dict[str, float], row: dict[str, float]) -> float:
    return 100.0 * sum(weights[o] * row[o] for o in weights)


def rank_with(model: DecisionModel, weights: dict[str, float], vm: dict[str, dict[str, float]]) -> list[RankedAlternative]:
    screen = {s.alternative_id: s.status for s in constraint_screen(model)}
    vals = sorted(((aid, _score(weights, row)) for aid, row in vm.items()), key=lambda t: (-t[1], t[0]))
    return [
        RankedAlternative(alternative_id=aid, value=v, rank=i + 1, at_risk=screen.get(aid) is Feasibility.AT_RISK)
        for i, (aid, v) in enumerate(vals)
    ]


def group_ranking(model: DecisionModel, group_id: str) -> GroupRanking | None:
    sw = model.weights_for(group_id)
    vm = value_matrix(model)
    if sw is None or vm is None or not vm:
        return None
    w = sw.normalized()
    ranked = rank_with(model, w, vm)
    margin = ranked[0].value - ranked[1].value if len(ranked) > 1 else 0.0
    return GroupRanking(
        group_id=group_id, weights=w, ranked=ranked, top=ranked[0].alternative_id, margin=margin,
        preferential_independence_checked=sw.preferential_independence_checked,
    )


def all_rankings(model: DecisionModel) -> list[GroupRanking]:
    out = []
    for w in model.weights:
        r = group_ranking(model, w.group_id)
        if r is not None:
            out.append(r)
    return out


class PooledRanking(BaseModel):
    label: str
    rule: str
    shares: dict[str, float]
    weights: dict[str, float]
    ranked: list[RankedAlternative]


def pooled_ranking(model: DecisionModel, shares: dict[str, float] | None = None) -> PooledRanking | None:
    """An EXPLICIT pooling act. ``shares`` (group -> non-negative share) default
    to equal. Pooling weights is equivalent to pooling values under the additive
    model. The result is labeled so it cannot be mistaken for a default."""
    vm = value_matrix(model)
    if vm is None or not model.weights:
        return None
    groups = [w.group_id for w in model.weights]
    if shares is None:
        shares = {g: 1.0 for g in groups}
        rule = "equal shares across weighted groups"
    else:
        unknown = set(shares) - set(groups)
        if unknown:
            raise ValueError(f"pooling shares name groups without weights: {sorted(unknown)}")
        if any(v < 0 for v in shares.values()) or sum(shares.values()) <= 0:
            raise ValueError("pooling shares must be non-negative with a positive total")
        rule = "stated shares"
    total = sum(shares.values())
    norm = {g: shares.get(g, 0.0) / total for g in groups}
    pooled: dict[str, float] = {}
    for w in model.weights:
        for o, v in w.normalized().items():
            pooled[o] = pooled.get(o, 0.0) + norm[w.group_id] * v
    return PooledRanking(
        label="POOLED — explicit act, not a default", rule=rule, shares=norm, weights=pooled,
        ranked=rank_with(model, pooled, vm),
    )


# --- even swaps -------------------------------------------------------------


class SwapCheck(BaseModel):
    swap_id: str
    implied_ratio: float | None  # w_give / w_get implied by the swap
    elicited_ratio: float | None  # from the group's swing weights
    consistent: bool | None


class EvenSwapTrack(BaseModel):
    group_id: str
    applied: list[str]
    values: dict[str, dict[str, float]]  # alternative -> objective -> value after swaps
    dominated_after: list[Dominance]
    irrelevant_objectives: list[str]  # equal across the non-dominated alternatives
    checks: list[SwapCheck]


def even_swap_tracks(model: DecisionModel) -> list[EvenSwapTrack]:
    vm = value_matrix(model)
    if vm is None:
        return []
    objs = {o.id: o for o in model.compensatory_leaves()}
    by_group: dict[str, list] = {}
    for s in model.even_swaps:
        by_group.setdefault(s.group_id, []).append(s)
    out: list[EvenSwapTrack] = []
    for gid, swaps in by_group.items():
        vals = {a: dict(row) for a, row in vm.items()}
        sw = model.weights_for(gid)
        w = sw.normalized() if sw else None
        checks: list[SwapCheck] = []
        applied: list[str] = []
        for s in swaps:
            if s.alternative_id not in vals:
                continue  # swap on an infeasible alternative: ignored
            og, ot = objs[s.give.objective_id], objs[s.get.objective_id]
            assert og.attribute is not None and ot.attribute is not None
            new_g, new_t = value_of(og.attribute, s.give.new_value), value_of(ot.attribute, s.get.new_value)
            dg = new_g - vals[s.alternative_id][og.id]
            dt = new_t - vals[s.alternative_id][ot.id]
            implied = (-dt / dg) if abs(dg) > 1e-12 else None  # w_give/w_get such that w_g*dg + w_t*dt = 0
            elicited = None
            consistent = None
            if w is not None and w.get(ot.id, 0) > 0:
                elicited = w[og.id] / w[ot.id]
                if implied is not None and implied > 0 and elicited > 0:
                    ratio = max(implied, elicited) / min(implied, elicited)
                    consistent = ratio <= SWAP_INCONSISTENCY_FACTOR
                elif implied is not None:
                    consistent = False  # a swap that gives up value on both, or gains on both
            checks.append(SwapCheck(swap_id=s.id, implied_ratio=implied, elicited_ratio=elicited, consistent=consistent))
            vals[s.alternative_id][og.id] = new_g
            vals[s.alternative_id][ot.id] = new_t
            applied.append(s.id)
        dom: list[Dominance] = []
        ids = list(vals)
        for a in ids:
            for b in ids:
                if a != b and all(vals[a][o] >= vals[b][o] - 1e-12 for o in objs) and any(
                    vals[a][o] > vals[b][o] + 1e-12 for o in objs
                ):
                    dom.append(Dominance(dominated=b, by=a, kind="POINT"))
        remaining = [a for a in ids if a not in {d.dominated for d in dom}]
        irrelevant = [
            o for o in objs
            if len(remaining) > 1 and max(vals[a][o] for a in remaining) - min(vals[a][o] for a in remaining) < 1e-9
        ]
        out.append(EvenSwapTrack(group_id=gid, applied=applied, values=vals, dominated_after=dom,
                                 irrelevant_objectives=irrelevant, checks=checks))
    return out


__all__ = [
    "Feasibility", "ConstraintCheck", "AlternativeScreen", "constraint_screen", "feasible_ids",
    "value_matrix", "value_bounds", "Dominance", "dominance",
    "RankedAlternative", "GroupRanking", "rank_with", "group_ranking", "all_rankings",
    "PooledRanking", "pooled_ranking",
    "SwapCheck", "EvenSwapTrack", "even_swap_tracks",
]
