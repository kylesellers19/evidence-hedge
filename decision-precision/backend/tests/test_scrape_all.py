"""Step 6: scrape_all runner — orchestration verified offline (injected fetcher),
including unconditional caching / resumability and the separate reparse pass."""

from __future__ import annotations

from pathlib import Path

from delib.layer2.cache import SparqlCache
from delib.layer2.survey import CorrelationStore
from delib.layer2.survey.bridge_evidence import BridgeEvidenceStore
from delib.layer2.survey.scrape import CORRELATIONS_PATH
from delib.layer2.survey.scrape_all import run_reparse, run_scrape

FIX = Path(__file__).resolve().parents[2] / "data" / "fixtures"


def _h(name: str) -> str:
    return (FIX / name).read_text(encoding="utf-8")


def _fetcher():
    """Route URLs to the synthetic fixtures (index, question pages, Kant page)."""
    def fetch(url: str) -> str:
        if "?" not in url:  # the index page (no query) -> the variable <select>
            return _h("philpeople_inventory.SYNTHETIC.html")
        if "variable=Mind" in url:
            return _h("philpeople_physicalism.SYNTHETIC.html")
        if "variable=Metaphilosophy" in url:
            return _h("philpeople_naturalism.SYNTHETIC.html")
        if "variable=God" in url:
            return _h("philpeople_physicalism.SYNTHETIC.html")  # any question page
        if "variable=Kant" in url:
            return _h("philpeople_kant.SYNTHETIC.html")
        raise AssertionError(f"unexpected url {url}")

    return fetch


def _quiet(_msg):  # silence progress in tests
    pass


def test_scrape_enumerates_and_stores():
    cache, store = SparqlCache(), CorrelationStore()
    summary = run_scrape(
        page_cache=cache, corr_store=store, fetcher=_fetcher(),
        min_interval=0.0, progress=_quiet,
    )
    # index (inventory) + the 3 enumerated variable pages fetched from network
    assert summary.pages_network >= 1
    assert summary.pairs_stored > 0
    assert store.get("Mind: physicalism", "God: theism") is not None


def test_run_is_resumable_from_cache():
    cache = SparqlCache()
    first = run_scrape(page_cache=cache, corr_store=CorrelationStore(),
                       fetcher=_fetcher(), min_interval=0.0, progress=_quiet)
    assert first.pages_network >= 1
    # second run against the same cache never hits the network
    second = run_scrape(page_cache=cache, corr_store=CorrelationStore(),
                        fetcher=_fetcher(), min_interval=0.0, progress=_quiet)
    assert second.pages_network == 0
    assert second.pages_cache_hits >= 1


def test_limit_bounds_variable_pages():
    cache, store = SparqlCache(), CorrelationStore()
    run_scrape(page_cache=cache, corr_store=store, fetcher=_fetcher(),
               limit=1, min_interval=0.0, progress=_quiet)
    # index + exactly 1 variable page
    urls = [k for k, _ in cache.items() if CORRELATIONS_PATH in k and "variable=" in k]
    assert len(urls) == 1


def test_philosophers_pass_fills_bridge_store():
    cache = SparqlCache()
    bridge = BridgeEvidenceStore()
    summary = run_scrape(
        page_cache=cache, corr_store=CorrelationStore(), bridge_store=bridge,
        variables=["Mind: physicalism"], philosophers=["Kant"],
        fetcher=_fetcher(), min_interval=0.0, progress=_quiet,
    )
    assert summary.bridge_rows == 1
    ev = bridge.all()[0]
    assert ev.thinker_id == "kant" and ev.r == 0.55


def test_reparse_from_cache_reproduces_without_network():
    cache = SparqlCache()
    run_scrape(page_cache=cache, corr_store=CorrelationStore(),
               variables=["Mind: physicalism", "Metaphilosophy: naturalism"],
               philosophers=["Kant"], bridge_store=BridgeEvidenceStore(),
               fetcher=_fetcher(), min_interval=0.0, progress=_quiet)

    # fresh stores, reparse the cached bytes only
    corr, bridge = CorrelationStore(), BridgeEvidenceStore()
    summary = run_reparse(page_cache=cache, corr_store=corr, bridge_store=bridge, progress=_quiet)
    assert summary.pages_reparsed >= 2
    assert corr.get("Mind: physicalism", "Metaphilosophy: naturalism") is not None
    assert bridge.count() == 1  # Kant page routed to the bridge store
