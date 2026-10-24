"""Tradition set + curated attack matrix (deliberation-canvas half).

Reuses the Layer-2 tradition leaves (the ethics/political traditions the survey
touches) as the vocabulary a consequence can be attributed to, and adds a small
CURATED attack matrix: which traditions attack which, and over what proposition.

Two adjacent nodes (joined by a causal/deliberative edge) whose attributed
traditions attack each other carry a tradition tension — the second tension layer
(distinct from register clashes). Author-curated, provenance-tagged, editable.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

# The Layer-2 tradition leaf ids, restated here so Layer 1 doesn't import Layer 2.
TRADITION_LEAVES: frozenset[str] = frozenset(
    {"kantian_deontological", "virtue_ethical", "utilitarian_aggregate", "libertarian_nozickian"}
)


class TraditionAttack(BaseModel):
    model_config = ConfigDict(extra="forbid")
    a: str = Field(min_length=1)
    b: str = Field(min_length=1)
    about: str = Field(min_length=1, description="The contested proposition.")
    provenance: str = "curated"


_ATTACKS: list[TraditionAttack] = [
    TraditionAttack(
        a="utilitarian_aggregate", b="kantian_deontological",
        about="Whether aggregate welfare can override a person's inviolable constraints.",
    ),
    TraditionAttack(
        a="utilitarian_aggregate", b="libertarian_nozickian",
        about="Whether redistribution for total welfare violates prior individual rights.",
    ),
    TraditionAttack(
        a="kantian_deontological", b="virtue_ethical",
        about="Whether morality is grounded in universal rules or in character and practical wisdom.",
    ),
    TraditionAttack(
        a="libertarian_nozickian", b="virtue_ethical",
        about="Whether the good life is a matter of unconstrained choice or of cultivated virtue.",
    ),
]

# symmetric lookup by unordered pair
_BY_PAIR: dict[frozenset[str], TraditionAttack] = {frozenset({t.a, t.b}): t for t in _ATTACKS}


def tradition_attacks(a: str, b: str) -> TraditionAttack | None:
    """The curated attack between two traditions, or None. Symmetric."""
    return _BY_PAIR.get(frozenset({a, b}))


__all__ = ["TRADITION_LEAVES", "TraditionAttack", "tradition_attacks"]
