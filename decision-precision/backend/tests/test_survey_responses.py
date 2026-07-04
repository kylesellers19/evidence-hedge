"""Layer 2 Stage A6: response-data correlation computation (tier 3)."""

from __future__ import annotations

from delib.layer2.survey import CorrelationStore, SourceTier, load_fixture
from delib.layer2.survey.responses import (
    compute_correlation_matrix,
    load_response_correlations,
)


def _responses():
    # X in {-2..2}; Y == X (perfect +), Z == -X (perfect -), W cov 0 with X.
    xs = [-2, -1, 0, 1, 2]
    ws = [1, -1, 0, -1, 1]  # sum(X*W) == 0 and nonzero variance
    return [{"X": x, "Y": x, "Z": -x, "W": w} for x, w in zip(xs, ws)]


def _by_pair(cors):
    return {tuple(sorted((c.var_a, c.var_b))): c for c in cors}


def test_known_correlations_are_reproduced():
    cors = _by_pair(compute_correlation_matrix(_responses()))
    assert abs(cors[("X", "Y")].r - 1.0) < 1e-9
    assert abs(cors[("X", "Z")].r + 1.0) < 1e-9
    assert abs(cors[("W", "X")].r) < 1e-9  # cov 0 -> r 0


def test_pairwise_exclusion_reduces_n():
    responses = _responses()
    responses.append({"X": 2, "Y": None, "Z": -2, "W": 0})  # excluded from any Y pair
    cors = _by_pair(compute_correlation_matrix(responses))
    assert cors[("X", "Z")].n == 6  # both answered by all 6
    assert cors[("X", "Y")].n == 5  # the None-Y respondent dropped for this pair


def test_zero_variance_pair_skipped():
    responses = [{"A": 1, "B": 3} for _ in range(4)]  # both constant
    assert compute_correlation_matrix(responses) == []


def test_response_data_overrides_all_tiers():
    store = CorrelationStore()
    load_fixture(store)  # PUBLISHED_TABLE
    before = store.get("God: theism", "Mind: physicalism")
    assert before.source_tier is SourceTier.PUBLISHED_TABLE

    # authoritative response data for the same pair
    responses = [
        {"God: theism": 2, "Mind: physicalism": -2},
        {"God: theism": -2, "Mind: physicalism": 2},
        {"God: theism": 1, "Mind: physicalism": -1},
        {"God: theism": -1, "Mind: physicalism": 1},
    ]
    load_response_correlations(store, responses)
    after = store.get("God: theism", "Mind: physicalism")
    assert after.source_tier is SourceTier.RESPONSE_DATA
    assert abs(after.r + 1.0) < 1e-9  # perfectly anti-correlated in the synthetic data
