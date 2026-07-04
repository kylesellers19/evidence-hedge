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
    SURVEY = "SURVEY"  # placed by the Bourget-Chalmers survey metric (ground truth)
    CALIBRATED = "CALIBRATED"  # placed by Procrustes-calibrated embedding (estimate)
    CORROBORATED = "CORROBORATED"  # survey/calibrated + independent instruments agree


class Layer2EdgeType(str, Enum):
    INFLUENCE = "INFLUENCE"  # Wikidata P737 projections (dated)
    DESCENT = "DESCENT"  # curated refinement/schism lineage
    ATTACK = "ATTACK"  # curated; states the contested proposition
    COMPATIBILITY = "COMPATIBILITY"  # curated


class Provenance(str, Enum):
    WIKIDATA = "wikidata"
    PHILPAPERS = "philpapers"
    MANUAL = "manual"
    CURATED = "curated"


__all__ = ["Grain", "GRAIN_ORDER", "Placement", "Layer2EdgeType", "Provenance"]
