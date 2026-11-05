"""One pass over a DecisionModel + DelibGraph producing every step's artifacts,
the decision-quality checklist, and the twelve-step status.

The step status is the spine of the UI: for each step, what exists, what is
missing, and which framework the step comes from. Status is mechanical (presence
and consistency checks), never a judgment of quality; the checklist says so.
"""

from __future__ import annotations

import hashlib
import json
from enum import Enum

from pydantic import BaseModel

from ..graph import DelibGraph
from .causal import (
    BackdoorResult,
    CellTrace,
    EdgeGap,
    InfluenceDiagram,
    backdoor_set,
    edge_evidence_gaps,
    influence_diagram,
    missing_cells,
)
from .config import RatificationRow, ratification_table
from .disagreement import Disagreement, DisagreementKind, disagreements
from .graphcheck import GraphIssue, graph_issues
from .models import AlternativeKind, DecisionModel, EdgeRef
from .robustness import AssumptionCandidate, AssumptionStatus, assumption_candidates, assumption_status
from .sensitivity import (
    GroupVOI,
    PrecisionRow,
    Quadrant,
    TornadoEntry,
    WeightStability,
    precision_report,
    tornado,
    value_of_information,
    weight_stability,
)
from .structure import (
    ObjectivesReport,
    Partition,
    QuestionSuggestion,
    StrategyTable,
    elicitation_gaps,
    objectives_report,
    partition,
    question_suggestions,
    strategy_table,
)
from .tradeoffs import (
    AlternativeScreen,
    Dominance,
    EvenSwapTrack,
    GroupRanking,
    all_rankings,
    constraint_screen,
    dominance,
    even_swap_tracks,
)

DECISION_ENGINE_VERSION = "0.1.0"


def analysis_hash(model: DecisionModel) -> str:
    """Stable id of the model content + engine version. A DecisionRecord stores
    the hash it was made against, so a record cannot silently outlive its model."""
    payload = model.model_dump(mode="json", exclude={"record"})
    blob = json.dumps({"engine": DECISION_ENGINE_VERSION, "model": payload}, sort_keys=True)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:16]


# --- decision quality ---------------------------------------------------------


class Check(BaseModel):
    check: str
    ok: bool
    detail: str | None = None


class DQElement(BaseModel):
    element: str
    ok: bool
    checks: list[Check]


# --- steps ----------------------------------------------------------------------


class StepState(str, Enum):
    EMPTY = "EMPTY"
    PARTIAL = "PARTIAL"
    COMPLETE = "COMPLETE"


class StepStatus(BaseModel):
    number: int
    name: str
    state: StepState
    summary: str
    gaps: list[str]
    grounding: str


class DecisionAnalysis(BaseModel):
    engine_version: str
    analysis_hash: str
    graph_issues: list[GraphIssue]
    question_suggestions: list[QuestionSuggestion]
    partition: Partition
    elicitation_gaps: list[str]
    objectives: ObjectivesReport
    strategy_table: StrategyTable
    influence_diagram: InfluenceDiagram
    edge_gaps: list[EdgeGap]
    backdoor: list[BackdoorResult]
    missing_cells: list[tuple[str, str]]
    screen: list[AlternativeScreen]
    dominance: list[Dominance]
    rankings: list[GroupRanking]
    even_swaps: list[EvenSwapTrack]
    weight_stability: list[WeightStability]
    tornado: list[TornadoEntry]
    voi: list[GroupVOI]
    precision: list[PrecisionRow]
    disagreements: list[Disagreement]
    assumptions: list[AssumptionStatus]
    assumption_candidates: list[AssumptionCandidate]
    decision_quality: list[DQElement]
    steps: list[StepStatus]
    ratification: list[RatificationRow]


GROUNDING = {
    1: "Decision hierarchy (Spetzler, Winter & Meyer 2016); boundary critique (Ulrich 1983)",
    2: "Value-focused laddering (Keeney 1992); cognitive mapping (Eden & Ackermann 1998); individual-first elicitation (Hemming et al. 2018)",
    3: "Separate facts from values (Gregory et al. 2012, Structured Decision Making)",
    4: "Fundamental vs means objectives (Keeney 1992); attribute selection (Keeney & Gregory 2005); orders of worth as a completeness check (Boltanski & Thévenot 2006)",
    5: "Strategy table; alternatives from objectives (Keeney 1992)",
    6: "Influence diagrams (Howard & Matheson 1984); causal graphs (Pearl 2009)",
    7: "Backdoor adjustment (Pearl 2009); transport to this site (Cartwright & Hardie 2012); Layer 1 grading (GRADE, Maryland SMS)",
    8: "Consequence table (Hammond, Keeney & Raiffa 1999); three-point quantiles (Keefer & Bodily 1983)",
    9: "Even swaps (Hammond, Keeney & Raiffa 1998); swing weights (von Winterfeldt & Edwards 1986)",
    10: "Value of information (Howard 1966); requisite modeling (Phillips 1984)",
    11: "Assumption-Based Planning (Dewar 2002)",
    12: "Decision Quality (Spetzler, Winter & Meyer 2016); premortem (Klein 2007)",
}

NAMES = {
    1: "Frame", 2: "Elicit", 3: "Separate facts from values", 4: "Objectives", 5: "Alternatives",
    6: "Causal model", 7: "Edge evidence", 8: "Consequence table", 9: "Tradeoffs",
    10: "Sensitivity and value of information", 11: "Robustness", 12: "Decision record",
}


def _state(has_any: bool, gaps: list[str]) -> StepState:
    if not has_any:
        return StepState.EMPTY
    return StepState.PARTIAL if gaps else StepState.COMPLETE


def analyze(model: DecisionModel, graph: DelibGraph) -> DecisionAnalysis:
    issues = graph_issues(model, graph)
    qs = question_suggestions(model, graph)
    part = partition(model)
    egaps = elicitation_gaps(model)
    objs = objectives_report(model, graph)
    st = strategy_table(model, graph)
    idg = influence_diagram(model, graph)

    basis: list[EdgeRef] = []
    for c in model.cells:
        for e in c.basis_edges:
            if e not in basis:
                basis.append(e)
    edges_to_check = list(dict.fromkeys(basis + idg.relevant_edges))
    edge_gaps = edge_evidence_gaps(model, graph, edges_to_check)
    backdoor = [backdoor_set(model, graph, e) for e in basis]

    missing = missing_cells(model)
    screen = constraint_screen(model)
    dom = dominance(model)
    ranks = all_rankings(model)
    swaps = even_swap_tracks(model)
    stab = [s for w in model.weights for s in weight_stability(model, w.group_id)]
    torn = [t for w in model.weights for t in tornado(model, w.group_id)]
    voi = [v for w in model.weights if (v := value_of_information(model, w.group_id)) is not None]
    prec = precision_report(model, graph) if ranks else []
    dis = disagreements(model, ranks, prec, {e.key() for e in idg.relevant_edges})
    astat = assumption_status(model, prec, stab)
    cands = assumption_candidates(model, prec)
    h = analysis_hash(model)

    # --- decision quality ---------------------------------------------------
    f = model.frame
    unconfirmed = [q.text for q in f.questions if not q.confirmed or q.kind is None]
    dq: list[DQElement] = []

    def el(name: str, checks: list[Check]) -> None:
        dq.append(DQElement(element=name, ok=all(c.ok for c in checks), checks=checks))

    el("Appropriate frame", [
        Check(check="decision owner named", ok=bool(f.owner)),
        Check(check="at least one focus decision", ok=bool(f.focus)),
        Check(check="affected-but-not-involved parties listed", ok=bool(f.affected_not_involved)),
        Check(check="every question typed and confirmed", ok=not unconfirmed,
              detail=f"{len(unconfirmed)} unconfirmed" if unconfirmed else None),
        Check(check="frame references resolve in the graph", ok=not [i for i in issues if i.step == 1]),
    ])
    kinds = {a.kind for a in model.alternatives}
    el("Creative, doable alternatives", [
        Check(check="two or more alternatives", ok=len(model.alternatives) >= 2),
        Check(check="status quo included", ok=AlternativeKind.STATUS_QUO in kinds),
        Check(check="strategy table complete and distinct",
              ok=not [g for g in st.gaps if "DEFER" not in g and "fewer than two" not in g and "STATUS_QUO" not in g]),
    ])
    sensitive_untraced = [r for r in prec if r.sensitive_groups and any(fl.startswith("untraced") for fl in r.flags)]
    investigate = [r for r in prec if r.quadrant is Quadrant.INVESTIGATE]
    el("Relevant and reliable information", [
        Check(check="consequence table complete", ok=not missing, detail=f"{len(missing)} missing" if missing else None),
        Check(check="every decision-sensitive cell traced to edges", ok=not sensitive_untraced),
        Check(check="every basis edge has an evidence card", ok=not [g for g in edge_gaps if "no evidence card" in g.gaps]),
        Check(check="no decision-sensitive cell rests on weak evidence without an assumption covering it",
              ok=not [r for r in investigate if r.cell not in {c for a in model.assumptions for c in a.refs.cells}],  # noqa: E501
              detail=f"{len(investigate)} cell(s) in INVESTIGATE" if investigate else None),
    ])
    interviewed = {i.group_id for i in model.interviews}
    weighted = {w.group_id for w in model.weights}
    inconsistent = [c for t in swaps for c in t.checks if c.consistent is False]
    el("Clear values and tradeoffs", [
        Check(check="every interviewed group has swing weights", ok=interviewed <= weighted,
              detail=f"missing: {sorted(interviewed - weighted)}" if interviewed - weighted else None),
        Check(check="preferential independence checked for every weighted group",
              ok=all(w.preferential_independence_checked for w in model.weights) and bool(model.weights)),
        Check(check="even swaps consistent with swing weights", ok=not inconsistent,
              detail=f"{len(inconsistent)} inconsistent" if inconsistent else None),
    ])
    covered_cells = {c for a in model.assumptions for c in a.refs.cells}
    covered_edges = {e for a in model.assumptions for e in a.refs.edges}
    unacknowledged = [
        d for d in dis
        if d.kind is DisagreementKind.FACTUAL and d.decision_relevant
        and not (d.edge is not None and d.edge in covered_edges)
        and not (d.cell is not None and d.cell in covered_cells)
    ]
    el("Sound reasoning", [
        Check(check="rankings computed for every weighted group", ok=bool(ranks) and len(ranks) == len(model.weights)),
        Check(check="sensitivity and value of information computed", ok=bool(voi)),
        Check(check="decision-relevant factual disagreements covered by an assumption", ok=not unacknowledged,
              detail=f"{len(unacknowledged)} uncovered" if unacknowledged else None),
        Check(check="no untreated feedback loop in the decision-relevant subgraph",
              ok=not [c for c in idg.cycles if c.treatment is None]),
    ])
    lb = [s for s in astat if s.load_bearing]
    rec = model.record
    el("Commitment to action", [
        Check(check="decision recorded", ok=rec is not None),
        Check(check="recorded against the current analysis", ok=rec is not None and rec.analysis_hash == h,
              detail=None if rec is None or rec.analysis_hash == h else "model changed since the decision was recorded"),
        Check(check="every interviewed group's position recorded",
              ok=rec is not None and interviewed <= {p.group_id for p in rec.positions}),
        Check(check="premortem done", ok=rec is not None and bool(rec.premortem)),
        Check(check="load-bearing assumptions have no open gaps", ok=not [s for s in lb if s.gaps]),
        Check(check="review triggers set when assumptions are load-bearing",
              ok=(not lb) or (rec is not None and bool(rec.review_trigger_signpost_ids))),
    ])

    # --- steps ------------------------------------------------------------------
    def gi(step: int) -> list[str]:
        return [f"graph: {i.ref}: {i.message}" for i in issues if i.step == step]

    steps: list[StepStatus] = []

    def step(n: int, has: bool, summary: str, gaps: list[str]) -> None:
        steps.append(StepStatus(number=n, name=NAMES[n], state=_state(has, gaps), summary=summary,
                                gaps=gaps, grounding=GROUNDING[n]))

    step(1, True, f"{len(f.focus)} focus decision(s), {len(f.questions)} question(s), "
         f"{len(f.affected_not_involved)} affected-not-involved",
         [c.check for c in dq[0].checks if not c.ok] + gi(1))
    step(2, bool(model.interviews),
         f"{len(model.groups)} group(s), {len(model.interviews)} interview(s), {len(model.statements)} statement(s)",
         egaps + gi(2))
    step(3, bool(model.statements),
         f"{len(part.values)} value, {len(part.facts)} fact, {len(part.options)} option, "
         f"{len(part.out_of_frame)} out-of-frame",
         [f"statement {s!r} is not linked to any objective, alternative, edge, or node" for s in part.unlinked] + gi(3))
    step(4, bool(objs.leaves),
         f"{len(objs.compensatory)} compensatory and {len(objs.constraints)} constraint objective(s)",
         objs.gaps + gi(4))
    step(5, bool(model.alternatives), f"{len(model.alternatives)} alternative(s) over {len(st.dimensions)} decision(s)",
         st.gaps + gi(5))
    step(6, bool(idg.decision_nodes),
         f"{len(idg.relevant_nodes)} decision-relevant node(s), {len(idg.cycles)} loop(s)", idg.gaps + gi(6))
    step(7, bool(model.edge_cards),
         f"{len(model.edge_cards)} card(s) for {len(edges_to_check)} edge(s) in scope",
         [f"{g.edge.key()}: {x}" for g in edge_gaps for x in g.gaps] + gi(7))
    n_cells = len(model.alternatives) * len(objs.leaves)
    step(8, bool(model.cells), f"{n_cells - len(missing)} of {n_cells} cell(s) estimated",
         [f"missing estimate ({a}, {o})" for a, o in missing] + gi(8))
    w_gaps = [c.check for c in dq[3].checks if not c.ok]
    step(9, bool(model.weights), f"{len(ranks)} group ranking(s), {len(dom)} dominance relation(s)",
         w_gaps + ([] if ranks or not model.weights else ["rankings blocked: complete the consequence table"]))
    q_counts = {q: sum(1 for r in prec if r.quadrant is q) for q in Quadrant}
    step(10, bool(voi),
         f"{q_counts[Quadrant.INVESTIGATE]} to investigate, {q_counts[Quadrant.MONITOR]} to monitor, "
         f"{q_counts[Quadrant.TOLERATE]} to tolerate, {q_counts[Quadrant.SETTLED]} settled",
         [f"({r.cell.alternative_id}, {r.cell.objective_id}) could change the choice (EVPPI {r.max_evppi:.1f} points) "
          "but rests on weak evidence" for r in investigate]
         + ([] if voi else ["blocked: needs rankings"]))
    step(11, bool(model.assumptions) or bool(cands),
         f"{len(lb)} load-bearing of {len(model.assumptions)} assumption(s); {len(cands)} candidate(s)",
         [f"{s.assumption_id}: {g}" for s in astat for g in s.gaps]
         + [f"candidate: {c.text}" for c in cands] + gi(11))
    step(12, rec is not None, "recorded" if rec else "not recorded",
         [c.check for c in dq[5].checks if not c.ok])

    return DecisionAnalysis(
        engine_version=DECISION_ENGINE_VERSION, analysis_hash=h, graph_issues=issues,
        question_suggestions=qs, partition=part, elicitation_gaps=egaps, objectives=objs,
        strategy_table=st, influence_diagram=idg, edge_gaps=edge_gaps, backdoor=backdoor,
        missing_cells=missing, screen=screen, dominance=dom, rankings=ranks, even_swaps=swaps,
        weight_stability=stab, tornado=torn, voi=voi, precision=prec, disagreements=dis,
        assumptions=astat, assumption_candidates=cands, decision_quality=dq, steps=steps,
        ratification=ratification_table(),
    )


__all__ = [
    "DECISION_ENGINE_VERSION", "analysis_hash", "Check", "DQElement", "StepState", "StepStatus",
    "DecisionAnalysis", "analyze", "CellTrace",
]
