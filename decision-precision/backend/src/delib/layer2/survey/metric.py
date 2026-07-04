"""Distance transform + sign routing (A2).

The paper clusters on ``1 - |rho|`` (abs, so anti-correlated positions cluster
together). DELIB routes ``|r|`` to the METRIC (sqrt-adjusted) and SIGN to the
EDGE layer — so opposition shows up as a red edge, not as metric proximity.
"""

from __future__ import annotations

import math
from typing import Callable

from ..edges import EmpiricalCobeliefEdge, EmpiricalOppositionEdge, Layer2Edge
from ..enums import Grain, Placement, Provenance
from ..map import Layer2Map
from ..nodes import MapNode
from .store import Cells, CorrelationRow

DistanceFn = Callable[[float], float]


def phi_from_cells(cells: Cells) -> float:
    """Phi coefficient from a 2x2 contingency table — the tetrachoric-ish
    estimator the survey pages' cells imply. Transpose-invariant, so it doesn't
    depend on which variable is 'a'. Used to check parsed cells against the
    page's published r."""
    aa, ar, ra, rr = cells.aa, cells.ar, cells.ra, cells.rr
    den = math.sqrt((aa + ar) * (ra + rr) * (aa + ra) * (ar + rr))
    return (aa * rr - ar * ra) / den if den else 0.0


def sqrt_distance(r: float) -> float:
    """d = sqrt(1 - |r|) — the paper's 1-|rho| metric, sqrt-adjusted."""
    return math.sqrt(1.0 - abs(r))


def linear_distance(r: float) -> float:
    """d = 1 - |r| — the paper's plain clustering metric (validation alternative)."""
    return 1.0 - abs(r)


DEFAULT_DISTANCE: DistanceFn = sqrt_distance

OPPOSITION_THRESHOLD = 0.35  # r <= -this -> opposition; r >= this -> co-belief


def route_sign(
    rows: list[CorrelationRow], threshold: float = OPPOSITION_THRESHOLD
) -> tuple[list[EmpiricalOppositionEdge], list[EmpiricalCobeliefEdge]]:
    """Route each pair by sign: strong negative -> opposition candidate, strong
    positive -> co-belief candidate. |r| stays in the metric, not here."""
    opposition: list[EmpiricalOppositionEdge] = []
    cobelief: list[EmpiricalCobeliefEdge] = []
    for row in rows:
        common = dict(
            source=row.option_a_id, target=row.option_b_id, r=row.r, n=row.n,
            provenance=Provenance.PHILSURVEY, tier=row.source_tier,
        )
        if row.r <= -threshold:
            opposition.append(EmpiricalOppositionEdge(**common))
        elif row.r >= threshold:
            cobelief.append(EmpiricalCobeliefEdge(**common))
    return opposition, cobelief


def ingest_survey_into_map(
    m: Layer2Map,
    rows: list[CorrelationRow],
    threshold: float = OPPOSITION_THRESHOLD,
    tradition_map: dict[str, str] | None = None,
) -> tuple[list[str], list[Layer2Edge]]:
    """Create a POSITION node per survey option (UNPLACED) and add the empirical
    edges. Options in ``tradition_map`` are nested under their tradition leaf
    (which must already exist in the map). Returns (added node ids, added edges)."""
    tradition_map = tradition_map or {}

    id_label: dict[str, str] = {}
    for row in rows:
        id_label.setdefault(row.option_a_id, row.label_a)
        id_label.setdefault(row.option_b_id, row.label_b)

    added_nodes: list[str] = []
    for oid, label in id_label.items():
        if oid in m:
            continue
        leaf = tradition_map.get(oid)
        parent = leaf if (leaf and leaf in m) else None
        m.add_node(
            MapNode(
                id=oid, label=label, grain=Grain.POSITION, parent_id=parent,
                placement=Placement.UNPLACED, provenance=Provenance.PHILSURVEY,
            )
        )
        added_nodes.append(oid)

    opposition, cobelief = route_sign(rows, threshold)
    added_edges: list[Layer2Edge] = []
    for edge in (*opposition, *cobelief):
        m.add_edge(edge)
        added_edges.append(edge)
    return added_nodes, added_edges


__all__ = [
    "DistanceFn",
    "sqrt_distance",
    "linear_distance",
    "DEFAULT_DISTANCE",
    "OPPOSITION_THRESHOLD",
    "phi_from_cells",
    "route_sign",
    "ingest_survey_into_map",
]
