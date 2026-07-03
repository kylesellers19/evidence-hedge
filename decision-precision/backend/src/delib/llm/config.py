"""LLM configuration (principle 1: model choice is config, never hardcoded)."""

from __future__ import annotations

import os

from pydantic import BaseModel, Field

# Task types that flow through the single LLM interface.
GENERATE = "generate"
CODE = "code"
GRADE = "grade"
INTAKE = "intake"


class LLMSettings(BaseModel):
    """All model/temperature choices live here and are overridable via env.

    LiteLLM model strings are provider-prefixed, e.g. ``anthropic/claude-sonnet-4-6``.
    Swapping providers/models is a config change — no code touches a model id.
    """

    default_model: str = "anthropic/claude-sonnet-4-6"
    model_by_task: dict[str, str] = Field(default_factory=dict)
    # Generator: moderate temp; Coder: low; Grader: low-ish (per the brief).
    temperature_by_task: dict[str, float] = Field(
        default_factory=lambda: {GENERATE: 0.7, INTAKE: 0.5, CODE: 0.1, GRADE: 0.2}
    )
    max_tokens: int = 4096
    max_schema_retries: int = 2

    def model_for(self, task_type: str) -> str:
        return self.model_by_task.get(task_type, self.default_model)

    def temperature_for(self, task_type: str) -> float:
        return self.temperature_by_task.get(task_type, 0.5)

    @classmethod
    def from_env(cls) -> "LLMSettings":
        s = cls()
        if m := os.environ.get("DELIB_LLM_MODEL"):
            s.default_model = m
        if mt := os.environ.get("DELIB_LLM_MAX_TOKENS"):
            s.max_tokens = int(mt)
        return s


__all__ = ["LLMSettings", "GENERATE", "CODE", "GRADE", "INTAKE"]
