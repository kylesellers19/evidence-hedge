"""Layer 2 Stage A — the survey metric space (Bourget & Chalmers 2020).

We replicate the paper's published methodology, we do not invent: |r| routes to
the metric (their 1-|rho| clustering distance, sqrt-adjusted), sign routes to the
edge layer.
"""

from .store import Cells, CorrelationRow, CorrelationStore, SourceTier, slugify
from .loader import DEFAULT_FIXTURE, load_fixture
from .metric import (
    DEFAULT_DISTANCE,
    OPPOSITION_THRESHOLD,
    ingest_survey_into_map,
    linear_distance,
    phi_from_cells,
    route_sign,
    sqrt_distance,
)
from .tradition_map import REGISTRY_LEAF_BY_OPTION, REGISTRY_LEAVES

__all__ = [
    "SourceTier",
    "Cells",
    "CorrelationRow",
    "CorrelationStore",
    "slugify",
    "phi_from_cells",
    "load_fixture",
    "DEFAULT_FIXTURE",
    "sqrt_distance",
    "linear_distance",
    "DEFAULT_DISTANCE",
    "OPPOSITION_THRESHOLD",
    "route_sign",
    "ingest_survey_into_map",
    "REGISTRY_LEAF_BY_OPTION",
    "REGISTRY_LEAVES",
]
