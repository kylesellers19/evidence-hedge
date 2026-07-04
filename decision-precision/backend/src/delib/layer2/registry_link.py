"""Seed the canonical normative-tradition leaves into the Layer-2 map.

The tradition vocabulary is shared with Layer 1 (delib.models.traditions):
``TRADITION_LEAVES`` become TRADITION-grain map nodes with the SAME ids, so a
Layer-1 consequence attribution and the Layer-2 geometry refer to one tradition.
They start UNPLACED — Stage A/C assign coordinates later; Stage B can attach
influence edges immediately. (Superseded the old FrameworkRegistry link.)
"""

from __future__ import annotations

from ..models.traditions import TRADITION_LEAVES
from .enums import Grain, Placement, Provenance
from .map import Layer2Map
from .nodes import MapNode


def _label(leaf: str) -> str:
    return leaf.replace("_", " ").title()


def tradition_leaf_nodes() -> list[MapNode]:
    return [
        MapNode(
            id=leaf,
            label=_label(leaf),
            grain=Grain.TRADITION,
            placement=Placement.UNPLACED,
            provenance=Provenance.MANUAL,
        )
        for leaf in sorted(TRADITION_LEAVES)
    ]


def link_traditions(m: Layer2Map) -> list[str]:
    """Add each canonical tradition leaf as an UNPLACED map node (idempotent).
    Returns the ids added."""
    added: list[str] = []
    for node in tradition_leaf_nodes():
        if node.id not in m:
            m.add_node(node)
            added.append(node.id)
    return added


__all__ = ["tradition_leaf_nodes", "link_traditions"]
