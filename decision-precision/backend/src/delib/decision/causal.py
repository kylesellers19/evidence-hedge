"""Steps 6-8: the causal model as an influence diagram, causal-inference checks
on each edge, edge evidence gaps, value functions, and cell provenance traces.

The influence diagram is a projection of the existing DelibGraph (Howard &
Matheson 1984): focus DECISION nodes are decision nodes, CONSEQUENCE/STATE nodes
are chance nodes, and each leaf fundamental objective is a value node attached
to the graph nodes its attribute measures. Nothing is copied; the graph stays the
single source of causal structure.
"""

from __future__ import annotations

import networkx as nx
from pydantic import BaseModel

from ..graph import DelibGraph
from ..models.enums import EVIDENCE_GRADE_ORDINAL, EvidenceGrade
from .graphcheck import causal_edge
from .models import (
    Attribute,
    ConfounderStatus,
    ConsequenceCell,
    DecisionModel,
    Direction,
    EdgeRef,
    EvidenceBasis,
    Transport,
)

# --- Step 6: influence diagram ----------------------------------------------


class CycleReport(BaseModel):
    nodes: list[str]
    treatment: str | None  # LoopTreatmentKind value, or None if untreated


class InfluenceDiagram(BaseModel):
    decision_nodes: list[str]
    chance_nodes: list[str]
    value_nodes: list[str]  # leaf objective ids
    measured_by: dict[str, list[str]]  # objective id -> graph node ids
    relevant_nodes: list[str]  # on some causal path focus decision -> measured node
    relevant_edges: list[EdgeRef]
    decisions_without_value_path: list[str]
    objectives_unreached: list[str]
    unmeasured_consequences: list[str]
    cycles: list[CycleReport]
    gaps: list[str]


def _measured(model: DecisionModel) -> dict[str, list[str]]:
    return {o.id: list(o.consequence_ids) for o in model.leaf_objectives()}


def influence_diagram(model: DecisionModel, graph: DelibGraph) -> InfluenceDiagram:
    causal = graph.causal_digraph()
    focus = [d for d in model.frame.focus if d in causal]
    measured = _measured(model)
    measured_nodes = {n for ns in measured.values() for n in ns if n in causal}

    desc: dict[str, set[str]] = {d: nx.descendants(causal, d) | {d} for d in focus}
    anc_measured: set[str] = set()
    for m in measured_nodes:
        anc_measured |= nx.ancestors(causal, m) | {m}
    reach_from_focus = set().union(*desc.values()) if desc else set()
    relevant = reach_from_focus & anc_measured
    relevant_edges = [
        EdgeRef(source=u, target=v)
        for u, v in causal.edges()
        if u in relevant and v in relevant
    ]

    no_value = [d for d in focus if not (desc[d] & measured_nodes)]
    unreached = [
        oid for oid, ns in measured.items()
        if not (set(ns) & reach_from_focus)
    ]
    measured_or_upstream = anc_measured
    unmeasured = sorted(
        n for n in reach_from_focus
        if n not in focus
        and graph.node_type(n).value in ("CONSEQUENCE", "STATE")
        and n not in measured_or_upstream
    )

    sub = causal.subgraph(relevant)
    cycles: list[CycleReport] = []
    for cyc in nx.simple_cycles(sub):
        t = next((lt for lt in model.loop_treatments if lt.matches(cyc)), None)
        cycles.append(CycleReport(nodes=list(cyc), treatment=t.treatment.value if t else None))

    gaps: list[str] = []
    if not focus:
        gaps.append("frame has no focus decisions present in the causal graph")
    gaps += [f"focus decision {d!r} reaches no node any objective measures" for d in no_value]
    gaps += [f"objective {o!r} is not reached from any focus decision" for o in unreached]
    gaps += [
        f"consequence {n!r} follows from a focus decision but no objective measures it or anything downstream"
        for n in unmeasured
    ]
    gaps += [
        f"feedback loop {c.nodes} in the decision-relevant subgraph has no treatment "
        "(unroll in time, cut an edge for analysis, or keep qualitative)"
        for c in cycles if c.treatment is None
    ]
    chance = sorted(
        n.id for n in graph.nodes()
        if n.type.value in ("CONSEQUENCE", "STATE") and n.id in reach_from_focus
    )
    return InfluenceDiagram(
        decision_nodes=focus,
        chance_nodes=chance,
        value_nodes=list(measured),
        measured_by=measured,
        relevant_nodes=sorted(relevant),
        relevant_edges=relevant_edges,
        decisions_without_value_path=no_value,
        objectives_unreached=unreached,
        unmeasured_consequences=unmeasured,
        cycles=cycles,
        gaps=gaps,
    )


# --- Step 7: causal-inference checks per edge --------------------------------


def _analysis_dag(model: DecisionModel, graph: DelibGraph) -> nx.DiGraph:
    """Causal digraph with CUT_EDGE_FOR_ANALYSIS treatments applied."""
    g = graph.causal_digraph().copy()
    for lt in model.loop_treatments:
        if lt.cut_edge is not None and g.has_edge(lt.cut_edge.source, lt.cut_edge.target):
            g.remove_edge(lt.cut_edge.source, lt.cut_edge.target)
    return g


def candidate_confounders(model: DecisionModel, graph: DelibGraph, edge: EdgeRef) -> list[str]:
    """Nodes upstream of both ends of X->Y once X->Y itself is removed: common
    causes the graph already contains. The graph only holds what someone named,
    so an empty list is not evidence of no confounding."""
    g = _analysis_dag(model, graph)
    x, y = edge.source, edge.target
    if x not in g or y not in g:
        return []
    if g.has_edge(x, y):
        g.remove_edge(x, y)
    common = (nx.ancestors(g, x) & nx.ancestors(g, y)) - {x, y}
    return sorted(common)


class BackdoorResult(BaseModel):
    edge: EdgeRef
    computable: bool
    adjustment_set: list[str] | None
    note: str


def backdoor_set(model: DecisionModel, graph: DelibGraph, edge: EdgeRef) -> BackdoorResult:
    """A minimal backdoor adjustment set for estimating X->Y from observational
    data (Pearl 2009): a set of non-descendants of X that d-separates X and Y once
    X's outgoing edges are removed. Relative to the variables in the graph only."""
    g = _analysis_dag(model, graph)
    x, y = edge.source, edge.target
    if x not in g or y not in g:
        return BackdoorResult(edge=edge, computable=False, adjustment_set=None, note="edge endpoints not in graph")
    relevant = nx.ancestors(g, x) | nx.ancestors(g, y) | {x, y}
    sub = g.subgraph(relevant).copy()
    if not nx.is_directed_acyclic_graph(sub):
        return BackdoorResult(
            edge=edge, computable=False, adjustment_set=None,
            note="the ancestors of this edge contain a feedback loop; treat the loop (step 6) first",
        )
    desc_x = nx.descendants(sub, x)
    bd = sub.copy()
    bd.remove_edges_from(list(bd.out_edges(x)))
    allowed = set(bd.nodes) - desc_x - {x, y}
    try:
        z = nx.find_minimal_d_separator(bd, {x}, {y}, restricted=allowed)
    except nx.NetworkXError as exc:  # pragma: no cover - defensive
        return BackdoorResult(edge=edge, computable=False, adjustment_set=None, note=str(exc))
    if z is None:
        return BackdoorResult(
            edge=edge, computable=True, adjustment_set=None,
            note="no adjustment set among the graph's non-descendants of the cause blocks every backdoor path",
        )
    return BackdoorResult(
        edge=edge, computable=True, adjustment_set=sorted(z),
        note="valid only relative to the variables in the graph; unnamed common causes are not covered",
    )


class EdgeGap(BaseModel):
    edge: EdgeRef
    gaps: list[str]


def edge_evidence_gaps(model: DecisionModel, graph: DelibGraph, edges: list[EdgeRef]) -> list[EdgeGap]:
    out: list[EdgeGap] = []
    for e in edges:
        gaps: list[str] = []
        card = model.card(e)
        if card is None:
            gaps.append("no evidence card")
            out.append(EdgeGap(edge=e, gaps=gaps))
            continue
        if EvidenceBasis.LITERATURE in card.basis and card.transport is Transport.NOT_ASSESSED:
            gaps.append("literature basis but transport to this site not assessed")
        if not card.confounder_prompt_answered:
            gaps.append("'what else causes both?' not asked or not recorded")
        unaddressed = [c.name for c in card.confounders if c.status is ConfounderStatus.UNADDRESSED]
        if unaddressed:
            gaps.append(f"named confounders unaddressed: {unaddressed}")
        named_nodes = {c.node_id for c in card.confounders if c.node_id}
        missing = [z for z in candidate_confounders(model, graph, e) if z not in named_nodes]
        if missing:
            gaps.append(f"graph shows common causes not considered on the card: {missing}")
        if card.basis == [EvidenceBasis.ELICITED_BELIEF] and not card.statement_ids:
            gaps.append("elicited-belief basis with no linked statements")
        if gaps:
            out.append(EdgeGap(edge=e, gaps=gaps))
    return out


# --- Step 8: value functions, evidence floors, traces -----------------------


def value_of(attr: Attribute, x: float) -> float:
    """Single-attribute value in [0, 1]. Piecewise-linear over value_points when
    elicited; linear between worst and best otherwise (PROVISIONAL default)."""
    if attr.value_points:
        pts = sorted(attr.value_points, key=lambda p: p[0])
        if x <= pts[0][0]:
            return pts[0][1]
        if x >= pts[-1][0]:
            return pts[-1][1]
        for (x0, v0), (x1, v1) in zip(pts, pts[1:]):
            if x0 <= x <= x1:
                return v0 + (v1 - v0) * (x - x0) / (x1 - x0)
    v = (x - attr.worst) / (attr.best - attr.worst)
    return min(1.0, max(0.0, v))


class EvidenceFloor(BaseModel):
    grade: EvidenceGrade | None
    ordinal: int | None
    untraced: bool  # no basis edges recorded for this cell
    missing_edges: list[str]  # basis edges absent from the graph
    elicited_only: list[str]  # basis edges whose card basis is only ELICITED_BELIEF
    transport_gaps: list[str]  # LITERATURE-basis edges without LIKELY_HOLDS transport


def evidence_floor(model: DecisionModel, graph: DelibGraph | None, cell: ConsequenceCell) -> EvidenceFloor:
    """Weakest-link evidence under a cell, using Layer 1's ratified ordinal."""
    if not cell.basis_edges:
        return EvidenceFloor(grade=None, ordinal=None, untraced=True, missing_edges=[], elicited_only=[], transport_gaps=[])
    grades: list[EvidenceGrade] = []
    missing, elicited, transport = [], [], []
    for e in cell.basis_edges:
        ce = causal_edge(graph, e) if graph is not None else None
        if ce is None:
            missing.append(e.key())
        else:
            grades.append(ce.evidence_grade)
        card = model.card(e)
        if card is not None:
            if card.basis == [EvidenceBasis.ELICITED_BELIEF]:
                elicited.append(e.key())
            if EvidenceBasis.LITERATURE in card.basis and card.transport is not Transport.LIKELY_HOLDS:
                transport.append(e.key())
    if missing or not grades:
        return EvidenceFloor(grade=None, ordinal=None, untraced=False, missing_edges=missing,
                             elicited_only=elicited, transport_gaps=transport)
    weakest = min(grades, key=lambda g: EVIDENCE_GRADE_ORDINAL[g])
    return EvidenceFloor(grade=weakest, ordinal=EVIDENCE_GRADE_ORDINAL[weakest], untraced=False,
                         missing_edges=[], elicited_only=elicited, transport_gaps=transport)


class TraceStatement(BaseModel):
    id: str
    group_id: str
    type: str
    quote: str


class TraceEdge(BaseModel):
    edge: EdgeRef
    mechanism_text: str | None
    evidence_grade: str | None
    citation_count: int
    basis: list[str]
    transport: str | None
    statements: list[TraceStatement]


class CellTrace(BaseModel):
    alternative_id: str
    objective_id: str
    attribute: str | None
    unit: str | None
    estimate: dict | None
    value_p50: float | None
    floor: EvidenceFloor
    edges: list[TraceEdge]
    statements: list[TraceStatement]  # statements linked to this objective+alternative


def trace(model: DecisionModel, graph: DelibGraph | None, alternative_id: str, objective_id: str) -> CellTrace:
    """Quote -> statement -> edge -> evidence -> estimate -> value, for one cell."""
    cell = model.cell(alternative_id, objective_id)
    if cell is None:
        raise KeyError(f"no cell ({alternative_id}, {objective_id})")
    obj = model.objective(objective_id)
    by_interview = {i.id: i.group_id for i in model.interviews}
    stmts = {s.id: s for s in model.statements}

    def ts(sid: str) -> TraceStatement:
        s = stmts[sid]
        return TraceStatement(id=s.id, group_id=by_interview[s.interview_id], type=s.type.value, quote=s.quote)

    edges: list[TraceEdge] = []
    for e in cell.basis_edges:
        ce = causal_edge(graph, e) if graph is not None else None
        card = model.card(e)
        sids = [s.id for s in model.statements if s.edge == e]
        if card is not None:
            sids += [x for x in card.statement_ids if x not in sids]
        edges.append(TraceEdge(
            edge=e,
            mechanism_text=ce.mechanism_text if ce else None,
            evidence_grade=ce.evidence_grade.value if ce else None,
            citation_count=len(ce.citations) if ce else 0,
            basis=[b.value for b in card.basis] if card else [],
            transport=card.transport.value if card else None,
            statements=[ts(x) for x in sids],
        ))
    linked = [
        s.id for s in model.statements
        if s.objective_id == objective_id and (s.alternative_id in (None, alternative_id))
    ]
    v = value_of(obj.attribute, cell.estimate.p50) if (obj.attribute and cell.estimate) else None
    return CellTrace(
        alternative_id=alternative_id,
        objective_id=objective_id,
        attribute=obj.attribute.name if obj.attribute else None,
        unit=obj.attribute.unit if obj.attribute else None,
        estimate=cell.estimate.model_dump(mode="json") if cell.estimate else None,
        value_p50=v,
        floor=evidence_floor(model, graph, cell),
        edges=edges,
        statements=[ts(x) for x in linked],
    )


def missing_cells(model: DecisionModel) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for a in model.alternatives:
        for o in model.leaf_objectives():
            c = model.cell(a.id, o.id)
            if c is None or c.estimate is None:
                out.append((a.id, o.id))
    return out


__all__ = [
    "CycleReport", "InfluenceDiagram", "influence_diagram",
    "candidate_confounders", "BackdoorResult", "backdoor_set",
    "EdgeGap", "edge_evidence_gaps",
    "value_of", "EvidenceFloor", "evidence_floor",
    "TraceStatement", "TraceEdge", "CellTrace", "trace", "missing_cells",
]
