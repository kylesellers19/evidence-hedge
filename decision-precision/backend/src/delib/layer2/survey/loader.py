"""Fixture loader (A1)."""

from __future__ import annotations

import json
from pathlib import Path

from .store import CorrelationStore, SourceTier

# repo-root/data/fixtures/... resolved from this file
DEFAULT_FIXTURE = (
    Path(__file__).resolve().parents[5] / "data" / "fixtures" / "philsurvey_2020_fixtures.json"
)


def load_fixture(
    store: CorrelationStore,
    path: str | Path = DEFAULT_FIXTURE,
    retrieved_at: float | None = None,
) -> dict:
    """Load the published-table correlations into the store. Returns the raw
    fixture dict (so callers can read meta / registry_relevant_edges)."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    for c in data["correlations"]:
        store.add(c["a"], c["b"], float(c["r"]), int(c["n"]),
                  SourceTier.PUBLISHED_TABLE, retrieved_at=retrieved_at)
    return data


__all__ = ["load_fixture", "DEFAULT_FIXTURE"]
