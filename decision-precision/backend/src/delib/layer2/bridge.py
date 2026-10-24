"""The bipartite bridge: THINKER --holds/defends--> POSITION.

The second hop (POSITION --instance-of--> TRADITION) is carried by
``MapNode.parent_id`` grain nesting, so the bridge itself only records
thinker -> node assignments. Every assignment is provenance-tagged and
confidence-scored so it is contestable, exactly like every other claim in DELIB.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from .enums import Provenance

_STRICT = ConfigDict(extra="forbid")


class BridgeRelation(str, Enum):
    HOLDS = "holds"
    DEFENDS = "defends"


class Thinker(BaseModel):
    model_config = _STRICT
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    wikidata_qid: str | None = None
    floruit_start: int | None = None  # year; drives the temporal edge layer
    floruit_end: int | None = None


class BridgeAssignment(BaseModel):
    model_config = _STRICT
    thinker_id: str = Field(min_length=1)
    target_id: str = Field(min_length=1)  # a MapNode (position or tradition)
    relation: BridgeRelation = BridgeRelation.HOLDS
    provenance: Provenance
    confidence: float = Field(ge=0.0, le=1.0)


__all__ = ["BridgeRelation", "Thinker", "BridgeAssignment"]
