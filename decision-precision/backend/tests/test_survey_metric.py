"""Layer 2 Stage A2: distance transform + sign routing."""

from __future__ import annotations

import math

from delib.layer2 import Layer2Map, Layer2EdgeType
from delib.layer2.survey import (
    CorrelationStore,
    SourceTier,
    ingest_survey_into_map,
    linear_distance,
    load_fixture,
    route_sign,
    sqrt_distance,
)


# --- distance transform -----------------------------------------------------


def test_sqrt_distance_uses_abs_r():
    assert abs(sqrt_distance(0.72) - math.sqrt(1 - 0.72)) < 1e-12
    # sign is irrelevant to the metric (|r|)
    assert sqrt_distance(-0.70) == sqrt_distance(0.70)


def test_linear_distance_is_paper_plain_metric():
    assert abs(linear_distance(-0.5) - 0.5) < 1e-12


# --- sign routing -----------------------------------------------------------


def _fixture_rows():
    store = CorrelationStore()
    load_fixture(store)
    return store.all()


def test_sign_routing_counts_match_fixture():
    opposition, cobelief = route_sign(_fixture_rows())
    assert len(opposition) == 45
    assert len(cobelief) == 82


def test_opposition_edges_are_typed_and_provenanced():
    opposition, cobelief = route_sign(_fixture_rows())
    assert all(e.r <= -0.35 for e in opposition)
    assert all(e.type is Layer2EdgeType.EMPIRICAL_OPPOSITION for e in opposition)
    assert all(e.provenance.value == "philsurvey2020" for e in opposition)
    assert all(e.tier is SourceTier.PUBLISHED_TABLE for e in opposition)
    assert all(e.r >= 0.35 for e in cobelief)


# --- ingest into map --------------------------------------------------------


def test_ingest_creates_positions_and_edges():
    m = Layer2Map()
    store = CorrelationStore()
    store.add("A view", "B view", -0.5, 100, SourceTier.PUBLISHED_TABLE)
    store.add("A view", "C view", 0.6, 200, SourceTier.PUBLISHED_TABLE)
    added_nodes, added_edges = ingest_survey_into_map(m, store.all())

    assert set(added_nodes) == {"a-view", "b-view", "c-view"}
    assert m.get_node("a-view").grain.value == "POSITION"
    assert m.get_node("a-view").placement.value == "UNPLACED"
    types = {e.type for e in added_edges}
    assert types == {Layer2EdgeType.EMPIRICAL_OPPOSITION, Layer2EdgeType.EMPIRICAL_COBELIEF}
