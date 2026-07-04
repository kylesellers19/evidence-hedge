"""Step 6: scrape_all runner — orchestration verified offline against the REAL
captured pages (injected fetcher), incl. resumability and the reparse pass."""

from __future__ import annotations

from pathlib import Path

from delib.layer2.cache import SparqlCache
from delib.layer2.survey import CorrelationStore
from delib.layer2.survey.bridge_evidence import BridgeEvidenceStore
from delib.layer2.survey.scrape import CORRELATIONS_PATH, category_from_url
from delib.layer2.survey.scrape_all import run_reparse, run_scrape

CAP = Path(__file__).resolve().parents[2] / "data" / "fixtures" / "site_captures"


def _cap(name: str) -> str:
    return (CAP / name).read_text(encoding="utf-8")


def _fetcher():
    index = _cap("correlations_index.html")
    physicalism = _cap("question_mind_physicalism.html")
    kant = _cap("philosopher_kant.html")

    def fetch(url: str) -> str:
        if "?" not in url:  # index page (no query)
            return index
        return kant if category_from_url(url) == "Philosopher" else physicalism

    return fetch


def _q(_msg):  # silence progress
    pass


def test_scrape_stores_real_pairs():
    cache, store = SparqlCache(), CorrelationStore()
    summary = run_scrape(
        page_cache=cache, corr_store=store, variables=["Mind: physicalism"],
        fetcher=_fetcher(), min_interval=0.0, progress=_q,
    )
    assert summary.pairs_stored == 143
    assert store.get("Consciousness: dualism", "Mind: physicalism").r == -0.69


def test_run_is_resumable_from_cache():
    cache = SparqlCache()
    first = run_scrape(page_cache=cache, corr_store=CorrelationStore(),
                       variables=["Mind: physicalism"], fetcher=_fetcher(), min_interval=0.0, progress=_q)
    assert first.pages_network >= 1
    second = run_scrape(page_cache=cache, corr_store=CorrelationStore(),
                        variables=["Mind: physicalism"], fetcher=_fetcher(), min_interval=0.0, progress=_q)
    assert second.pages_network == 0 and second.pages_cache_hits >= 1


def test_limit_bounds_variable_pages():
    cache = SparqlCache()
    run_scrape(page_cache=cache, corr_store=CorrelationStore(),
               variables=["Mind: physicalism", "God: theism", "Extra"], limit=2,
               fetcher=_fetcher(), min_interval=0.0, progress=_q)
    var_urls = [k for k, _ in cache.items() if CORRELATIONS_PATH in k and "variable=" in k]
    assert len(var_urls) == 2  # index (no variable) + exactly 2 variable pages


def test_philosophers_pass_fills_bridge_store():
    cache, bridge = SparqlCache(), BridgeEvidenceStore()
    summary = run_scrape(
        page_cache=cache, corr_store=CorrelationStore(), bridge_store=bridge,
        variables=["Mind: physicalism"], philosophers=["Kant"],
        fetcher=_fetcher(), min_interval=0.0, progress=_q,
    )
    assert summary.bridge_rows == 70
    assert any(e.thinker_id == "kant" and e.position_id == "practical-reason-kantian"
               for e in bridge.all())


def test_reparse_from_cache_reproduces_without_network():
    cache = SparqlCache()
    run_scrape(page_cache=cache, corr_store=CorrelationStore(), bridge_store=BridgeEvidenceStore(),
               variables=["Mind: physicalism"], philosophers=["Kant"],
               fetcher=_fetcher(), min_interval=0.0, progress=_q)

    corr, bridge = CorrelationStore(), BridgeEvidenceStore()
    summary = run_reparse(page_cache=cache, corr_store=corr, bridge_store=bridge, progress=_q)
    assert summary.pages_reparsed >= 2  # index skipped (no variable), physicalism + kant parsed
    assert corr.get("Consciousness: dualism", "Mind: physicalism") is not None
    assert bridge.count() == 70  # Kant page routed to the bridge store
