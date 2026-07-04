"""PhilPeople site scraper (A5, tier 2) — reconciled to the REAL page markup.

Confirmed against live captures. Each correlation is a ``<table class="table">``:

    <thead>
      <tr class="meta-heading">
        <th class="rcell"><div> r: -0.69 </div></th>
        <th class="collabel"><span class="colname"><a href="?...variable=X"> X </a></span></th>
      </tr>
      <tr><td class="rowlabel rowname">PAGE VARIABLE</td><th>Accept</th><th>Reject</th></tr>
    </thead>
    <tbody>
      <tr><th>Accept</th><td>aa</td><td>ar</td></tr>   row = page-var Accept, cols = paired Accept/Reject
      <tr><th>Reject</th><td>ra</td><td>rr</td></tr>
    </tbody>

Key facts learned from the captures:
- The displayed table is Accept/Reject BINARIZED. Its phi therefore ATTENUATES
  the published 5-point Pearson r (median |phi-r| ~0.025, max ~0.10, 0 sign
  disagreements). The cell mapping is validated by sign + cell-sum==n + a band,
  NOT by phi==r (they are different estimators). See test_survey_scrape.
- There is no per-block "n"; n is the SUM of the four cells (verified against
  published n: dualism 838, naturalism 1231, God 1477).
- Variables are enumerated from a ``dropdown-item`` menu, NOT a <select>.

Injectable fetcher (stdlib urllib, no dep), conservative rate limit, SQLite page
cache. Cloudflare challenge stubs are detected and rejected (never cached/parsed).
"""

from __future__ import annotations

import html as _html
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
PHILOSOPHER_CATEGORY = "Philosopher"

# The category selector's own options — they appear in EVERY page's dropdown
# (constant across pages) and are NOT survey variables. Dropped from enumeration.
# Validated: none ever appears as a paired variable in real correlation data.
CATEGORY_LABELS = frozenset({
    "Philosophical questions", "Philosopher", "AOS", "Region of affiliation",
    "Region of nationality", "Region of PhD", "Gender", "Tradition", "Other demographics",
})

_R = re.compile(r"r:\s*(-?\d*\.?\d+)")
_INT = re.compile(r"^-?\d+$")
# The variable picker is a dropdown of <a class="dropdown-item"><span> Label </span></a>.
_DROPDOWN = re.compile(
    r'<a[^>]*class="[^"]*dropdown-item[^"]*"[^>]*>.*?<span[^>]*>(.*?)</span>',
    re.IGNORECASE | re.DOTALL,
)


class ChallengeError(RuntimeError):
    """Raised when a fetch returns a bot-challenge interstitial, not a real page."""


def is_challenge(html: str) -> bool:
    """A Cloudflare 'Just a moment…' interstitial — NOT a real page. Real pages
    also embed the invisible ``challenge-platform`` script, so we key on the
    interstitial signature only (title/body text + the running-challenge div),
    never on the generic cf script."""
    low = html.lower()
    if "just a moment" in low or "challenge-running" in low or "cf-error-details" in low:
        return True
    # An interstitial is tiny; a real results page is ~1MB+.
    return len(html) < 5000 and ("cf-challenge" in low or "_cf_chl_opt" in low)


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
    """Segments each ``<table class="table">`` correlation block, collecting BOTH
    variable labels from the block itself — the ``.colname <a>`` (column variable)
    and the ``td.rowlabel.rowname`` (row variable) — plus r and the integer <td>s
    inside <tbody> (the 2x2 cells, reading order aa, ar, ra, rr with rows = the row
    variable, cols = the column variable). Reading both endpoints from the block
    means orientation is never assumed (the page variable may be row OR column)."""

    def __init__(self) -> None:
        super().__init__()
        self.blocks: list[dict] = []
        self._depth = 0
        self._cur: dict | None = None
        self._in_tbody = False
        self._a: str | None = None
        self._a_href = ""
        self._td: str | None = None
        self._td_in_body = False
        self._td_is_rowname = False

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self._depth += 1
            if self._depth == 1:
                self._cur = {"text": "", "links": [], "cells": [], "rowname": ""}
        if self._cur is None:
            return
        if tag == "tbody":
            self._in_tbody = True
        elif tag == "a":
            self._a = ""
            self._a_href = dict(attrs).get("href", "") or ""
        elif tag == "td":
            self._td = ""
            self._td_in_body = self._in_tbody
            self._td_is_rowname = "rowname" in (dict(attrs).get("class", "") or "")

    def handle_data(self, data):
        if self._cur is not None:
            self._cur["text"] += data
        if self._a is not None:
            self._a += data
        if self._td is not None:
            self._td += data

    def handle_endtag(self, tag):
        if self._cur is None:
            return
        if tag == "tbody":
            self._in_tbody = False
        elif tag == "a" and self._a is not None:
            self._cur["links"].append((self._a.strip(), self._a_href))
            self._a = None
        elif tag == "td" and self._td is not None:
            t = self._td.strip()
            if self._td_is_rowname:
                self._cur["rowname"] = t  # the row variable label
            elif self._td_in_body and _INT.match(t):
                self._cur["cells"].append(int(t))
            self._td = None
        elif tag == "table":
            if self._depth == 1:
                self.blocks.append(self._cur)
                self._cur = None
            self._depth = max(0, self._depth - 1)


def _query(url: str) -> dict[str, list[str]]:
    return urllib.parse.parse_qs(urllib.parse.urlparse(url).query)


def _variable_from_href(href: str) -> str | None:
    vals = _query(_html.unescape(href)).get("variable")
    return vals[0] if vals else None


def variable_from_url(url: str) -> str | None:
    return _variable_from_href(url)


def category_from_url(url: str) -> str | None:
    vals = _query(url).get("category")
    return vals[0] if vals else None


def parse_correlations(html: str, page_variable: str | None = None) -> list[ParsedCorrelation]:
    """Parse a page's correlation blocks. Each block fully specifies its pair —
    ``label_a`` = row variable, ``label_b`` = column variable — so orientation is
    read, never assumed (this eliminates self-pairs when the page variable lands
    in the column). ``page_variable`` is accepted for API compatibility but not
    used for pairing. n is the cell sum; p is not shown per block (all p<0.0001)."""
    parser = _PageParser()
    parser.feed(html)
    out: list[ParsedCorrelation] = []
    for block in parser.blocks:
        mr = _R.search(block["text"])
        row_label = block["rowname"].strip()
        col = next(((t, h) for t, h in block["links"] if "variable=" in h), None)
        cl = block["cells"]
        if not mr or not row_label or col is None or len(cl) != 4:
            continue
        col_label, href = col
        cells = Cells(aa=cl[0], ar=cl[1], ra=cl[2], rr=cl[3])  # rows=row, cols=col
        out.append(
            ParsedCorrelation(
                label_a=row_label,
                label_b=col_label,
                r=float(mr.group(1)),
                n=cells.aa + cells.ar + cells.ra + cells.rr,
                p_value=None,
                cells=cells,
                paired_variable_id=_variable_from_href(href),
            )
        )
    return out


def parse_variable_inventory(html: str) -> list[str]:
    """The variables from the dropdown-item picker (deduped, order preserved).
    The 9 category-selector labels are dropped — they are not survey variables."""
    out: list[str] = []
    seen: set[str] = set()
    for raw in _DROPDOWN.findall(html):
        label = re.sub(r"<[^>]+>", "", _html.unescape(raw)).strip()
        if not label or label.lower() == "select a variable" or label in CATEGORY_LABELS:
            continue
        if label not in seen:
            seen.add(label)
            out.append(label)
    return out


def derive_philosophers(scraper: "PhilPeopleScraper") -> list[str]:
    """The ~60 philosopher names from the Philosopher category's dropdown (any
    category=Philosopher page carries it; category labels already filtered out)."""
    html = scraper.fetch(f"{PHILPEOPLE_BASE}{CORRELATIONS_PATH}?category={urllib.parse.quote(PHILOSOPHER_CATEGORY)}")
    return parse_variable_inventory(html)


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
        # NOTE (why this succeeds where a bare `curl` got a Cloudflare challenge):
        # the live capture passed the invisible Cloudflare check with a plain
        # urllib GET carrying the ScrapeConfig.user_agent ("DELIB/0.1 (research;
        # consequence mapping)") — a descriptive, non-curl UA. If Cloudflare
        # tightens and challenge stubs start appearing (ChallengeError), options
        # in order: (1) a browser-like User-Agent, (2) a persisted cf_clearance
        # cookie from one manual browser solve, (3) a real browser session
        # (Playwright). The cache makes any of these a one-time cost.
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
        # A bot-challenge stub is a FAILED fetch, not a page: never cache it (so
        # it stays refetch-eligible) and never let it reach the parser/store.
        # This is distinct from a PARSE failure, which does not gate caching.
        if is_challenge(html):
            raise ChallengeError(f"bot-challenge interstitial for {url} (not cached)")
        self.cache.put(url, html)  # unconditional wrt parse outcome
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
    "PHILOSOPHER_CATEGORY",
    "CATEGORY_LABELS",
    "derive_philosophers",
    "ScrapeConfig",
    "ParsedCorrelation",
    "Inconsistency",
    "ChallengeError",
    "is_challenge",
    "parse_correlations",
    "parse_variable_inventory",
    "build_correlation_url",
    "variable_from_url",
    "category_from_url",
    "ingest_page",
    "PhilPeopleScraper",
]
