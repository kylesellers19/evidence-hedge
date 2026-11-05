"""HTTP surface for the decision layer, mounted under /api/decision.

Same prototype seam as the deliberation session: one in-process decision model
per server. The graph is supplied by the host app (``configure``), so this module
does not import ``delib.api`` and the layer stays testable on its own.

Decision-model writes are NOT logged to the training-data store (PROVISIONAL;
see config.ratification_table): the model carries client interview quotes.
"""

from __future__ import annotations

from typing import Any, Callable

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ValidationError

from ..graph import DelibGraph
from .analysis import DecisionAnalysis, StepStatus, analysis_hash, analyze
from .causal import BackdoorResult, CellTrace, backdoor_set, candidate_confounders, trace
from .config import RatificationRow, ratification_table
from .models import CodedBy, DecisionFrame, DecisionModel, DecisionRecord, EdgeRef, TypedQuestion
from .structure import suggest_question_kind
from .tradeoffs import PooledRanking, pooled_ranking

router = APIRouter(prefix="/api/decision", tags=["decision"])

_state: dict[str, Any] = {"model": None, "graph": None}


def configure(graph_provider: Callable[[], DelibGraph]) -> None:
    _state["graph"] = graph_provider


def _graph() -> DelibGraph:
    provider = _state["graph"]
    if provider is None:
        raise HTTPException(503, "decision layer has no graph provider configured")
    return provider()


def _model() -> DecisionModel:
    m = _state["model"]
    if m is None:
        raise HTTPException(404, "no decision model; POST /api/decision/new or PUT /api/decision first")
    return m


class NewDecision(BaseModel):
    decision_statement: str = Field(min_length=1)
    owner: str = Field(min_length=1)


class ModelResponse(BaseModel):
    model: DecisionModel | None
    analysis_hash: str | None


def _resp() -> ModelResponse:
    m = _state["model"]
    return ModelResponse(model=m, analysis_hash=analysis_hash(m) if m else None)


@router.post("/new", response_model=ModelResponse)
def new_decision(body: NewDecision) -> ModelResponse:
    """Start a decision on the current graph. The seed question is added as a
    machine-suggested, unconfirmed TypedQuestion."""
    g = _graph()
    questions: list[TypedQuestion] = []
    if g.seed_id is not None:
        qt = getattr(g.get_node(g.seed_id), "question_text", None)
        if qt:
            s = suggest_question_kind(qt)
            questions.append(TypedQuestion(
                text=qt, kind=s.kind, confirmed=False,
                suggested_by=CodedBy.MACHINE if s.kind else CodedBy.HUMAN, evidence=s.matched,
            ))
    frame = DecisionFrame(
        decision_statement=body.decision_statement, owner=body.owner, seed_id=g.seed_id, questions=questions,
    )
    _state["model"] = DecisionModel(frame=frame)
    return _resp()


@router.get("", response_model=ModelResponse)
def get_model() -> ModelResponse:
    return _resp()


@router.put("", response_model=ModelResponse)
def put_model(body: DecisionModel) -> ModelResponse:
    """Replace the model. Schema and integrity errors return 422 (pydantic);
    references into the graph are reported by the analysis, not rejected here."""
    _state["model"] = body
    return _resp()


@router.delete("", response_model=ModelResponse)
def clear_model() -> ModelResponse:
    _state["model"] = None
    return _resp()


@router.get("/analysis", response_model=DecisionAnalysis)
def get_analysis() -> DecisionAnalysis:
    return analyze(_model(), _graph())


@router.get("/steps", response_model=list[StepStatus])
def get_steps() -> list[StepStatus]:
    return analyze(_model(), _graph()).steps


@router.get("/trace", response_model=CellTrace)
def get_trace(alternative_id: str, objective_id: str) -> CellTrace:
    m = _model()
    try:
        return trace(m, _graph(), alternative_id, objective_id)
    except KeyError as exc:
        raise HTTPException(404, str(exc))


class ConfounderResponse(BaseModel):
    edge: EdgeRef
    candidates: list[str]
    backdoor: BackdoorResult


@router.get("/edges/confounders", response_model=ConfounderResponse)
def get_confounders(source: str, target: str) -> ConfounderResponse:
    m = _model()
    g = _graph()
    e = EdgeRef(source=source, target=target)
    return ConfounderResponse(edge=e, candidates=candidate_confounders(m, g, e), backdoor=backdoor_set(m, g, e))


class PoolRequest(BaseModel):
    shares: dict[str, float] | None = None


@router.post("/pooled", response_model=PooledRanking)
def post_pooled(body: PoolRequest) -> PooledRanking:
    """Explicit pooling across groups. Never computed unless asked for."""
    try:
        r = pooled_ranking(_model(), body.shares)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    if r is None:
        raise HTTPException(409, "pooling needs a complete consequence table and at least one group's weights")
    return r


@router.post("/record", response_model=ModelResponse)
def post_record(body: DecisionRecord) -> ModelResponse:
    """Record the decision against the current analysis hash (server-set)."""
    m = _model()
    rec = body.model_copy(update={"analysis_hash": analysis_hash(m)})
    try:
        _state["model"] = DecisionModel.model_validate({**m.model_dump(mode="json"), "record": rec.model_dump(mode="json")})
    except ValidationError as exc:
        raise HTTPException(422, str(exc))
    return _resp()


@router.get("/ratification", response_model=list[RatificationRow])
def get_ratification() -> list[RatificationRow]:
    return ratification_table()


@router.get("/schema")
def get_schema() -> dict[str, Any]:
    return DecisionModel.model_json_schema()


__all__ = ["router", "configure"]
