"""Layer 2 A5 — parser reconciled to REAL captured markup (offline fixtures).

Validation of the contingency-cell mapping is by sign + cell-sum==n + a realistic
band (the displayed 2x2 is Accept/Reject-binarized, so phi attenuates the
published 5-point Pearson r; they agree in sign, not to 0.01)."""

from __future__ import annotations

from pathlib import Path

import pytest

from delib.layer2.cache import SparqlCache
from delib.layer2.survey import CorrelationStore, SourceTier, load_fixture, phi_from_cells
from delib.layer2.survey.scrape import (
    CATEGORY_LABELS,
    ChallengeError,
    PhilPeopleScraper,
    ScrapeConfig,
    build_correlation_url,
    derive_philosophers,
    ingest_page,
    is_challenge,
    parse_correlations,
    parse_variable_inventory,
)

CAP = Path(__file__).resolve().parents[2] / "data" / "fixtures" / "site_captures"


def _cap(name: str) -> str:
    return (CAP / name).read_text(encoding="utf-8")


def _physicalism():
    return parse_correlations(_cap("question_mind_physicalism.html"), "Mind: physicalism")


# --- real structure + known values ------------------------------------------


def test_physicalism_page_row_count_and_known_values():
    rows = _physicalism()
    assert len(rows) == 143
    by = {r.label_b: r for r in rows}
    dual = by["Consciousness: dualism"]
    assert dual.r == -0.69 and dual.n == 838  # n derived from cell-sum
    assert by["Metaphilosophy: naturalism"].r == 0.62 and by["Metaphilosophy: naturalism"].n == 1231
    assert by["God: theism"].r == -0.52 and by["God: theism"].n == 1477


def test_n_equals_cell_sum_for_every_row():
    for r in _physicalism():
        assert r.cells is not None
        assert r.n == r.cells.aa + r.cells.ar + r.cells.ra + r.cells.rr


def test_cell_mapping_validated_by_sign_and_band():
    """Approved check: sign(phi)==sign(r) for ALL blocks; |phi-r| within a
    realistic attenuation band. A wrong aa/ar/ra/rr mapping would break sign."""
    rows = _physicalism()
    diffs = []
    for r in rows:
        phi = phi_from_cells(r.cells)
        if abs(r.r) > 0.01:
            assert (phi < 0) == (r.r < 0), f"sign flip on {r.label_b}: phi={phi} r={r.r}"
        diffs.append(abs(phi - r.r))
    diffs.sort()
    median = diffs[len(diffs) // 2]
    assert median < 0.05  # observed ~0.025
    assert max(diffs) < 0.15  # observed ~0.10


# --- orientation: both endpoints read from the block (self-pair regression) --


def _block(row, col, r, aa, ar, ra, rr):
    return f"""<table class="table"><thead>
      <tr class="meta-heading"><th class="rcell"><div> r: {r} </div></th>
      <th class="collabel"><span class="colname"><a href="/x?category=Q&amp;variable={col} "> {col} </a></span></th></tr>
      <tr><td class="rowlabel rowname">{row}</td><th>Accept</th><th>Reject</th></tr></thead>
      <tbody><tr><th>Accept</th><td>{aa}</td><td>{ar}</td></tr><tr><th>Reject</th><td>{ra}</td><td>{rr}</td></tr></tbody></table>"""


def test_page_variable_as_column_does_not_self_pair():
    # the exact RC case: the page variable is the COLUMN, another variable the ROW
    rc = "Semantic content: radical contextualism (most or all)"
    rows = parse_correlations(
        _block("True contradictions: impossible", rc, -0.24, 100, 200, 300, 400),
        page_variable=rc,
    )
    assert len(rows) == 1
    r = rows[0]
    assert r.label_a == "True contradictions: impossible" and r.label_b == rc
    assert r.label_a != r.label_b  # NOT a self-pair (the bug that caused 20 "inconsistencies")
    assert (r.cells.aa, r.cells.ar, r.cells.ra, r.cells.rr) == (100, 200, 300, 400)
    assert r.n == 1000


# --- enumeration ------------------------------------------------------------


def test_inventory_drops_the_9_category_labels():
    inv = parse_variable_inventory(_cap("correlations_index.html"))
    assert len(inv) == 237  # 246 dropdown items minus 9 category labels
    assert "Mind: physicalism" in inv and "Consciousness: dualism" in inv
    assert not (set(inv) & CATEGORY_LABELS)


def test_category_labels_never_appear_as_variables():
    # the paired-variable cross-check that validates the filter
    rows = _physicalism() + parse_correlations(_cap("philosopher_kant.html"))
    seen = {r.label_a for r in rows} | {r.label_b for r in rows}
    assert not (seen & CATEGORY_LABELS)


def test_derive_philosophers_from_category_page():
    scraper = PhilPeopleScraper(
        fetcher=lambda url: _cap("philosopher_kant.html"),  # any Philosopher page carries the dropdown
        config=ScrapeConfig(min_interval_seconds=0.0), sleep_fn=lambda s: None,
    )
    phils = derive_philosophers(scraper)
    assert len(phils) == 59  # 60 dropdown thinkers minus the 'none' non-identification option
    assert "Kant" in phils and "Aristotle" in phils and "Wollstonecraft" in phils
    assert "none" not in {p.lower() for p in phils}
    assert not (set(phils) & CATEGORY_LABELS)


def test_build_correlation_url_encodes_params():
    url = build_correlation_url("Mind: physicalism")
    assert "category=Philosophical" in url and "variable=Mind" in url


# --- tier merge: SITE_SCRAPE (with cells) supersedes PUBLISHED_TABLE ---------


def test_site_scrape_supersedes_published_with_cells():
    store = CorrelationStore()
    load_fixture(store)  # PUBLISHED_TABLE, no cells
    pub = store.get("Consciousness: dualism", "Mind: physicalism")
    assert pub.source_tier is SourceTier.PUBLISHED_TABLE and pub.cells is None

    ingest_page(store, "Mind: physicalism", _cap("question_mind_physicalism.html"), {})
    got = store.get("Consciousness: dualism", "Mind: physicalism")
    assert got.source_tier is SourceTier.SITE_SCRAPE
    assert got.cells is not None and got.r == -0.69 and got.n == 838


# --- cross-page consistency (dedupe) ----------------------------------------


def test_reparsing_same_page_is_consistent():
    store, seen = CorrelationStore(), {}
    html = _cap("question_mind_physicalism.html")
    assert ingest_page(store, "Mind: physicalism", html, seen) == []
    # same page again shares every pair at the same r -> no inconsistency
    assert ingest_page(store, "Mind: physicalism", html, seen) == []


def test_tampered_r_is_flagged_inconsistent():
    store, seen = CorrelationStore(), {}
    html = _cap("question_mind_physicalism.html")
    ingest_page(store, "Mind: physicalism", html, seen)
    tampered = html.replace("r: -0.69", "r: -0.20", 1)
    inc = ingest_page(store, "Mind: physicalism", tampered, seen)
    assert any(abs(i.r_first - (-0.69)) < 1e-9 and abs(i.r_second - (-0.20)) < 1e-9 for i in inc)


# --- challenge detection ----------------------------------------------------


def test_is_challenge_distinguishes_stub_from_real_page():
    assert is_challenge(_cap("cloudflare_challenge.SYNTHETIC.html")) is True
    # real pages embed the invisible cf script but are NOT interstitials
    assert is_challenge(_cap("question_mind_physicalism.html")) is False
    assert is_challenge(_cap("correlations_index.html")) is False


def test_scraper_rejects_challenge_stub_and_does_not_cache():
    cache = SparqlCache()
    scraper = PhilPeopleScraper(
        fetcher=lambda url: _cap("cloudflare_challenge.SYNTHETIC.html"),
        cache=cache, config=ScrapeConfig(min_interval_seconds=0.0), sleep_fn=lambda s: None,
    )
    with pytest.raises(ChallengeError):
        scraper.fetch("https://survey2020.philpeople.org/survey/results/correlations?variable=X")
    assert cache.count() == 0  # stub never cached -> refetch-eligible
