"""Layer 2 A7: empirical thinker<->position bridge (survey identification)."""

from __future__ import annotations

from pathlib import Path

from delib.layer2 import Grain, Layer2Map, MapNode, Placement, Provenance
from delib.layer2.bridge import BridgeAssignment, Thinker
from delib.layer2.survey import phi_from_cells
from delib.layer2.survey.bridge_evidence import (
    BridgeEvidenceStore,
    ingest_bridge_evidence_into_map,
    scrape_bridge_evidence,
)
from delib.layer2.survey.scrape import PhilPeopleScraper, ScrapeConfig

CAP = Path(__file__).resolve().parents[2] / "data" / "fixtures" / "site_captures"

# the A7 validation triples supplied with the spec
TRIPLES = [
    ("Kant", "Practical reason: Kantian", 0.55, 639),
    ("Hume", "Practical reason: Humean", 0.49, 641),
    ("Aristotle", "Practical reason: Aristotelian", 0.43, 641),
]


def _pos(label: str) -> MapNode:
    from delib.layer2.survey import slugify

    return MapNode(id=slugify(label), label=label, grain=Grain.POSITION,
                   placement=Placement.UNPLACED, provenance=Provenance.PHILSURVEY)


def _evidence_store() -> BridgeEvidenceStore:
    s = BridgeEvidenceStore()
    for thinker, position, r, n in TRIPLES:
        s.add(thinker, position, r, n)
    return s


def _map_with_thinkers_and_positions() -> Layer2Map:
    m = Layer2Map()
    for thinker, position, _, _ in TRIPLES:
        from delib.layer2.survey import slugify

        m.add_thinker(Thinker(id=slugify(thinker), label=thinker))
        m.add_node(_pos(position))
    return m


# --- scrape philosopher page (reuses A5 parser) -----------------------------


def test_scrape_bridge_evidence_from_real_philosopher_page():
    scraper = PhilPeopleScraper(
        fetcher=lambda url: (CAP / "philosopher_kant.html").read_text(),
        config=ScrapeConfig(min_interval_seconds=0.0), sleep_fn=lambda s: None,
    )
    store = BridgeEvidenceStore()
    added = scrape_bridge_evidence(scraper, store, ["Kant"])
    assert added == 70  # real Kant page: 70 thinker<->position associations
    ev = next(e for e in store.all() if e.position_id == "practical-reason-kantian")
    assert ev.thinker_id == "kant" and ev.r == 0.55 and ev.n == 639
    assert (phi_from_cells(ev.cells) < 0) == (ev.r < 0)  # sign matches (attenuated magnitude)
    assert abs(phi_from_cells(ev.cells) - ev.r) < 0.05


# --- validation triples -> bridge assignments -------------------------------


def test_ingest_creates_empirical_survey_assignments_with_measured_weight():
    m = _map_with_thinkers_and_positions()
    added = ingest_bridge_evidence_into_map(m, _evidence_store())
    assert len(added) == 3

    kant = next(a for a in m.bridge() if a.thinker_id == "kant")
    assert kant.target_id == "practical-reason-kantian"
    assert kant.provenance is Provenance.EMPIRICAL_SURVEY
    assert abs(kant.confidence - 0.55) < 1e-9  # confidence == |r|

    hume = next(a for a in m.bridge() if a.thinker_id == "hume")
    assert abs(hume.confidence - 0.49) < 1e-9


def test_min_r_filters_weak_evidence():
    m = _map_with_thinkers_and_positions()
    added = ingest_bridge_evidence_into_map(m, _evidence_store(), min_r=0.50)
    # only Kant (0.55) clears 0.50; Hume 0.49 and Aristotle 0.43 dropped
    assert {a.thinker_id for a in added} == {"kant"}


# --- provenance priority: manual > empirical > wikidata ---------------------


def test_manual_override_beats_empirical_survey():
    m = _map_with_thinkers_and_positions()
    ingest_bridge_evidence_into_map(m, _evidence_store())  # EMPIRICAL_SURVEY
    m.add_bridge(BridgeAssignment(thinker_id="kant", target_id="practical-reason-kantian",
                                  provenance=Provenance.MANUAL, confidence=0.99))
    resolved = {(a.thinker_id, a.target_id): a for a in m.resolved_bridge()}
    assert resolved[("kant", "practical-reason-kantian")].provenance is Provenance.MANUAL


def test_empirical_survey_beats_wikidata():
    m = _map_with_thinkers_and_positions()
    m.add_bridge(BridgeAssignment(thinker_id="kant", target_id="practical-reason-kantian",
                                  provenance=Provenance.WIKIDATA, confidence=0.9))
    ingest_bridge_evidence_into_map(m, _evidence_store())  # EMPIRICAL_SURVEY, conf 0.55
    resolved = {(a.thinker_id, a.target_id): a for a in m.resolved_bridge()}
    # empirical survey outranks wikidata despite lower confidence
    assert resolved[("kant", "practical-reason-kantian")].provenance is Provenance.EMPIRICAL_SURVEY
