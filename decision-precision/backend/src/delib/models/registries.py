"""Stakeholder and framework registries.

Frameworks carry a markdown rubric loaded from ``/rubrics/*.md`` at runtime; the
registry is the single source of truth the CODER prompt is constrained against
(it must never emit a framework absent from this registry).

``burden_index`` for a stakeholder is *computed from the graph* (sum of negative
valences weighted by path confidence), not stored here — see
``delib.queries.burden_index``.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

_STRICT = ConfigDict(extra="forbid")


class Stakeholder(BaseModel):
    model_config = _STRICT
    id: str = Field(min_length=1)
    description: str = Field(min_length=1)


class Framework(BaseModel):
    model_config = _STRICT
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    rubric: str = Field(min_length=1, description="Markdown rubric text.")


def _derive_name(stem: str, text: str) -> str:
    """Framework display name = first markdown H1, else a title-cased stem."""
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("# "):
            return line[2:].strip()
    return stem.replace("_", " ").title()


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


class FrameworkRegistry:
    def __init__(self) -> None:
        self._items: dict[str, Framework] = {}

    def register(self, f: Framework) -> Framework:
        if f.id in self._items:
            raise ValueError(f"Framework id already registered: {f.id!r}")
        self._items[f.id] = f
        return f

    def get(self, fid: str) -> Framework:
        return self._items[fid]

    def __contains__(self, fid: str) -> bool:
        return fid in self._items

    def ids(self) -> set[str]:
        return set(self._items)

    def __iter__(self):
        return iter(self._items.values())

    def __len__(self) -> int:
        return len(self._items)

    @classmethod
    def from_dir(cls, rubrics_dir: str | Path) -> "FrameworkRegistry":
        """Load one framework per ``*.md`` file; id == filename stem."""
        reg = cls()
        path = Path(rubrics_dir)
        if not path.is_dir():
            raise FileNotFoundError(f"rubrics dir not found: {path}")
        for md in sorted(path.glob("*.md")):
            text = md.read_text(encoding="utf-8")
            reg.register(
                Framework(id=md.stem, name=_derive_name(md.stem, text), rubric=text)
            )
        return reg


__all__ = [
    "Stakeholder",
    "Framework",
    "StakeholderRegistry",
    "FrameworkRegistry",
]
