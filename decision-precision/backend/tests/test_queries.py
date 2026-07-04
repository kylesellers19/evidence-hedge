"""Tests for graph queries against the small_graph fixture."""

from __future__ import annotations

from delib.models.enums import EvidenceGrade, LoopClass, Register
from delib.queries import (
    burden_index,
    burden_indices,
    loop_inventory,
    path_confidence,
    register_clash_points,
    resolution_subgraph,
    tradition_tension_points,
)

# small_graph causal edges & grades:
#   seed->build SUPPORTED(5), build->desirability SUPPORTED(5),
#   desirability->rent WEAK(4), rent->build ANALOGICAL(3),
#   rent->displacement CONTESTED(1), build->capacity SUPPORTED(5)
# ordinals: SUPPORTED=5 WEAK=4 ANALOGICAL=3 CONTESTED=1


# --- path_confidence --------------------------------------------------------


def test_path_confidence_weakest_link(small_graph):
    pc = path_confidence(small_graph, "seed", "capacity")
    assert pc is not None
    assert pc.path == ["seed", "build", "capacity"]
    assert pc.weakest_grade is EvidenceGrade.SUPPORTED  # both links SUPPORTED
    assert pc.ordinal == 5


def test_path_confidence_takes_weakest_along_route(small_graph):
    pc = path_confidence(small_graph, "seed", "displacement")
    # seed->build->desirability->rent->displacement: weakest = CONTESTED (1)
    assert pc is not None
    assert pc.weakest_grade is EvidenceGrade.CONTESTED
    assert pc.ordinal == 1


def test_path_confidence_none_when_unreachable(small_graph):
    assert path_confidence(small_graph, "capacity", "seed") is None


# --- register clashes + tradition tensions ----------------------------------


def test_register_clash_within_node(small_graph):
    clashes = register_clash_points(small_graph)
    disp = [c for c in clashes if c.node_id == "displacement"]
    assert len(disp) == 1
    assert {disp[0].register_a, disp[0].register_b} == {Register.MARKET, Register.CIVIC}


def test_tradition_tension_across_edge(small_graph):
    tensions = tradition_tension_points(small_graph)
    # rent (utilitarian_aggregate) -> displacement (kantian_deontological)
    edge = [t for t in tensions if t.source == "rent" and t.target == "displacement"]
    assert len(edge) == 1
    assert edge[0].tradition_a == "utilitarian_aggregate"
    assert edge[0].tradition_b == "kantian_deontological"
    assert "constraint" in edge[0].about.lower() or "override" in edge[0].about.lower()


# --- resolution_subgraph ----------------------------------------------------


def test_resolution_subgraph_only_seed_to_closure(small_graph):
    res = resolution_subgraph(small_graph)
    # seed-(frames)->build-(causal)->capacity->(closure) is the only route.
    assert set(res.node_ids) == {"seed", "build", "capacity"}
    assert len(res.closure_edges) == 1
    assert res.closure_edges[0].source == "capacity"
    # the framing root and the one causal edge are both included.
    assert [(e.source, e.target) for e in res.frames_edges] == [("seed", "build")]
    assert [(e.source, e.target) for e in res.causal_edges] == [("build", "capacity")]
    # displacement / desirability / rent are NOT on a seed->closure route.
    assert "displacement" not in res.node_ids
    assert "rent" not in res.node_ids


# --- loop_inventory ---------------------------------------------------------


def test_loop_inventory_finds_reinforcing_loop(small_graph):
    loops = loop_inventory(small_graph)
    assert len(loops) == 1
    loop = loops[0]
    assert set(loop.nodes) == {"build", "desirability", "rent"}
    assert loop.loop_class is LoopClass.REINFORCING
    assert loop.polarity_product == 1


def test_loop_undetermined_when_polarity_uncoded(small_graph):
    # Zero out one edge polarity -> loop becomes UNDETERMINED.
    small_graph.raw()["desirability"]["rent"]["CAUSAL"]["data"].polarity = 0
    loops = loop_inventory(small_graph)
    assert loops[0].loop_class is LoopClass.UNDETERMINED


def test_no_tension_where_absent(small_graph):
    # desirability carries no registers/traditions -> no clash, no tension
    clashes = register_clash_points(small_graph)
    tensions = tradition_tension_points(small_graph)
    assert all(c.node_id != "desirability" for c in clashes)
    assert all(t.source != "desirability" and t.target != "desirability" for t in tensions)


# --- burden over distributional effects -------------------------------------


def test_burden_weights_negative_effect_by_path_confidence(small_graph):
    # displacement harms incumbents (DISPLACEMENT -1); seed->displacement weakest
    # is CONTESTED (ordinal 1), weight 1/5 = 0.2; one negative effect -> 0.2
    assert abs(burden_index(small_graph, "incumbents") - 0.2) < 1e-9


def test_burden_zero_for_unaffected(small_graph):
    # newcomers only receive a POSITIVE effect (capacity ACCESS +1) -> no burden
    assert burden_index(small_graph, "newcomers") == 0.0


def test_burden_indices_covers_registry(small_graph):
    assert set(burden_indices(small_graph)) == {"incumbents", "newcomers"}
