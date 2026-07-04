"""Link Layer-1 frameworks to Layer-2 tradition leaves.

Per the chosen integration: the coding frameworks (aggregate_utilitarian,
prioritarian, …) become TRADITION-grain map nodes with the SAME ids, so Layer 1
and Layer 2 share vocabulary. They start UNPLACED — Stage A/C assign coordinates
later; Stage B can attach influence edges to them immediately.
"""

from __future__ import annotations

from ..models.registries import FrameworkRegistry
from .enums import Grain, Placement, Provenance
from .map import Layer2Map
from .nodes import MapNode


def traditions_from_frameworks(frameworks: FrameworkRegistry) -> list[MapNode]:
    return [
        MapNode(
            id=f.id,
            label=f.name,
            grain=Grain.TRADITION,
            placement=Placement.UNPLACED,
            provenance=Provenance.MANUAL,
        )
        for f in frameworks
    ]


def link_frameworks(m: Layer2Map, frameworks: FrameworkRegistry) -> list[str]:
    """Add each framework as an UNPLACED tradition leaf (idempotent). Returns
    the ids added."""
    added: list[str] = []
    for node in traditions_from_frameworks(frameworks):
        if node.id not in m:
            m.add_node(node)
            added.append(node.id)
    return added


__all__ = ["traditions_from_frameworks", "link_frameworks"]
