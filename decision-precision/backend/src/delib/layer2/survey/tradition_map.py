"""Curated survey-option -> tradition-leaf map (A2/A4 bridge).

Derived from the fixture's ``registry_relevant_edges``: the survey answer options
that are proxies for DELIB registry tradition leaves. Positions carrying a
mapping are nested under their tradition leaf via ``parent_id`` (grain nesting),
so the empirical co-belief/opposition edges between them read as evidence about
the tradition. Everything else stays an unattached POSITION.

NOTE (flagged): the four leaf ids (kantian_deontological, virtue_ethical,
utilitarian_aggregate, libertarian_nozickian) come from the fixture; they are
expected to exist in the map as link_frameworks-created TRADITION leaves. This
small map is editable/versioned like the rest of the bridge.
"""

from __future__ import annotations

# option slug -> tradition leaf id
REGISTRY_LEAF_BY_OPTION: dict[str, str] = {
    "normative-ethics-deontology": "kantian_deontological",
    "practical-reason-kantian": "kantian_deontological",
    "normative-ethics-virtue-ethics": "virtue_ethical",
    "practical-reason-aristotelian": "virtue_ethical",
    "normative-ethics-consequentialism": "utilitarian_aggregate",
    "political-philosophy-libertarianism": "libertarian_nozickian",
}

# the tradition leaves the survey touches (union of the map's values)
REGISTRY_LEAVES: set[str] = set(REGISTRY_LEAF_BY_OPTION.values())

__all__ = ["REGISTRY_LEAF_BY_OPTION", "REGISTRY_LEAVES"]
