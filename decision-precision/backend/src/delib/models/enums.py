"""Enumerations and ordinal mappings shared across the DELIB schema."""

from __future__ import annotations

from enum import Enum


class NodeType(str, Enum):
    SEED = "SEED"
    DECISION = "DECISION"
    CONSEQUENCE = "CONSEQUENCE"
    STATE = "STATE"


class EdgeType(str, Enum):
    CAUSAL = "CAUSAL"
    DELIBERATIVE = "DELIBERATIVE"
    CLOSURE = "CLOSURE"


class EvidenceGrade(str, Enum):
    """How well the empirical literature backs a causal claim."""

    SUPPORTED = "SUPPORTED"
    WEAK = "WEAK"
    CONTESTED = "CONTESTED"
    CONTRADICTED = "CONTRADICTED"
    ANALOGICAL = "ANALOGICAL"
    SPECULATIVE = "SPECULATIVE"


class ClosureSatisfaction(str, Enum):
    """How a consequence relates to the seed's goal state."""

    FULFILLS = "FULFILLS"
    DEFEATS = "DEFEATS"
    PARTIAL = "PARTIAL"


class LoopClass(str, Enum):
    """Classification of a causal cycle (system-dynamics sense)."""

    REINFORCING = "REINFORCING"
    BALANCING = "BALANCING"
    UNDETERMINED = "UNDETERMINED"


# --- Evidence-grade ordinal mapping ----------------------------------------
# Used by `path_confidence`: the confidence of a causal path is its weakest
# link (the MIN of the ordinals along the path). Higher ordinal == higher
# confidence that the causal claim actually holds.
#
# NOTE (flagged for confirmation): the *ordering* below is a semantic choice
# the brief does not fully pin down. Rationale for the default:
#   SUPPORTED    direct empirical support                       -> highest
#   WEAK         some real but weak support
#   ANALOGICAL   transferred from an analogous domain (transfer risk)
#   SPECULATIVE  plausible reasoning, no evidence yet
#   CONTESTED    literature actively conflicts
#   CONTRADICTED evidence points against the claim              -> lowest
# It lives in exactly one place so re-ordering is a one-line change.
EVIDENCE_GRADE_ORDINAL: dict[EvidenceGrade, int] = {
    EvidenceGrade.SUPPORTED: 5,
    EvidenceGrade.WEAK: 4,
    EvidenceGrade.ANALOGICAL: 3,
    EvidenceGrade.SPECULATIVE: 2,
    EvidenceGrade.CONTESTED: 1,
    EvidenceGrade.CONTRADICTED: 0,
}
