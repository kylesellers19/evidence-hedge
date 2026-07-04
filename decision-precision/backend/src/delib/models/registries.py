"""Stakeholder registry.

The Framework registry was removed with the register/tradition pivot (frameworks
are superseded by delib.models.traditions). Stakeholders were REPURPOSED: they
are the referents of a consequence's ``distributional_effects`` (the who-bears-
what layer), validated at graph-insert time.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

_STRICT = ConfigDict(extra="forbid")


class Stakeholder(BaseModel):
    model_config = _STRICT
    id: str = Field(min_length=1)
    description: str = Field(min_length=1)


class StakeholderRegistry:
    def __init__(self) -> None:
        self._items: dict[str, Stakeholder] = {}

    def register(self, s: Stakeholder) -> Stakeholder:
        if s.id in self._items:
            raise ValueError(f"Stakeholder id already registered: {s.id!r}")
        self._items[s.id] = s
        return s

    def get(self, sid: str) -> Stakeholder:
        return self._items[sid]

    def __contains__(self, sid: str) -> bool:
        return sid in self._items

    def ids(self) -> set[str]:
        return set(self._items)

    def __iter__(self):
        return iter(self._items.values())

    def __len__(self) -> int:
        return len(self._items)


__all__ = [
    "Stakeholder",
    "StakeholderRegistry",
]
