"""Layer 2 enumerations."""

from __future__ import annotations

from enum import Enum


class Grain(str, Enum):
    """Nesting grain. Distances are computed and reported AT A STATED GRAIN;
    a tradition-level distance is not a claim about its children."""

    TRADITION = "TRADITION"
    POSITION = "POSITION"
    CLAIM = "CLAIM"


# Coarse -> fine ordering; a node's parent must be same-or-coarser grain.
GRAIN_ORDER: dict[Grain, int] = {Grain.TRADITION: 0, Grain.POSITION: 1, Grain.CLAIM: 2}


class Placement(str, Enum):
    """How a node got its coordinates. Estimates must declare themselves."""

    UNPLACED = "UNPLACED"  # exists (has edges/bridge) but not yet on the metric
    PARTIAL = "PARTIAL"  # smoke-test coords from a sparse component; NOT the metric
    SURVEY = "SURVEY"  # placed by the Bourget-Chalmers survey metric (ground truth)
    CALIBRATED = "CALIBRATED"  # placed by Procrustes-calibrated embedding (estimate)
    CORROBORATED = "CORROBORATED"  # survey/calibrated + independent instruments agree


class Layer2EdgeType(str, Enum):
    INFLUENCE = "INFLUENCE"  # Wikidata P737 projections (dated)
    DESCENT = "DESCENT"  # curated refinement/schism lineage
    ATTACK = "ATTACK"  # curated; states the contested proposition
    COMPATIBILITY = "COMPATIBILITY"  # curated
    EMPIRICAL_OPPOSITION = "EMPIRICAL_OPPOSITION"  # survey r <= -threshold (corroborates ATTACK)
    EMPIRICAL_COBELIEF = "EMPIRICAL_COBELIEF"  # survey r >= threshold


class Provenance(str, Enum):
    WIKIDATA = "wikidata"
    PHILPAPERS = "philpapers"
    PHILSURVEY = "philsurvey2020"
    EMPIRICAL_SURVEY = "empirical_survey"  # A7: measured thinker<->position identification
    MANUAL = "manual"
    CURATED = "curated"


# Bridge (thinker -> position/tradition) provenance priority: a manual override
# beats measured survey evidence, which beats crowd-curated Wikidata claims.
BRIDGE_PROVENANCE_PRIORITY: dict[Provenance, int] = {
    Provenance.MANUAL: 3,
    Provenance.EMPIRICAL_SURVEY: 2,
    Provenance.WIKIDATA: 1,
    Provenance.PHILPAPERS: 1,
    Provenance.PHILSURVEY: 1,
    Provenance.CURATED: 1,
}


class SourceTier(str, Enum):
    PUBLISHED_TABLE = "PUBLISHED_TABLE"  # the fixture (top of the distribution)
    SITE_SCRAPE = "SITE_SCRAPE"  # survey2020.philpeople.org per-question pages
    RESPONSE_DATA = "RESPONSE_DATA"  # anonymized respondent rows (authoritative)


# merge priority: higher wins
TIER_PRIORITY: dict[SourceTier, int] = {
    SourceTier.PUBLISHED_TABLE: 1,
    SourceTier.SITE_SCRAPE: 2,
    SourceTier.RESPONSE_DATA: 3,
}


__all__ = [
    "Grain",
    "GRAIN_ORDER",
    "Placement",
    "Layer2EdgeType",
    "Provenance",
    "BRIDGE_PROVENANCE_PRIORITY",
    "SourceTier",
    "TIER_PRIORITY",
]
