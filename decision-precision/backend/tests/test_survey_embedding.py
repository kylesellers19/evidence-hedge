"""Layer 2 Stage A3: embedding machinery (smoke path, PARTIAL coords)."""

from __future__ import annotations

import os

import numpy as np
import pytest

from delib.layer2 import Layer2Map, Placement
from delib.layer2.survey import CorrelationStore, ingest_survey_into_map, load_fixture
from delib.layer2.survey.embedding import (
    apply_partial_coords,
    classical_mds,
    embed_survey,
    largest_component,
    umap_embed,
)


def _pairwise(coords):
    n = coords.shape[0]
    return np.array([[np.linalg.norm(coords[i] - coords[j]) for j in range(n)] for i in range(n)])


def test_classical_mds_reconstructs_euclidean_config():
    pts = np.array([[0.0, 0.0], [1.0, 0.0], [3.0, 0.0], [0.0, 4.0]])
    D = _pairwise(pts)
    coords, variance = classical_mds(D, k=2)
    # distances are recovered up to rotation/reflection
    assert np.allclose(_pairwise(coords), D, atol=1e-6)
    assert len(variance) == 2 and all(v >= 0 for v in variance)


def _fixture_rows():
    store = CorrelationStore()
    load_fixture(store)
    return store.all()


def test_embed_survey_on_largest_component():
    result = embed_survey(_fixture_rows(), k=2, compute_umap=False)
    assert len(result.component) >= 20  # the big cluster, not the isolated pairs
    assert set(result.coords_mds) == set(result.component)
    assert len(result.variance_mds) == 2
    assert all(len(c) == 2 for c in result.coords_mds.values())


def test_embed_survey_10d():
    result = embed_survey(_fixture_rows(), k=10, compute_umap=False)
    assert all(len(c) == 10 for c in result.coords_mds.values())


def test_apply_partial_coords_marks_partial():
    m = Layer2Map()
    store = CorrelationStore()
    load_fixture(store)
    ingest_survey_into_map(m, store.all())  # UNPLACED positions
    result = embed_survey(store.all(), k=2, compute_umap=False)

    updated = apply_partial_coords(m, result)
    assert len(updated) == len(result.component)
    sample = m.get_node(result.component[0])
    assert sample.placement is Placement.PARTIAL
    assert sample.coords_partial is not None and sample.coords_survey is None


@pytest.mark.skipif(
    not os.environ.get("DELIB_RUN_UMAP"),
    reason="UMAP numba JIT is slow (~10s); set DELIB_RUN_UMAP=1 to exercise it",
)
def test_umap_embed_shape():
    # small precomputed distance matrix -> UMAP returns (n, k)
    rng = np.random.default_rng(0)
    x = rng.random((6, 3))
    D = _pairwise(x)
    out = umap_embed(D, k=2)
    assert out.shape == (6, 2)
