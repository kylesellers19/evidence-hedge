"""Phase 5 step 6: grader->coder model routing, prompt caching, LLM budget."""

from __future__ import annotations

import json

from delib.evidence import BudgetConfig, BudgetMeter
from delib.llm import LLM, LLMSettings
from delib.llm.config import CODE, GRADE


def test_grader_defaults_to_configured_coder_model():
    s = LLMSettings(model_by_task={CODE: "anthropic/claude-opus-4-8"})
    assert s.model_for(GRADE) == "anthropic/claude-opus-4-8"  # inherits the coder model
    # an explicit grader override still wins
    s2 = LLMSettings(model_by_task={CODE: "m-coder", GRADE: "m-grader"})
    assert s2.model_for(GRADE) == "m-grader"


class _Capture:
    def __init__(self) -> None:
        self.messages = None

    def __call__(self, *, model, messages, temperature, max_tokens, **kw):
        self.messages = messages
        return {
            "choices": [{"message": {"content": json.dumps({
                "per_study_designs": [], "consistency": "NONE", "directness": "NONE", "transfer_note": None,
            })}}],
            "usage": {"total_tokens": 1000},
        }


def test_grader_system_block_is_prompt_cached():
    cap = _Capture()
    llm = LLM(settings=LLMSettings(enable_prompt_cache=True), completion_fn=cap)
    llm.grade_components("claim", "evidence")
    sys_msg = cap.messages[0]
    # cached form: content is a block list with cache_control
    assert isinstance(sys_msg["content"], list)
    assert sys_msg["content"][0]["cache_control"] == {"type": "ephemeral"}


def test_non_grader_system_is_plain_string():
    cap = _Capture()
    # generate returns a different schema; reuse capture but it will fail schema —
    # we only care that the system message shape is a plain string for non-GRADE.
    llm = LLM(settings=LLMSettings(max_schema_retries=0), completion_fn=cap)
    try:
        llm.intake("q")
    except Exception:
        pass
    assert isinstance(cap.messages[0]["content"], str)


def test_llm_dollars_recorded_to_budget():
    meter = BudgetMeter(BudgetConfig())
    cap = _Capture()
    llm = LLM(settings=LLMSettings(), completion_fn=cap, budget=meter)
    llm.grade_components("claim", "evidence")
    # 1000 tokens * sonnet 0.003/1k = 0.003
    assert abs(meter.llm_dollars - 0.003) < 1e-9
