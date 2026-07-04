"""Layer 2 Stage 0: schema type discipline, container constraints, and the
diagnostic/lineage queries."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from delib.layer2 import (
    AttackEdge,
    BridgeAssignment,
    CompatibilityEdge,
    DescentEdge,
    Grain,
    InfluenceEdge,
    Layer2ConstraintError,
    Layer2Map,
    MapNode,
    Placement,
    Provenance,
    Thinker,
    diagnostic_regions,
    lineage_drift,
    node_distance,
)


def trad(nid, x, y) -> MapNode:
    return MapNode(
        id=nid, label=nid, grain=Grain.TRADITION, placement=Placement.SURVEY,
        coords_survey=[x, y], provenance=Provenance.MANUAL,
    )


def attack(a, b, about="the good"):
    return AttackEdge(source=a, target=b, about=about, provenance=Provenance.CURATED, confidence=0.8)


def compat(a, b):
    return CompatibilityEdge(source=a, target=b, provenance=Provenance.CURATED, confidence=0.7)


def descent(a, b):
    return DescentEdge(source=a, target=b, provenance=Provenance.CURATED, confidence=0.9)


# --- node placement honesty -------------------------------------------------


def test_survey_placement_requires_survey_coords():
    with pytest.raises(ValidationError):
        MapNode(id="x", label="x", grain=Grain.TRADITION, placement=Placement.SURVEY,
                provenance=Provenance.MANUAL)  # no coords_survey


def test_calibrated_placement_requires_calibrated_coords():
    with pytest.raises(ValidationError):
        MapNode(id="x", label="x", grain=Grain.TRADITION, placement=Placement.CALIBRATED,
                coords_survey=[1, 2], provenance=Provenance.MANUAL)  # survey coords, not calibrated


def test_calibrated_node_valid():
    n = MapNode(id="x", label="x", grain=Grain.TRADITION, placement=Placement.CALIBRATED,
                coords_calibrated=[1.0, 2.0], provenance=Provenance.PHILPAPERS)
    assert n.coords() == [1.0, 2.0]


# --- edge type discipline ---------------------------------------------------


def test_about_only_on_attack():
    with pytest.raises(ValidationError):
        InfluenceEdge(source="a", target="b", about="x", provenance=Provenance.WIKIDATA, confidence=0.5)


def test_period_only_on_influence():
    with pytest.raises(ValidationError):
        AttackEdge(source="a", target="b", about="x", period=1800,
                   provenance=Provenance.CURATED, confidence=0.5)


def test_attack_requires_about():
    with pytest.raises(ValidationError):
        AttackEdge(source="a", target="b", provenance=Provenance.CURATED, confidence=0.5)


def test_influence_edge_valid():
    e = InfluenceEdge(source="a", target="b", period=1807, weight=3.0,
                      provenance=Provenance.WIKIDATA, confidence=0.6)
    assert e.type.value == "INFLUENCE" and e.period == 1807


# --- container constraints --------------------------------------------------


def test_duplicate_node_raises():
    m = Layer2Map()
    m.add_node(trad("a", 0, 0))
    with pytest.raises(Layer2ConstraintError):
        m.add_node(trad("a", 1, 1))


def test_parent_must_be_coarser_or_equal():
    m = Layer2Map()
    m.add_node(trad("util", 0, 0))
    m.add_node(MapNode(id="act", label="act", grain=Grain.POSITION, parent_id="util",
                       placement=Placement.SURVEY, coords_survey=[0, 0.1], provenance=Provenance.MANUAL))
    # a TRADITION cannot be nested under a POSITION
    with pytest.raises(Layer2ConstraintError):
        m.add_node(MapNode(id="bad", label="bad", grain=Grain.TRADITION, parent_id="act",
                           placement=Placement.SURVEY, coords_survey=[0, 0], provenance=Provenance.MANUAL))


def test_edge_endpoint_must_be_map_node():
    m = Layer2Map()
    m.add_node(trad("a", 0, 0))
    with pytest.raises(Layer2ConstraintError):
        m.add_edge(attack("a", "ghost"))


def test_descent_cycle_raises():
    m = Layer2Map()
    for n in ("a", "b", "c"):
        m.add_node(trad(n, 0, 0))
    m.add_edge(descent("a", "b"))
    m.add_edge(descent("b", "c"))
    with pytest.raises(Layer2ConstraintError):
        m.add_edge(descent("c", "a"))


def test_influence_may_cycle():
    m = Layer2Map()
    m.add_node(trad("a", 0, 0))
    m.add_node(trad("b", 1, 0))
    m.add_edge(InfluenceEdge(source="a", target="b", provenance=Provenance.WIKIDATA, confidence=0.5))
    m.add_edge(InfluenceEdge(source="b", target="a", provenance=Provenance.WIKIDATA, confidence=0.5))  # ok


# --- bridge -----------------------------------------------------------------


def test_bridge_requires_known_thinker_and_target():
    m = Layer2Map()
    m.add_node(trad("kant", 0, 0))
    m.add_thinker(Thinker(id="kant_p", label="Immanuel Kant", floruit_start=1770))
    with pytest.raises(Layer2ConstraintError):
        m.add_bridge(BridgeAssignment(thinker_id="ghost", target_id="kant",
                                      provenance=Provenance.MANUAL, confidence=0.9))
    with pytest.raises(Layer2ConstraintError):
        m.add_bridge(BridgeAssignment(thinker_id="kant_p", target_id="ghost",
                                      provenance=Provenance.MANUAL, confidence=0.9))
    ok = m.add_bridge(BridgeAssignment(thinker_id="kant_p", target_id="kant",
                                       provenance=Provenance.MANUAL, confidence=0.9))
    assert ok in m.bridge()


# --- queries: distance + diagnostic regions ---------------------------------


def test_distance_respects_grain():
    a = trad("a", 0, 0)
    b = MapNode(id="b", label="b", grain=Grain.POSITION, placement=Placement.SURVEY,
                coords_survey=[3, 4], provenance=Provenance.MANUAL)
    assert node_distance(a, a) == 0.0
    assert node_distance(a, b) is None  # different grain -> not compared


def _diag_map() -> Layer2Map:
    m = Layer2Map()
    m.add_node(trad("kant", 0, 0))
    m.add_node(trad("bentham", 0.1, 0))
    m.add_node(trad("virtue", 10, 0))
    m.add_node(trad("marx", 5, 5))
    m.add_edge(attack("kant", "bentham", about="the ground of moral obligation"))
    m.add_edge(compat("marx", "virtue"))
    return m


def test_diagnostic_regions_classify():
    report = diagnostic_regions(_diag_map(), near=0.5, far=3.0)
    riv = {frozenset((p.a, p.b)) for p in report.rivalries}
    alli = {frozenset((p.a, p.b)) for p in report.surprising_alliances}
    inc = {frozenset((p.a, p.b)) for p in report.incommensurable}

    assert frozenset(("kant", "bentham")) in riv  # near + attack
    assert frozenset(("marx", "virtue")) in alli  # far + compatibility
    assert frozenset(("kant", "virtue")) in inc  # far + no edge
    # the compatibility pair is NOT flagged incommensurable (it has an edge)
    assert frozenset(("marx", "virtue")) not in inc


# --- queries: lineage drift -------------------------------------------------


def test_lineage_drift_surfaces_migrated_descendant():
    m = Layer2Map()
    for nid, (x, y) in {"a": (0, 0), "b": (0.1, 0), "c": (0, 0.1), "d": (0.1, 0.1)}.items():
        m.add_node(trad(nid, x, y))
    m.add_node(trad("far", 10, 0))  # a descendant that migrated far
    m.add_edge(descent("a", "b"))  # near descendant
    m.add_edge(descent("a", "far"))  # drifted descendant

    drifts = {(d.ancestor, d.descendant) for d in lineage_drift(m, factor=1.5)}
    assert ("a", "far") in drifts
    assert ("a", "b") not in drifts
