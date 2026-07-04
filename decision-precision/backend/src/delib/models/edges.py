"""Edge models.

Three edge types, kept structurally distinct (``extra="forbid"``) so evidence
grades cannot land on a deliberative edge, closure metadata cannot land on a
causal edge, and so on. Endpoint-*type* constraints (deliberative is
decision->decision, closure is consequence->seed) depend on knowing the node
types, so they are enforced at graph-insert time — see ``graph.DelibGraph``.
"""

from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field

from .enums import EdgeType, EvidenceGrade, ClosureSatisfaction

_STRICT = ConfigDict(extra="forbid")


class Citation(BaseModel):
    """A reference surfaced by the evidence multiplexer. Merge key is ``doi``."""

    model_config = _STRICT
    doi: str | None = None
    title: str | None = None
    year: int | None = None
    source: str | None = Field(default=None, description="Which plugin surfaced it.")
    url: str | None = None


class CausalEdge(BaseModel):
    model_config = _STRICT
    type: Literal[EdgeType.CAUSAL] = EdgeType.CAUSAL
    source: str = Field(min_length=1)
    target: str = Field(min_length=1)
    mechanism_text: str = Field(min_length=1)
    evidence_grade: EvidenceGrade = EvidenceGrade.SPECULATIVE
    # the graded claim's consistency direction — lets an ANALOGICAL grade still
    # read as supporting / mixed / contradicting (set by the evidence re-grade).
    evidence_consistency: str | None = None
    citations: list[Citation] = Field(default_factory=list)
    transfer_note: str | None = None
    # NOTE (flagged for confirmation): `polarity` is NOT in the brief's field
    # list. It is required to classify causal loops as reinforcing vs balancing
    # (product of polarities around the cycle). Additive and defaults to 0
    # (unknown) so it never breaks the specified schema; loop_inventory reports
    # UNDETERMINED when any edge on a cycle has polarity 0.
    #   +1 = same-direction (more source -> more target)
    #   -1 = opposite-direction (more source -> less target)
    #    0 = unknown / not yet coded
    polarity: int = Field(default=0, ge=-1, le=1)


class DeliberativeEdge(BaseModel):
    """Decision -> decision ordering/dependency. Must stay acyclic."""

    model_config = _STRICT
    type: Literal[EdgeType.DELIBERATIVE] = EdgeType.DELIBERATIVE
    source: str = Field(min_length=1)
    target: str = Field(min_length=1)


class ClosureEdge(BaseModel):
    """Consequence -> seed. Tests whether a consequence bears on the goal state."""

    model_config = _STRICT
    type: Literal[EdgeType.CLOSURE] = EdgeType.CLOSURE
    source: str = Field(min_length=1)
    target: str = Field(min_length=1)
    satisfies: ClosureSatisfaction
    justification: str = Field(min_length=1)


class FramesEdge(BaseModel):
    """SEED -> ring-1 node. Roots the graph.

    A framing edge is NOT an empirical causal claim — the seed does not *cause*
    the ring-1 decisions/consequences, it *frames* them — so it carries no
    evidence grade or polarity and is confidence-neutral in path_confidence.

    NOTE (flagged for confirmation): scoped to seed -> ring-1 rooting; causal
    edges remain the branching structure for ring >= 1. If you meant a general
    structural parent link across the whole tree, say so and I'll broaden it.
    """

    model_config = _STRICT
    type: Literal[EdgeType.FRAMES] = EdgeType.FRAMES
    source: str = Field(min_length=1)
    target: str = Field(min_length=1)


Edge = Annotated[
    Union[CausalEdge, DeliberativeEdge, ClosureEdge, FramesEdge],
    Field(discriminator="type"),
]

__all__ = [
    "Citation",
    "CausalEdge",
    "DeliberativeEdge",
    "ClosureEdge",
    "FramesEdge",
    "Edge",
]
