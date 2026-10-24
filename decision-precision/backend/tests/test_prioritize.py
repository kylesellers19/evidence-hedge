"""Phase 2d: expansion prioritization."""

from __future__ import annotations

from delib.fixtures.brooklyn import build_brooklyn_master
from delib.prioritize import PriorityWeights, prioritize_expansions


def test_ranks_only_unexpanded_decision_consequence_nodes():
    g = build_brooklyn_master()  # nothing expanded yet
    items = prioritize_expansions(g)
    ids = {i.node_id for i in items}
    assert "seed" not in ids
    assert len(items) == 17  # 3 decisions + 14 consequences


def test_scores_sorted_descending():
    items = prioritize_expansions(build_brooklyn_master())
    scores = [i.score for i in items]
    assert scores == sorted(scores, reverse=True)


def test_expanded_nodes_excluded():
    g = build_brooklyn_master()
    g.get_node("capacity").expanded = True
    ids = {i.node_id for i in prioritize_expansions(g)}
    assert "capacity" not in ids
    assert len(ids) == 16


def test_favoring_tension_promotes_most_tense():
    g = build_brooklyn_master()
    # displacement carries three register clashes plus two tradition tensions
    items = prioritize_expansions(g, PriorityWeights(tension=10, evidence=0, goal_relevance=0))
    assert items[0].node_id == "displacement"


def test_components_are_normalized():
    items = prioritize_expansions(build_brooklyn_master())
    for i in items:
        assert 0.0 <= i.tension <= 1.0
        assert 0.0 <= i.evidence <= 1.0
        assert 0.0 <= i.goal_relevance <= 1.0


def test_weights_change_ranking():
    g = build_brooklyn_master()
    default = [i.node_id for i in prioritize_expansions(g)]
    tension_only = [
        i.node_id for i in prioritize_expansions(g, PriorityWeights(tension=1, evidence=0, goal_relevance=0))
    ]
    # a different weighting yields a different overall ordering
    assert default != tension_only
