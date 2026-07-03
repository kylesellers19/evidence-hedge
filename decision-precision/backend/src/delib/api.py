"""FastAPI app (Phase 3 prototype).

Thin HTTP surface over a single in-memory Session. Emits GraphView payloads the
React Flow renderer consumes; expansion and edits mutate the live graph, and
edits are logged to the training-data store.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .queries import path_confidence
from .serialize import GraphView, NodeView, graph_view
from .session import Session

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


__all__ = ["app", "session"]
