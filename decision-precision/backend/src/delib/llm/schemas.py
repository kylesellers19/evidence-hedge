"""LLM-facing response schemas.

These are deliberately *flatter* than the graph models — an LLM returns a simple
JSON shape and the role adapters map it into the strict node/edge models. Keeping
them separate means the structured-output contract with the model is decoupled
from the internal type discipline.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from ..models.enums import Confidence, EffectType, EvidenceGrade, Register

_STRICT = ConfigDict(extra="forbid")


# --- generator --------------------------------------------------------------


class ProposedChild(BaseModel):
    model_config = _STRICT
    type: Literal["DECISION", "CONSEQUENCE", "STATE"]
    label: str = Field(min_length=1)
    mechanism_text: str = Field(min_length=1, description="How the parent leads to this")
    evidence_grade: EvidenceGrade = EvidenceGrade.SPECULATIVE
    polarity: int = Field(default=0, ge=-1, le=1)
    goal_relevance: float = Field(default=0.5, ge=0.0, le=1.0)
    unexpanded_child_estimate: int = Field(default=0, ge=0)


class GeneratorOutput(BaseModel):
    model_config = _STRICT
    children: list[ProposedChild] = Field(default_factory=list)


class SeedIntakeOutput(BaseModel):
    model_config = _STRICT
    goal_state_text: str = Field(min_length=1)
    goal_criteria: list[str] = Field(default_factory=list)


# --- coder ------------------------------------------------------------------


class RegisterEngagementCoding(BaseModel):
    model_config = _STRICT
    register: Register
    signature_marker: str = Field(min_length=1)
    justification: str = Field(min_length=1)
    confidence: Confidence = Confidence.MODERATE


class TraditionCoding(BaseModel):
    model_config = _STRICT
    tradition: str = Field(min_length=1)
    signature_marker: str = Field(min_length=1)
    justification: str = Field(min_length=1)
    confidence: Confidence = Confidence.MODERATE


class DistributionalEffectCoding(BaseModel):
    model_config = _STRICT
    stakeholder_id: str = Field(min_length=1)
    effect_type: EffectType
    direction: Literal[-1, 1]
    magnitude_note: str = Field(min_length=1)
    # evidence_claim_ref is populated by the Phase-5 evidence pass, not the coder.


class ConsequenceCoding(BaseModel):
    model_config = _STRICT
    registers: list[RegisterEngagementCoding] = Field(default_factory=list)
    traditions: list[TraditionCoding] = Field(default_factory=list)
    distributional_effects: list[DistributionalEffectCoding] = Field(default_factory=list)
    goal_relevance: float = Field(ge=0.0, le=1.0)


class ProctorScoreCoding(BaseModel):
    model_config = _STRICT
    score: int = Field(ge=1, le=5)
    justification: str = Field(min_length=1)


class DecisionCoding(BaseModel):
    model_config = _STRICT
    # CFIR domain -> construct tags
    innovation: list[str] = Field(default_factory=list)
    outer_setting: list[str] = Field(default_factory=list)
    inner_setting: list[str] = Field(default_factory=list)
    individuals: list[str] = Field(default_factory=list)
    process: list[str] = Field(default_factory=list)
    acceptability: ProctorScoreCoding
    feasibility: ProctorScoreCoding
    cost: ProctorScoreCoding
    sustainability: ProctorScoreCoding
    adoption: ProctorScoreCoding


# --- grader -----------------------------------------------------------------


class GradeOutput(BaseModel):
    model_config = _STRICT
    evidence_grade: EvidenceGrade
    transfer_note: str | None = None


class StudyDesignClassification(BaseModel):
    model_config = _STRICT
    ref: str = Field(min_length=1, description="DOI or title identifying the paper.")
    design: str = Field(min_length=1, description="Study design (use the provided pub-type tags where present).")


class GradeComponentsOutput(BaseModel):
    """The Phase-5 grader output — COMPONENTS, not a grade. evidence_grade is
    computed from these downstream (evidence.grading)."""

    model_config = _STRICT
    per_study_designs: list[StudyDesignClassification] = Field(default_factory=list)
    consistency: Literal["CONSISTENT_SUPPORT", "MIXED", "CONSISTENT_CONTRA", "NONE"]
    directness: Literal["DIRECT", "ANALOGICAL", "NONE"]
    transfer_note: str | None = None


__all__ = [
    "ProposedChild",
    "GeneratorOutput",
    "SeedIntakeOutput",
    "RegisterEngagementCoding",
    "TraditionCoding",
    "DistributionalEffectCoding",
    "ConsequenceCoding",
    "ProctorScoreCoding",
    "DecisionCoding",
    "GradeOutput",
    "StudyDesignClassification",
    "GradeComponentsOutput",
]
