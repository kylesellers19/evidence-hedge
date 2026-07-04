"""Layer 2 node model.

A single node type (position/tradition) keyed by a ``grain`` field, per the
spec — the fields are identical across grains, so distinct classes would add no
type safety. The type discipline here is *placement honesty*: a node's declared
``placement`` must be backed by the coordinates it claims (a SURVEY node must
carry survey coords; a CALIBRATED node must carry calibrated coords). Estimates
cannot masquerade as ground truth.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .enums import Grain, Placement, Provenance


class MapNode(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    grain: Grain
    parent_id: str | None = None  # grain nesting; validated at insert time
    coords_survey: list[float] | None = None
    coords_calibrated: list[float] | None = None
    coords_partial: list[float] | None = None  # sparse-component smoke coords; NOT the metric
    placement: Placement
    bridge_thinkers: list[str] = Field(default_factory=list)
    provenance: Provenance

    @model_validator(mode="after")
    def _placement_backed_by_coords(self) -> "MapNode":
        if self.placement is Placement.UNPLACED and (
            self.coords_survey or self.coords_calibrated or self.coords_partial
        ):
            raise ValueError("UNPLACED node must not carry coordinates")
        if self.placement is Placement.PARTIAL and not self.coords_partial:
            raise ValueError("PARTIAL placement requires coords_partial")
        if self.placement is Placement.SURVEY and not self.coords_survey:
            raise ValueError("SURVEY placement requires coords_survey")
        if self.placement is Placement.CALIBRATED and not self.coords_calibrated:
            raise ValueError("CALIBRATED placement requires coords_calibrated")
        if self.placement is Placement.CORROBORATED and not (
            self.coords_survey or self.coords_calibrated
        ):
            raise ValueError("CORROBORATED placement requires some coordinates")
        return self

    def coords(self) -> list[float] | None:
        """Coordinates to use for distance, by trust precedence: survey (ground
        truth) > calibrated (estimate) > partial (sparse-component smoke)."""
        return self.coords_survey or self.coords_calibrated or self.coords_partial


__all__ = ["MapNode"]
