"""Full-scrape runner + reparse pass (A5/A7 step 6).

  python -m delib.layer2.survey.scrape_all scrape  [--variables ...] [--philosophers ...] [--limit N]
  python -m delib.layer2.survey.scrape_all reparse

Safe to run twice: every page's RAW HTML is cached unconditionally on fetch, so
a re-run never refetches a cached page (resumable) and parsing is a SEPARATE,
re-runnable pass (`reparse`) over the cache. Rate-limited; prints progress and
an end-of-run summary.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Callable

from pydantic import BaseModel

from ..cache import SparqlCache
from .bridge_evidence import BridgeEvidenceStore, PHILOSOPHER_CATEGORY
from .scrape import (
    CORRELATIONS_PATH,
    DEFAULT_CATEGORY,
    PHILPEOPLE_BASE,
    Inconsistency,
    PhilPeopleScraper,
    ScrapeConfig,
    build_correlation_url,
    category_from_url,
    ingest_page,
    parse_correlations,
    parse_variable_inventory,
    variable_from_url,
)
from .store import CorrelationStore

DATA = Path(__file__).resolve().parents[5] / "data"
DEFAULT_PAGE_CACHE = DATA / "cache" / "philpeople_pages.sqlite"
DEFAULT_CORR_DB = DATA / "cache" / "correlations.sqlite"
DEFAULT_BRIDGE_DB = DATA / "cache" / "bridge_evidence.sqlite"


class ScrapeSummary(BaseModel):
    pages_network: int = 0
    pages_cache_hits: int = 0
    pages_reparsed: int = 0
    pairs_stored: int = 0
    bridge_rows: int = 0
    inconsistencies: int = 0
    parse_errors: list[str] = []


def run_scrape(
    *,
    page_cache: SparqlCache,
    corr_store: CorrelationStore,
    category: str = DEFAULT_CATEGORY,
    variables: list[str] | None = None,
    philosophers: list[str] | None = None,
    bridge_store: BridgeEvidenceStore | None = None,
    limit: int | None = None,
    min_interval: float = 2.0,
    fetcher: Callable[[str], str] | None = None,
    progress: Callable[[str], None] = print,
) -> ScrapeSummary:
    scraper = PhilPeopleScraper(
        fetcher=fetcher, cache=page_cache, config=ScrapeConfig(min_interval_seconds=min_interval)
    )

    # Always fetch (and cache) the index page — its <select> is the enumeration
    # source and its markup is needed to reconcile parse_variable_inventory.
    progress("Fetching index page…")
    inventory = parse_variable_inventory(scraper.fetch(f"{PHILPEOPLE_BASE}{CORRELATIONS_PATH}"))
    progress(f"  inventory: {len(inventory)} variables")
    if variables is None:
        variables = inventory
    if limit is not None:
        variables = variables[:limit]

    seen: dict[str, float] = {}
    inconsistencies: list[Inconsistency] = []
    errors: list[str] = []
    before = corr_store.count()

    for i, variable in enumerate(variables, 1):
        url = build_correlation_url(variable, category)
        try:
            html = scraper.fetch(url)  # cached before any parse
            inc = ingest_page(corr_store, variable, html, seen)
            inconsistencies += inc
            progress(f"  [{i}/{len(variables)}] {variable} ({corr_store.count()} pairs, {len(inc)} inc)")
        except Exception as e:  # page cached regardless; keep going
            errors.append(url)
            progress(f"  [{i}/{len(variables)}] PARSE FAIL {variable}: {e}")

    bridge_rows = 0
    if philosophers:
        if limit is not None:
            philosophers = philosophers[:limit]
        store = bridge_store or BridgeEvidenceStore()
        progress(f"Philosopher pass: {len(philosophers)} thinkers")
        for i, name in enumerate(philosophers, 1):
            url = build_correlation_url(name, PHILOSOPHER_CATEGORY)
            try:
                html = scraper.fetch(url)
                for row in parse_correlations(html, name):
                    store.add(row.label_a, row.label_b, row.r, row.n, p_value=row.p_value, cells=row.cells)
                progress(f"  [{i}/{len(philosophers)}] {name}")
            except Exception as e:
                errors.append(url)
                progress(f"  [{i}/{len(philosophers)}] PARSE FAIL {name}: {e}")
        bridge_rows = store.count()

    summary = ScrapeSummary(
        pages_network=scraper.network_fetches,
        pages_cache_hits=scraper.cache_hits,
        pairs_stored=corr_store.count() - before,
        bridge_rows=bridge_rows,
        inconsistencies=len(inconsistencies),
        parse_errors=errors,
    )
    _print_summary(progress, summary)
    return summary


def run_reparse(
    *,
    page_cache: SparqlCache,
    corr_store: CorrelationStore,
    bridge_store: BridgeEvidenceStore,
    progress: Callable[[str], None] = print,
) -> ScrapeSummary:
    """Re-parse every cached correlation page — no network. Routes Philosopher
    pages to the bridge-evidence store, question pages to the correlation store."""
    seen: dict[str, float] = {}
    inconsistencies: list[Inconsistency] = []
    errors: list[str] = []
    pages = 0
    for url, html in page_cache.items():
        if CORRELATIONS_PATH not in url:
            continue
        variable = variable_from_url(url)
        if variable is None:
            continue
        pages += 1
        try:
            if category_from_url(url) == PHILOSOPHER_CATEGORY:
                for row in parse_correlations(html, variable):
                    bridge_store.add(row.label_a, row.label_b, row.r, row.n, p_value=row.p_value, cells=row.cells)
            else:
                inconsistencies += ingest_page(corr_store, variable, html, seen)
        except Exception:
            errors.append(url)
    summary = ScrapeSummary(
        pages_reparsed=pages,
        pairs_stored=corr_store.count(),
        bridge_rows=bridge_store.count(),
        inconsistencies=len(inconsistencies),
        parse_errors=errors,
    )
    _print_summary(progress, summary)
    return summary


def _print_summary(progress: Callable[[str], None], s: ScrapeSummary) -> None:
    progress("--- summary ---")
    if s.pages_reparsed:
        progress(f"  pages reparsed:  {s.pages_reparsed}")
    else:
        progress(f"  pages fetched:   {s.pages_network} network, {s.pages_cache_hits} from cache")
    progress(f"  pairs stored:    {s.pairs_stored}")
    progress(f"  bridge rows:     {s.bridge_rows}")
    progress(f"  inconsistencies: {s.inconsistencies}")
    progress(f"  parse errors:    {len(s.parse_errors)}")


def _read_list(value: str | None) -> list[str] | None:
    if not value:
        return None
    if value.startswith("@"):
        return [ln.strip() for ln in Path(value[1:]).read_text().splitlines() if ln.strip()]
    return [v.strip() for v in value.split(",") if v.strip()]


def main(argv: list[str] | None = None) -> None:  # pragma: no cover - CLI
    p = argparse.ArgumentParser(prog="scrape_all", description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)

    sc = sub.add_parser("scrape", help="fetch + parse + store (network)")
    sc.add_argument("--page-cache", default=str(DEFAULT_PAGE_CACHE))
    sc.add_argument("--corr-db", default=str(DEFAULT_CORR_DB))
    sc.add_argument("--bridge-db", default=str(DEFAULT_BRIDGE_DB))
    sc.add_argument("--category", default=DEFAULT_CATEGORY)
    sc.add_argument("--variables", help="comma list or @file; default = full inventory")
    sc.add_argument("--philosophers", help="comma list or @file for the A7 bridge pass")
    sc.add_argument("--limit", type=int, default=None)
    sc.add_argument("--min-interval", type=float, default=2.0)

    rp = sub.add_parser("reparse", help="re-parse cached pages (no network)")
    rp.add_argument("--page-cache", default=str(DEFAULT_PAGE_CACHE))
    rp.add_argument("--corr-db", default=str(DEFAULT_CORR_DB))
    rp.add_argument("--bridge-db", default=str(DEFAULT_BRIDGE_DB))

    args = p.parse_args(argv)
    page_cache = SparqlCache(args.page_cache)
    corr_store = CorrelationStore(args.corr_db)
    bridge_store = BridgeEvidenceStore(args.bridge_db)

    if args.cmd == "scrape":
        run_scrape(
            page_cache=page_cache, corr_store=corr_store, category=args.category,
            variables=_read_list(args.variables), philosophers=_read_list(args.philosophers),
            bridge_store=bridge_store, limit=args.limit, min_interval=args.min_interval,
        )
    else:
        run_reparse(page_cache=page_cache, corr_store=corr_store, bridge_store=bridge_store)


if __name__ == "__main__":  # pragma: no cover
    main()


__all__ = ["ScrapeSummary", "run_scrape", "run_reparse", "main"]
