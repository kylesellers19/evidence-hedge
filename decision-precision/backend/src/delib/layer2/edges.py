"""Layer 2 edges — kept distinct, never merged (per the spec).

Four edge types as separate ``extra="forbid"`` models, so ``about`` (the
contested proposition) can only live on an ATTACK edge and ``period`` (the dating)
only on an INFLUENCE edge — putting either on the wrong edge type raises. All
carry provenance + confidence, consistent with DELIB's "every claim is graded"
epistemics.
"""

from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field

from .enums import Layer2EdgeType, Provenance

_STRICT = ConfigDict(extra="forbid")


class _Layer2EdgeBase(BaseModel):
    model_config = _STRICT
    source: str = Field(min_length=1)
    target: str = Field(min_length=1)
    provenance: Provenance
    confidence: float = Field(ge=0.0, le=1.0)


class InfluenceEdge(_Layer2EdgeBase):
    type: Literal[Layer2EdgeType.INFLUENCE] = Layer2EdgeType.INFLUENCE
    weight: float | None = Field(default=None, ge=0.0)
    period: int | None = Field(default=None, description="Century or year (thinker floruit).")


class DescentEdge(_Layer2EdgeBase):
    type: Literal[Layer2EdgeType.DESCENT] = Layer2EdgeType.DESCENT
    weight: float | None = Field(default=None, ge=0.0)


class AttackEdge(_Layer2EdgeBase):
    type: Literal[Layer2EdgeType.ATTACK] = Layer2EdgeType.ATTACK
    about: str = Field(min_length=1, description="The proposition contested.")


class CompatibilityEdge(_Layer2EdgeBase):
    type: Literal[Layer2EdgeType.COMPATIBILITY] = Layer2EdgeType.COMPATIBILITY
    weight: float | None = Field(default=None, ge=0.0)


Layer2Edge = Annotated[
    Union[InfluenceEdge, DescentEdge, AttackEdge, CompatibilityEdge],
    Field(discriminator="type"),
]

__all__ = [
    "InfluenceEdge",
    "DescentEdge",
    "AttackEdge",
    "CompatibilityEdge",
    "Layer2Edge",
]
