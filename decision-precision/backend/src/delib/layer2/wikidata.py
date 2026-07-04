"""Wikidata influence source (Stage B).

Raper's method upgraded to Wikidata SPARQL. The HTTP fetcher is injectable so
tests run offline; the default uses stdlib urllib (no new dependency). Every
raw response is cached, so a real pull happens once and nothing external is
load-bearing thereafter.
"""

from __future__ import annotations

import hashlib
import json
import urllib.parse
import urllib.request
from typing import Callable

from pydantic import BaseModel

from .cache import SparqlCache

WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"

# Relations pulled per the spec.
RELATION_PROPERTY = {
    "influenced_by": "P737",
    "student_of": "P1066",
    "student": "P802",
    "movement": "P135",
}


class ThinkerEdge(BaseModel):
    """A normalized, direction-preserving influence edge: influence flows
    influencer -> influenced."""

    influencer_qid: str
    influenced_qid: str
    relation: str


def _qid(uri: str) -> str:
    return uri.rsplit("/", 1)[-1]


def _default_fetcher(query: str) -> dict:  # pragma: no cover - network
    url = WIKIDATA_SPARQL + "?" + urllib.parse.urlencode({"query": query, "format": "json"})
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "DELIB/0.1 (research; consequence mapping)",
            "Accept": "application/sparql-results+json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


class WikidataClient:
    def __init__(
        self,
        fetcher: Callable[[str], dict] | None = None,
        cache: SparqlCache | None = None,
    ) -> None:
        self._fetch = fetcher or _default_fetcher
        self.cache = cache or SparqlCache()

    def _run(self, query: str) -> dict:
        key = hashlib.sha256(query.encode("utf-8")).hexdigest()
        cached = self.cache.get(key)
        if cached is not None:
            return json.loads(cached)
        result = self._fetch(query)
        self.cache.put(key, json.dumps(result))
        return result

    @staticmethod
    def _values(qids: list[str]) -> str:
        return " ".join(f"wd:{q}" for q in qids)

    def influenced_by(self, qids: list[str]) -> list[ThinkerEdge]:
        """P737: ``?s wdt:P737 ?o`` means s is influenced by o, so influence
        flows o -> s."""
        query = (
            f"SELECT ?s ?o WHERE {{ VALUES ?s {{ {self._values(qids)} }} ?s wdt:P737 ?o . }}"
        )
        data = self._run(query)
        edges: list[ThinkerEdge] = []
        for b in data.get("results", {}).get("bindings", []):
            edges.append(
                ThinkerEdge(
                    influencer_qid=_qid(b["o"]["value"]),
                    influenced_qid=_qid(b["s"]["value"]),
                    relation="influenced_by",
                )
            )
        return edges

    def student_of(self, qids: list[str]) -> list[ThinkerEdge]:
        """P1066: ``?s wdt:P1066 ?o`` means s is a student of o; the teacher o
        influences the student s."""
        query = (
            f"SELECT ?s ?o WHERE {{ VALUES ?s {{ {self._values(qids)} }} ?s wdt:P1066 ?o . }}"
        )
        data = self._run(query)
        return [
            ThinkerEdge(
                influencer_qid=_qid(b["o"]["value"]),
                influenced_qid=_qid(b["s"]["value"]),
                relation="student_of",
            )
            for b in data.get("results", {}).get("bindings", [])
        ]


__all__ = ["WikidataClient", "ThinkerEdge", "RELATION_PROPERTY", "WIKIDATA_SPARQL"]
