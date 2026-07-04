"""Apply CODER and GRADER results back onto a graph.

Separate from generation: coding a node and grading an edge are distinct LLM
calls (never combined), and each writes the validated result into the graph's
networkx store in place.
"""

from __future__ import annotations

from ..graph import DelibGraph
from ..models.edges import CausalEdge
from ..models.enums import EdgeType
from ..models.nodes import (
    CFIRTags,
    ConsequenceNode,
    DecisionNode,
    Node,
    ProctorScore,
    ProctorScores,
    RegisterEngagement,
    TraditionAttribution,
)
from ..models.traditions import TRADITION_LEAVES
from .interface import LLM


def code_node(llm: LLM, graph: DelibGraph, node_id: str) -> Node:
    """Run the CODER on one node (registers/traditions for a consequence,
    CFIR/Proctor for a decision) and write the coded node back. Cross-
    contamination is impossible: the method called is chosen by the node's type.
    Machine-coded nodes stay coding_status=PENDING until a human verifies them."""
    node = graph.get_node(node_id)
    summary = f"{node.label} (ring {node.ring})"

    if isinstance(node, ConsequenceNode):
        coding = llm.code_consequence(summary, set(TRADITION_LEAVES))
        updated = node.model_copy(
            update={
                "registers": [RegisterEngagement(**r.model_dump()) for r in coding.registers],
                "traditions": [TraditionAttribution(**t.model_dump()) for t in coding.traditions],
                "goal_relevance": coding.goal_relevance,
            }
        )
    elif isinstance(node, DecisionNode):
        c = llm.code_decision(summary)
        updated = node.model_copy(
            update={
                "cfir_tags": CFIRTags(
                    innovation=c.innovation,
                    outer_setting=c.outer_setting,
                    inner_setting=c.inner_setting,
                    individuals=c.individuals,
                    process=c.process,
                ),
                "proctor_scores": ProctorScores(
                    acceptability=ProctorScore(**c.acceptability.model_dump()),
                    feasibility=ProctorScore(**c.feasibility.model_dump()),
                    cost=ProctorScore(**c.cost.model_dump()),
                    sustainability=ProctorScore(**c.sustainability.model_dump()),
                    adoption=ProctorScore(**c.adoption.model_dump()),
                ),
            }
        )
    else:
        return node  # seed/state carry nothing to code

    graph.raw().nodes[node_id]["data"] = updated
    return updated


def grade_edge(
    llm: LLM, graph: DelibGraph, source: str, target: str, abstracts: str = ""
) -> CausalEdge:
    """Run the GRADER on one causal edge and write back its evidence grade."""
    key = EdgeType.CAUSAL.value
    edge_attrs = graph.raw().get_edge_data(source, target, key)
    if edge_attrs is None:
        raise KeyError(f"no causal edge {source!r}->{target!r}")
    edge: CausalEdge = edge_attrs["data"]
    out = llm.grade(edge.mechanism_text, abstracts)
    updated = edge.model_copy(
        update={"evidence_grade": out.evidence_grade, "transfer_note": out.transfer_note}
    )
    graph.raw()[source][target][key]["data"] = updated
    return updated


__all__ = ["code_node", "grade_edge"]
