"""Layer 2 A5 (reconciled): philpeople scraper against the real page structure,
replayed on synthetic recorded fixtures (no network)."""

from __future__ import annotations

from pathlib import Path

from delib.layer2.survey import CorrelationStore, SourceTier, phi_from_cells
from delib.layer2.survey.scrape import (
    PhilPeopleScraper,
    ScrapeConfig,
    build_correlation_url,
    parse_correlations,
    parse_variable_inventory,
)

FIX = Path(__file__).resolve().parents[2] / "data" / "fixtures"


def _html(name: str) -> str:
    return (FIX / name).read_text(encoding="utf-8")


def _scraper(pages: dict[str, str]):
    """pages: url-substring -> html. Fetcher matches by substring."""
    def fetcher(url: str) -> str:
        for key, html in pages.items():
            if key in url:
                return html
        raise AssertionError(f"unexpected url {url}")

    return PhilPeopleScraper(
        fetcher=fetcher, config=ScrapeConfig(min_interval_seconds=0.0), sleep_fn=lambda s: None
    )


# --- parsing ----------------------------------------------------------------


def test_parse_page_extracts_r_n_p_cells_and_paired_variable():
    rows = parse_correlations(_html("philpeople_physicalism.SYNTHETIC.html"), "Mind: physicalism")
    assert len(rows) == 2
    god = next(r for r in rows if r.label_b == "God: theism")
    assert god.label_a == "Mind: physicalism"
    assert god.r == -0.60 and god.n == 1000 and god.p_value == 0.0001
    assert god.paired_variable_id == "God: theism"
    assert god.cells is not None


def test_parsed_cells_phi_matches_r():
    for row in parse_correlations(_html("philpeople_physicalism.SYNTHETIC.html"), "Mind: physicalism"):
        assert abs(phi_from_cells(row.cells) - row.r) < 0.02


# --- enumeration ------------------------------------------------------------


def test_inventory_parses_select_options():
    inv = parse_variable_inventory(_html("philpeople_inventory.SYNTHETIC.html"))
    assert "Mind: physicalism" in inv and "God: theism" in inv
    assert all(not v.lower().startswith("select") for v in inv)  # placeholder dropped


def test_build_correlation_url_encodes_params():
    url = build_correlation_url("Mind: physicalism")
    assert "category=Philosophical" in url and "variable=Mind" in url


# --- scrape + dedupe/consistency --------------------------------------------


def test_scrape_variables_stores_site_scrape_with_cells():
    scraper = _scraper({"variable=Mind": _html("philpeople_physicalism.SYNTHETIC.html")})
    store = CorrelationStore()
    inconsistencies = scraper.scrape_variables(store, ["Mind: physicalism"])
    assert inconsistencies == []
    row = store.get("Mind: physicalism", "God: theism")
    assert row.source_tier is SourceTier.SITE_SCRAPE
    assert row.cells is not None and abs(phi_from_cells(row.cells) - row.r) < 0.02


def test_cross_page_pair_is_deduped_and_consistent():
    scraper = _scraper({
        "variable=Mind": _html("philpeople_physicalism.SYNTHETIC.html"),
        "variable=Metaphilosophy": _html("philpeople_naturalism.SYNTHETIC.html"),
    })
    store = CorrelationStore()
    inconsistencies = scraper.scrape_variables(
        store, ["Mind: physicalism", "Metaphilosophy: naturalism"]
    )
    # the (physicalism, naturalism) pair appears on both pages at r=0.60 -> consistent
    assert inconsistencies == []
    # deduped: one stored row for the shared pair
    assert store.get("Mind: physicalism", "Metaphilosophy: naturalism").r == 0.60


def test_cross_page_r_mismatch_is_reported():
    good = _html("philpeople_physicalism.SYNTHETIC.html")
    tampered = _html("philpeople_naturalism.SYNTHETIC.html").replace("r: 0.60", "r: 0.20")
    scraper = _scraper({"variable=Mind": good, "variable=Metaphilosophy": tampered})
    store = CorrelationStore()
    inconsistencies = scraper.scrape_variables(
        store, ["Mind: physicalism", "Metaphilosophy: naturalism"]
    )
    assert len(inconsistencies) == 1
    assert {inconsistencies[0].r_first, inconsistencies[0].r_second} == {0.60, 0.20}
