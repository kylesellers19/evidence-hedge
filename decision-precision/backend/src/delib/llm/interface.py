"""The single LLM interface (principles 1 & 2).

Every LLM call goes through :class:`LLM`. It is the one place that talks to
LiteLLM, enforces structured output (reject + retry on schema violation), and
appends every request/response pair to the training-data store. The three roles
— ``generate`` / ``code`` / ``grade`` (plus seed ``intake``) — are thin methods
over one private ``_structured`` call, differing only by prompt, schema, and
task-typed config. Model choice never appears in code; it comes from settings.
"""

from __future__ import annotations

import json
from typing import Any, Callable, TypeVar

from pydantic import BaseModel, ValidationError

from ..store import TrainingDataStore
from . import config as cfg
from . import prompts
from .config import LLMSettings
from .schemas import (  # noqa: F401 (GradeComponentsOutput used below)
    GradeComponentsOutput,
    ConsequenceCoding,
    DecisionCoding,
    GeneratorOutput,
    GradeOutput,
    SeedIntakeOutput,
)

T = TypeVar("T", bound=BaseModel)


class LLMError(RuntimeError):
    """Raised when structured output can't be obtained within the retry budget."""


def _extract_content(resp: Any) -> str:
    """Pull the message text out of a LiteLLM (OpenAI-shaped) response."""
    try:
        return resp.choices[0].message.content
    except AttributeError:
        return resp["choices"][0]["message"]["content"]


def _usage_tokens(resp: Any) -> int:
    """Total tokens from a LiteLLM response usage block (0 if absent)."""
    try:
        usage = resp.usage
        return int(getattr(usage, "total_tokens", 0) or 0)
    except AttributeError:
        try:
            return int((resp.get("usage") or {}).get("total_tokens", 0) or 0)
        except Exception:
            return 0


class LLM:
    def __init__(
        self,
        settings: LLMSettings | None = None,
        store: TrainingDataStore | None = None,
        completion_fn: Callable[..., Any] | None = None,
        budget: Any | None = None,
    ) -> None:
        self.settings = settings or LLMSettings()
        self.store = store or TrainingDataStore()
        self.budget = budget  # optional evidence.BudgetMeter — records LLM dollars
        if completion_fn is None:  # pragma: no cover - real transport
            import litellm

            completion_fn = litellm.completion
        self._completion = completion_fn

    # --- core ---------------------------------------------------------------

    def _structured(
        self,
        task_type: str,
        system: str,
        user: str,
        schema: type[T],
        post_validate: Callable[[T], None] | None = None,
    ) -> T:
        """One structured call: LiteLLM -> validate against ``schema`` ->
        optional semantic ``post_validate`` -> log. Retries with a repair prompt
        on any validation failure, up to ``max_schema_retries``."""
        model = self.settings.model_for(task_type)
        temperature = self.settings.temperature_for(task_type)
        messages = [
            self._system_message(task_type, system),
            {"role": "user", "content": user},
        ]
        input_payload = {"model": model, "task_type": task_type, "messages": messages}

        last_error: Exception | None = None
        for _ in range(self.settings.max_schema_retries + 1):
            resp = self._completion(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=self.settings.max_tokens,
                response_format=schema,
            )
            self._charge_budget(model, resp)
            content = _extract_content(resp)
            try:
                obj = schema.model_validate_json(content)
                if post_validate is not None:
                    post_validate(obj)  # raises ValueError to trigger a retry
                self.store.log(
                    task_type=task_type,
                    input_obj=input_payload,
                    output_obj=obj.model_dump(mode="json"),
                )
                return obj
            except (ValidationError, ValueError) as e:
                last_error = e
                messages = messages + [
                    {"role": "assistant", "content": content},
                    {
                        "role": "user",
                        "content": (
                            f"That did not satisfy the requirements: {e}. "
                            "Return ONLY corrected JSON matching the schema."
                        ),
                    },
                ]

        self.store.log(
            task_type=f"{task_type}:schema_fail",
            input_obj=input_payload,
            output_obj={"error": str(last_error)},
        )
        raise LLMError(f"{task_type}: schema validation failed after retries: {last_error}")

    def _system_message(self, task_type: str, system: str) -> dict[str, Any]:
        """Cache the grader's large rubric block via LiteLLM's Anthropic prompt-
        cache (content-block form with cache_control). Other roles use a plain
        string system message."""
        if self.settings.enable_prompt_cache and task_type == cfg.GRADE:
            return {
                "role": "system",
                "content": [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
            }
        return {"role": "system", "content": system}

    def _charge_budget(self, model: str, resp: Any) -> None:
        if self.budget is None:
            return
        tokens = _usage_tokens(resp)
        if tokens:
            self.budget.record_llm(self.budget.estimate_llm_cost(model, tokens))

    # --- roles --------------------------------------------------------------

    def intake(self, question_text: str) -> SeedIntakeOutput:
        user = f"Question:\n{question_text}"
        return self._structured(cfg.INTAKE, prompts.INTAKE_SYSTEM, user, SeedIntakeOutput)

    def generate(self, node_summary: str, graph_context: str) -> GeneratorOutput:
        user = f"Node to expand:\n{node_summary}\n\nGraph context:\n{graph_context}"
        return self._structured(cfg.GENERATE, prompts.GENERATOR_SYSTEM, user, GeneratorOutput)

    def code_consequence(
        self,
        node_summary: str,
        tradition_leaves: set[str],
        stakeholder_ids: set[str],
    ) -> ConsequenceCoding:
        user = (
            f"Consequence node:\n{node_summary}\n\n"
            "Attribute the orders of worth (registers) this consequence engages — "
            "MARKET, INDUSTRIAL, CIVIC, DOMESTIC, INSPIRED, FAME, GREEN, PROJECTIVE — "
            "each with a quoted signature marker and a justification. Where a "
            f"normative tradition is clearly implicated (of {sorted(tradition_leaves)}), "
            "add a tradition attribution, likewise with a signature marker.\n"
            f"Then extract distributional effects — for the affected stakeholders "
            f"(of {sorted(stakeholder_ids)}) record effect_type "
            "(FINANCIAL/HEALTH/WELFARE/ACCESS/DISPLACEMENT/OTHER), direction "
            "(-1 harm / +1 benefit), and a prose magnitude_note. These are "
            "DESCRIPTIVE empirical impacts, not moral scores."
        )

        def check(c: ConsequenceCoding) -> None:
            for t in c.traditions:
                if t.tradition not in tradition_leaves:
                    raise ValueError(f"unknown tradition leaf: {t.tradition!r}")
            for e in c.distributional_effects:
                if e.stakeholder_id not in stakeholder_ids:
                    raise ValueError(f"unknown stakeholder id: {e.stakeholder_id!r}")

        return self._structured(
            cfg.CODE, prompts.CODER_SYSTEM, user, ConsequenceCoding, post_validate=check
        )

    def code_decision(self, node_summary: str) -> DecisionCoding:
        user = (
            f"Decision node:\n{node_summary}\n\n"
            "Tag CFIR domains (innovation, outer_setting, inner_setting, individuals, "
            "process) and score the five Proctor implementation outcomes 1-5 with "
            "justifications."
        )
        return self._structured(cfg.CODE, prompts.CODER_SYSTEM, user, DecisionCoding)

    def grade(self, claim: str, abstracts: str) -> GradeOutput:
        user = f"Causal claim:\n{claim}\n\nRetrieved evidence:\n{abstracts}"
        return self._structured(cfg.GRADE, prompts.GRADER_SYSTEM, user, GradeOutput)

    def grade_components(self, claim: str, evidence_summary: str) -> GradeComponentsOutput:
        """Phase-5 grader: classify each paper's study design (using provided
        publication-type tags where present, the abstract otherwise) and assess
        consistency + directness across the set. Returns COMPONENTS; the
        evidence_grade is computed downstream. Cached rubric block via
        prompts.GRADER_COMPONENTS_SYSTEM (prompt-caching handled at the LiteLLM
        layer, step 6)."""
        user = f"Claim:\n{claim}\n\nRetrieved evidence:\n{evidence_summary}"
        return self._structured(
            cfg.GRADE, prompts.GRADER_COMPONENTS_SYSTEM, user, GradeComponentsOutput
        )


__all__ = ["LLM", "LLMError"]
