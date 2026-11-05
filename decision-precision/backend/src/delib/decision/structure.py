"""Steps 1-5: framing, elicitation coverage, the facts/values split, objective
completeness, and the strategy table. Pure functions; no LLM."""

from __future__ import annotations

import re

import networkx as nx
from pydantic import BaseModel

from ..graph import DelibGraph
from ..models.enums import NodeType, Register
from ..models.nodes import ConsequenceNode, DecisionNode
from .models import (
    AlternativeKind,
    CodedBy,
    DecisionModel,
    InterviewMode,
    ObjectiveKind,
    QuestionKind,
    StatementType,
)

# --- Step 1: question typing -------------------------------------------------
# Ordered: OBJECTIVE patterns are checked first ("how do we protect" must not be
# read as an uncertainty), then ALTERNATIVE, then UNCERTAINTY.
# PROVISIONAL — not ratified (lexicon)
_QUESTION_PATTERNS: list[tuple[QuestionKind, str, re.Pattern[str]]] = [
    (QuestionKind.OBJECTIVE, "how-do-we-<protect>", re.compile(
        r"^\s*how\s+(do|can|should|could|might)\s+(we|i|they|the\s+\w+)\s+(make\s+sure|keep|protect|ensure|"
        r"preserve|maintain|improve|increase|reduce|minimi[sz]e|maximi[sz]e|avoid|support|achieve)\b", re.I)),
    (QuestionKind.ALTERNATIVE, "what-if / should-we", re.compile(
        r"^\s*(what\s+(happens|would\s+happen|will\s+happen)\s+if|what\s+if|should\s+(we|i|they|the\s+\w+)|"
        r"(does|would)\s+it\s+make\s+sense\s+to|is\s+it\s+worth)\b", re.I)),
    (QuestionKind.UNCERTAINTY, "will / how-likely", re.compile(
        r"^\s*(will|how\s+likely|is\s+it\s+likely|what\s+are\s+the\s+(odds|chances)|how\s+(much|many|soon)\s+will|"
        r"when\s+will)\b", re.I)),
]


class QuestionSuggestion(BaseModel):
    text: str
    kind: QuestionKind | None
    pattern: str | None
    matched: str | None


def suggest_question_kind(text: str) -> QuestionSuggestion:
    for kind, name, rx in _QUESTION_PATTERNS:
        m = rx.search(text)
        if m:
            return QuestionSuggestion(text=text, kind=kind, pattern=name, matched=m.group(0).strip())
    return QuestionSuggestion(text=text, kind=None, pattern=None, matched=None)


def question_suggestions(model: DecisionModel, graph: DelibGraph | None) -> list[QuestionSuggestion]:
    """Suggestions for every untyped or unconfirmed question, plus the graph's
    seed question when the frame does not list it yet."""
    out: list[QuestionSuggestion] = []
    listed = {q.text for q in model.frame.questions}
    for q in model.frame.questions:
        if q.kind is None or not q.confirmed:
            out.append(suggest_question_kind(q.text))
    if graph is not None and graph.seed_id is not None:
        seed = graph.get_node(graph.seed_id)
        qt = getattr(seed, "question_text", None)
        if qt and qt not in listed:
            out.append(suggest_question_kind(qt))
    return out


# --- Steps 2-3: elicitation coverage and the facts/values split --------------

VALUE_TYPES = {StatementType.OBJECTIVE, StatementType.MEANS, StatementType.CONSTRAINT}
FACT_TYPES = {StatementType.CAUSAL_BELIEF, StatementType.FACT_CLAIM, StatementType.UNCERTAINTY}
OPTION_TYPES = {StatementType.ALTERNATIVE}


class Partition(BaseModel):
    values: list[str]
    facts: list[str]
    options: list[str]
    out_of_frame: list[str]
    unlinked: list[str]  # typed but not linked to any model or graph element


def partition(model: DecisionModel) -> Partition:
    values, facts, options, oof, unlinked = [], [], [], [], []
    for s in model.statements:
        if s.type in VALUE_TYPES:
            values.append(s.id)
        elif s.type in FACT_TYPES:
            facts.append(s.id)
        elif s.type in OPTION_TYPES:
            options.append(s.id)
        else:
            oof.append(s.id)
        linked = any(x is not None for x in (s.objective_id, s.alternative_id, s.edge, s.node_id))
        if s.type is not StatementType.OUT_OF_FRAME and not linked:
            unlinked.append(s.id)
    return Partition(values=values, facts=facts, options=options, out_of_frame=oof, unlinked=unlinked)


def statement_group(model: DecisionModel) -> dict[str, str]:
    """statement id -> group id (through its interview)."""
    by_interview = {i.id: i.group_id for i in model.interviews}
    return {s.id: by_interview[s.interview_id] for s in model.statements}


def elicitation_gaps(model: DecisionModel) -> list[str]:
    gaps: list[str] = []
    interviewed = {i.group_id for i in model.interviews}
    for g in model.groups:
        if g.id not in interviewed:
            gaps.append(f"group {g.id!r} has no interviews")
    for i in model.interviews:
        if not i.redaction_confirmed:
            gaps.append(f"interview {i.id!r}: redaction not confirmed")
        if i.mode in (InterviewMode.GROUP, InterviewMode.WORKSHOP) and i.individual_first is not True:
            gaps.append(
                f"interview {i.id!r}: group format without recorded individual-first elicitation "
                "(estimates and objectives risk anchoring on the first speaker)"
            )
    sg = statement_group(model)
    for s in model.statements:
        if s.coded_by is CodedBy.MACHINE and not s.verified:
            gaps.append(f"statement {s.id!r}: machine-coded, not verified")
    raised = {sg[s.id] for s in model.statements if s.type in VALUE_TYPES}
    for gid in interviewed - raised:
        gaps.append(f"group {gid!r}: interviewed but no objective, means, or constraint statements coded")
    return gaps


# --- Step 4: objectives ---------------------------------------------------------


class RegisterGap(BaseModel):
    register: Register
    consequence_ids: list[str]


class ObjectivesReport(BaseModel):
    leaves: list[str]
    compensatory: list[str]
    constraints: list[str]
    raised_by: dict[str, list[str]]  # objective id -> group ids whose statements raised it
    leaves_without_attribute: list[str]
    unlinked_value_statements: list[str]
    register_gaps: list[RegisterGap]
    gaps: list[str]


def _relevant_consequences(model: DecisionModel, graph: DelibGraph) -> list[ConsequenceNode]:
    causal = graph.causal_digraph()
    focus = [d for d in model.frame.focus if d in causal]
    if focus:
        reach: set[str] = set()
        for d in focus:
            reach |= nx.descendants(causal, d)
        ids = reach
    else:
        ids = {n.id for n in graph.nodes()}
    return [n for n in graph.nodes() if isinstance(n, ConsequenceNode) and n.id in ids]


def objectives_report(model: DecisionModel, graph: DelibGraph | None) -> ObjectivesReport:
    sg = statement_group(model)
    raised: dict[str, set[str]] = {}
    for s in model.statements:
        if s.objective_id is not None:
            raised.setdefault(s.objective_id, set()).add(sg[s.id])
    for o in model.objectives:
        for st in o.statement_ids:
            raised.setdefault(o.id, set()).add(sg[st])

    leaves = model.leaf_objectives()
    no_attr = [o.id for o in leaves if o.attribute is None]
    unlinked = [s.id for s in model.statements if s.type in VALUE_TYPES and s.objective_id is None]

    # Orders of worth as a completeness check: a register invoked on the
    # consequences this decision reaches, but expressed by no fundamental
    # objective, means the value tree is missing something someone argued for.
    reg_gaps: list[RegisterGap] = []
    if graph is not None:
        grounded = {r for o in model.objectives if o.kind is ObjectiveKind.FUNDAMENTAL for r in o.registers}
        invoked: dict[Register, list[str]] = {}
        for c in _relevant_consequences(model, graph):
            for e in c.registers:
                invoked.setdefault(e.register, []).append(c.id)
        for reg in Register:
            if reg in invoked and reg not in grounded:
                reg_gaps.append(RegisterGap(register=reg, consequence_ids=sorted(set(invoked[reg]))))

    gaps: list[str] = []
    if not leaves:
        gaps.append("no fundamental objectives")
    gaps += [f"leaf objective {oid!r} has no attribute (measure)" for oid in no_attr]
    gaps += [f"value statement {sid!r} is not linked to an objective" for sid in unlinked]
    gaps += [
        f"order of worth {g.register.value} is invoked on {len(g.consequence_ids)} consequence(s) "
        "but expressed by no fundamental objective"
        for g in reg_gaps
    ]
    return ObjectivesReport(
        leaves=[o.id for o in leaves],
        compensatory=[o.id for o in model.compensatory_leaves()],
        constraints=[o.id for o in model.constraint_leaves()],
        raised_by={k: sorted(v) for k, v in raised.items()},
        leaves_without_attribute=no_attr,
        unlinked_value_statements=unlinked,
        register_gaps=reg_gaps,
        gaps=gaps,
    )


# --- Step 5: strategy table ---------------------------------------------------


class Dimension(BaseModel):
    node_id: str
    label: str
    options: list[str]


class StrategyRow(BaseModel):
    alternative_id: str
    label: str
    kind: AlternativeKind
    choices: dict[str, str]


class StrategyTable(BaseModel):
    dimensions: list[Dimension]
    rows: list[StrategyRow]
    gaps: list[str]


def strategy_table(model: DecisionModel, graph: DelibGraph | None) -> StrategyTable:
    dims: list[Dimension] = []
    for d in model.frame.focus:
        if graph is not None and d in graph and graph.node_type(d) is NodeType.DECISION:
            node: DecisionNode = graph.get_node(d)  # type: ignore[assignment]
            dims.append(Dimension(node_id=d, label=node.label, options=list(node.alternatives)))
        else:
            dims.append(Dimension(node_id=d, label=d, options=[]))
    rows = [
        StrategyRow(alternative_id=a.id, label=a.label, kind=a.kind, choices=dict(a.choices))
        for a in model.alternatives
    ]
    gaps: list[str] = []
    if len(model.alternatives) < 2:
        gaps.append("fewer than two alternatives: there is nothing to decide between")
    kinds = {a.kind for a in model.alternatives}
    if AlternativeKind.STATUS_QUO not in kinds:
        gaps.append("no STATUS_QUO alternative: consequences have no baseline")
    if AlternativeKind.DEFER not in kinds:
        gaps.append("no DEFER alternative considered (recommended where waiting buys information)")
    dim_ids = [d.node_id for d in dims]
    combos: dict[tuple, str] = {}
    for a in model.alternatives:
        if a.kind is not AlternativeKind.ACTION:
            continue
        missing = [d for d in dim_ids if d not in a.choices]
        if missing:
            gaps.append(f"alternative {a.id!r} makes no choice for {missing}")
        key = tuple(a.choices.get(d) for d in dim_ids)
        if dim_ids and key in combos:
            gaps.append(f"alternatives {combos[key]!r} and {a.id!r} make identical choices")
        combos.setdefault(key, a.id)
    return StrategyTable(dimensions=dims, rows=rows, gaps=gaps)


__all__ = [
    "QuestionSuggestion", "suggest_question_kind", "question_suggestions",
    "VALUE_TYPES", "FACT_TYPES", "OPTION_TYPES",
    "Partition", "partition", "statement_group", "elicitation_gaps",
    "RegisterGap", "ObjectivesReport", "objectives_report",
    "Dimension", "StrategyRow", "StrategyTable", "strategy_table",
]
