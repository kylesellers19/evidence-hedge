"""Layer 2 Stage A5: philpeople scraper, replayed against a recorded (synthetic)
page fixture with no network."""

from __future__ import annotations

from pathlib import Path

from delib.layer2.survey import CorrelationStore, SourceTier, load_fixture
from delib.layer2.survey.scrape import (
    PhilPeopleScraper,
    ScrapeConfig,
    parse_correlations,
)

SAMPLE = (
    Path(__file__).resolve().parents[2]
    / "data" / "fixtures" / "philpeople_sample_question.SYNTHETIC.html"
)


def _html() -> str:
    return SAMPLE.read_text(encoding="utf-8")


def _scraper(fetcher):
    return PhilPeopleScraper(
        fetcher=fetcher,
        config=ScrapeConfig(min_interval_seconds=0.0),
        sleep_fn=lambda s: None,
    )


def test_parse_extracts_rows():
    rows = parse_correlations(_html())
    assert len(rows) == 3
    by = {(r.label_a, r.label_b): r for r in rows}
    got = by[("God: theism", "Mind: physicalism")]
    assert got.r == -0.52 and got.n == 1477


def test_fetch_caches_page():
    calls = {"n": 0}

    def fetcher(url):
        calls["n"] += 1
        return _html()

    scraper = _scraper(fetcher)
    url = "https://survey2020.philpeople.org/q/mind-physicalism"
    scraper.fetch(url)
    scraper.fetch(url)  # served from cache
    assert calls["n"] == 1


def test_scrape_into_store_tags_site_scrape():
    scraper = _scraper(lambda url: _html())
    store = CorrelationStore()
    added = scraper.scrape_into_store(store, ["https://survey2020.philpeople.org/q/x"])
    assert added == 3
    row = store.get("God: theism", "Mind: physicalism")
    assert row.source_tier is SourceTier.SITE_SCRAPE


def test_site_scrape_overrides_published_table():
    store = CorrelationStore()
    # a (deliberately wrong) published-table value...
    store.add("God: theism", "Mind: physicalism", -0.99, 10, SourceTier.PUBLISHED_TABLE)
    # ...is overridden by the higher-tier scrape
    _scraper(lambda url: _html()).scrape_into_store(store, ["https://x"])
    row = store.get("God: theism", "Mind: physicalism")
    assert row.r == -0.52 and row.source_tier is SourceTier.SITE_SCRAPE
