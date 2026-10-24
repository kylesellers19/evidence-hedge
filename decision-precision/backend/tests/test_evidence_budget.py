"""Phase 5 step 5: the dual budget meter + cache-hit-first charging."""

from __future__ import annotations

import pytest

from delib.evidence import (
    BudgetConfig,
    BudgetExceeded,
    BudgetMeter,
    MultiplexerRetriever,
    OpenAlexSource,
)
from delib.layer2.cache import SparqlCache
from pathlib import Path

FIX = Path(__file__).resolve().parents[1] / "data" / "fixtures" / "evidence"


def test_openalex_credit_cap_enforced():
    m = BudgetMeter(BudgetConfig(openalex_credit_cap=2))
    m.check_source("openalex"); m.record_source("openalex")
    m.check_source("openalex"); m.record_source("openalex")
    with pytest.raises(BudgetExceeded):
        m.check_source("openalex")  # third would exceed the cap of 2


def test_llm_dollar_cap_enforced():
    m = BudgetMeter(BudgetConfig(llm_dollar_cap=0.01))
    cost = m.estimate_llm_cost("anthropic/claude-opus-4-8", 400)  # opus 0.015/1k -> 0.006
    m.check_llm(cost); m.record_llm(cost)
    with pytest.raises(BudgetExceeded):
        m.check_llm(cost)  # 0.012 > 0.01


def test_staleness_threshold():
    m = BudgetMeter(BudgetConfig(staleness_threshold_s=100))
    assert m.is_stale(None, now=1000) is True  # never graded
    assert m.is_stale(950, now=1000) is False  # 50s old, fresh
    assert m.is_stale(800, now=1000) is True  # 200s old, stale


def test_snapshot_shape():
    m = BudgetMeter(BudgetConfig(openalex_credit_cap=5, llm_dollar_cap=1.0))
    m.record_source("openalex"); m.record_llm(0.25)
    snap = m.snapshot()
    assert snap["openalex_credits"] == 1 and snap["openalex_credit_cap"] == 5
    assert snap["llm_dollars"] == 0.25 and snap["source_calls"]["openalex"] == 1


def _fetcher():
    text = (FIX / "openalex_rent_displacement.SYNTHETIC.json").read_text()
    return lambda _url: text


def test_cache_hit_is_free_but_miss_charges():
    cache = SparqlCache()
    meter = BudgetMeter(BudgetConfig(openalex_credit_cap=10))
    r = MultiplexerRetriever([OpenAlexSource()], cache, _fetcher(), budget=meter)
    r.retrieve("q")  # miss -> charged
    assert meter.openalex_credits == 1
    r.retrieve("q")  # cache hit -> free
    assert meter.openalex_credits == 1


def test_retrieve_stops_at_cap():
    cache = SparqlCache()
    meter = BudgetMeter(BudgetConfig(openalex_credit_cap=0))  # no budget at all
    r = MultiplexerRetriever([OpenAlexSource()], cache, _fetcher(), budget=meter)
    with pytest.raises(BudgetExceeded):
        r.retrieve("q")
