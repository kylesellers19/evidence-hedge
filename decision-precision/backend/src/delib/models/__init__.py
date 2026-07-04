"""DELIB pydantic schema (Phase 1)."""

import warnings

# RegisterEngagement / RegisterEngagementCoding deliberately name a field
# `register` (the order-of-worth it carries). Pydantic warns that the name shadows
# a BaseModel attribute; the shadow is accepted — we never touch BaseModel.register
# and the JSON/API contract needs exactly this name. Registered here (the models
# package is imported before any such class is defined) so it covers both classes.
warnings.filterwarnings(
    "ignore",
    message=r'Field name "register" .*shadows an attribute in parent "BaseModel"',
    category=UserWarning,
)

from .enums import (
    ClosureSatisfaction,
    CodingStatus,
    Confidence,
    EdgeType,
    EffectType,
    EvidenceGrade,
    LoopClass,
    NodeType,
    Register,
    EVIDENCE_GRADE_ORDINAL,
)
from .nodes import (
    CFIRTags,
    ConsequenceNode,
    DecisionNode,
    DistributionalEffect,
    Node,
    ProctorScore,
    ProctorScores,
    RegisterEngagement,
    SeedNode,
    StateNode,
    TraditionAttribution,
)
from .registers import register_clashes
from .traditions import TRADITION_LEAVES, TraditionAttack, tradition_attacks
from .edges import (
    CausalEdge,
    Citation,
    ClosureEdge,
    DeliberativeEdge,
    Edge,
    FramesEdge,
)
from .registries import (
    Stakeholder,
    StakeholderRegistry,
)

__all__ = [
    # enums
    "NodeType",
    "EdgeType",
    "EvidenceGrade",
    "ClosureSatisfaction",
    "LoopClass",
    "Register",
    "Confidence",
    "CodingStatus",
    "EffectType",
    "EVIDENCE_GRADE_ORDINAL",
    # nodes
    "SeedNode",
    "DecisionNode",
    "ConsequenceNode",
    "StateNode",
    "Node",
    "CFIRTags",
    "ProctorScore",
    "ProctorScores",
    "RegisterEngagement",
    "TraditionAttribution",
    "DistributionalEffect",
    # registers / traditions
    "register_clashes",
    "TRADITION_LEAVES",
    "TraditionAttack",
    "tradition_attacks",
    # edges
    "CausalEdge",
    "DeliberativeEdge",
    "ClosureEdge",
    "FramesEdge",
    "Citation",
    "Edge",
    # registries
    "Stakeholder",
    "StakeholderRegistry",
]
