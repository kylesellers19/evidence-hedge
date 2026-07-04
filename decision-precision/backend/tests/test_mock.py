"""Phase 2b: the Brooklyn fixture + mock expansion, validated end-to-end
through the Phase-1 queries."""

from __future__ import annotations

from delib.fixtures.brooklyn import build_brooklyn_master
from delib.generation import apply_expansion
from delib.mock import MockGenerator, grow_full
from delib.models.enums import ClosureSatisfaction, LoopClass, NodeType
from delib.models.enums import Register
from delib.queries import (
    burden_index,
    loop_inventory,
    path_confidence,
    register_clash_points,
    resolution_subgraph,
    tradition_tension_points,
)


# --- the authored master builds and is well-formed --------------------------


def test_master_builds_with_18_nodes():
    g = build_brooklyn_master()
    assert len(g) == 18
    assert g.seed_id == "seed"
    rings = {r: 0 for r in (0, 1, 2, 3)}
    for n in g.nodes():
        rings[n.ring] += 1
    assert rings == {0: 1, 1: 3, 2: 7, 3: 7}  # seed + 3 rings


def test_master_has_reinforcing_loop():
    loops = loop_inventory(build_brooklyn_master())
    assert len(loops) == 1
    loop = loops[0]
    assert set(loop.nodes) == {"build", "desirability", "rent"}
    assert loop.loop_class is LoopClass.REINFORCING


def test_master_register_clash_on_displacement():
    clashes = register_clash_points(build_brooklyn_master())
    disp = {frozenset({c.register_a, c.register_b}) for c in clashes if c.node_id == "displacement"}
    # displacement engages MARKET + CIVIC + DOMESTIC: three clashing pairs
    assert frozenset({Register.MARKET, Register.CIVIC}) in disp
    assert frozenset({Register.MARKET, Register.DOMESTIC}) in disp


def test_master_tradition_tension_rent_displacement():
    tensions = tradition_tension_points(build_brooklyn_master())
    edge = [t for t in tensions if t.source == "rent" and t.target == "displacement"]
    assert len(edge) == 1
    assert edge[0].tradition_a == "utilitarian_aggregate"
    assert edge[0].tradition_b == "kantian_deontological"


def test_master_compromise_pairs_suppressed():
    # construction_jobs engages MARKET + INDUSTRIAL (a compromise) -> no clash
    clashes = register_clash_points(build_brooklyn_master())
    assert all(c.node_id != "construction_jobs" for c in clashes)


def test_master_partial_closure():
    g = build_brooklyn_master()
    closures = list(g.edges())
    partials = [
        e for e in closures
        if getattr(e, "satisfies", None) is ClosureSatisfaction.PARTIAL
    ]
    assert len(partials) == 1
    assert partials[0].source == "capacity" and partials[0].target == "seed"


def test_master_path_confidence_weakest_link():
    g = build_brooklyn_master()
    # seed -(frames)-> build -> desirability -> rent -> displacement
    pc = path_confidence(g, "seed", "displacement")
    assert pc is not None
    assert pc.weakest_grade.value == "CONTESTED"  # weakest causal link on route


# --- growing via the generator reconstructs the master ----------------------


def test_grow_full_reconstructs_master():
    live = grow_full()
    master = build_brooklyn_master()
    assert len(live) == len(master) == 18
    # same reinforcing loop and register clash appear in the grown graph
    assert loop_inventory(live)[0].loop_class is LoopClass.REINFORCING
    assert any(c.node_id == "displacement" for c in register_clash_points(live))
    # closure survived the grow
    assert len(resolution_subgraph(live).closure_edges) == 1


def test_progressive_disclosure_seed_then_ring1():
    gen = MockGenerator()
    master = gen.master()
    # start with seed only
    from delib.graph import DelibGraph

    live = DelibGraph(stakeholders=master.stakeholders)
    live.add_node(master.get_node("seed").model_copy(deep=True))
    assert len(live) == 1

    # expand seed -> ring 1 only (3 decisions)
    added = apply_expansion(live, gen.expand(live, "seed"))
    assert set(added) == {"build", "affordability_mandate", "zoning_variance"}
    assert live.get_node("seed").__class__.__name__ == "SeedNode"
    # ring-2 nodes are NOT yet present
    assert "capacity" not in live


def test_expand_unknown_node_returns_empty():
    gen = MockGenerator()
    res = gen.expand(gen.master(), "nonexistent")
    assert res.candidates == []


def test_master_coding_status_mix():
    g = build_brooklyn_master()
    statuses = {n.id: n.coding_status.value for n in g.nodes() if hasattr(n, "coding_status")}
    assert statuses["displacement"] == "HUMAN_VERIFIED"
    assert statuses["social_fabric"] == "PENDING"


def test_burden_falls_on_incumbents_not_developer():
    g = build_brooklyn_master()
    # incumbents bear displacement/rent/disruption/social_fabric; developer bears none
    assert burden_index(g, "incumbents") > burden_index(g, "small_businesses") > 0
    assert burden_index(g, "developer") == 0.0
