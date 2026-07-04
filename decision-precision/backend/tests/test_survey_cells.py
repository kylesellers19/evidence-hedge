"""Layer 2 A5 reconciliation: contingency cells + p_value + phi estimator."""

from __future__ import annotations

from delib.layer2.survey import (
    Cells,
    CorrelationStore,
    SourceTier,
    load_fixture,
    phi_from_cells,
)


def test_phi_from_symmetric_cells():
    # aa=rr=40, ar=ra=10 -> phi = (40-10)/(40+10) = 0.6
    assert abs(phi_from_cells(Cells(aa=40, ar=10, ra=10, rr=40)) - 0.6) < 1e-12


def test_phi_is_transpose_invariant():
    c = Cells(aa=50, ar=8, ra=20, rr=42)
    assert abs(phi_from_cells(c) - phi_from_cells(c.transposed())) < 1e-12


def test_published_table_rows_have_null_cells():
    store = CorrelationStore()
    load_fixture(store)
    row = store.get("God: theism", "Mind: physicalism")
    assert row.cells is None and row.p_value is None


def test_site_row_carries_cells_and_pvalue_transposed_on_swap():
    store = CorrelationStore()
    # add in NON-canonical order (z > a): cells given as (a=z-opt, b=a-opt)
    store.add(
        "Z opt", "A opt", 0.5, 100, SourceTier.SITE_SCRAPE,
        cells=Cells(aa=40, ar=5, ra=10, rr=45), p_value=0.0001,
    )
    row = store.get("A opt", "Z opt")
    assert row.option_a_id == "a-opt"  # canonical order
    # ar/ra transposed to match the swapped orientation; aa/rr unchanged
    assert row.cells.aa == 40 and row.cells.rr == 45
    assert row.cells.ar == 10 and row.cells.ra == 5
    assert row.p_value == 0.0001


def test_phi_of_stored_cells_matches_r():
    store = CorrelationStore()
    store.add(
        "X view", "Y view", 0.6, 100, SourceTier.SITE_SCRAPE,
        cells=Cells(aa=40, ar=10, ra=10, rr=40),
    )
    row = store.get("X view", "Y view")
    assert abs(phi_from_cells(row.cells) - row.r) < 0.02
