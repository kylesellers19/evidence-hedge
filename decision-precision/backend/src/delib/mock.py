"""Mock generator (Phase 2b).

Wraps the authored Brooklyn master graph and reveals it one expansion at a time,
so a live graph can be grown from seed + ring-1 outward exactly the way the
progressive-disclosure UI (Phase 3) will drive it. Implements the same
:class:`~delib.generation.Generator` interface the LiteLLM generator will use in
Phase 4.
"""

from __future__ import annotations

from .fixtures.brooklyn import GOAL_STATE, SEED_QUESTION, build_brooklyn_master
from .generation import Candidate, ExpansionResult, Generator, GoalStateProposal
from .graph import DelibGraph


class MockGenerator(Generator):
    def __init__(self, master: DelibGraph | None = None) -> None:
        self._master = master or build_brooklyn_master()

    def intake(self, question_text: str) -> GoalStateProposal:
        return GoalStateProposal(
            question_text=question_text or SEED_QUESTION,
            goal_state_text=GOAL_STATE,
            goal_criteria=[
                "net housing capacity increases",
                "no net wellbeing loss to incumbent residents",
            ],
        )

    def expand(self, graph: DelibGraph, node_id: str) -> ExpansionResult:
        """Reveal `node_id`'s out-edges (children + loop-backs + closure) from
        the master. Loop-back and closure targets that already exist in the
        live graph are attached without re-adding the node."""
        master = self._master
        if node_id not in master:
            return ExpansionResult(parent_id=node_id, candidates=[])

        candidates: list[Candidate] = []
        for _, target, attrs in master.raw().out_edges(node_id, data=True):
            edge = attrs["data"]
            child = master.get_node(target)
            # deep-copy so the live graph never aliases the master's objects.
            candidates.append(
                Candidate(node=child.model_copy(deep=True), edge=edge.model_copy(deep=True))
            )
        return ExpansionResult(parent_id=node_id, candidates=candidates)

    def master(self) -> DelibGraph:
        return self._master


def grow_full(master: DelibGraph | None = None) -> DelibGraph:
    """Drive the mock generator BFS-from-seed until nothing new appears —
    reconstructing the whole master in a fresh live graph via the public
    expand/apply path. Useful for tests and as a Phase-3 data source."""
    from .generation import apply_expansion

    gen = MockGenerator(master)
    m = gen.master()
    live = DelibGraph(stakeholders=m.stakeholders)
    seed = m.get_node(m.seed_id).model_copy(deep=True)  # type: ignore[arg-type]
    live.add_node(seed)

    frontier = [m.seed_id]
    seen: set[str] = set()
    while frontier:
        node_id = frontier.pop(0)
        if node_id in seen:
            continue
        seen.add(node_id)
        result = gen.expand(live, node_id)
        added = apply_expansion(live, result)
        frontier.extend(added)
    return live


__all__ = ["MockGenerator", "grow_full"]
