"""Phase 2c: dedup stub + tree->DAG merge on apply."""

from __future__ import annotations

from delib.dedup import Deduplicator, StringSimilarityBackend
from delib.generation import Candidate, ExpansionResult, apply_expansion
from delib.graph import DelibGraph
from delib.models.edges import CausalEdge
from delib.models.nodes import SeedNode
from conftest import consequence, decision


def _base_graph() -> DelibGraph:
    g = DelibGraph()
    g.add_node(SeedNode(id="seed", label="s", question_text="q", goal_state_text="g"))
    g.add_node(decision("d1", "Build tower", 1))
    g.add_node(decision("d2", "Build tower", 1))  # a second parent
    g.add_node(consequence("rent_a", "Area rents rise", 2, 0.5))
    return g


# --- backend / matching -----------------------------------------------------


def test_string_similarity_matches_near_identical():
    d = Deduplicator(threshold=0.85)
    g = _base_graph()
    twin = consequence("rent_b", "Area rents rise", 2, 0.5)
    assert d.find_duplicate(g, twin) == "rent_a"


def test_no_match_for_dissimilar():
    d = Deduplicator(threshold=0.85)
    g = _base_graph()
    other = consequence("x", "School funding improves", 2, 0.5)
    assert d.find_duplicate(g, other) is None


def test_never_merges_across_node_types():
    d = Deduplicator(threshold=0.0)  # even at zero threshold, types must differ
    g = _base_graph()
    # a decision labelled like the consequence should NOT match the consequence
    dec = decision("build_like", "Area rents rise", 1)
    assert d.find_duplicate(g, dec) != "rent_a"


def test_ignores_same_id():
    d = Deduplicator(threshold=0.0)
    g = _base_graph()
    same = consequence("rent_a", "Area rents rise", 2, 0.5)
    # its own id is skipped; may match the other similar node or None, never rent_a
    assert d.find_duplicate(g, same) != "rent_a"


# --- merge on apply turns tree into DAG -------------------------------------


def test_apply_merges_duplicate_into_dag():
    g = _base_graph()
    d = Deduplicator(threshold=0.85)
    # d2 expands and produces a consequence that duplicates rent_a
    result = ExpansionResult(
        parent_id="d2",
        candidates=[
            Candidate(
                node=consequence("rent_dup", "Area rents rise", 2, 0.5),
                edge=CausalEdge(source="d2", target="rent_dup", mechanism_text="m"),
            )
        ],
    )
    added = apply_expansion(g, result, deduplicator=d)
    # no twin added; edge rewired to the existing rent_a
    assert added == []
    assert "rent_dup" not in g
    # rent_a now has two parents (d1 already had it? no — build a fresh edge here)
    preds = list(g.raw().predecessors("rent_a"))
    assert "d2" in preds


def test_apply_without_dedup_adds_twin():
    g = _base_graph()
    result = ExpansionResult(
        parent_id="d2",
        candidates=[
            Candidate(
                node=consequence("rent_dup", "Area rents rise", 2, 0.5),
                edge=CausalEdge(source="d2", target="rent_dup", mechanism_text="m"),
            )
        ],
    )
    added = apply_expansion(g, result)  # no deduplicator
    assert added == ["rent_dup"]
    assert "rent_dup" in g
