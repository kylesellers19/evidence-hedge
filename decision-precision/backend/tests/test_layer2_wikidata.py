"""Layer 2 Stage B: Wikidata client (cached, offline via injected fetcher),
framework->tradition linkage, and thinker->tradition influence projection."""

from __future__ import annotations

from delib.layer2 import (
    Layer2Map,
    Layer2EdgeType,
    Placement,
    SparqlCache,
    ThinkerEdge,
    WikidataClient,
    link_frameworks,
    project_influence,
)
from delib.layer2.bridge import BridgeAssignment
from delib.layer2.enums import Provenance
from delib.layer2.bridge import Thinker
from delib.models.registries import Framework, FrameworkRegistry


def _bindings(pairs):
    # pairs of (s_qid, o_qid) -> SPARQL bindings shape
    base = "http://www.wikidata.org/entity/"
    return {"results": {"bindings": [
        {"s": {"value": base + s}, "o": {"value": base + o}} for s, o in pairs
    ]}}


# --- wikidata client + cache ------------------------------------------------


def test_influenced_by_normalizes_direction():
    # Q_P is influenced by Q_B  =>  influence flows Q_B -> Q_P
    fetcher = lambda q: _bindings([("Q_P", "Q_B")])
    client = WikidataClient(fetcher=fetcher)
    edges = client.influenced_by(["Q_P"])
    assert len(edges) == 1
    assert edges[0].influencer_qid == "Q_B" and edges[0].influenced_qid == "Q_P"


def test_cache_prevents_refetch():
    calls = {"n": 0}

    def fetcher(q):
        calls["n"] += 1
        return _bindings([("Q_P", "Q_B")])

    client = WikidataClient(fetcher=fetcher, cache=SparqlCache())
    client.influenced_by(["Q_P"])
    client.influenced_by(["Q_P"])  # identical query -> served from cache
    assert calls["n"] == 1


# --- framework -> tradition linkage -----------------------------------------


def _frameworks() -> FrameworkRegistry:
    reg = FrameworkRegistry()
    reg.register(Framework(id="aggregate_utilitarian", name="Aggregate Utilitarian", rubric="r"))
    reg.register(Framework(id="prioritarian", name="Prioritarian", rubric="r"))
    return reg


def test_link_frameworks_creates_unplaced_traditions():
    m = Layer2Map()
    added = link_frameworks(m, _frameworks())
    assert set(added) == {"aggregate_utilitarian", "prioritarian"}
    node = m.get_node("prioritarian")
    assert node.grain.value == "TRADITION"
    assert node.placement is Placement.UNPLACED
    # idempotent
    assert link_frameworks(m, _frameworks()) == []


# --- projection through the bridge ------------------------------------------


def _map_with_bridge() -> Layer2Map:
    m = Layer2Map()
    link_frameworks(m, _frameworks())
    m.add_thinker(Thinker(id="bentham", label="Jeremy Bentham", wikidata_qid="Q_B", floruit_start=1780))
    m.add_thinker(Thinker(id="parfit", label="Derek Parfit", wikidata_qid="Q_P", floruit_start=1980))
    m.add_bridge(BridgeAssignment(thinker_id="bentham", target_id="aggregate_utilitarian",
                                  provenance=Provenance.MANUAL, confidence=0.9))
    m.add_bridge(BridgeAssignment(thinker_id="parfit", target_id="prioritarian",
                                  provenance=Provenance.MANUAL, confidence=0.9))
    return m


def test_project_influence_lifts_to_tradition_edge():
    m = _map_with_bridge()
    # Bentham (aggregate_utilitarian) influenced Parfit (prioritarian)
    edges = project_influence(m, [ThinkerEdge(influencer_qid="Q_B", influenced_qid="Q_P", relation="influenced_by")])
    assert len(edges) == 1
    e = edges[0]
    assert e.source == "aggregate_utilitarian" and e.target == "prioritarian"
    assert e.period == 1780  # dated by the influencer's floruit
    assert e.provenance is Provenance.WIKIDATA
    # inserted into the map as an INFLUENCE edge
    inf = list(m.edges(Layer2EdgeType.INFLUENCE))
    assert len(inf) == 1


def test_project_drops_self_loops_and_unbridged():
    m = _map_with_bridge()
    edges = project_influence(m, [
        ThinkerEdge(influencer_qid="Q_B", influenced_qid="Q_B", relation="influenced_by"),  # self
        ThinkerEdge(influencer_qid="Q_X", influenced_qid="Q_P", relation="influenced_by"),  # unbridged src
    ])
    assert edges == []
