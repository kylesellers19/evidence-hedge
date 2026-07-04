"""SQLite key/value cache for raw SPARQL responses (principle 3: nothing
external is load-bearing except the cache)."""

from __future__ import annotations

import sqlite3
from pathlib import Path


class SparqlCache:
    def __init__(self, db_path: str | Path = ":memory:") -> None:
        self.db_path = str(db_path)
        if self.db_path != ":memory:":
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.execute("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)")
        self._conn.commit()

    def get(self, key: str) -> str | None:
        row = self._conn.execute("SELECT value FROM kv WHERE key = ?", (key,)).fetchone()
        return row[0] if row else None

    def put(self, key: str, value: str) -> None:
        self._conn.execute("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", (key, value))
        self._conn.commit()

    def items(self) -> list[tuple[str, str]]:
        return [(r[0], r[1]) for r in self._conn.execute("SELECT key, value FROM kv").fetchall()]

    def count(self) -> int:
        return int(self._conn.execute("SELECT COUNT(*) FROM kv").fetchone()[0])


__all__ = ["SparqlCache"]
