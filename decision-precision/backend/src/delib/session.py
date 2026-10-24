"""In-memory session (Phase 3 prototype).

Holds one live DelibGraph plus the generator that grows it and the store that
logs human corrections. Initial state is progressive-disclosure minimal: seed +
ring-1 only. This is a single-process prototype seam; a real backend would key
sessions and persist graphs, but nothing above this layer assumes that.
"""

from __future__ import annotations

from typing import Any

from .dedup import Deduplicator
from .generation import Generator, apply_expansion
from .graph import DelibGraph
from .mock import MockGenerator
from .store import TrainingDataStore


class Session:
    def __init__(
        self,
        generator: Generator | None = None,
        store: TrainingDataStore | None = None,
        deduplicator: Deduplicator | None = None,
    ) -> None:
        self.generator = generator or MockGenerator()
        self.store = store or TrainingDataStore()
        self.deduplicator = deduplicator
        self.graph = DelibGraph()
        self.reset()

    # --- lifecycle ----------------------------------------------------------

    def reset(self) -> DelibGraph:
        """Rebuild the live graph to its initial seed + ring-1 state."""
        master = getattr(self.generator, "master", lambda: None)()
        if master is None or master.seed_id is None:
            raise RuntimeError("generator has no seeded master to initialize from")

        self.graph = DelibGraph(stakeholders=master.stakeholders)
        self.graph.add_node(master.get_node(master.seed_id).model_copy(deep=True))
        # reveal ring-1 (progressive-disclosure initial render)
        apply_expansion(self.graph, self.generator.expand(self.graph, master.seed_id))
        return self.graph

    # --- operations ---------------------------------------------------------

    def expand(self, node_id: str) -> list[str]:
        if node_id not in self.graph:
            raise KeyError(node_id)
        result = self.generator.expand(self.graph, node_id)
        return apply_expansion(self.graph, result, deduplicator=self.deduplicator)

    def edit_node(self, node_id: str, changes: dict[str, Any]) -> Any:
        """Apply field edits to a node, validating the result, and log the
        before/after to the training-data store as a human correction."""
        if node_id not in self.graph:
            raise KeyError(node_id)
        node = self.graph.get_node(node_id)
        before = node.model_dump(mode="json")
        # model_copy(update=...) re-runs no validation, so re-validate explicitly.
        updated = node.model_validate({**before, **changes})
        # write back into the graph's networkx store
        self.graph.raw().nodes[node_id]["data"] = updated
        after = updated.model_dump(mode="json")
        # the correction's tier is the node's resulting coding status (a panel
        # edit that confirms a node lands HUMAN_VERIFIED at that tier).
        tier = getattr(getattr(updated, "coding_status", None), "value", None)
        self.store.log(
            task_type=f"edit:{updated.type.value.lower()}",
            input_obj=before,
            output_obj=before,
            corrected_obj=after,
            tier=tier,
        )
        return updated


__all__ = ["Session"]
