"""Project thinker-level influence up to tradition-level edges through the bridge.

A tradition-level INFLUENCE edge is the (log-scaled) count of thinker-level
influence edges crossing it, direction preserved, dated by the influencer's
floruit — which makes the edge layer temporal and the map animatable by century.
"""

from __future__ import annotations

import math
from collections import defaultdict

from .edges import InfluenceEdge
from .enums import Provenance
from .map import Layer2Map
from .wikidata import ThinkerEdge


def _qid_to_traditions(m: Layer2Map) -> dict[str, set[str]]:
    """Wikidata QID -> the set of tradition/position ids it bridges to."""
    thinker_to_traditions: dict[str, set[str]] = defaultdict(set)
    for b in m.bridge():
        thinker_to_traditions[b.thinker_id].add(b.target_id)
    out: dict[str, set[str]] = defaultdict(set)
    for t in m.thinkers():
        if t.wikidata_qid:
            out[t.wikidata_qid] |= thinker_to_traditions.get(t.id, set())
    return out


def _qid_to_floruit(m: Layer2Map) -> dict[str, int]:
    return {t.wikidata_qid: t.floruit_start for t in m.thinkers()
            if t.wikidata_qid and t.floruit_start is not None}


def project_influence(
    m: Layer2Map, thinker_edges: list[ThinkerEdge], add: bool = True
) -> list[InfluenceEdge]:
    """Aggregate thinker edges into tradition-level INFLUENCE edges. When
    ``add``, the edges are inserted into the map (self-loops are dropped)."""
    qid_traditions = _qid_to_traditions(m)
    qid_floruit = _qid_to_floruit(m)

    counts: dict[tuple[str, str], int] = defaultdict(int)
    periods: dict[tuple[str, str], list[int]] = defaultdict(list)
    for e in thinker_edges:
        for src in qid_traditions.get(e.influencer_qid, set()):
            for tgt in qid_traditions.get(e.influenced_qid, set()):
                if src == tgt:
                    continue
                counts[(src, tgt)] += 1
                if (fl := qid_floruit.get(e.influencer_qid)) is not None:
                    periods[(src, tgt)].append(fl)

    edges: list[InfluenceEdge] = []
    for (src, tgt), count in counts.items():
        period = min(periods[(src, tgt)]) if periods[(src, tgt)] else None
        edge = InfluenceEdge(
            source=src,
            target=tgt,
            weight=round(math.log1p(count), 4),
            period=period,
            provenance=Provenance.WIKIDATA,
            confidence=min(1.0, 0.4 + 0.1 * count),
        )
        if add:
            m.add_edge(edge)
        edges.append(edge)
    return edges


__all__ = ["project_influence"]
