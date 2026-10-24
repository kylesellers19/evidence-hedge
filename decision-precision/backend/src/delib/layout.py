"""Radial-concentric layout (Phase 3, server-side).

Per principle 4 (layout decoupled from rendering), positions are computed here
and the renderer consumes them. The seed sits at the origin; radius grows with
ring (causal distance); a node's angle is the midpoint of an angular slice whose
width is proportional to its subtree's leaf count, so siblings spread and
subtrees stay locally clustered.

The output is renderer-agnostic (`{id, x, y, ring, angle, radius}`), so swapping
React Flow for a WebGL renderer later needs no change here.
"""

from __future__ import annotations

import math

from pydantic import BaseModel

from .graph import DelibGraph

TAU = 2 * math.pi


class NodePosition(BaseModel):
    id: str
    x: float
    y: float
    ring: int
    angle: float  # radians, [0, 2π)
    radius: float


def radial_layout(
    g: DelibGraph,
    ring_spacing: float = 240.0,
    start_angle: float = 0.0,
) -> dict[str, NodePosition]:
    """Position every node radially. Angular placement follows the framing+causal
    spine (a BFS tree from the seed); radius follows each node's stored ring."""
    seed = g.seed_id
    structural = g.structural_digraph()
    positions: dict[str, NodePosition] = {}

    if seed is None or seed not in structural:
        return _fallback_only(g, ring_spacing, start_angle)

    # BFS tree from the seed over the framing+causal spine.
    children: dict[str, list[str]] = {n: [] for n in structural.nodes}
    visited: set[str] = {seed}
    queue: list[str] = [seed]
    while queue:
        u = queue.pop(0)
        for v in structural.successors(u):
            if v not in visited:
                visited.add(v)
                children[u].append(v)
                queue.append(v)

    # Leaf-count weighting (memoized), so wide subtrees get wide angular slices.
    leaves: dict[str, int] = {}

    def leaf_count(n: str) -> int:
        if n in leaves:
            return leaves[n]
        c = 1 if not children[n] else sum(leaf_count(k) for k in children[n])
        leaves[n] = c
        return c

    def place(n: str, a0: float, a1: float) -> None:
        angle = (a0 + a1) / 2.0
        ring = g.get_node(n).ring
        radius = ring * ring_spacing
        positions[n] = NodePosition(
            id=n,
            x=radius * math.cos(angle),
            y=radius * math.sin(angle),
            ring=ring,
            angle=angle % TAU,
            radius=radius,
        )
        kids = children[n]
        if not kids:
            return
        total = sum(leaf_count(k) for k in kids)
        cursor = a0
        for k in kids:
            span = (a1 - a0) * (leaf_count(k) / total)
            place(k, cursor, cursor + span)
            cursor += span

    place(seed, start_angle, start_angle + TAU)

    # Any node not reachable from the seed via the spine (shouldn't happen in a
    # well-formed graph): spread evenly within its ring so nothing is lost.
    _place_orphans(g, positions, ring_spacing, start_angle)
    return positions


def _place_orphans(
    g: DelibGraph,
    positions: dict[str, NodePosition],
    ring_spacing: float,
    start_angle: float,
) -> None:
    by_ring: dict[int, list[str]] = {}
    for node in g.nodes():
        if node.id not in positions:
            by_ring.setdefault(node.ring, []).append(node.id)
    for ring, ids in by_ring.items():
        for i, nid in enumerate(sorted(ids)):
            angle = (start_angle + TAU * i / len(ids)) % TAU
            radius = ring * ring_spacing
            positions[nid] = NodePosition(
                id=nid,
                x=radius * math.cos(angle),
                y=radius * math.sin(angle),
                ring=ring,
                angle=angle,
                radius=radius,
            )


def _fallback_only(
    g: DelibGraph, ring_spacing: float, start_angle: float
) -> dict[str, NodePosition]:
    positions: dict[str, NodePosition] = {}
    _place_orphans(g, positions, ring_spacing, start_angle)
    return positions


__all__ = ["NodePosition", "radial_layout"]
