"""Phase 3: radial-concentric layout."""

from __future__ import annotations

import math

from delib.fixtures.brooklyn import build_brooklyn_master
from delib.layout import radial_layout


def test_every_node_positioned():
    g = build_brooklyn_master()
    pos = radial_layout(g)
    assert set(pos) == {n.id for n in g.nodes()}
    assert len(pos) == 18


def test_seed_at_origin():
    pos = radial_layout(build_brooklyn_master())
    seed = pos["seed"]
    assert seed.ring == 0
    assert abs(seed.x) < 1e-9 and abs(seed.y) < 1e-9


def test_radius_grows_with_ring():
    pos = radial_layout(build_brooklyn_master(), ring_spacing=240.0)
    for p in pos.values():
        assert abs(p.radius - p.ring * 240.0) < 1e-9
        # distance from origin matches radius
        assert abs(math.hypot(p.x, p.y) - p.radius) < 1e-6


def test_angles_in_range():
    pos = radial_layout(build_brooklyn_master())
    for p in pos.values():
        assert 0.0 <= p.angle < 2 * math.pi + 1e-9


def test_same_ring_nodes_distinct_angles():
    pos = radial_layout(build_brooklyn_master())
    ring2 = sorted(p.angle for p in pos.values() if p.ring == 2)
    # no two ring-2 nodes collapse to the same angle
    assert all(b - a > 1e-6 for a, b in zip(ring2, ring2[1:]))


def test_ring_spacing_scales():
    g = build_brooklyn_master()
    tight = radial_layout(g, ring_spacing=100.0)
    wide = radial_layout(g, ring_spacing=300.0)
    assert wide["capacity"].radius == 3 * tight["capacity"].radius
