"""Layer 2 Stage A4: the validation harness — the map audits itself against the
paper's published numbers. The suite documents what we CANNOT yet verify rather
than pretending."""

from __future__ import annotations

import json
import math

import pytest

from delib.layer2 import Layer2Map
from delib.layer2.registry_link import link_traditions
from delib.layer2.survey import (
    DEFAULT_FIXTURE,
    CorrelationStore,
    REGISTRY_LEAF_BY_OPTION,
    ingest_survey_into_map,
    load_fixture,
    route_sign,
    slugify,
    sqrt_distance,
)
REGISTRY_LEAVES = ("kantian_deontological", "virtue_ethical", "utilitarian_aggregate", "libertarian_nozickian")


def test_distance_reproduces_sqrt_1_minus_abs_r_for_every_pair():
    store = CorrelationStore()
    load_fixture(store)
    for row in store.all():
        assert abs(sqrt_distance(row.r) - math.sqrt(1 - abs(row.r))) < 1e-12


def test_sign_routing_counts_are_45_and_82():
    store = CorrelationStore()
    load_fixture(store)
    opposition, cobelief = route_sign(store.all())
    assert len(opposition) == 45 and len(cobelief) == 82


def test_pca_targets_pending_response_data():
    """The paper's PCA (101 variables, PC1 12.3%, PC2 8.8%) is recorded as the
    EXPECTED target but cannot be reproduced from the published-table fixture —
    it needs the RESPONSE_DATA tier. This test documents the gap, not a pass."""
    targets = json.loads(DEFAULT_FIXTURE.read_text())["meta"]["methodology_to_replicate"]["pca_targets"]
    assert targets["n_variables"] == 101
    assert targets["pc1_variance_pct"] == 12.3
    assert targets["pc2_variance_pct"] == 8.8
    pytest.skip(
        "PCA replication (101 vars; PC1 12.3%, PC2 8.8%) requires response-level "
        "data (RESPONSE_DATA tier). The fixture is published-table only — see A6."
    )


def _linked_map() -> tuple[Layer2Map, dict]:
    m = Layer2Map()
    link_traditions(m)  # 4 UNPLACED TRADITION leaves (canonical vocabulary)
    store = CorrelationStore()
    data = load_fixture(store)
    ingest_survey_into_map(m, store.all(), tradition_map=REGISTRY_LEAF_BY_OPTION)
    return m, data


def test_registry_relevant_edges_all_present():
    m, data = _linked_map()
    for edge in data["registry_relevant_edges"]["edges"]:
        a, b = slugify(edge["pair"][0]), slugify(edge["pair"][1])
        assert m.edges_between(a, b), f"missing empirical edge {a} <-> {b}"


def test_registry_positions_nested_under_correct_tradition_leaf():
    m, _ = _linked_map()
    expected = {
        "normative-ethics-deontology": "kantian_deontological",
        "practical-reason-kantian": "kantian_deontological",
        "normative-ethics-virtue-ethics": "virtue_ethical",
        "practical-reason-aristotelian": "virtue_ethical",
        "normative-ethics-consequentialism": "utilitarian_aggregate",
        "political-philosophy-libertarianism": "libertarian_nozickian",
    }
    for option_id, leaf in expected.items():
        assert m.get_node(option_id).parent_id == leaf
    # all four leaves are present as TRADITION grain
    for leaf in REGISTRY_LEAVES:
        assert m.get_node(leaf).grain.value == "TRADITION"
