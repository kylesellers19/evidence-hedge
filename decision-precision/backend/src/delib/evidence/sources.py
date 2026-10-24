"""Source plugins behind one interface, merged on DOI.

Each plugin turns a claim into a query, fetches raw JSON (cached UNCONDITIONALLY
before any parse — the philpeople lesson), and parses it into RetrievedPaper.
Reparse-from-cache is free (the parse never touches the network). An injected
``fetcher`` makes every plugin testable against recorded fixtures offline.

  - OpenAlex        : semantic search (claim text passed as the query)
  - Semantic Scholar: search + publicationTypes; citation intents (contrasting
                      citations feed a CONTRADICTED signal) via a second call
  - PubMed          : E-utilities esearch + esummary; health-typed claims only

Results across sources are merged on DOI (case-normalized), unioning fields and
recording which sources surfaced each paper.
"""

from __future__ import annotations

import json
import urllib.parse
from abc import ABC, abstractmethod
from typing import Callable

from pydantic import BaseModel, ConfigDict, Field

from ..layer2.cache import SparqlCache

_STRICT = ConfigDict(extra="forbid")

Fetcher = Callable[[str], str]

OPENALEX_BASE = "https://api.openalex.org/works"
S2_BASE = "https://api.semanticscholar.org/graph/v1/paper"
PUBMED_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"


def normalize_doi(doi: str | None) -> str | None:
    """Strip the URL/scheme prefix and lowercase, so the same DOI from any source
    merges. ``https://doi.org/10.1/X`` -> ``10.1/x``."""
    if not doi:
        return None
    d = doi.strip().lower()
    for prefix in ("https://doi.org/", "http://doi.org/", "doi:"):
        if d.startswith(prefix):
            d = d[len(prefix):]
    return d or None


class RetrievedPaper(BaseModel):
    model_config = _STRICT
    source: str
    doi: str | None = None
    title: str = Field(min_length=1)
    year: int | None = None
    venue: str | None = None
    abstract: str | None = None
    url: str | None = None
    publication_types: list[str] = Field(default_factory=list)  # design tags
    supporting_citations: int | None = None  # S2 intent counts
    contrasting_citations: int | None = None


class MergedPaper(BaseModel):
    model_config = _STRICT
    doi: str | None = None
    title: str
    year: int | None = None
    venue: str | None = None
    abstract: str | None = None
    url: str | None = None
    publication_types: list[str] = Field(default_factory=list)
    supporting_citations: int | None = None
    contrasting_citations: int | None = None
    sources: list[str] = Field(default_factory=list)


class EvidenceSource(ABC):
    name: str

    @abstractmethod
    def build_url(self, claim_text: str, limit: int) -> str: ...

    @abstractmethod
    def parse(self, raw: str) -> list[RetrievedPaper]: ...

    def search(
        self, claim_text: str, *, cache: SparqlCache, fetcher: Fetcher, limit: int = 10
    ) -> list[RetrievedPaper]:
        url = self.build_url(claim_text, limit)
        raw = cache.get(url)
        if raw is None:
            raw = fetcher(url)
            cache.put(url, raw)  # cached before any parse — success/failure is not the gate
        return self.parse(raw)


# --- OpenAlex ---------------------------------------------------------------


class OpenAlexSource(EvidenceSource):
    name = "openalex"

    def __init__(self, api_key: str | None = None, mailto: str | None = None) -> None:
        self.api_key = api_key
        self.mailto = mailto

    def build_url(self, claim_text: str, limit: int) -> str:
        params = {"search": claim_text, "per-page": str(limit)}
        if self.api_key:
            params["api_key"] = self.api_key
        if self.mailto:
            params["mailto"] = self.mailto
        return f"{OPENALEX_BASE}?{urllib.parse.urlencode(params)}"

    def parse(self, raw: str) -> list[RetrievedPaper]:
        data = json.loads(raw)
        out: list[RetrievedPaper] = []
        for w in data.get("results", []):
            title = w.get("display_name") or w.get("title")
            if not title:
                continue
            venue = ((w.get("primary_location") or {}).get("source") or {}).get("display_name")
            out.append(RetrievedPaper(
                source=self.name,
                doi=normalize_doi(w.get("doi")),
                title=title,
                year=w.get("publication_year"),
                venue=venue,
                abstract=_openalex_abstract(w.get("abstract_inverted_index")),
                url=w.get("id"),
                publication_types=[w["type"]] if w.get("type") else [],
            ))
        return out


def _openalex_abstract(inverted: dict | None) -> str | None:
    """OpenAlex ships abstracts as an inverted index {word: [positions]}."""
    if not inverted:
        return None
    positions: list[tuple[int, str]] = []
    for word, idxs in inverted.items():
        positions.extend((i, word) for i in idxs)
    positions.sort()
    return " ".join(w for _, w in positions) or None


# --- Semantic Scholar -------------------------------------------------------


class SemanticScholarSource(EvidenceSource):
    name = "s2"
    _FIELDS = "title,year,abstract,venue,externalIds,publicationTypes"

    def build_url(self, claim_text: str, limit: int) -> str:
        params = {"query": claim_text, "limit": str(limit), "fields": self._FIELDS}
        return f"{S2_BASE}/search?{urllib.parse.urlencode(params)}"

    def parse(self, raw: str) -> list[RetrievedPaper]:
        data = json.loads(raw)
        out: list[RetrievedPaper] = []
        for p in data.get("data", []):
            if not p.get("title"):
                continue
            out.append(RetrievedPaper(
                source=self.name,
                doi=normalize_doi((p.get("externalIds") or {}).get("DOI")),
                title=p["title"],
                year=p.get("year"),
                venue=p.get("venue"),
                abstract=p.get("abstract"),
                url=f"{S2_BASE}/{p['paperId']}" if p.get("paperId") else None,
                publication_types=list(p.get("publicationTypes") or []),
            ))
        return out

    def citations_url(self, paper_id: str, limit: int = 100) -> str:
        params = {"fields": "intents,isInfluential", "limit": str(limit)}
        return f"{S2_BASE}/{paper_id}/citations?{urllib.parse.urlencode(params)}"

    @staticmethod
    def parse_citation_intents(raw: str) -> tuple[int, int]:
        """Return (supporting, contrasting) citation counts. Contrasting citations
        are the CONTRADICTED signal."""
        data = json.loads(raw)
        supporting = contrasting = 0
        for c in data.get("data", []):
            intents = c.get("intents") or []
            if "result" in intents or "methodology" in intents or "supporting" in intents:
                supporting += 1
            if "contrasting" in intents or "contradicting" in intents:
                contrasting += 1
        return supporting, contrasting


# --- PubMed (E-utilities) ---------------------------------------------------


class PubMedSource(EvidenceSource):
    name = "pubmed"

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key

    def build_url(self, claim_text: str, limit: int) -> str:
        params = {"db": "pubmed", "term": claim_text, "retmode": "json", "retmax": str(limit)}
        if self.api_key:
            params["api_key"] = self.api_key
        return f"{PUBMED_BASE}/esearch.fcgi?{urllib.parse.urlencode(params)}"

    def summary_url(self, pmids: list[str]) -> str:
        params = {"db": "pubmed", "id": ",".join(pmids), "retmode": "json"}
        if self.api_key:
            params["api_key"] = self.api_key
        return f"{PUBMED_BASE}/esummary.fcgi?{urllib.parse.urlencode(params)}"

    def parse(self, raw: str) -> list[RetrievedPaper]:
        # esearch returns only PMIDs; the caller fetches esummary. When given an
        # esummary payload directly, parse the docsums.
        data = json.loads(raw)
        if "esearchresult" in data:  # esearch: no papers yet, just ids
            return []
        result = data.get("result", {})
        out: list[RetrievedPaper] = []
        for uid in result.get("uids", []):
            doc = result.get(uid, {})
            if not doc.get("title"):
                continue
            year = _pubmed_year(doc.get("pubdate"))
            out.append(RetrievedPaper(
                source=self.name,
                doi=normalize_doi(_pubmed_doi(doc)),
                title=doc["title"],
                year=year,
                venue=doc.get("fulljournalname") or doc.get("source"),
                url=f"https://pubmed.ncbi.nlm.nih.gov/{uid}/",
                publication_types=list(doc.get("pubtype") or []),
            ))
        return out

    @staticmethod
    def pmids(raw: str) -> list[str]:
        return list(json.loads(raw).get("esearchresult", {}).get("idlist", []))


def _pubmed_year(pubdate: str | None) -> int | None:
    if not pubdate:
        return None
    head = pubdate.strip().split(" ")[0]
    return int(head) if head.isdigit() else None


def _pubmed_doi(doc: dict) -> str | None:
    for aid in doc.get("articleids", []):
        if aid.get("idtype") == "doi":
            return aid.get("value")
    return None


# --- merge on DOI -----------------------------------------------------------


def merge_on_doi(papers: list[RetrievedPaper]) -> list[MergedPaper]:
    """Merge papers across sources by normalized DOI (papers without a DOI stay
    distinct, keyed by (source,title)). Fields are unioned; the surfacing sources
    are recorded."""
    groups: dict[object, list[RetrievedPaper]] = {}
    order: list[object] = []
    for p in papers:
        key = p.doi if p.doi else (p.source, p.title.lower())
        if key not in groups:
            groups[key] = []
            order.append(key)
        groups[key].append(p)

    merged: list[MergedPaper] = []
    for key in order:
        grp = groups[key]
        ptypes: list[str] = []
        for p in grp:
            for t in p.publication_types:
                if t not in ptypes:
                    ptypes.append(t)
        merged.append(MergedPaper(
            doi=grp[0].doi,
            title=grp[0].title,
            year=_first(p.year for p in grp),
            venue=_first(p.venue for p in grp),
            abstract=_first(p.abstract for p in grp),
            url=_first(p.url for p in grp),
            publication_types=ptypes,
            supporting_citations=_first(p.supporting_citations for p in grp),
            contrasting_citations=_first(p.contrasting_citations for p in grp),
            sources=sorted({p.source for p in grp}),
        ))
    return merged


def _first(vals):
    for v in vals:
        if v is not None:
            return v
    return None


__all__ = [
    "Fetcher",
    "RetrievedPaper",
    "MergedPaper",
    "EvidenceSource",
    "OpenAlexSource",
    "SemanticScholarSource",
    "PubMedSource",
    "normalize_doi",
    "merge_on_doi",
]
