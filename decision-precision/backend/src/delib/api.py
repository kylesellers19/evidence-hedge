"""FastAPI app (Phase 3 prototype).

Thin HTTP surface over a single in-memory Session. Emits GraphView payloads the
React Flow renderer consumes; expansion and edits mutate the live graph, and
edits are logged to the training-data store.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .evidence.budget import BudgetExceeded
from .evidence.claims import claim_hash
from .evidence.grading import ClaimDomain
from .evidence.service import EvidenceService
from .models.edges import CausalEdge
from .models.enums import EdgeType, EvidenceGrade

from .layer2.cache import SparqlCache
from .layer2.survey.atlas import AtlasView, build_atlas
from .layer2.survey.bridge_evidence import BridgeEvidenceStore
from .layer2.survey.scrape import CORRELATIONS_PATH, parse_variable_inventory
from .layer2.survey.store import CorrelationStore, slugify
from .queries import path_confidence
from .serialize import GraphView, NodeView, graph_view
from .session import Session

DATA = Path(__file__).resolve().parents[3] / "data"
DEFAULT_CORR_DB = DATA / "cache" / "correlations.sqlite"
DEFAULT_PAGE_CACHE = DATA / "cache" / "philpeople_pages.sqlite"
DEFAULT_BRIDGE_DB = DATA / "cache" / "bridge_evidence.sqlite"


def _authoritative_position_ids() -> set[str] | None:
    """The index inventory's variable slugs — the exact position set. None when
    the page cache is absent (build_atlas then falls back to the prefix heuristic)."""
    if not DEFAULT_PAGE_CACHE.exists():
        return None
    cache = SparqlCache(str(DEFAULT_PAGE_CACHE))
    for url, html in cache.items():
        if CORRELATIONS_PATH in url and "variable=" not in url:  # the index page
            return {slugify(v) for v in parse_variable_inventory(html)}
    return None

app = FastAPI(title="DELIB", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Single-process prototype session. A real backend would key these per user.
session = Session()


class EditRequest(BaseModel):
    changes: dict[str, Any]


def _view(view: str) -> GraphView:
    if view not in ("full", "resolution"):
        raise HTTPException(422, f"unknown view: {view!r}")
    return graph_view(session.graph, view=view)


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"ok": True, "nodes": len(session.graph), "corrections": session.store.count()}


@app.post("/api/session/reset", response_model=GraphView)
def reset() -> GraphView:
    session.reset()
    return _view("full")


@app.get("/api/graph", response_model=GraphView)
def get_graph(view: str = "full") -> GraphView:
    return _view(view)


@app.post("/api/nodes/{node_id}/expand", response_model=GraphView)
def expand_node(node_id: str) -> GraphView:
    try:
        session.expand(node_id)
    except KeyError:
        raise HTTPException(404, f"node not found: {node_id}")
    return _view("full")


@app.get("/api/nodes/{node_id}/path")
def node_path(node_id: str) -> dict[str, Any]:
    """Path from the seed to this node with weakest-link confidence (hover)."""
    if node_id not in session.graph:
        raise HTTPException(404, f"node not found: {node_id}")
    seed = session.graph.seed_id
    pc = path_confidence(session.graph, seed, node_id) if seed else None
    return {"path_confidence": pc.model_dump(mode="json") if pc else None}


@app.patch("/api/nodes/{node_id}", response_model=NodeView)
def edit_node(node_id: str, body: EditRequest) -> NodeView:
    try:
        session.edit_node(node_id, body.changes)
    except KeyError:
        raise HTTPException(404, f"node not found: {node_id}")
    except Exception as exc:  # pydantic ValidationError et al. -> 400
        raise HTTPException(400, str(exc))
    # return the refreshed node view
    view = _view("full")
    for nv in view.nodes:
        if nv.id == node_id:
            return nv
    raise HTTPException(404, f"node not found after edit: {node_id}")


@app.get("/api/overlays")
def overlays() -> dict[str, Any]:
    return _view("full").overlays


# Atlas (Layer 2): the position map in two geometries, computed once from the
# correlation cache and memoized in-process (heavy MDS/PCA off the request path
# after first call). 503 if the cache store is absent (Stage A not yet scraped).
_atlas_cache: dict[str, AtlasView] = {}


@app.get("/api/atlas", response_model=AtlasView)
def atlas() -> AtlasView:
    if "view" not in _atlas_cache:
        if not DEFAULT_CORR_DB.exists():
            raise HTTPException(503, "correlation cache not found; run the Stage A scrape/reparse first")
        store = CorrelationStore(str(DEFAULT_CORR_DB))
        if store.count() == 0:
            raise HTTPException(503, "correlation store is empty; run the Stage A scrape/reparse first")
        bridge_rows = (
            BridgeEvidenceStore(str(DEFAULT_BRIDGE_DB)).all() if DEFAULT_BRIDGE_DB.exists() else None
        )
        _atlas_cache["view"] = build_atlas(
            store, position_ids=_authoritative_position_ids(), bridge_rows=bridge_rows
        )
    return _atlas_cache["view"]


class ProjectRequest(BaseModel):
    graph_id: str


class ProjectResponse(BaseModel):
    graph_id: str
    touched_node_ids: list[str]


@app.post("/api/atlas/project", response_model=ProjectResponse)
def atlas_project(body: ProjectRequest) -> ProjectResponse:
    """Projection contract (STUB): map a DELIB deliberation graph onto the atlas —
    return the atlas position ids its attributions touch, so the frontend can light
    them and dim the rest. Nothing computes the mapping yet; the contract exists so
    the convergence demo is a data change later, not a rebuild. Always [] for now."""
    return ProjectResponse(graph_id=body.graph_id, touched_node_ids=[])


# Evidence multiplexer (Phase 5): claims are graded once and compound across
# graphs. The service holds the persistent claim store, raw cache, sources, budget.
evidence_service = EvidenceService()


class RegradeRequest(BaseModel):
    claim_text: str
    domain: ClaimDomain = ClaimDomain.POLICY
    health_typed: bool = False


def _apply_grade_to_edges(h: str, grade: str) -> int:
    """Restyle every causal edge whose mechanism claim hashes to ``h``."""
    g = session.graph
    updated = 0
    for e in g.edges():
        if e.type is not EdgeType.CAUSAL:
            continue
        edge: CausalEdge = e  # type: ignore[assignment]
        if claim_hash(edge.mechanism_text) == h:
            new = edge.model_copy(update={"evidence_grade": EvidenceGrade(grade)})
            g.raw()[e.source][e.target][EdgeType.CAUSAL.value]["data"] = new
            updated += 1
    return updated


@app.post("/api/evidence/regrade")
def regrade(body: RegradeRequest) -> dict[str, Any]:
    """Retrieve evidence for a claim and write a fresh grade snapshot, then restyle
    any causal edges that assert this claim. Grades are snapshots — this can run
    again any time. 402 when a budget cap is hit."""
    try:
        rec = evidence_service.regrade(
            body.claim_text, domain=body.domain, health_typed=body.health_typed, now=time.time()
        )
    except BudgetExceeded as exc:
        raise HTTPException(402, str(exc))
    edges = _apply_grade_to_edges(rec.claim_hash, rec.evidence_grade) if rec.evidence_grade else 0
    return {"claim": rec.model_dump(mode="json"), "edges_restyled": edges}


@app.get("/api/evidence/claim")
def get_claim(claim_text: str) -> dict[str, Any]:
    """The current grade snapshot for a claim (null when never graded)."""
    rec = evidence_service.get_claim(claim_text)
    return {"claim": rec.model_dump(mode="json") if rec else None}


@app.get("/api/evidence/budget")
def evidence_budget() -> dict[str, Any]:
    return evidence_service.budget_snapshot()


__all__ = ["app", "session"]
