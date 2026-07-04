"""Layer 2 Stage A3: embedding machinery (smoke path, PARTIAL coords)."""

from __future__ import annotations

import os

import numpy as np
import pytest

from delib.layer2 import Layer2Map, Placement
from delib.layer2.survey import CorrelationStore, ingest_survey_into_map, load_fixture
from delib.layer2.survey.embedding import (
    apply_coords,
    apply_partial_coords,
    classical_mds,
    embed_survey,
    largest_component,
    signed_pca,
    umap_embed,
)
from delib.layer2.survey.store import CorrelationRow


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


def _signed_row(a, b, r):
    from delib.layer2.survey import SourceTier
    return CorrelationRow(option_a_id=a, option_b_id=b, label_a=a, label_b=b,
                          r=r, n=100, source_tier=SourceTier.SITE_SCRAPE, retrieved_at=0.0)


def test_signed_pca_pc1_is_bipolar():
    # two clusters, within-cluster r=+0.8, cross-cluster r=-0.8 -> PC1 splits them
    A, B = ["a1", "a2", "a3"], ["b1", "b2", "b3"]
    rows = []
    for grp in (A, B):
        for i in range(len(grp)):
            for j in range(i + 1, len(grp)):
                rows.append(_signed_row(grp[i], grp[j], 0.8))
    for a in A:
        for b in B:
            rows.append(_signed_row(a, b, -0.8))
    res = signed_pca(rows, A + B, k=2)
    pc1 = res.components[0]
    signs = [pc1[i] > 0 for i in range(6)]
    # cluster A shares one sign, cluster B the opposite (bipolar separation)
    assert len(set(signs[:3])) == 1 and len(set(signs[3:])) == 1
    assert signs[0] != signs[3]
    assert res.variance[0] > res.variance[1] > 0


def test_apply_coords_survey_placement():
    m = Layer2Map()
    store = CorrelationStore()
    load_fixture(store)
    ingest_survey_into_map(m, store.all())
    result = embed_survey(store.all(), k=2, compute_umap=False)
    updated = apply_coords(m, result, placement=Placement.SURVEY)
    sample = m.get_node(updated[0])
    assert sample.placement is Placement.SURVEY
    assert sample.coords_survey is not None and sample.coords_partial is None


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
