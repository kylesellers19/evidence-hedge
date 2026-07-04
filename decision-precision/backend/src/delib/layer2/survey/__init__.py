"""Layer 2 Stage A — the survey metric space (Bourget & Chalmers 2020).

We replicate the paper's published methodology, we do not invent: |r| routes to
the metric (their 1-|rho| clustering distance, sqrt-adjusted), sign routes to the
edge layer.
"""

from .store import CorrelationRow, CorrelationStore, SourceTier, slugify
from .loader import DEFAULT_FIXTURE, load_fixture

__all__ = [
    "SourceTier",
    "CorrelationRow",
    "CorrelationStore",
    "slugify",
    "load_fixture",
    "DEFAULT_FIXTURE",
]
