"""Phase 3b: FastAPI surface + serialization, driven end-to-end."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from delib import api
from delib.session import Session


@pytest.fixture(autouse=True)
def fresh_session():
    # each test gets a clean in-memory session
    api.session = Session()
    return api.session


@pytest.fixture
def client():
    return TestClient(api.app)


def test_atlas_503_when_cache_absent(client, tmp_path, monkeypatch):
    api._atlas_cache.clear()
    monkeypatch.setattr(api, "DEFAULT_CORR_DB", tmp_path / "missing.sqlite")
    r = client.get("/api/atlas")
    assert r.status_code == 503


def test_atlas_serves_two_geometries(client, tmp_path, monkeypatch):
    from delib.layer2.survey import CorrelationStore, load_fixture

    db = tmp_path / "corr.sqlite"
    load_fixture(CorrelationStore(str(db)))
    api._atlas_cache.clear()
    monkeypatch.setattr(api, "DEFAULT_CORR_DB", db)
    body = client.get("/api/atlas").json()
    assert {g["name"] for g in body["geometries"]} == {"attention", "polarity"}
    assert body["n_positions"] >= 20
    node = body["nodes"][0]
    assert len(node["attention"]) == 2 and len(node["polarity"]) == 2
    api._atlas_cache.clear()  # don't leak the fixture atlas into other tests


def test_initial_graph_is_seed_plus_ring1(client):
    r = client.get("/api/graph")
    assert r.status_code == 200
    body = r.json()
    ids = {n["id"] for n in body["nodes"]}
    assert ids == {"seed", "build", "affordability_mandate", "zoning_variance"}
    # ring-1 decisions are unexpanded with a halo + child-count badge
    build = next(n for n in body["nodes"] if n["id"] == "build")
    assert build["halo"] is True
    assert build["unexpanded_child_estimate"] == 6
    assert build["type"] == "DECISION"


def test_seed_at_origin_in_payload(client):
    seed = next(n for n in client.get("/api/graph").json()["nodes"] if n["id"] == "seed")
    assert abs(seed["x"]) < 1e-9 and abs(seed["y"]) < 1e-9


def test_expand_reveals_children(client):
    before = {n["id"] for n in client.get("/api/graph").json()["nodes"]}
    r = client.post("/api/nodes/build/expand")
    assert r.status_code == 200
    after = {n["id"] for n in r.json()["nodes"]}
    assert "capacity" in after and "desirability" in after
    assert after > before
    build = next(n for n in r.json()["nodes"] if n["id"] == "build")
    assert build["expanded"] is True


def test_expand_unknown_node_404(client):
    assert client.post("/api/nodes/nope/expand").status_code == 404


def test_full_expansion_surfaces_overlays(client):
    # grow the whole graph, then overlays should show the loop + divergence
    for nid in ("build", "affordability_mandate", "zoning_variance"):
        client.post(f"/api/nodes/{nid}/expand")
    for nid in ("capacity", "desirability", "rent", "displacement", "tax_revenue",
                "shadow_infrastructure", "affordable_units"):
        client.post(f"/api/nodes/{nid}/expand")
    ov = client.get("/api/overlays").json()
    assert any(l["loop_class"] == "REINFORCING" for l in ov["loops"])
    assert any(d["node_id"] == "displacement" for d in ov["divergence"]["across_frameworks"])
    assert ov["burden_index"]["incumbents"] > 0


def test_resolution_view_filters(client):
    client.post("/api/nodes/build/expand")     # reveals capacity
    client.post("/api/nodes/capacity/expand")  # reveals capacity->seed closure
    full = client.get("/api/graph?view=full").json()
    res = client.get("/api/graph?view=resolution").json()
    assert len(res["nodes"]) <= len(full["nodes"])
    res_ids = {n["id"] for n in res["nodes"]}
    # capacity bears the closure and sits on the seed->closure route
    assert "capacity" in res_ids


def test_path_to_seed_confidence(client):
    client.post("/api/nodes/build/expand")
    r = client.get("/api/nodes/capacity/path")
    pc = r.json()["path_confidence"]
    assert pc is not None
    assert pc["path"][0] == "seed" and pc["path"][-1] == "capacity"
    assert pc["weakest_grade"] == "SUPPORTED"


def test_edit_logs_correction(client):
    n0 = client.get("/api/health").json()["corrections"]
    r = client.patch("/api/nodes/build", json={"changes": {"label": "Build a 50-story tower"}})
    assert r.status_code == 200
    assert r.json()["label"] == "Build a 50-story tower"
    assert client.get("/api/health").json()["corrections"] == n0 + 1


def test_edit_invalid_is_rejected(client):
    # putting valences on a decision must 400 (type discipline holds over HTTP)
    r = client.patch("/api/nodes/build", json={"changes": {"valences": [
        {"stakeholder_id": "incumbents", "framework_id": "prioritarian", "sign": -1, "justification": "x"}
    ]}})
    assert r.status_code == 400


def test_edge_style_semantics_present(client):
    client.post("/api/nodes/build/expand")
    edges = client.get("/api/graph").json()["edges"]
    causal = next(e for e in edges if e["source"] == "build" and e["target"] == "capacity")
    assert causal["type"] == "CAUSAL"
    assert causal["evidence_grade"] == "SUPPORTED"
    assert causal["contradicted"] is False
