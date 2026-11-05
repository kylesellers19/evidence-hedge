"""Decision layer HTTP surface (/api/decision)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from delib.api import app
from delib.decision import api as decision_api

from _decision_builders import toy_graph, toy_model_dict


@pytest.fixture()
def client():
    original = decision_api._state["graph"]
    decision_api.configure(toy_graph)
    c = TestClient(app)
    c.delete("/api/decision")
    yield c
    c.delete("/api/decision")
    decision_api._state["graph"] = original


def test_no_model_is_404_not_500(client):
    assert client.get("/api/decision").json() == {"model": None, "analysis_hash": None}
    assert client.get("/api/decision/analysis").status_code == 404


def test_new_types_the_seed_question_as_an_unconfirmed_suggestion():
    decision_api._state["model"] = None
    c = TestClient(app)  # live Brooklyn session graph
    r = c.post("/api/decision/new", json={"decision_statement": "tower", "owner": "o"})
    q = r.json()["model"]["frame"]["questions"][0]
    assert q["kind"] == "ALTERNATIVE" and q["confirmed"] is False and q["suggested_by"] == "MACHINE"
    c.delete("/api/decision")


def test_put_then_analyze(client):
    r = client.put("/api/decision", json=toy_model_dict())
    assert r.status_code == 200 and r.json()["analysis_hash"]
    a = client.get("/api/decision/analysis").json()
    assert [s["number"] for s in a["steps"]] == list(range(1, 13))
    assert {r["group_id"]: r["top"] for r in a["rankings"]} == {"g1": "x", "g2": "y"}
    assert client.get("/api/decision/steps").json()[7]["state"] == "COMPLETE"


def test_integrity_errors_are_422(client):
    d = toy_model_dict()
    d["weights"][0]["points"] = {"o1": 90, "o2": 40}
    r = client.put("/api/decision", json=d)
    assert r.status_code == 422 and "exactly 100" in r.text


def test_trace_confounders_pooled_record(client):
    client.put("/api/decision", json=toy_model_dict())
    t = client.get("/api/decision/trace", params={"alternative_id": "x", "objective_id": "o1"}).json()
    assert t["edges"][0]["edge"] == {"source": "D", "target": "A"}
    assert client.get("/api/decision/trace", params={"alternative_id": "x", "objective_id": "zz"}).status_code == 404
    cf = client.get("/api/decision/edges/confounders", params={"source": "A", "target": "B"}).json()
    assert cf["candidates"] == ["D", "E"] and cf["backdoor"]["adjustment_set"] == ["D", "E"]
    p = client.post("/api/decision/pooled", json={}).json()
    assert p["label"].startswith("POOLED")
    h = client.get("/api/decision").json()["analysis_hash"]
    rec = client.post("/api/decision/record", json={"chosen_alternative_id": "x", "decided_by": "o", "rationale": "r"})
    assert rec.status_code == 200 and rec.json()["model"]["record"]["analysis_hash"] == h
    bad = client.post("/api/decision/record", json={"chosen_alternative_id": "nope", "decided_by": "o", "rationale": "r"})
    assert bad.status_code == 422


def test_ratification_and_schema(client):
    rows = client.get("/api/decision/ratification").json()
    assert rows and all(r["status"] == "PROVISIONAL — not ratified" for r in rows)
    assert "DecisionFrame" in client.get("/api/decision/schema").json()["$defs"]
