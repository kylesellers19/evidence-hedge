"""Deduplication (Phase 2c).

When an expansion produces a node that means the same thing as one already in
the graph, we merge: instead of adding a twin, we rewire the new edge to the
existing node. A node that thereby gains a second parent turns the tree into a
DAG — which is the intended outcome.

The similarity backend is a seam: today a cheap string-similarity stub, later an
embedding backend, swapped without touching the merge logic. Only same-type
nodes are ever considered duplicates.
"""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from difflib import SequenceMatcher

from .graph import DelibGraph
from .models.nodes import Node

_WS = re.compile(r"\s+")
_PUNCT = re.compile(r"[^\w\s]")


def _normalize(text: str) -> str:
    return _WS.sub(" ", _PUNCT.sub("", text.lower())).strip()


class SimilarityBackend(ABC):
    """Maps two labels to a similarity in [0, 1]."""

    @abstractmethod
    def similarity(self, a: str, b: str) -> float: ...


class StringSimilarityBackend(SimilarityBackend):
    """Stub backend: normalized SequenceMatcher ratio. Replace with an embedding
    backend later — the Deduplicator does not care which is in use."""

    def similarity(self, a: str, b: str) -> float:
        return SequenceMatcher(None, _normalize(a), _normalize(b)).ratio()


class Deduplicator:
    def __init__(
        self,
        backend: SimilarityBackend | None = None,
        threshold: float = 0.85,
    ) -> None:
        self.backend = backend or StringSimilarityBackend()
        self.threshold = threshold

    def score(self, node: Node, other: Node) -> float:
        """0 unless the two are the same node type; else label similarity."""
        if node.type is not other.type:
            return 0.0
        return self.backend.similarity(node.label, other.label)

    def find_duplicate(self, graph: DelibGraph, node: Node) -> str | None:
        """Id of the most-similar existing same-type node above threshold, if
        any (never the node's own id)."""
        best_id: str | None = None
        best_score = self.threshold
        for existing in graph.nodes():
            if existing.id == node.id:
                continue
            s = self.score(node, existing)
            if s >= best_score:
                best_score = s
                best_id = existing.id
        return best_id


__all__ = [
    "SimilarityBackend",
    "StringSimilarityBackend",
    "Deduplicator",
]
