"""Layer 2 — influence graph over co-belief geometry (see docs/layer2-map-spec.md).

Stage 0: typed schema + container + diagnostic queries (no external deps).
Later stages add the survey metric (A), Wikidata edges (B), calibration (C),
and validation (D).
"""

from .bridge import BridgeAssignment, BridgeRelation, Thinker
from .edges import (
    AttackEdge,
    CompatibilityEdge,
    DescentEdge,
    InfluenceEdge,
    Layer2Edge,
)
from .enums import Grain, Layer2EdgeType, Placement, Provenance
from .map import Layer2ConstraintError, Layer2Map
from .nodes import MapNode
from .queries import (
    DiagnosticReport,
    LineageDrift,
    diagnostic_regions,
    lineage_drift,
    node_distance,
)
from .cache import SparqlCache
from .wikidata import ThinkerEdge, WikidataClient
from .project import project_influence
from .registry_link import link_frameworks, traditions_from_frameworks

__all__ = [
    # enums
    "Grain",
    "Placement",
    "Layer2EdgeType",
    "Provenance",
    # nodes / edges / bridge
    "MapNode",
    "InfluenceEdge",
    "DescentEdge",
    "AttackEdge",
    "CompatibilityEdge",
    "Layer2Edge",
    "Thinker",
    "BridgeAssignment",
    "BridgeRelation",
    # container
    "Layer2Map",
    "Layer2ConstraintError",
    # queries
    "node_distance",
    "diagnostic_regions",
    "DiagnosticReport",
    "lineage_drift",
    "LineageDrift",
    # stage B: wikidata influence
    "SparqlCache",
    "WikidataClient",
    "ThinkerEdge",
    "project_influence",
    "link_frameworks",
    "traditions_from_frameworks",
]
