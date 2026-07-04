"""Correlation store (A1).

SQLite-backed like everything else. Answer-option labels normalize to stable
slug ids (verbatim label kept alongside). Pairs are stored unordered (canonical
id order) and merged across source tiers with priority
RESPONSE_DATA > SITE_SCRAPE > PUBLISHED_TABLE — a higher tier overwrites a lower
one for the same pair, a lower tier never displaces a higher one.
"""

from __future__ import annotations

import re
import sqlite3
import time
from pathlib import Path

from pydantic import BaseModel

from ..enums import SourceTier, TIER_PRIORITY

_TIER_PRIORITY = TIER_PRIORITY
_SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(label: str) -> str:
    """Stable, idempotent option id: lowercase, non-alphanumerics -> single '-'.
    slugify(slugify(x)) == slugify(x)."""
    return _SLUG_RE.sub("-", label.lower()).strip("-")


class CorrelationRow(BaseModel):
    option_a_id: str
    option_b_id: str
    label_a: str
    label_b: str
    r: float
    n: int
    source_tier: SourceTier
    retrieved_at: float


def _canonical(a_id, a_label, b_id, b_label):
    """Order the pair by id so (a,b) and (b,a) collapse to one row."""
    if a_id <= b_id:
        return a_id, a_label, b_id, b_label
    return b_id, b_label, a_id, a_label


class CorrelationStore:
    def __init__(self, db_path: str | Path = ":memory:") -> None:
        self.db_path = str(db_path)
        if self.db_path != ":memory:":
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS correlations (
                pair_key TEXT PRIMARY KEY,
                option_a_id TEXT NOT NULL,
                option_b_id TEXT NOT NULL,
                label_a TEXT NOT NULL,
                label_b TEXT NOT NULL,
                r REAL NOT NULL,
                n INTEGER NOT NULL,
                source_tier TEXT NOT NULL,
                retrieved_at REAL NOT NULL
            )
            """
        )
        self._conn.commit()

    def add(
        self,
        label_a: str,
        label_b: str,
        r: float,
        n: int,
        tier: SourceTier,
        retrieved_at: float | None = None,
    ) -> bool:
        """Insert/merge one pair. Returns True if the store now holds this
        (i.e. it was inserted or overwrote a lower tier), False if an
        equal-or-higher existing tier kept its value."""
        a_id, a_label, b_id, b_label = _canonical(
            slugify(label_a), label_a, slugify(label_b), label_b
        )
        pair_key = f"{a_id}|{b_id}"
        ts = time.time() if retrieved_at is None else retrieved_at

        existing = self._conn.execute(
            "SELECT source_tier FROM correlations WHERE pair_key = ?", (pair_key,)
        ).fetchone()
        if existing is not None:
            cur_tier = SourceTier(existing["source_tier"])
            if _TIER_PRIORITY[tier] < _TIER_PRIORITY[cur_tier]:
                return False  # lower tier never displaces a higher one

        self._conn.execute(
            """
            INSERT INTO correlations
                (pair_key, option_a_id, option_b_id, label_a, label_b, r, n, source_tier, retrieved_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(pair_key) DO UPDATE SET
                option_a_id=excluded.option_a_id, option_b_id=excluded.option_b_id,
                label_a=excluded.label_a, label_b=excluded.label_b,
                r=excluded.r, n=excluded.n,
                source_tier=excluded.source_tier, retrieved_at=excluded.retrieved_at
            """,
            (pair_key, a_id, b_id, a_label, b_label, r, n, tier.value, ts),
        )
        self._conn.commit()
        return True

    def _row(self, row: sqlite3.Row) -> CorrelationRow:
        return CorrelationRow(
            option_a_id=row["option_a_id"],
            option_b_id=row["option_b_id"],
            label_a=row["label_a"],
            label_b=row["label_b"],
            r=row["r"],
            n=row["n"],
            source_tier=SourceTier(row["source_tier"]),
            retrieved_at=row["retrieved_at"],
        )

    def get(self, label_or_id_a: str, label_or_id_b: str) -> CorrelationRow | None:
        a, b = sorted((slugify(label_or_id_a), slugify(label_or_id_b)))
        row = self._conn.execute(
            "SELECT * FROM correlations WHERE pair_key = ?", (f"{a}|{b}",)
        ).fetchone()
        return self._row(row) if row else None

    def all(self) -> list[CorrelationRow]:
        rows = self._conn.execute("SELECT * FROM correlations ORDER BY pair_key").fetchall()
        return [self._row(r) for r in rows]

    def count(self) -> int:
        return int(self._conn.execute("SELECT COUNT(*) FROM correlations").fetchone()[0])

    def option_ids(self) -> set[str]:
        out: set[str] = set()
        for r in self.all():
            out.add(r.option_a_id)
            out.add(r.option_b_id)
        return out


__all__ = ["SourceTier", "CorrelationRow", "CorrelationStore", "slugify"]
