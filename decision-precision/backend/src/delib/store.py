"""Training-data store (principle 2 — log everything).

Every LLM request/response pair and every human correction is appended here.
This dataset is a first-class product, so the table shape is fixed by the brief:
``task_type, input_json, output_json, human_corrected_output_json, timestamp``.

Phase 3 uses only the human-correction path (edits from the UI); Phase 4 adds
the LLM request/response path through the same store.
"""

from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path
from typing import Any


def _dumps(obj: Any) -> str | None:
    return None if obj is None else json.dumps(obj, default=str, sort_keys=True)


class TrainingDataStore:
    def __init__(self, db_path: str | Path = ":memory:") -> None:
        self.db_path = str(db_path)
        if self.db_path != ":memory:":
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init()

    def _init(self) -> None:
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_type TEXT NOT NULL,
                input_json TEXT NOT NULL,
                output_json TEXT,
                human_corrected_output_json TEXT,
                timestamp REAL NOT NULL
            )
            """
        )
        self._conn.commit()

    def log(
        self,
        task_type: str,
        input_obj: Any,
        output_obj: Any = None,
        corrected_obj: Any = None,
        timestamp: float | None = None,
    ) -> int:
        """Append one row; returns its id. Used both for LLM pairs (Phase 4) and
        human corrections (input=before, corrected=after)."""
        ts = time.time() if timestamp is None else timestamp
        cur = self._conn.execute(
            "INSERT INTO interactions "
            "(task_type, input_json, output_json, human_corrected_output_json, timestamp) "
            "VALUES (?, ?, ?, ?, ?)",
            (task_type, _dumps(input_obj), _dumps(output_obj), _dumps(corrected_obj), ts),
        )
        self._conn.commit()
        return int(cur.lastrowid)

    def add_correction(self, row_id: int, corrected_obj: Any) -> None:
        self._conn.execute(
            "UPDATE interactions SET human_corrected_output_json = ? WHERE id = ?",
            (_dumps(corrected_obj), row_id),
        )
        self._conn.commit()

    def count(self) -> int:
        return int(self._conn.execute("SELECT COUNT(*) FROM interactions").fetchone()[0])

    def all(self) -> list[dict[str, Any]]:
        rows = self._conn.execute(
            "SELECT * FROM interactions ORDER BY id"
        ).fetchall()
        return [dict(r) for r in rows]

    def close(self) -> None:
        self._conn.close()


__all__ = ["TrainingDataStore"]
