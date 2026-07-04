"""PhilPeople site scraper (A5, tier 2) — reconciled to the real page structure.

Pages are server-rendered (no JS). Each correlation is a <table>: a header row
with "r: <float>" and an <a> to the paired variable (href carries
?category=&variable=); a nested 2x2 contingency table; a footer with "n: <int>"
and "p < 0.0001" or "p: <float>". Each page is ONE page-variable's correlations,
so a parsed row is (page_variable, paired_variable, r, n, p, cells).

Enumeration: the /survey/results/correlations page carries a variable <select>
(~230 options); we fetch ?category=Philosophical questions&variable=<each>. Every
pair appears on both endpoints' pages, so we dedupe and check r agrees.

Same plugin discipline as the evidence multiplexer: injectable fetcher (stdlib
urllib default, no new dep), conservative rate limit, SQLite page cache. Offline
tests replay recorded (synthetic) fixtures.

CELL-EXTRACTION CAVEAT: the 2x2 cells are read as the four integer <td>s inside
the correlation <table>, in reading order (aa, ar, ra, rr). This is the one part
that needs a real capture to confirm exact ordering/selectors.
"""

from __future__ import annotations

import re
import time
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from typing import Callable

from pydantic import BaseModel

from ..cache import SparqlCache
from .store import Cells, CorrelationStore, SourceTier, slugify

PHILPEOPLE_BASE = "https://survey2020.philpeople.org"
CORRELATIONS_PATH = "/survey/results/correlations"
DEFAULT_CATEGORY = "Philosophical questions"

_R = re.compile(r"r:\s*(-?\d*\.?\d+)")
_N = re.compile(r"n:\s*(\d+)")
_P = re.compile(r"p\s*[:<]\s*(\d*\.?\d+)")
_INT = re.compile(r"^-?\d+$")
_OPTION = re.compile(r"<option[^>]*>([^<]+)</option>", re.IGNORECASE)


class ScrapeConfig(BaseModel):
    min_interval_seconds: float = 2.0
    user_agent: str = "DELIB/0.1 (research; consequence mapping)"


class ParsedCorrelation(BaseModel):
    label_a: str  # the page variable
    label_b: str  # the paired variable
    r: float
    n: int
    p_value: float | None = None
    cells: Cells | None = None
    paired_variable_id: str | None = None  # from ?variable= in the link href


class Inconsistency(BaseModel):
    pair_key: str
    r_first: float
    r_second: float


# --- parsing ----------------------------------------------------------------


class _PageParser(HTMLParser):
    """Segments top-level <table> blocks, collecting each block's text, links,
    and integer cells (nested tables included)."""

    def __init__(self) -> None:
        super().__init__()
        self.blocks: list[dict] = []
        self._depth = 0
        self._cur: dict | None = None
        self._a: str | None = None
        self._a_href = ""
        self._td: str | None = None

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self._depth += 1
            if self._depth == 1:
                self._cur = {"text": "", "links": [], "nums": []}
        if self._cur is None:
            return
        if tag == "a":
            self._a = ""
            self._a_href = dict(attrs).get("href", "") or ""
        elif tag == "td":
            self._td = ""

    def handle_data(self, data):
        if self._cur is not None:
            self._cur["text"] += data
        if self._a is not None:
            self._a += data
        if self._td is not None:
            self._td += data

    def handle_endtag(self, tag):
        if tag == "a" and self._a is not None and self._cur is not None:
            self._cur["links"].append((self._a.strip(), self._a_href))
            self._a = None
        elif tag == "td" and self._td is not None:
            t = self._td.strip()
            if self._cur is not None and _INT.match(t):
                self._cur["nums"].append(int(t))
            self._td = None
        elif tag == "table":
            if self._depth == 1 and self._cur is not None:
                self.blocks.append(self._cur)
                self._cur = None
            self._depth = max(0, self._depth - 1)


def _query(url: str) -> dict[str, list[str]]:
    return urllib.parse.parse_qs(urllib.parse.urlparse(url).query)


def _variable_from_href(href: str) -> str | None:
    vals = _query(href).get("variable")
    return vals[0] if vals else None


def variable_from_url(url: str) -> str | None:
    return _variable_from_href(url)


def category_from_url(url: str) -> str | None:
    vals = _query(url).get("category")
    return vals[0] if vals else None


def parse_correlations(html: str, page_variable: str) -> list[ParsedCorrelation]:
    parser = _PageParser()
    parser.feed(html)
    out: list[ParsedCorrelation] = []
    for block in parser.blocks:
        mr = _R.search(block["text"])
        if not mr or not block["links"]:
            continue
        r = float(mr.group(1))
        mn = _N.search(block["text"])
        mp = _P.search(block["text"])
        label_b, href = block["links"][0]
        nums = block["nums"]
        cells = Cells(aa=nums[0], ar=nums[1], ra=nums[2], rr=nums[3]) if len(nums) == 4 else None
        out.append(
            ParsedCorrelation(
                label_a=page_variable,
                label_b=label_b,
                r=r,
                n=int(mn.group(1)) if mn else 0,
                p_value=float(mp.group(1)) if mp else None,
                cells=cells,
                paired_variable_id=_variable_from_href(href),
            )
        )
    return out


def parse_variable_inventory(html: str) -> list[str]:
    """The ~230 options from the variable <select> (placeholder options dropped)."""
    out: list[str] = []
    for text in _OPTION.findall(html):
        label = text.strip()
        if label and not label.lower().startswith("select"):
            out.append(label)
    return out


def build_correlation_url(variable: str, category: str = DEFAULT_CATEGORY, base: str = PHILPEOPLE_BASE) -> str:
    qs = urllib.parse.urlencode({"category": category, "variable": variable})
    return f"{base}{CORRELATIONS_PATH}?{qs}"


# --- scraper ----------------------------------------------------------------


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
        self.network_fetches = 0
        self.cache_hits = 0

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
        """Return the page bytes, cache-resumable. Raw HTML is cached
        UNCONDITIONALLY — the moment it's fetched, before any parsing — so a
        parse failure never loses the capture and reparse_from_cache can re-run."""
        cached = self.cache.get(url)
        if cached is not None:
            self.cache_hits += 1
            return cached
        self._throttle()
        html = self._fetch(url)
        self.cache.put(url, html)  # unconditional: independent of parse outcome
        self.network_fetches += 1
        return html

    def inventory(self, category: str = DEFAULT_CATEGORY) -> list[str]:
        return parse_variable_inventory(self.fetch(f"{PHILPEOPLE_BASE}{CORRELATIONS_PATH}"))

    def scrape_variables(
        self,
        store: CorrelationStore,
        variables: list[str],
        category: str = DEFAULT_CATEGORY,
        r_tolerance: float = 0.01,
    ) -> list[Inconsistency]:
        """Fetch each variable's page, parse, and store at SITE_SCRAPE. A pair
        seen on both endpoints' pages is deduped by the store; a materially
        different r across the two pages is reported as an inconsistency."""
        seen: dict[str, float] = {}
        inconsistencies: list[Inconsistency] = []
        for variable in variables:
            html = self.fetch(build_correlation_url(variable, category))
            inconsistencies += ingest_page(store, variable, html, seen, r_tolerance)
        return inconsistencies


def ingest_page(
    store: CorrelationStore,
    page_variable: str,
    html: str,
    seen: dict[str, float],
    r_tolerance: float = 0.01,
) -> list[Inconsistency]:
    """Parse one already-fetched page into the store; track cross-page r
    agreement via ``seen`` (pair_key -> r). Reused by scrape and reparse."""
    inconsistencies: list[Inconsistency] = []
    for row in parse_correlations(html, page_variable):
        key = "|".join(sorted((slugify(row.label_a), slugify(row.label_b))))
        if key in seen and abs(seen[key] - row.r) > r_tolerance:
            inconsistencies.append(Inconsistency(pair_key=key, r_first=seen[key], r_second=row.r))
        seen[key] = row.r
        store.add(
            row.label_a, row.label_b, row.r, row.n, SourceTier.SITE_SCRAPE,
            cells=row.cells, p_value=row.p_value,
        )
    return inconsistencies


__all__ = [
    "PHILPEOPLE_BASE",
    "CORRELATIONS_PATH",
    "DEFAULT_CATEGORY",
    "ScrapeConfig",
    "ParsedCorrelation",
    "Inconsistency",
    "parse_correlations",
    "parse_variable_inventory",
    "build_correlation_url",
    "variable_from_url",
    "category_from_url",
    "ingest_page",
    "PhilPeopleScraper",
]
