"""Tests for graph queries against the small_graph fixture."""

from __future__ import annotations

from delib.models.enums import EvidenceGrade, LoopClass
from delib.queries import (
    burden_index,
    burden_indices,
    divergence_points,
    loop_inventory,
    path_confidence,
    resolution_subgraph,
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


# --- divergence_points ------------------------------------------------------


def test_divergence_across_frameworks(small_graph):
    report = divergence_points(small_graph)
    fw = [d for d in report.across_frameworks if d.node_id == "displacement"]
    assert len(fw) == 1
    d = fw[0]
    assert d.fixed_id == "incumbents"
    assert d.signs == {"prioritarian": -2, "aggregate_utilitarian": 0}


def test_no_spurious_stakeholder_divergence(small_graph):
    # displacement has only one stakeholder (incumbents), so no cross-stakeholder
    # divergence should be reported.
    report = divergence_points(small_graph)
    assert all(d.node_id != "displacement" for d in report.across_stakeholders)


# --- resolution_subgraph ----------------------------------------------------


def test_resolution_subgraph_only_seed_to_closure(small_graph):
    res = resolution_subgraph(small_graph)
    # seed->build->capacity->(closure) is the only resolution path.
    assert set(res.node_ids) == {"seed", "build", "capacity"}
    assert len(res.closure_edges) == 1
    assert res.closure_edges[0].source == "capacity"
    # displacement / desirability / rent are NOT on a seed->closure path.
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


# --- burden_index -----------------------------------------------------------


def test_burden_index_weights_by_path_confidence(small_graph):
    # incumbents have one negative valence: displacement, prioritarian, -2.
    # path_confidence(seed->displacement) weakest = CONTESTED (ordinal 1),
    # weight = 1/5 = 0.2; contribution = |−2| * 0.2 = 0.4
    b = burden_index(small_graph, "incumbents")
    assert abs(b - 0.4) < 1e-9


def test_burden_index_zero_for_unburdened(small_graph):
    assert burden_index(small_graph, "newcomers") == 0.0


def test_burden_indices_covers_registry(small_graph):
    idx = burden_indices(small_graph)
    assert set(idx) == {"incumbents", "newcomers"}
