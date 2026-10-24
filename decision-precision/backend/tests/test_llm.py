"""Phase 4: the LLM interface + roles, driven by a fake completion function
(no network). Proves structured-output enforcement, schema-retry, per-call
logging, registry constraints, and that the LLM generator yields schema-valid
nodes through the same Generator seam the mock uses."""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from delib.generation import apply_expansion
from delib.graph import DelibGraph
from delib.llm import LLM, LLMError, LLMGenerator, LLMSettings, code_node, grade_edge
from delib.models.edges import CausalEdge
from delib.models.nodes import SeedNode
from delib.store import TrainingDataStore
from conftest import consequence, decision


def _resp(content: str):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
    )


class Fake:
    """Fake litellm.completion. Returns queued contents in order, else a
    per-schema canned content."""

    def __init__(self, by_schema=None, queue=None):
        self.by_schema = by_schema or {}
        self.queue = list(queue or [])
        self.calls = []

    def __call__(self, *, model, messages, temperature, max_tokens, response_format):
        self.calls.append((response_format.__name__, messages))
        if self.queue:
            return _resp(self.queue.pop(0))
        return _resp(self.by_schema[response_format.__name__])


def _llm(fake, store=None, retries=2):
    return LLM(
        settings=LLMSettings(max_schema_retries=retries),
        store=store or TrainingDataStore(),
        completion_fn=fake,
    )


# --- structured output + logging -------------------------------------------


def test_grade_returns_and_logs():
    store = TrainingDataStore()
    fake = Fake(by_schema={"GradeOutput": json.dumps({"evidence_grade": "SUPPORTED", "transfer_note": None})})
    out = _llm(fake, store).grade("more supply lowers rent", "abstracts...")
    assert out.evidence_grade.value == "SUPPORTED"
    assert store.count() == 1
    assert store.all()[0]["task_type"] == "grade"


def test_retry_on_bad_json_then_success():
    fake = Fake(queue=["not json at all", json.dumps({"evidence_grade": "WEAK"})])
    out = _llm(fake).grade("c", "e")
    assert out.evidence_grade.value == "WEAK"
    assert len(fake.calls) == 2  # one bad, one good


def test_schema_fail_raises_and_logs():
    store = TrainingDataStore()
    fake = Fake(queue=["x", "y", "z"])  # always bad; 1 + 2 retries = 3 calls
    with pytest.raises(LLMError):
        _llm(fake, store, retries=2).grade("c", "e")
    assert len(fake.calls) == 3
    assert any(r["task_type"] == "grade:schema_fail" for r in store.all())


# --- coder vocabulary constraint -------------------------------------------

_LEAVES = {"kantian_deontological", "utilitarian_aggregate"}


_STAKEHOLDERS = {"incumbents", "newcomers"}


def test_coder_rejects_unknown_tradition():
    bad = json.dumps({
        "registers": [{"register": "MARKET", "signature_marker": "priced out", "justification": "j"}],
        "traditions": [{"tradition": "phlogiston_ethics", "signature_marker": "m", "justification": "j"}],
        "distributional_effects": [],
        "goal_relevance": 0.5,
    })
    fake = Fake(queue=[bad, bad, bad])
    with pytest.raises(LLMError):
        _llm(fake).code_consequence("rents rise", _LEAVES, _STAKEHOLDERS)


def test_coder_rejects_unknown_stakeholder_in_effect():
    bad = json.dumps({
        "registers": [],
        "traditions": [],
        "distributional_effects": [
            {"stakeholder_id": "ghost", "effect_type": "FINANCIAL", "direction": -1, "magnitude_note": "n"},
        ],
        "goal_relevance": 0.5,
    })
    fake = Fake(queue=[bad, bad, bad])
    with pytest.raises(LLMError):
        _llm(fake).code_consequence("rents rise", _LEAVES, _STAKEHOLDERS)


def test_coder_accepts_known_vocab():
    good = json.dumps({
        "registers": [{"register": "MARKET", "signature_marker": "rents rise", "justification": "j", "confidence": "HIGH"}],
        "traditions": [{"tradition": "utilitarian_aggregate", "signature_marker": "net welfare", "justification": "j"}],
        "distributional_effects": [
            {"stakeholder_id": "incumbents", "effect_type": "FINANCIAL", "direction": -1, "magnitude_note": "rent burden"},
        ],
        "goal_relevance": 0.9,
    })
    fake = Fake(by_schema={"ConsequenceCoding": good})
    out = _llm(fake).code_consequence("rents rise", _LEAVES, _STAKEHOLDERS)
    assert out.registers[0].register.value == "MARKET" and out.goal_relevance == 0.9
    assert out.traditions[0].tradition == "utilitarian_aggregate"
    assert out.distributional_effects[0].effect_type.value == "FINANCIAL"


# --- LLM generator through the Generator seam ------------------------------


def _seeded_graph() -> DelibGraph:
    g = DelibGraph()
    g.add_node(SeedNode(id="seed", label="s", question_text="q", goal_state_text="goal"))
    return g


def test_llm_generator_expand_yields_valid_nodes():
    children = json.dumps({"children": [
        {"type": "CONSEQUENCE", "label": "Rents rise", "mechanism_text": "m", "evidence_grade": "WEAK", "polarity": 1, "goal_relevance": 0.5, "unexpanded_child_estimate": 2},
        {"type": "DECISION", "label": "Set affordability mandate", "mechanism_text": "m", "evidence_grade": "SPECULATIVE", "polarity": 0, "goal_relevance": 0.5, "unexpanded_child_estimate": 1},
    ]})
    fake = Fake(by_schema={"GeneratorOutput": children})
    gen = LLMGenerator(_llm(fake))
    g = _seeded_graph()

    result = gen.expand(g, "seed")
    added = apply_expansion(g, result)  # inserts via the strict graph -> validates
    assert len(added) == 2
    assert len(g) == 3
    # seed roots ring-1 children via FRAMES edges
    frames = [e for e in g.edges() if e.type.value == "FRAMES"]
    assert len(frames) == 2 and all(e.source == "seed" for e in frames)


def test_intake_returns_goal_proposal():
    fake = Fake(by_schema={"SeedIntakeOutput": json.dumps({"goal_state_text": "housing up", "goal_criteria": ["a", "b"]})})
    prop = LLMGenerator(_llm(fake)).intake("what if a tower is built?")
    assert prop.goal_state_text == "housing up"
    assert prop.goal_criteria == ["a", "b"]


# --- coder / grader applied to the graph -----------------------------------


def test_code_node_overwrites_placeholder_proctor():
    g = _seeded_graph()
    g.add_node(decision("build", "Build tower", 1))  # placeholder-ish scores
    coding = {
        "innovation": ["high-rise"], "outer_setting": [], "inner_setting": [],
        "individuals": [], "process": ["ULURP"],
        "acceptability": {"score": 2, "justification": "opposition"},
        "feasibility": {"score": 4, "justification": "financed"},
        "cost": {"score": 2, "justification": "expensive"},
        "sustainability": {"score": 4, "justification": "durable"},
        "adoption": {"score": 3, "justification": "conditional"},
    }
    fake = Fake(by_schema={"DecisionCoding": json.dumps(coding)})
    updated = code_node(_llm(fake), g, "build")
    assert updated.proctor_scores.feasibility.score == 4
    assert updated.cfir_tags.process == ["ULURP"]


def test_grade_edge_updates_evidence():
    g = _seeded_graph()
    g.add_node(consequence("c1", "capacity", 1, 0.9))
    g.add_edge(CausalEdge(source="seed", target="c1", mechanism_text="units add capacity"))
    fake = Fake(by_schema={"GradeOutput": json.dumps({"evidence_grade": "SUPPORTED", "transfer_note": "direct"})})
    updated = grade_edge(_llm(fake), g, "seed", "c1")
    assert updated.evidence_grade.value == "SUPPORTED"
    assert updated.transfer_note == "direct"
