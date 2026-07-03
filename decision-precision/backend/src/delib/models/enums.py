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
    FRAMES = "FRAMES"


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
# VALIDATED against evidence-hierarchy scholarship (GRADE, OCEBM 2011, Maryland
# SMS, Nesta, IPCC) — see docs/evidence-hierarchies.md for the anchor levels and
# sources behind each rung. The six grades project three axes (direction,
# certainty, directness) onto one ordinal; Phase 4/5 will back this with the
# richer {direction, certainty, provenance} representation.
#
# The one expert-disputed adjacency is SPECULATIVE (2) > CONTESTED (1): an
# untested-but-plausible mechanism keeps forward warrant, whereas contested
# direct evidence has shown the effect is unreliable. Swap the two if you prefer
# "any direct signal outranks none" — this dict is the single place to do it.
EVIDENCE_GRADE_ORDINAL: dict[EvidenceGrade, int] = {
    EvidenceGrade.SUPPORTED: 5,
    EvidenceGrade.WEAK: 4,
    EvidenceGrade.ANALOGICAL: 3,
    EvidenceGrade.SPECULATIVE: 2,
    EvidenceGrade.CONTESTED: 1,
    EvidenceGrade.CONTRADICTED: 0,
}
