"""The claim store — keyed on NORMALIZED claims, not edges.

A claim is the reusable unit of evidence. Two edges (or a distributional effect)
that assert the same thing normalize to the same ``claim_hash`` and share one
graded record, so grading compounds across graphs — the store is a first-class,
persistent data asset. Edges/effects reference claims many-to-one by hash.

``grade_components`` is stored as a JSON blob (its typed shape lives in
evidence.grading, wired in step 3); ``graded_at`` makes every grade a snapshot.
"""

from __future__ import annotations

import hashlib
import json
import re
import sqlite3
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

_STRICT = ConfigDict(extra="forbid")
_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def normalize_claim(text: str) -> str:
    """Deterministic normalization: lowercase, collapse every run of non-
    alphanumerics to a single space, strip. Two surface forms of the same claim
    ("Rent increases cause displacement." / "rent increase causes displacement")
    still differ by morphology — normalization is intentionally conservative
    (it never rewrites words), so the hash is stable and predictable, not clever."""
    return _NON_ALNUM.sub(" ", text.lower()).strip()


def claim_hash(text: str) -> str:
    """16-hex-char stable id of a claim's normalized text."""
    return hashlib.sha256(normalize_claim(text).encode("utf-8")).hexdigest()[:16]


class Citation(BaseModel):
    model_config = _STRICT
    source: str = Field(description="Which plugin surfaced it: openalex | s2 | pubmed.")
    doi: str | None = None  # merge key across sources (normalized lowercase)
    title: str = Field(min_length=1)
    year: int | None = None
    venue: str | None = None
    url: str | None = None
    study_design: str | None = None  # publication-type / classified design
    citation_intent: str | None = None  # S2: supporting | contrasting | background


class ClaimRecord(BaseModel):
    model_config = _STRICT
    claim_hash: str
    claim_text: str  # the surface form first interned
    normalized_text: str
    graded_at: float | None = None  # unix seconds; None => ungraded. A grade is a snapshot.
    grade_components: dict[str, Any] | None = None  # typed in evidence.grading (step 3)
    evidence_grade: str | None = None  # computed from components
    citations: list[Citation] = Field(default_factory=list)


class ClaimStore:
    """Persistent SQLite store of graded claims, keyed by claim_hash."""

    def __init__(self, db_path: str | Path = ":memory:") -> None:
        self.db_path = str(db_path)
        if self.db_path != ":memory:":
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS claims (
                claim_hash TEXT PRIMARY KEY,
                claim_text TEXT NOT NULL,
                normalized_text TEXT NOT NULL,
                graded_at REAL,
                grade_components TEXT,
                evidence_grade TEXT,
                citations TEXT NOT NULL DEFAULT '[]'
            )
            """
        )
        self._conn.commit()

    def intern(self, claim_text: str) -> str:
        """Ensure a (possibly ungraded) record exists for this claim; return its
        hash. Idempotent — re-interning the same claim never disturbs its grade."""
        h = claim_hash(claim_text)
        if self._conn.execute("SELECT 1 FROM claims WHERE claim_hash = ?", (h,)).fetchone() is None:
            self._conn.execute(
                "INSERT INTO claims (claim_hash, claim_text, normalized_text) VALUES (?, ?, ?)",
                (h, claim_text, normalize_claim(claim_text)),
            )
            self._conn.commit()
        return h

    def get(self, h: str) -> ClaimRecord | None:
        row = self._conn.execute("SELECT * FROM claims WHERE claim_hash = ?", (h,)).fetchone()
        return self._row(row) if row else None

    def get_by_text(self, claim_text: str) -> ClaimRecord | None:
        return self.get(claim_hash(claim_text))

    def set_grade(
        self,
        h: str,
        *,
        grade_components: dict[str, Any] | None,
        evidence_grade: str | None,
        citations: list[Citation],
        graded_at: float,
    ) -> ClaimRecord:
        """Write a grade snapshot onto an interned claim. Overwrites any prior
        grade (re-grades are expected — nothing here assumes immutability)."""
        self._conn.execute(
            "UPDATE claims SET graded_at = ?, grade_components = ?, evidence_grade = ?, "
            "citations = ? WHERE claim_hash = ?",
            (
                graded_at,
                json.dumps(grade_components) if grade_components is not None else None,
                evidence_grade,
                json.dumps([c.model_dump(mode="json") for c in citations]),
                h,
            ),
        )
        self._conn.commit()
        rec = self.get(h)
        if rec is None:
            raise KeyError(f"cannot grade unknown claim {h!r}; intern it first")
        return rec

    def all(self) -> list[ClaimRecord]:
        return [self._row(r) for r in self._conn.execute("SELECT * FROM claims ORDER BY claim_hash")]

    def count(self) -> int:
        return int(self._conn.execute("SELECT COUNT(*) FROM claims").fetchone()[0])

    def _row(self, row: sqlite3.Row) -> ClaimRecord:
        return ClaimRecord(
            claim_hash=row["claim_hash"],
            claim_text=row["claim_text"],
            normalized_text=row["normalized_text"],
            graded_at=row["graded_at"],
            grade_components=json.loads(row["grade_components"]) if row["grade_components"] else None,
            evidence_grade=row["evidence_grade"],
            citations=[Citation(**c) for c in json.loads(row["citations"])],
        )


__all__ = ["Citation", "ClaimRecord", "ClaimStore", "claim_hash", "normalize_claim"]
