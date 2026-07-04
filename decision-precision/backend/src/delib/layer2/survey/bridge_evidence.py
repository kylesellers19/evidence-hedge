"""Empirical bridge (A7).

The survey's Philosopher category (~60 thinkers) crosses "describe yourself as
X-ian" identification against philosophical positions, with r/n/p and contingency
cells — measured thinker<->position associations. These ground thinker->position
bridge edges at the EMPIRICAL_SURVEY provenance tier (above Wikidata, below a
manual override). Thinker->tradition still flows through the position->tradition
tradition_map / grain nesting.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

from pydantic import BaseModel

from ..bridge import BridgeAssignment, BridgeRelation
from ..enums import Provenance
from ..map import Layer2Map
from .scrape import DEFAULT_CATEGORY, PhilPeopleScraper, build_correlation_url, parse_correlations
from .store import Cells, CorrelationStore, slugify

PHILOSOPHER_CATEGORY = "Philosopher"
PHILOSOPHER_PREFIX = "Philosopher: "  # the survey prefixes the identification row label


class BridgeEvidence(BaseModel):
    thinker_id: str
    thinker_label: str
    position_id: str
    position_label: str
    r: float
    n: int
    p_value: float | None = None
    cells: Cells | None = None
    provenance: str = "philsurvey2020"


class BridgeEvidenceStore:
    def __init__(self, db_path: str | Path = ":memory:") -> None:
        self.db_path = str(db_path)
        if self.db_path != ":memory:":
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS bridge_evidence (
                key TEXT PRIMARY KEY,
                thinker_id TEXT NOT NULL, thinker_label TEXT NOT NULL,
                position_id TEXT NOT NULL, position_label TEXT NOT NULL,
                r REAL NOT NULL, n INTEGER NOT NULL, p_value REAL,
                cell_aa INTEGER, cell_ar INTEGER, cell_ra INTEGER, cell_rr INTEGER,
                provenance TEXT NOT NULL
            )
            """
        )
        self._conn.commit()

    def add(self, thinker_label, position_label, r, n, p_value=None, cells: Cells | None = None) -> None:
        tid, pid = slugify(thinker_label), slugify(position_label)
        c = cells
        self._conn.execute(
            """
            INSERT INTO bridge_evidence
                (key, thinker_id, thinker_label, position_id, position_label,
                 r, n, p_value, cell_aa, cell_ar, cell_ra, cell_rr, provenance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                r=excluded.r, n=excluded.n, p_value=excluded.p_value,
                cell_aa=excluded.cell_aa, cell_ar=excluded.cell_ar,
                cell_ra=excluded.cell_ra, cell_rr=excluded.cell_rr
            """,
            (
                f"{tid}|{pid}", tid, thinker_label, pid, position_label, r, n, p_value,
                c.aa if c else None, c.ar if c else None, c.ra if c else None, c.rr if c else None,
                "philsurvey2020",
            ),
        )
        self._conn.commit()

    def all(self) -> list[BridgeEvidence]:
        out = []
        for row in self._conn.execute("SELECT * FROM bridge_evidence ORDER BY key").fetchall():
            cells = (
                Cells(aa=row["cell_aa"], ar=row["cell_ar"], ra=row["cell_ra"], rr=row["cell_rr"])
                if row["cell_aa"] is not None else None
            )
            out.append(BridgeEvidence(
                thinker_id=row["thinker_id"], thinker_label=row["thinker_label"],
                position_id=row["position_id"], position_label=row["position_label"],
                r=row["r"], n=row["n"], p_value=row["p_value"], cells=cells,
                provenance=row["provenance"],
            ))
        return out

    def count(self) -> int:
        return int(self._conn.execute("SELECT COUNT(*) FROM bridge_evidence").fetchone()[0])


def scrape_bridge_evidence(
    scraper: PhilPeopleScraper,
    store: BridgeEvidenceStore,
    philosophers: list[str],
    category: str = PHILOSOPHER_CATEGORY,
) -> int:
    """Fetch each philosopher's identification page (reusing the A5 parser) and
    record thinker<->position associations."""
    added = 0
    for philosopher in philosophers:
        html = scraper.fetch(build_correlation_url(philosopher, category))
        added += ingest_philosopher_page(store, html)
    return added


def ingest_philosopher_page(store: BridgeEvidenceStore, html: str) -> int:
    """Parse one Philosopher-category page into thinker<->position evidence. One
    endpoint of each block is ``Philosopher: X`` (the thinker); strip the prefix
    and orient the cells to (thinker, position). Non-thinker blocks (demographic
    rows) are skipped. Reused by the scraper and by reparse-from-cache."""
    added = 0
    for row in parse_correlations(html):
        if row.label_a.startswith(PHILOSOPHER_PREFIX):
            thinker, position, cells = row.label_a[len(PHILOSOPHER_PREFIX):], row.label_b, row.cells
        elif row.label_b.startswith(PHILOSOPHER_PREFIX):
            thinker, position, cells = row.label_b[len(PHILOSOPHER_PREFIX):], row.label_a, row.cells.transposed()
        else:
            continue
        store.add(thinker, position, row.r, row.n, p_value=row.p_value, cells=cells)
        added += 1
    return added


def ingest_bridge_evidence_into_map(
    m: Layer2Map, store: BridgeEvidenceStore, min_r: float = 0.0
) -> list[BridgeAssignment]:
    """Add thinker->position bridge assignments (EMPIRICAL_SURVEY tier,
    confidence = |r|) for evidence whose thinker and position both exist in the
    map and |r| >= min_r."""
    added: list[BridgeAssignment] = []
    thinker_ids = {t.id for t in m.thinkers()}
    for ev in store.all():
        if abs(ev.r) < min_r or ev.thinker_id not in thinker_ids or ev.position_id not in m:
            continue
        assignment = m.add_bridge(
            BridgeAssignment(
                thinker_id=ev.thinker_id,
                target_id=ev.position_id,
                relation=BridgeRelation.HOLDS,
                provenance=Provenance.EMPIRICAL_SURVEY,
                confidence=min(1.0, abs(ev.r)),
            )
        )
        added.append(assignment)
    return added


__all__ = [
    "PHILOSOPHER_CATEGORY",
    "BridgeEvidence",
    "BridgeEvidenceStore",
    "scrape_bridge_evidence",
    "ingest_philosopher_page",
    "ingest_bridge_evidence_into_map",
]
