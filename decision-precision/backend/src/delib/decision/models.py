"""The decision layer's typed model.

Same discipline as Layer 1 (``delib.models``): every model is ``extra="forbid"``,
and cross-references are validated once, in :class:`DecisionModel`, so an
ill-formed decision cannot be constructed. References INTO the deliberation graph
(decision nodes, consequence nodes, causal edges, stakeholders) are checked
separately by :func:`delib.decision.graphcheck.graph_issues`, because the live
graph grows by progressive disclosure and may not yet hold every node a decision
refers to.

The twelve steps (see ``docs/decision-layer.md``) map onto these models:

  1 Frame ............ DecisionFrame
  2 Elicit ........... UserGroup, Interview, Statement
  3 Facts vs values .. Statement.type (partitioned in elicitation.py)
  4 Objectives ....... Objective, Attribute
  5 Alternatives ..... Alternative
  6 Causal model ..... the DelibGraph itself + LoopTreatment
  7 Edge evidence .... EdgeEvidenceCard
  8 Consequences ..... ConsequenceCell, Estimate
  9 Tradeoffs ........ SwingWeights, EvenSwap
 10 Sensitivity/VOI .. computed (sensitivity.py)
 11 Robustness ....... Assumption, Signpost
 12 Decision record .. DecisionRecord
"""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from ..models.enums import Register

_STRICT = ConfigDict(extra="forbid")


# --- shared -----------------------------------------------------------------


class CodedBy(str, Enum):
    """Who produced a coding. MACHINE codings are suggestions until verified."""

    HUMAN = "HUMAN"
    MACHINE = "MACHINE"


class EdgeRef(BaseModel):
    """A reference to a CAUSAL edge in the deliberation graph."""

    model_config = ConfigDict(extra="forbid", frozen=True)
    source: str = Field(min_length=1)
    target: str = Field(min_length=1)

    def key(self) -> str:
        return f"{self.source}->{self.target}"


class CellRef(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    alternative_id: str = Field(min_length=1)
    objective_id: str = Field(min_length=1)


class WeightRef(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    group_id: str = Field(min_length=1)
    objective_id: str = Field(min_length=1)


# --- Step 1: frame ----------------------------------------------------------


class QuestionKind(str, Enum):
    """What a seed question is, once the unit of analysis is a decision.

    "What if we do X?" is an ALTERNATIVE to compare; "Will X happen?" is an
    UNCERTAINTY to model; "How do we protect Y?" is an OBJECTIVE to measure.
    """

    ALTERNATIVE = "ALTERNATIVE"
    UNCERTAINTY = "UNCERTAINTY"
    OBJECTIVE = "OBJECTIVE"


class TypedQuestion(BaseModel):
    model_config = _STRICT
    text: str = Field(min_length=1)
    kind: QuestionKind | None = None
    confirmed: bool = False
    suggested_by: CodedBy = CodedBy.HUMAN
    evidence: str | None = Field(default=None, description="Matched pattern, when machine-suggested.")


class DecisionFrame(BaseModel):
    """What is being decided, by whom, and where the boundary sits.

    Decision hierarchy (Spetzler, Winter & Meyer 2016): ``givens`` are already
    settled, ``focus`` is decided now, ``deferred`` is decided later.
    Boundary fields follow Ulrich's (1983) four boundary categories: motivation
    (``beneficiary``), power (``owner``), knowledge (``expertise``), and
    legitimacy (``affected_not_involved``).
    """

    model_config = _STRICT
    decision_statement: str = Field(min_length=1)
    owner: str = Field(min_length=1, description="Who has authority to decide.")
    seed_id: str | None = None
    beneficiary: str | None = Field(default=None, description="Whose purposes the decision ought to serve.")
    expertise: list[str] = Field(default_factory=list, description="Whose knowledge counts, and why.")
    affected_not_involved: list[str] = Field(
        default_factory=list, description="Parties affected but not interviewed."
    )
    givens: list[str] = Field(default_factory=list)
    focus: list[str] = Field(default_factory=list, description="DecisionNode ids decided now.")
    deferred: list[str] = Field(default_factory=list)
    horizon: str | None = None
    questions: list[TypedQuestion] = Field(default_factory=list)


# --- Step 2: elicitation ----------------------------------------------------


class UserGroup(BaseModel):
    model_config = _STRICT
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    description: str | None = None
    stakeholder_id: str | None = Field(
        default=None, description="Optional link to the graph's stakeholder registry."
    )


class InterviewMode(str, Enum):
    INDIVIDUAL = "INDIVIDUAL"
    GROUP = "GROUP"
    WORKSHOP = "WORKSHOP"
    SURVEY_OPEN_TEXT = "SURVEY_OPEN_TEXT"


class Interview(BaseModel):
    model_config = _STRICT
    id: str = Field(min_length=1)
    group_id: str = Field(min_length=1)
    mode: InterviewMode
    held_on: str | None = None
    interviewer: str | None = None
    redaction_confirmed: bool = Field(
        default=False, description="Identifying and confidential details removed from quotes."
    )
    individual_first: bool | None = Field(
        default=None,
        description="GROUP/WORKSHOP only: were estimates and objectives collected individually "
                    "before discussion (Hemming et al. 2018)? None = not recorded.",
    )


class StatementType(str, Enum):
    """Step 3 partitions on this: values (OBJECTIVE, MEANS, CONSTRAINT), facts
    (CAUSAL_BELIEF, FACT_CLAIM, UNCERTAINTY), options (ALTERNATIVE), and the
    frame (OUT_OF_FRAME)."""

    OBJECTIVE = "OBJECTIVE"
    MEANS = "MEANS"
    CONSTRAINT = "CONSTRAINT"
    CAUSAL_BELIEF = "CAUSAL_BELIEF"
    FACT_CLAIM = "FACT_CLAIM"
    UNCERTAINTY = "UNCERTAINTY"
    ALTERNATIVE = "ALTERNATIVE"
    OUT_OF_FRAME = "OUT_OF_FRAME"


class CausalForm(str, Enum):
    """Whether a belief is about intervening (do-X) or about co-occurrence."""

    INTERVENTIONAL = "INTERVENTIONAL"
    ASSOCIATIONAL = "ASSOCIATIONAL"
    UNCLEAR = "UNCLEAR"


class StatedConfidence(str, Enum):
    """How confidently the speaker asserted it (hedges and boosters, Hyland 2005).
    Human-coded in this change set."""

    HEDGED = "HEDGED"
    UNMARKED = "UNMARKED"
    BOOSTED = "BOOSTED"


class Statement(BaseModel):
    """One coded unit of an interview, anchored to the quote it came from."""

    model_config = _STRICT
    id: str = Field(min_length=1)
    interview_id: str = Field(min_length=1)
    quote: str = Field(min_length=1)
    span_start: int | None = Field(default=None, ge=0)
    span_end: int | None = Field(default=None, ge=0)
    type: StatementType
    coded_by: CodedBy = CodedBy.HUMAN
    verified: bool = False
    stated_confidence: StatedConfidence = StatedConfidence.UNMARKED
    # links into the model / graph (what this statement is evidence for)
    objective_id: str | None = None
    alternative_id: str | None = None
    edge: EdgeRef | None = None
    node_id: str | None = None
    # causal beliefs only
    polarity: Literal[-1, 0, 1] | None = None
    causal_form: CausalForm | None = None
    population: str | None = Field(
        default=None,
        description="Whom the believed effect falls on: a group id, or 'ALL'. None = unspecified.",
    )
    note: str | None = None

    @model_validator(mode="after")
    def _check(self) -> "Statement":
        if self.span_start is not None and self.span_end is not None and self.span_end < self.span_start:
            raise ValueError(f"statement {self.id!r}: span_end precedes span_start")
        if self.type is StatementType.CAUSAL_BELIEF:
            if self.edge is None:
                raise ValueError(f"statement {self.id!r}: a CAUSAL_BELIEF must reference a causal edge")
            if self.polarity is None:
                raise ValueError(f"statement {self.id!r}: a CAUSAL_BELIEF must state polarity (-1, 0, +1)")
        elif self.polarity is not None or self.causal_form is not None:
            raise ValueError(f"statement {self.id!r}: polarity/causal_form apply only to CAUSAL_BELIEF")
        return self


# --- Step 4: objectives -----------------------------------------------------


class ObjectiveKind(str, Enum):
    FUNDAMENTAL = "FUNDAMENTAL"
    MEANS = "MEANS"


class AttributeKind(str, Enum):
    """Keeney & Gregory (2005): natural, constructed, or proxy measures."""

    NATURAL = "NATURAL"
    CONSTRUCTED = "CONSTRUCTED"
    PROXY = "PROXY"


class Direction(str, Enum):
    MAXIMIZE = "MAXIMIZE"
    MINIMIZE = "MINIMIZE"


class AggregationRole(str, Enum):
    """COMPENSATORY objectives trade off against others through weights.
    CONSTRAINT objectives are thresholds: failing one is not offset by doing
    well elsewhere (the non-compensatory treatment for values that resist a
    common measure)."""

    COMPENSATORY = "COMPENSATORY"
    CONSTRAINT = "CONSTRAINT"


class Attribute(BaseModel):
    """The measure for a fundamental objective, with the range swing weights are
    elicited over. ``value_points`` optionally define a piecewise-linear value
    function as (x, v) pairs with v in [0, 1]; otherwise value is linear."""

    model_config = _STRICT
    name: str = Field(min_length=1)
    unit: str = Field(min_length=1)
    kind: AttributeKind
    direction: Direction
    worst: float
    best: float
    value_points: list[tuple[float, float]] | None = None

    @model_validator(mode="after")
    def _check(self) -> "Attribute":
        if self.worst == self.best:
            raise ValueError(f"attribute {self.name!r}: worst and best must differ")
        if self.direction is Direction.MAXIMIZE and not self.best > self.worst:
            raise ValueError(f"attribute {self.name!r}: MAXIMIZE needs best > worst")
        if self.direction is Direction.MINIMIZE and not self.best < self.worst:
            raise ValueError(f"attribute {self.name!r}: MINIMIZE needs best < worst")
        if self.value_points is not None:
            pts = sorted(self.value_points, key=lambda p: p[0])
            if len(pts) < 2:
                raise ValueError(f"attribute {self.name!r}: value_points needs at least two points")
            xs = [p[0] for p in pts]
            if len(set(xs)) != len(xs):
                raise ValueError(f"attribute {self.name!r}: value_points has duplicate x")
            lo, hi = min(self.worst, self.best), max(self.worst, self.best)
            if abs(xs[0] - lo) > 1e-9 or abs(xs[-1] - hi) > 1e-9:
                raise ValueError(f"attribute {self.name!r}: value_points must span worst..best exactly")
            vs = [p[1] for p in pts]
            if any(v < 0 or v > 1 for v in vs):
                raise ValueError(f"attribute {self.name!r}: value_points v must lie in [0, 1]")
            increasing = self.direction is Direction.MAXIMIZE
            for a, b in zip(vs, vs[1:]):
                if (increasing and b < a) or (not increasing and b > a):
                    raise ValueError(f"attribute {self.name!r}: value_points must be monotone in direction")
            v_worst = vs[0] if increasing else vs[-1]
            v_best = vs[-1] if increasing else vs[0]
            if abs(v_worst) > 1e-9 or abs(v_best - 1) > 1e-9:
                raise ValueError(f"attribute {self.name!r}: value_points must map worst->0 and best->1")
        return self

    @property
    def lo(self) -> float:
        return min(self.worst, self.best)

    @property
    def hi(self) -> float:
        return max(self.worst, self.best)


class Objective(BaseModel):
    """A fundamental objective (an end, organized in a hierarchy) or a means
    objective (matters because it serves fundamental ones) — Keeney 1992."""

    model_config = _STRICT
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    kind: ObjectiveKind
    parent_id: str | None = Field(default=None, description="FUNDAMENTAL hierarchy parent.")
    serves: list[str] = Field(default_factory=list, description="MEANS: fundamental objective ids served.")
    attribute: Attribute | None = None
    role: AggregationRole = AggregationRole.COMPENSATORY
    threshold: float | None = Field(default=None, description="CONSTRAINT: the acceptable limit.")
    registers: list[Register] = Field(
        default_factory=list, description="Orders of worth this objective expresses."
    )
    consequence_ids: list[str] = Field(
        default_factory=list, description="Graph CONSEQUENCE/STATE nodes this attribute measures."
    )
    statement_ids: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check(self) -> "Objective":
        if self.kind is ObjectiveKind.MEANS:
            if not self.serves:
                raise ValueError(f"objective {self.id!r}: a MEANS objective must serve a fundamental one")
            if self.parent_id is not None:
                raise ValueError(f"objective {self.id!r}: MEANS objectives sit outside the hierarchy (no parent)")
            if self.role is AggregationRole.CONSTRAINT:
                raise ValueError(f"objective {self.id!r}: only FUNDAMENTAL objectives can be constraints")
        else:
            if self.serves:
                raise ValueError(f"objective {self.id!r}: FUNDAMENTAL objectives do not 'serve' others")
        if self.role is AggregationRole.CONSTRAINT:
            if self.threshold is None or self.attribute is None:
                raise ValueError(f"objective {self.id!r}: a CONSTRAINT needs an attribute and a threshold")
            if not (self.attribute.lo <= self.threshold <= self.attribute.hi):
                raise ValueError(f"objective {self.id!r}: threshold must lie within the attribute range")
        elif self.threshold is not None:
            raise ValueError(f"objective {self.id!r}: threshold applies only to CONSTRAINT objectives")
        return self


# --- Step 5: alternatives ---------------------------------------------------


class AlternativeKind(str, Enum):
    ACTION = "ACTION"
    STATUS_QUO = "STATUS_QUO"
    DEFER = "DEFER"


class Alternative(BaseModel):
    """One row of the strategy table: an option chosen for each focus decision."""

    model_config = _STRICT
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    kind: AlternativeKind = AlternativeKind.ACTION
    choices: dict[str, str] = Field(
        default_factory=dict, description="DecisionNode id -> one of that node's alternatives."
    )
    description: str | None = None
    statement_ids: list[str] = Field(default_factory=list)


# --- Step 6: causal model (loops) -------------------------------------------


class LoopTreatmentKind(str, Enum):
    UNROLL_IN_TIME = "UNROLL_IN_TIME"
    CUT_EDGE_FOR_ANALYSIS = "CUT_EDGE_FOR_ANALYSIS"
    QUALITATIVE_ONLY = "QUALITATIVE_ONLY"


class LoopTreatment(BaseModel):
    """How a feedback loop inside the decision-relevant subgraph is handled.
    Influence diagrams and backdoor analysis need acyclic structure."""

    model_config = _STRICT
    nodes: list[str] = Field(min_length=2)
    treatment: LoopTreatmentKind
    cut_edge: EdgeRef | None = None
    note: str | None = None

    @model_validator(mode="after")
    def _check(self) -> "LoopTreatment":
        if self.treatment is LoopTreatmentKind.CUT_EDGE_FOR_ANALYSIS and self.cut_edge is None:
            raise ValueError("CUT_EDGE_FOR_ANALYSIS needs cut_edge")
        return self

    def matches(self, cycle: list[str]) -> bool:
        return set(self.nodes) == set(cycle)


# --- Step 7: edge evidence --------------------------------------------------


class EvidenceBasis(str, Enum):
    LITERATURE = "LITERATURE"
    SITE_DATA = "SITE_DATA"
    ELICITED_BELIEF = "ELICITED_BELIEF"
    MECHANISM_ONLY = "MECHANISM_ONLY"


class Transport(str, Enum):
    """Will the causal principle evidenced elsewhere hold here? (Cartwright & Hardie 2012)"""

    LIKELY_HOLDS = "LIKELY_HOLDS"
    UNCERTAIN = "UNCERTAIN"
    UNLIKELY = "UNLIKELY"
    NOT_ASSESSED = "NOT_ASSESSED"


class FactorStatus(str, Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    UNKNOWN = "UNKNOWN"


class SupportFactor(BaseModel):
    model_config = _STRICT
    factor: str = Field(min_length=1)
    status: FactorStatus
    note: str | None = None


class ConfounderStatus(str, Enum):
    ADDRESSED = "ADDRESSED"
    UNADDRESSED = "UNADDRESSED"
    NOT_A_CONFOUNDER = "NOT_A_CONFOUNDER"


class NamedConfounder(BaseModel):
    model_config = _STRICT
    name: str = Field(min_length=1)
    node_id: str | None = None
    status: ConfounderStatus = ConfounderStatus.UNADDRESSED
    note: str | None = None


class GroupEffect(BaseModel):
    """Effect heterogeneity: the edge's direction for one group's members."""

    model_config = _STRICT
    group_id: str = Field(min_length=1)
    direction: Literal[-1, 0, 1]
    note: str | None = None


class EdgeEvidenceCard(BaseModel):
    """Decision-layer annotation of one causal edge. The literature grade stays
    on the CausalEdge (Layer 1's ratified grading); this card adds what a
    decision needs on top: where the belief comes from, whether it is about
    intervening, what else could explain it, whom it differs for, and whether
    it transports to this site."""

    model_config = _STRICT
    edge: EdgeRef
    basis: list[EvidenceBasis] = Field(min_length=1)
    causal_form: CausalForm = CausalForm.UNCLEAR
    confounder_prompt_answered: bool = Field(
        default=False, description="Someone was asked 'what else causes both?' and the answer is recorded."
    )
    confounders: list[NamedConfounder] = Field(default_factory=list)
    group_effects: list[GroupEffect] = Field(default_factory=list)
    support_factors: list[SupportFactor] = Field(default_factory=list)
    transport: Transport = Transport.NOT_ASSESSED
    statement_ids: list[str] = Field(default_factory=list)
    note: str | None = None

    @model_validator(mode="after")
    def _check(self) -> "EdgeEvidenceCard":
        if self.transport is Transport.LIKELY_HOLDS and any(
            f.status is FactorStatus.ABSENT for f in self.support_factors
        ):
            raise ValueError(
                f"edge {self.edge.key()}: transport cannot be LIKELY_HOLDS with an ABSENT support factor"
            )
        gids = [g.group_id for g in self.group_effects]
        if len(set(gids)) != len(gids):
            raise ValueError(f"edge {self.edge.key()}: duplicate group in group_effects")
        return self


# --- Step 8: consequence table ----------------------------------------------


class EstimateMethod(str, Enum):
    ELICITED = "ELICITED"
    MODELED = "MODELED"
    LITERATURE = "LITERATURE"
    MEASURED = "MEASURED"


class Estimate(BaseModel):
    """Three quantiles in the attribute's units (see config.PT_WEIGHTS)."""

    model_config = _STRICT
    p05: float
    p50: float
    p95: float
    method: EstimateMethod
    source_note: str | None = None

    @model_validator(mode="after")
    def _check(self) -> "Estimate":
        if not (self.p05 <= self.p50 <= self.p95):
            raise ValueError("estimate quantiles must satisfy p05 <= p50 <= p95")
        return self

    @property
    def uncertain(self) -> bool:
        return self.p95 > self.p05


class ConsequenceCell(BaseModel):
    """Alternative x fundamental objective. ``estimate`` None means explicitly
    MISSING, which blocks ranking rather than being silently imputed."""

    model_config = _STRICT
    alternative_id: str = Field(min_length=1)
    objective_id: str = Field(min_length=1)
    estimate: Estimate | None = None
    basis_edges: list[EdgeRef] = Field(default_factory=list)
    group_estimates: dict[str, Estimate] = Field(
        default_factory=dict, description="Per-group estimates before reconciliation."
    )
    note: str | None = None

    def ref(self) -> CellRef:
        return CellRef(alternative_id=self.alternative_id, objective_id=self.objective_id)


# --- Step 9: tradeoffs ------------------------------------------------------


class SwingWeights(BaseModel):
    """Swing weighting (von Winterfeldt & Edwards 1986): the most valued
    worst-to-best swing scores 100; the others are rated relative to it."""

    model_config = _STRICT
    group_id: str = Field(min_length=1)
    points: dict[str, float]
    elicited_on: str | None = None
    preferential_independence_checked: bool = False

    @model_validator(mode="after")
    def _check(self) -> "SwingWeights":
        if not self.points:
            raise ValueError(f"weights for {self.group_id!r}: no points")
        if any(p < 0 or p > 100 for p in self.points.values()):
            raise ValueError(f"weights for {self.group_id!r}: points must lie in [0, 100]")
        if abs(max(self.points.values()) - 100) > 1e-9:
            raise ValueError(f"weights for {self.group_id!r}: the largest swing must score exactly 100")
        return self

    def normalized(self) -> dict[str, float]:
        total = sum(self.points.values())
        return {k: v / total for k, v in self.points.items()}


class SwapLeg(BaseModel):
    model_config = _STRICT
    objective_id: str = Field(min_length=1)
    new_value: float


class EvenSwap(BaseModel):
    """Hammond, Keeney & Raiffa (1998): change one alternative on two objectives
    so that the group judges the result equally attractive."""

    model_config = _STRICT
    id: str = Field(min_length=1)
    group_id: str = Field(min_length=1)
    alternative_id: str = Field(min_length=1)
    give: SwapLeg
    get: SwapLeg
    note: str | None = None

    @model_validator(mode="after")
    def _check(self) -> "EvenSwap":
        if self.give.objective_id == self.get.objective_id:
            raise ValueError(f"even swap {self.id!r}: give and get must be different objectives")
        return self


# --- Step 11: robustness ----------------------------------------------------


class Signpost(BaseModel):
    """Dewar (2002): an observable that warns a load-bearing assumption is failing."""

    model_config = _STRICT
    id: str = Field(min_length=1)
    indicator: str = Field(min_length=1)
    threshold: str = Field(min_length=1)
    cadence: str | None = None


class AssumptionRefs(BaseModel):
    model_config = _STRICT
    cells: list[CellRef] = Field(default_factory=list)
    edges: list[EdgeRef] = Field(default_factory=list)
    weights: list[WeightRef] = Field(default_factory=list)


class Assumption(BaseModel):
    model_config = _STRICT
    id: str = Field(min_length=1)
    text: str = Field(min_length=1)
    refs: AssumptionRefs = Field(default_factory=AssumptionRefs)
    vulnerable: bool | None = Field(default=None, description="Could plausibly fail within the horizon. None = unassessed.")
    signposts: list[Signpost] = Field(default_factory=list)
    shaping_actions: list[str] = Field(default_factory=list)
    hedging_actions: list[str] = Field(default_factory=list)


# --- Step 12: decision record -----------------------------------------------


class GroupPosition(BaseModel):
    model_config = _STRICT
    group_id: str = Field(min_length=1)
    preferred_alternative_id: str | None = None
    dissent_note: str | None = None


class PremortemEntry(BaseModel):
    """Klein (2007): assume it failed; say why."""

    model_config = _STRICT
    failure_story: str = Field(min_length=1)
    causes: list[str] = Field(default_factory=list)
    mitigation: str | None = None


class DecisionRecord(BaseModel):
    model_config = _STRICT
    chosen_alternative_id: str = Field(min_length=1)
    decided_by: str = Field(min_length=1)
    decided_on: str | None = None
    rationale: str = Field(min_length=1)
    positions: list[GroupPosition] = Field(default_factory=list)
    premortem: list[PremortemEntry] = Field(default_factory=list)
    review_trigger_signpost_ids: list[str] = Field(default_factory=list)
    analysis_hash: str | None = Field(
        default=None, description="Hash of the model the analysis ran on, set when recorded."
    )


# --- the container ----------------------------------------------------------


def _dupes(ids: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for i in ids:
        if i in seen and i not in out:
            out.append(i)
        seen.add(i)
    return out


class DecisionModel(BaseModel):
    """Everything a decision needs, cross-validated as a unit."""

    model_config = _STRICT
    frame: DecisionFrame
    groups: list[UserGroup] = Field(default_factory=list)
    interviews: list[Interview] = Field(default_factory=list)
    statements: list[Statement] = Field(default_factory=list)
    objectives: list[Objective] = Field(default_factory=list)
    alternatives: list[Alternative] = Field(default_factory=list)
    loop_treatments: list[LoopTreatment] = Field(default_factory=list)
    edge_cards: list[EdgeEvidenceCard] = Field(default_factory=list)
    cells: list[ConsequenceCell] = Field(default_factory=list)
    weights: list[SwingWeights] = Field(default_factory=list)
    even_swaps: list[EvenSwap] = Field(default_factory=list)
    assumptions: list[Assumption] = Field(default_factory=list)
    record: DecisionRecord | None = None

    # --- lookups ------------------------------------------------------------

    def objective(self, oid: str) -> Objective:
        for o in self.objectives:
            if o.id == oid:
                return o
        raise KeyError(oid)

    def alternative(self, aid: str) -> Alternative:
        for a in self.alternatives:
            if a.id == aid:
                return a
        raise KeyError(aid)

    def cell(self, aid: str, oid: str) -> ConsequenceCell | None:
        for c in self.cells:
            if c.alternative_id == aid and c.objective_id == oid:
                return c
        return None

    def card(self, edge: EdgeRef) -> EdgeEvidenceCard | None:
        for c in self.edge_cards:
            if c.edge == edge:
                return c
        return None

    def weights_for(self, gid: str) -> SwingWeights | None:
        for w in self.weights:
            if w.group_id == gid:
                return w
        return None

    def leaf_objectives(self) -> list[Objective]:
        """Fundamental objectives with no fundamental children: the columns of
        the consequence table."""
        parents = {o.parent_id for o in self.objectives if o.parent_id}
        return [
            o for o in self.objectives
            if o.kind is ObjectiveKind.FUNDAMENTAL and o.id not in parents
        ]

    def compensatory_leaves(self) -> list[Objective]:
        return [o for o in self.leaf_objectives() if o.role is AggregationRole.COMPENSATORY]

    def constraint_leaves(self) -> list[Objective]:
        return [o for o in self.leaf_objectives() if o.role is AggregationRole.CONSTRAINT]

    # --- integrity ----------------------------------------------------------

    @model_validator(mode="after")
    def _integrity(self) -> "DecisionModel":
        errs: list[str] = []

        for name, ids in (
            ("group", [g.id for g in self.groups]),
            ("interview", [i.id for i in self.interviews]),
            ("statement", [s.id for s in self.statements]),
            ("objective", [o.id for o in self.objectives]),
            ("alternative", [a.id for a in self.alternatives]),
            ("even swap", [s.id for s in self.even_swaps]),
            ("assumption", [a.id for a in self.assumptions]),
            ("signpost", [sp.id for a in self.assumptions for sp in a.signposts]),
        ):
            for d in _dupes(ids):
                errs.append(f"duplicate {name} id {d!r}")

        gids = {g.id for g in self.groups}
        iids = {i.id for i in self.interviews}
        sids = {s.id for s in self.statements}
        oids = {o.id for o in self.objectives}
        aids = {a.id for a in self.alternatives}
        objs = {o.id: o for o in self.objectives}

        for i in self.interviews:
            if i.group_id not in gids:
                errs.append(f"interview {i.id!r}: unknown group {i.group_id!r}")
            if i.individual_first is not None and i.mode is InterviewMode.INDIVIDUAL:
                errs.append(f"interview {i.id!r}: individual_first applies only to group formats")

        for s in self.statements:
            if s.interview_id not in iids:
                errs.append(f"statement {s.id!r}: unknown interview {s.interview_id!r}")
            if s.objective_id is not None and s.objective_id not in oids:
                errs.append(f"statement {s.id!r}: unknown objective {s.objective_id!r}")
            if s.alternative_id is not None and s.alternative_id not in aids:
                errs.append(f"statement {s.id!r}: unknown alternative {s.alternative_id!r}")
            if s.population not in (None, "ALL") and s.population not in gids:
                errs.append(f"statement {s.id!r}: population {s.population!r} is not a group or 'ALL'")

        # objectives hierarchy
        for o in self.objectives:
            if o.parent_id is not None:
                p = objs.get(o.parent_id)
                if p is None:
                    errs.append(f"objective {o.id!r}: unknown parent {o.parent_id!r}")
                elif p.kind is not ObjectiveKind.FUNDAMENTAL:
                    errs.append(f"objective {o.id!r}: parent {o.parent_id!r} is not FUNDAMENTAL")
            for f in o.serves:
                t = objs.get(f)
                if t is None:
                    errs.append(f"objective {o.id!r}: serves unknown objective {f!r}")
                elif t.kind is not ObjectiveKind.FUNDAMENTAL:
                    errs.append(f"objective {o.id!r}: serves {f!r}, which is not FUNDAMENTAL")
            for st in o.statement_ids:
                if st not in sids:
                    errs.append(f"objective {o.id!r}: unknown statement {st!r}")
        # hierarchy acyclic
        for o in self.objectives:
            seen: set[str] = set()
            cur = o
            while cur.parent_id is not None and cur.parent_id in objs:
                if cur.id in seen:
                    errs.append(f"objective hierarchy has a cycle through {o.id!r}")
                    break
                seen.add(cur.id)
                cur = objs[cur.parent_id]
        parents = {o.parent_id for o in self.objectives if o.parent_id}
        for o in self.objectives:
            if o.kind is ObjectiveKind.FUNDAMENTAL and o.id in parents and o.attribute is not None:
                errs.append(f"objective {o.id!r}: only leaf fundamental objectives carry an attribute")
            if o.kind is ObjectiveKind.FUNDAMENTAL and o.id in parents and o.role is AggregationRole.CONSTRAINT:
                errs.append(f"objective {o.id!r}: only leaf fundamental objectives can be constraints")

        for a in self.alternatives:
            for st in a.statement_ids:
                if st not in sids:
                    errs.append(f"alternative {a.id!r}: unknown statement {st!r}")

        # edge cards
        card_keys = [c.edge.key() for c in self.edge_cards]
        for d in _dupes(card_keys):
            errs.append(f"duplicate edge card for {d}")
        for c in self.edge_cards:
            for ge in c.group_effects:
                if ge.group_id not in gids:
                    errs.append(f"edge card {c.edge.key()}: unknown group {ge.group_id!r}")
            for st in c.statement_ids:
                if st not in sids:
                    errs.append(f"edge card {c.edge.key()}: unknown statement {st!r}")

        # cells
        leaves = {o.id: o for o in self.leaf_objectives()}
        cell_keys = [(c.alternative_id, c.objective_id) for c in self.cells]
        for d in _dupes([f"{a}|{o}" for a, o in cell_keys]):
            errs.append(f"duplicate consequence cell {d}")
        for c in self.cells:
            if c.alternative_id not in aids:
                errs.append(f"cell ({c.alternative_id}, {c.objective_id}): unknown alternative")
            obj = leaves.get(c.objective_id)
            if obj is None:
                errs.append(
                    f"cell ({c.alternative_id}, {c.objective_id}): objective is not a leaf FUNDAMENTAL objective"
                )
                continue
            if obj.attribute is None:
                errs.append(f"cell ({c.alternative_id}, {c.objective_id}): objective has no attribute")
                continue
            ests = ([("estimate", c.estimate)] if c.estimate else []) + list(c.group_estimates.items())
            for label, e in ests:
                if e.p05 < obj.attribute.lo - 1e-9 or e.p95 > obj.attribute.hi + 1e-9:
                    errs.append(
                        f"cell ({c.alternative_id}, {c.objective_id}) {label}: interval "
                        f"[{e.p05}, {e.p95}] falls outside the attribute range "
                        f"[{obj.attribute.lo}, {obj.attribute.hi}]; widen the range and re-elicit "
                        "swing weights (weights depend on the range)"
                    )
            for g in c.group_estimates:
                if g not in gids:
                    errs.append(f"cell ({c.alternative_id}, {c.objective_id}): unknown group {g!r}")

        # weights
        comp = {o.id for o in self.compensatory_leaves()}
        for d in _dupes([w.group_id for w in self.weights]):
            errs.append(f"duplicate swing weights for group {d!r}")
        for w in self.weights:
            if w.group_id not in gids:
                errs.append(f"weights: unknown group {w.group_id!r}")
            extra = set(w.points) - comp
            missing = comp - set(w.points)
            if extra:
                errs.append(f"weights for {w.group_id!r}: not compensatory leaf objectives: {sorted(extra)}")
            if missing:
                errs.append(f"weights for {w.group_id!r}: missing objectives {sorted(missing)} (use 0 explicitly)")

        # even swaps
        for s in self.even_swaps:
            if s.group_id not in gids:
                errs.append(f"even swap {s.id!r}: unknown group {s.group_id!r}")
            if s.alternative_id not in aids:
                errs.append(f"even swap {s.id!r}: unknown alternative {s.alternative_id!r}")
            for leg in (s.give, s.get):
                o = leaves.get(leg.objective_id)
                if o is None or o.role is not AggregationRole.COMPENSATORY or o.attribute is None:
                    errs.append(f"even swap {s.id!r}: {leg.objective_id!r} is not a compensatory leaf objective")
                elif not (o.attribute.lo - 1e-9 <= leg.new_value <= o.attribute.hi + 1e-9):
                    errs.append(f"even swap {s.id!r}: new value for {leg.objective_id!r} is outside its range")

        # assumptions
        for a in self.assumptions:
            for cr in a.refs.cells:
                if cr.alternative_id not in aids or cr.objective_id not in leaves:
                    errs.append(f"assumption {a.id!r}: unknown cell ({cr.alternative_id}, {cr.objective_id})")
            for wr in a.refs.weights:
                if wr.group_id not in gids or wr.objective_id not in comp:
                    errs.append(f"assumption {a.id!r}: unknown weight ({wr.group_id}, {wr.objective_id})")

        # record
        if self.record is not None:
            r = self.record
            if r.chosen_alternative_id not in aids:
                errs.append(f"record: unknown chosen alternative {r.chosen_alternative_id!r}")
            for p in r.positions:
                if p.group_id not in gids:
                    errs.append(f"record: unknown group {p.group_id!r}")
                if p.preferred_alternative_id is not None and p.preferred_alternative_id not in aids:
                    errs.append(f"record: unknown alternative {p.preferred_alternative_id!r}")
            spids = {sp.id for a in self.assumptions for sp in a.signposts}
            for sp in r.review_trigger_signpost_ids:
                if sp not in spids:
                    errs.append(f"record: unknown signpost {sp!r}")

        if errs:
            raise ValueError("decision model integrity: " + "; ".join(errs))
        return self


__all__ = [
    "CodedBy", "EdgeRef", "CellRef", "WeightRef",
    "QuestionKind", "TypedQuestion", "DecisionFrame",
    "UserGroup", "InterviewMode", "Interview", "StatementType", "CausalForm",
    "StatedConfidence", "Statement",
    "ObjectiveKind", "AttributeKind", "Direction", "AggregationRole", "Attribute", "Objective",
    "AlternativeKind", "Alternative",
    "LoopTreatmentKind", "LoopTreatment",
    "EvidenceBasis", "Transport", "FactorStatus", "SupportFactor", "ConfounderStatus",
    "NamedConfounder", "GroupEffect", "EdgeEvidenceCard",
    "EstimateMethod", "Estimate", "ConsequenceCell",
    "SwingWeights", "SwapLeg", "EvenSwap",
    "Signpost", "AssumptionRefs", "Assumption",
    "GroupPosition", "PremortemEntry", "DecisionRecord",
    "DecisionModel",
]
