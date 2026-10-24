"""The retrieval multiplexer — one call fans out to the enabled source plugins,
caches raw responses, and merges the results on DOI.

PubMed is health-routed: it only runs for health-typed claims (the caller decides
by node/claim type), so policy/economic claims don't waste a biomedical query.
Budget gating (step 5) wraps this; retrieval itself just fans out and merges.
"""

from __future__ import annotations

from ..layer2.cache import SparqlCache
from .budget import BudgetMeter
from .sources import EvidenceSource, Fetcher, MergedPaper, PubMedSource, merge_on_doi


class MultiplexerRetriever:
    def __init__(
        self,
        sources: list[EvidenceSource],
        cache: SparqlCache,
        fetcher: Fetcher,
        budget: BudgetMeter | None = None,
    ) -> None:
        self.sources = sources
        self.cache = cache
        self.fetcher = fetcher
        self.budget = budget

    def retrieve(self, claim_text: str, *, limit: int = 10, health_typed: bool = False) -> list[MergedPaper]:
        papers = []
        for src in self.sources:
            if isinstance(src, PubMedSource) and not health_typed:
                continue  # biomedical index only for health-typed claims
            # cache-hit-first: a cache hit costs nothing; only a network miss
            # checks the cap and charges the meter.
            miss = self.cache.get(src.build_url(claim_text, limit)) is None
            if self.budget is not None and miss:
                self.budget.check_source(src.name)
            papers += src.search(claim_text, cache=self.cache, fetcher=self.fetcher, limit=limit)
            if self.budget is not None and miss:
                self.budget.record_source(src.name)
        return merge_on_doi(papers)


__all__ = ["MultiplexerRetriever"]
