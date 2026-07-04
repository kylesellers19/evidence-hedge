"""PhilPeople site scraper (A5, tier 2).

Same plugin discipline as the evidence multiplexer: an injectable fetcher (stdlib
urllib default — no new dep), a conservative configurable rate limit, and every
page cached in SQLite so the test suite replays recorded pages with no network.

PARSER STATUS — PROVISIONAL. Written against an ASSUMED page structure
(``<tr class="correlation" data-a data-b data-r data-n>``), because real
survey2020.philpeople.org pages could not be captured here (no network). The
real pages likely render correlations via JS/JSON; before trusting this on live
pages, capture 2-3 real pages and reconcile the selectors — do not guess against
markup you haven't seen.
"""

from __future__ import annotations

import time
import urllib.request
from html.parser import HTMLParser
from typing import Callable

from pydantic import BaseModel

from ..cache import SparqlCache
from .store import CorrelationStore, SourceTier

PHILPEOPLE_BASE = "https://survey2020.philpeople.org"


class ScrapeConfig(BaseModel):
    min_interval_seconds: float = 2.0  # conservative rate limit between live fetches
    user_agent: str = "DELIB/0.1 (research; consequence mapping)"


class ParsedCorrelation(BaseModel):
    label_a: str
    label_b: str
    r: float
    n: int


class _CorrelationParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.rows: list[ParsedCorrelation] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "tr":
            return
        d = {k: v for k, v in attrs}
        if "data-r" not in d:
            return
        try:
            self.rows.append(
                ParsedCorrelation(
                    label_a=d["data-a"], label_b=d["data-b"],
                    r=float(d["data-r"]), n=int(d["data-n"]),
                )
            )
        except (KeyError, TypeError, ValueError):
            # Malformed row -> skip; on live pages a total parse failure should
            # surface the captured HTML for inspection, not be silently guessed.
            pass


def parse_correlations(html: str) -> list[ParsedCorrelation]:
    parser = _CorrelationParser()
    parser.feed(html)
    return parser.rows


class PhilPeopleScraper:
    def __init__(
        self,
        fetcher: Callable[[str], str] | None = None,
        cache: SparqlCache | None = None,
        config: ScrapeConfig | None = None,
        sleep_fn: Callable[[float], None] = time.sleep,
    ) -> None:
        self.config = config or ScrapeConfig()
        self.cache = cache or SparqlCache()
        self._fetch = fetcher or self._default_fetcher
        self._sleep = sleep_fn
        self._last_fetch: float | None = None

    def _default_fetcher(self, url: str) -> str:  # pragma: no cover - network
        req = urllib.request.Request(url, headers={"User-Agent": self.config.user_agent})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8", errors="replace")

    def _throttle(self) -> None:
        interval = self.config.min_interval_seconds
        if interval <= 0:
            return
        if self._last_fetch is not None:
            wait = interval - (time.monotonic() - self._last_fetch)
            if wait > 0:
                self._sleep(wait)
        self._last_fetch = time.monotonic()

    def fetch(self, url: str) -> str:
        cached = self.cache.get(url)
        if cached is not None:
            return cached
        self._throttle()
        html = self._fetch(url)
        self.cache.put(url, html)
        return html

    def scrape_into_store(self, store: CorrelationStore, urls: list[str]) -> int:
        added = 0
        for url in urls:
            for row in parse_correlations(self.fetch(url)):
                if store.add(row.label_a, row.label_b, row.r, row.n, SourceTier.SITE_SCRAPE):
                    added += 1
        return added


__all__ = [
    "PHILPEOPLE_BASE",
    "ScrapeConfig",
    "ParsedCorrelation",
    "parse_correlations",
    "PhilPeopleScraper",
]
