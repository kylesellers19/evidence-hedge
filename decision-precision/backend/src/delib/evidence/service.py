"""EvidenceService — the session-scoped wiring of the multiplexer.

Holds the persistent claim store, the raw-response cache, the source plugins, the
dual budget meter, and (lazily) the grader LLM. Exposes the three operations the
API surface needs: re-grade a claim (a fresh snapshot), read a claim's current
grade, and read the running budget. The LLM transport is constructed lazily so
importing the service never pulls LiteLLM; tests inject a fake instead.
"""

from __future__ import annotations

import os
import urllib.request
from typing import Callable

from ..layer2.cache import SparqlCache
from ..llm.interface import LLM
from .budget import BudgetConfig, BudgetMeter
from .claims import ClaimRecord, ClaimStore
from .grader import grade_and_store
from .grading import ClaimDomain
from .retrieve import MultiplexerRetriever
from .sources import EvidenceSource, OpenAlexSource, PubMedSource, SemanticScholarSource

Fetcher = Callable[[str], str]


def default_sources() -> list[EvidenceSource]:
    return [
        OpenAlexSource(api_key=os.environ.get("OPENALEX_API_KEY"), mailto=os.environ.get("DELIB_MAILTO")),
        SemanticScholarSource(),
        PubMedSource(api_key=os.environ.get("NCBI_API_KEY")),
    ]


def http_fetcher(url: str) -> str:  # pragma: no cover - real transport
    req = urllib.request.Request(url, headers={"User-Agent": "delib-evidence/0.1"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8")


class EvidenceService:
    def __init__(
        self,
        *,
        claim_store: ClaimStore | None = None,
        budget_config: BudgetConfig | None = None,
        sources: list[EvidenceSource] | None = None,
        cache: SparqlCache | None = None,
        llm: LLM | None = None,
        fetcher: Fetcher | None = None,
    ) -> None:
        self.claim_store = claim_store or ClaimStore()
        self.budget = BudgetMeter(budget_config or BudgetConfig())
        self.cache = cache or SparqlCache()
        self.sources = sources if sources is not None else default_sources()
        self.fetcher = fetcher or http_fetcher
        self._llm = llm  # lazily built if None
        self.retriever = MultiplexerRetriever(self.sources, self.cache, self.fetcher, budget=self.budget)

    @property
    def llm(self) -> LLM:
        if self._llm is None:  # pragma: no cover - real transport
            self._llm = LLM(budget=self.budget)
        return self._llm

    def regrade(
        self, claim_text: str, *, domain: ClaimDomain, health_typed: bool, now: float
    ) -> ClaimRecord:
        """Retrieve evidence and write a fresh grade snapshot. Budget-gated:
        retrieval checks the source cap; the grader records LLM dollars."""
        papers = self.retriever.retrieve(claim_text, health_typed=health_typed)
        return grade_and_store(self.llm, self.claim_store, claim_text, papers, domain, graded_at=now)

    def get_claim(self, claim_text: str) -> ClaimRecord | None:
        return self.claim_store.get_by_text(claim_text)

    def budget_snapshot(self) -> dict:
        return self.budget.snapshot()


__all__ = ["EvidenceService", "default_sources", "http_fetcher"]
