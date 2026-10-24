"""Layer 2 queries — the payoff.

The map's point is that proximity (metric) and lineage/tension (edges) are
independent, so the *interesting* regions are where they disagree:
  - near + ATTACK        -> live rivalry (Collins's engines)
  - far  + no edge       -> incommensurable (reading tension here is a category error)
  - far  + COMPATIBILITY -> surprising alliance
Plus the Stage-D lineage-drift check: descendants that migrated far from their
ancestor are the map's most interesting single artifacts.

Distances are computed AT A STATED GRAIN — pairs of different grain are never
compared.
"""

from __future__ import annotations

import math
from itertools import combinations
from typing import Literal

from pydantic import BaseModel

from .enums import Grain, Layer2EdgeType
from .map import Layer2Map
from .nodes import MapNode


def node_distance(a: MapNode, b: MapNode) -> float | None:
    """Euclidean distance over shared coordinates; None if either is unplaced
    or the two are different grains (grain rule)."""
    if a.grain is not b.grain:
        return None
    ca, cb = a.coords(), b.coords()
    if not ca or not cb:
        return None
    k = min(len(ca), len(cb))
    return math.sqrt(sum((ca[i] - cb[i]) ** 2 for i in range(k)))


class DiagnosticPair(BaseModel):
    a: str
    b: str
    distance: float
    kind: Literal["rivalry", "incommensurable", "surprising_alliance"]


class DiagnosticReport(BaseModel):
    rivalries: list[DiagnosticPair] = []
    incommensurable: list[DiagnosticPair] = []
    surprising_alliances: list[DiagnosticPair] = []


def diagnostic_regions(
    m: Layer2Map, near: float, far: float, grain: Grain | None = None
) -> DiagnosticReport:
    report = DiagnosticReport()
    placed = [n for n in m.nodes() if n.coords() and (grain is None or n.grain is grain)]

    for a, b in combinations(placed, 2):
        d = node_distance(a, b)
        if d is None:
            continue
        edges = m.edges_between(a.id, b.id)
        has_attack = any(e.type is Layer2EdgeType.ATTACK for e in edges)
        has_compat = any(e.type is Layer2EdgeType.COMPATIBILITY for e in edges)

        if d <= near and has_attack:
            report.rivalries.append(DiagnosticPair(a=a.id, b=b.id, distance=d, kind="rivalry"))
        if d >= far and not edges:
            report.incommensurable.append(
                DiagnosticPair(a=a.id, b=b.id, distance=d, kind="incommensurable")
            )
        if d >= far and has_compat:
            report.surprising_alliances.append(
                DiagnosticPair(a=a.id, b=b.id, distance=d, kind="surprising_alliance")
            )
    return report


class LineageDrift(BaseModel):
    ancestor: str
    descendant: str
    distance: float
    baseline: float  # median same-grain pairwise distance


def lineage_drift(m: Layer2Map, factor: float = 1.5) -> list[LineageDrift]:
    """DESCENT edges whose descendant sits far (> factor * median) from its
    ancestor — surfaced, never suppressed."""
    dists = [
        d
        for a, b in combinations([n for n in m.nodes() if n.coords()], 2)
        if (d := node_distance(a, b)) is not None
    ]
    if not dists:
        return []
    dists.sort()
    median = dists[len(dists) // 2]

    out: list[LineageDrift] = []
    for e in m.edges(Layer2EdgeType.DESCENT):
        d = node_distance(m.get_node(e.source), m.get_node(e.target))
        if d is not None and d > factor * median:
            out.append(
                LineageDrift(ancestor=e.source, descendant=e.target, distance=d, baseline=median)
            )
    return out


__all__ = [
    "node_distance",
    "DiagnosticPair",
    "DiagnosticReport",
    "diagnostic_regions",
    "LineageDrift",
    "lineage_drift",
]
