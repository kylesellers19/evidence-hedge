"""Node models.

Type discipline is the point: each node type is a *distinct* pydantic model with
``extra="forbid"``, so it is structurally impossible to attach proctor scores to
a consequence, valences to a decision, etc. — such fields are rejected as
unexpected extras at construction time. The public :data:`Node` type is a
discriminated union keyed on ``type``.
"""

from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field

from .enums import CodingStatus, Confidence, NodeType, Register

_STRICT = ConfigDict(extra="forbid")


# --- Sub-models -------------------------------------------------------------


class ProctorScore(BaseModel):
    """A single Proctor implementation-outcome score with its justification."""

    model_config = _STRICT
    score: int = Field(ge=1, le=5)
    justification: str = Field(min_length=1)


class ProctorScores(BaseModel):
    """The five Proctor implementation outcomes (decisions only)."""

    model_config = _STRICT
    acceptability: ProctorScore
    feasibility: ProctorScore
    cost: ProctorScore
    sustainability: ProctorScore
    adoption: ProctorScore


class CFIRTags(BaseModel):
    """CFIR domain tags (decisions only). Each domain holds construct tags."""

    model_config = _STRICT
    innovation: list[str] = Field(default_factory=list)
    outer_setting: list[str] = Field(default_factory=list)
    inner_setting: list[str] = Field(default_factory=list)
    individuals: list[str] = Field(default_factory=list)
    process: list[str] = Field(default_factory=list)


class RegisterEngagement(BaseModel):
    """A consequence engaging one order of worth (Boltanski–Thévenot register).

    UNSIGNED: it names the register invoked, evidenced by a ``signature_marker``
    (a quoted phrase from the source that triggered the attribution). Tension
    comes from the curated clash table over the set of engaged registers, not
    from a per-engagement sign.
    """

    model_config = _STRICT
    register: Register
    signature_marker: str = Field(min_length=1, description="Quoted phrase evidencing this register.")
    justification: str = Field(min_length=1)
    confidence: Confidence = Confidence.MODERATE


class TraditionAttribution(BaseModel):
    """A consequence attributed to a normative tradition (leaf id). Same unsigned
    shape as a register engagement; tradition tensions come from the curated
    attack matrix over adjacent nodes' traditions."""

    model_config = _STRICT
    tradition: str = Field(min_length=1, description="Tradition leaf id.")
    signature_marker: str = Field(min_length=1, description="Quoted phrase evidencing this tradition.")
    justification: str = Field(min_length=1)
    confidence: Confidence = Confidence.MODERATE


# --- Node types -------------------------------------------------------------


class _NodeBase(BaseModel):
    model_config = _STRICT
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    ring: int = Field(ge=0, description="Causal distance from the seed.")
    coding_status: CodingStatus = CodingStatus.PENDING


class SeedNode(BaseModel):
    """The root question. ``goal_state_text`` is what closure edges test."""

    model_config = _STRICT
    type: Literal[NodeType.SEED] = NodeType.SEED
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    ring: Literal[0] = 0
    question_text: str = Field(min_length=1)
    goal_state_text: str = Field(min_length=1)
    goal_criteria: list[str] = Field(default_factory=list)


class DecisionNode(_NodeBase):
    type: Literal[NodeType.DECISION] = NodeType.DECISION
    alternatives: list[str] = Field(default_factory=list)
    cfir_tags: CFIRTags
    proctor_scores: ProctorScores
    expanded: bool = False
    unexpanded_child_estimate: int = Field(default=0, ge=0)


class ConsequenceNode(_NodeBase):
    type: Literal[NodeType.CONSEQUENCE] = NodeType.CONSEQUENCE
    registers: list[RegisterEngagement] = Field(default_factory=list)
    traditions: list[TraditionAttribution] = Field(default_factory=list)
    goal_relevance: float = Field(ge=0.0, le=1.0)
    expanded: bool = False
    unexpanded_child_estimate: int = Field(default=0, ge=0)


class StateNode(_NodeBase):
    """An intermediate world-state.

    NOTE (flagged for confirmation): the brief lists STATE as a node type but
    does not spell out its fields. Kept minimal (label + optional criteria)
    until you pin the schema.
    """

    type: Literal[NodeType.STATE] = NodeType.STATE
    criteria: list[str] = Field(default_factory=list)


# Discriminated union — parse/serialize any node by its ``type`` tag.
Node = Annotated[
    Union[SeedNode, DecisionNode, ConsequenceNode, StateNode],
    Field(discriminator="type"),
]

__all__ = [
    "ProctorScore",
    "ProctorScores",
    "CFIRTags",
    "RegisterEngagement",
    "TraditionAttribution",
    "SeedNode",
    "DecisionNode",
    "ConsequenceNode",
    "StateNode",
    "Node",
]
