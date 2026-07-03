"""Insert-time constraint tests for DelibGraph."""

from __future__ import annotations

import pytest

from delib.graph import DelibGraph, GraphConstraintError
from delib.models.edges import CausalEdge, ClosureEdge, DeliberativeEdge, FramesEdge
from delib.models.enums import ClosureSatisfaction
from delib.models.nodes import SeedNode
from conftest import consequence, decision, val


def _seed(g: DelibGraph) -> None:
    g.add_node(
        SeedNode(
            id="seed",
            label="s",
            question_text="q",
            goal_state_text="g",
        )
    )


# --- Node inserts -----------------------------------------------------------


def test_duplicate_node_id_raises():
    g = DelibGraph()
    _seed(g)
    g.add_node(decision("d1", "x", 1))
    with pytest.raises(GraphConstraintError):
        g.add_node(decision("d1", "y", 1))


def test_second_seed_raises():
    g = DelibGraph()
    _seed(g)
    with pytest.raises(GraphConstraintError):
        g.add_node(SeedNode(id="seed2", label="s", question_text="q", goal_state_text="g"))
    assert g.seed_id == "seed"


# --- Deliberative edges -----------------------------------------------------


def test_deliberative_decision_to_decision_ok():
    g = DelibGraph()
    _seed(g)
    g.add_node(decision("d1", "x", 1))
    g.add_node(decision("d2", "y", 1))
    g.add_edge(DeliberativeEdge(source="d1", target="d2"))


def test_deliberative_to_consequence_raises():
    g = DelibGraph()
    _seed(g)
    g.add_node(decision("d1", "x", 1))
    g.add_node(consequence("c1", "y", 2, 0.5))
    with pytest.raises(GraphConstraintError):
        g.add_edge(DeliberativeEdge(source="d1", target="c1"))


def test_deliberative_cycle_raises():
    g = DelibGraph()
    _seed(g)
    for i in (1, 2, 3):
        g.add_node(decision(f"d{i}", "x", 1))
    g.add_edge(DeliberativeEdge(source="d1", target="d2"))
    g.add_edge(DeliberativeEdge(source="d2", target="d3"))
    with pytest.raises(GraphConstraintError):
        g.add_edge(DeliberativeEdge(source="d3", target="d1"))


def test_deliberative_self_loop_raises():
    g = DelibGraph()
    _seed(g)
    g.add_node(decision("d1", "x", 1))
    with pytest.raises(GraphConstraintError):
        g.add_edge(DeliberativeEdge(source="d1", target="d1"))


# --- Closure edges ----------------------------------------------------------


def test_closure_consequence_to_seed_ok():
    g = DelibGraph()
    _seed(g)
    g.add_node(consequence("c1", "y", 2, 0.9))
    g.add_edge(
        ClosureEdge(source="c1", target="seed", satisfies=ClosureSatisfaction.FULFILLS,
                    justification="j")
    )


def test_closure_from_decision_raises():
    g = DelibGraph()
    _seed(g)
    g.add_node(decision("d1", "x", 1))
    with pytest.raises(GraphConstraintError):
        g.add_edge(
            ClosureEdge(source="d1", target="seed",
                        satisfies=ClosureSatisfaction.FULFILLS, justification="j")
        )


def test_closure_to_nonseed_raises():
    g = DelibGraph()
    _seed(g)
    g.add_node(consequence("c1", "y", 2, 0.9))
    g.add_node(consequence("c2", "z", 2, 0.9))
    with pytest.raises(GraphConstraintError):
        g.add_edge(
            ClosureEdge(source="c1", target="c2",
                        satisfies=ClosureSatisfaction.FULFILLS, justification="j")
        )


# --- Causal edges -----------------------------------------------------------


def test_causal_into_seed_raises():
    g = DelibGraph()
    _seed(g)
    g.add_node(consequence("c1", "y", 2, 0.9))
    with pytest.raises(GraphConstraintError):
        g.add_edge(CausalEdge(source="c1", target="seed", mechanism_text="m"))


def test_causal_loop_allowed():
    """The causal subgraph MAY cycle."""
    g = DelibGraph()
    _seed(g)
    g.add_node(consequence("c1", "y", 2, 0.5))
    g.add_node(consequence("c2", "z", 2, 0.5))
    g.add_edge(CausalEdge(source="c1", target="c2", mechanism_text="m"))
    g.add_edge(CausalEdge(source="c2", target="c1", mechanism_text="m"))  # no raise


def test_edge_endpoint_missing_raises():
    g = DelibGraph()
    _seed(g)
    g.add_node(consequence("c1", "y", 2, 0.5))
    with pytest.raises(GraphConstraintError):
        g.add_edge(CausalEdge(source="c1", target="ghost", mechanism_text="m"))


# --- Frames edges -----------------------------------------------------------


def test_frames_seed_to_ring1_ok():
    g = DelibGraph()
    _seed(g)
    g.add_node(decision("d1", "x", 1))
    g.add_edge(FramesEdge(source="seed", target="d1"))


def test_frames_from_nonseed_raises():
    g = DelibGraph()
    _seed(g)
    g.add_node(decision("d1", "x", 1))
    g.add_node(decision("d2", "y", 1))
    with pytest.raises(GraphConstraintError):
        g.add_edge(FramesEdge(source="d1", target="d2"))


def test_frames_to_seed_raises():
    g = DelibGraph()
    _seed(g)
    with pytest.raises(GraphConstraintError):
        g.add_edge(FramesEdge(source="seed", target="seed"))


def test_frames_to_nonring1_raises():
    g = DelibGraph()
    _seed(g)
    g.add_node(consequence("c2", "y", 2, 0.5))
    with pytest.raises(GraphConstraintError):
        g.add_edge(FramesEdge(source="seed", target="c2"))


# --- Valence referential integrity -----------------------------------------


def test_valence_unknown_framework_raises(registries):
    sh, fw = registries
    g = DelibGraph(stakeholders=sh, frameworks=fw)
    _seed(g)
    with pytest.raises(GraphConstraintError):
        g.add_node(
            consequence("c1", "y", 2, 0.5, valences=[val("incumbents", "kantian", -1)])
        )


def test_valence_unknown_stakeholder_raises(registries):
    sh, fw = registries
    g = DelibGraph(stakeholders=sh, frameworks=fw)
    _seed(g)
    with pytest.raises(GraphConstraintError):
        g.add_node(
            consequence("c1", "y", 2, 0.5, valences=[val("ghost", "prioritarian", -1)])
        )


def test_valence_refs_ok_when_registered(registries):
    sh, fw = registries
    g = DelibGraph(stakeholders=sh, frameworks=fw)
    _seed(g)
    g.add_node(
        consequence("c1", "y", 2, 0.5, valences=[val("incumbents", "prioritarian", -1)])
    )


def test_small_graph_builds(small_graph):
    assert small_graph.seed_id == "seed"
    assert len(small_graph) == 6
