"""Layer 2 Atlas: the position map in two honest geometries (offline)."""

from __future__ import annotations

from delib.layer2.survey import CorrelationStore, SourceTier, load_fixture
from delib.layer2.survey.atlas import build_atlas, is_position, position_rows
from delib.layer2.survey.store import slugify


def test_is_position_drops_demographics_and_philosophers():
    assert is_position("Mind: physicalism")
    assert is_position("Consciousness: dualism")
    assert not is_position("AOS: Philosophy of Mind")
    assert not is_position("Region of nationality: Europe")
    assert not is_position("Gender: Woman")
    assert not is_position("Tradition: Analytic")
    assert not is_position("Philosopher: Kant")


def _store_with_a_demographic() -> CorrelationStore:
    store = CorrelationStore()
    load_fixture(store)  # all published pairs are positions
    # inject one demographic correlation that must be filtered out of the atlas
    store.add("Mind: physicalism", "AOS: Philosophy of Mind", 0.4, 500, SourceTier.SITE_SCRAPE)
    return store


def test_position_rows_excludes_demographic_pairs():
    store = _store_with_a_demographic()
    labels = {r.label_a for r in position_rows(store)} | {r.label_b for r in position_rows(store)}
    assert "AOS: Philosophy of Mind" not in labels
    assert "Mind: physicalism" in labels


def test_build_atlas_two_geometries_same_nodes():
    atlas = build_atlas(_store_with_a_demographic())
    names = {g.name for g in atlas.geometries}
    assert names == {"attention", "polarity"}
    assert atlas.n_positions >= 20
    # every node carries BOTH coordinate sets
    for node in atlas.nodes:
        assert len(node.attention) == 2 and len(node.polarity) == 2
        assert not node.id.startswith("aos-")  # demographics excluded
    # density = observed / C(n,2), in (0, 1]
    assert 0.0 < atlas.density <= 1.0


def test_atlas_edges_are_typed_and_signed():
    atlas = build_atlas(_store_with_a_demographic())
    types = {e.type for e in atlas.edges}
    assert types <= {"EMPIRICAL_OPPOSITION", "EMPIRICAL_COBELIEF"}
    # opposition edges are the negative-r ones, cobelief the positive
    for e in atlas.edges:
        if e.type == "EMPIRICAL_OPPOSITION":
            assert e.r <= -0.35
        else:
            assert e.r >= 0.35


def test_explicit_position_ids_beat_the_prefix_heuristic_on_gender():
    # the metaphysics-of-gender QUESTION shares the 'Gender:' prefix with the
    # demographic; the heuristic drops it, the authoritative id set keeps it.
    q = "Gender: social"  # a real survey question option
    assert not is_position(q)  # heuristic (wrongly) drops it
    store = CorrelationStore()
    load_fixture(store)
    store.add("Mind: physicalism", q, 0.3, 400, SourceTier.SITE_SCRAPE)
    store.add("Mind: physicalism", "Gender: Woman", 0.2, 400, SourceTier.SITE_SCRAPE)  # demographic
    pos_ids = {r.option_a_id for r in load_fixture_rows()} | {slugify(q)}
    kept = {r.label_a for r in position_rows(store, pos_ids)} | {r.label_b for r in position_rows(store, pos_ids)}
    assert q in kept  # question survives
    assert "Gender: Woman" not in kept  # demographic excluded


def load_fixture_rows():
    s = CorrelationStore()
    load_fixture(s)
    return s.all()


def test_atlas_edges_reference_atlas_nodes():
    atlas = build_atlas(_store_with_a_demographic())
    node_ids = {n.id for n in atlas.nodes}
    # every edge endpoint that is a position is a known node (demographics gone)
    for e in atlas.edges:
        assert e.source in node_ids and e.target in node_ids


def test_nodes_carry_neighbors_sorted_by_abs_r():
    atlas = build_atlas(_store_with_a_demographic())
    node = next(n for n in atlas.nodes if n.neighbors)
    mags = [abs(x.r) for x in node.neighbors]
    assert mags == sorted(mags, reverse=True)
    assert len(node.neighbors) <= 6
    # neighbor ids are atlas nodes (positions), never the demographic
    ids = {n.id for n in atlas.nodes}
    assert all(x.id in ids for x in node.neighbors)


class _Ev:
    def __init__(self, tid, tlabel, pid, r):
        self.thinker_id, self.thinker_label, self.position_id, self.r = tid, tlabel, pid, r


def test_thinker_layer_centroid_and_topk():
    store = CorrelationStore()
    load_fixture(store)
    atlas0 = build_atlas(store)
    a, b = atlas0.nodes[0].id, atlas0.nodes[1].id
    bridge = [
        _Ev("kant", "Kant", a, 0.6),
        _Ev("kant", "Kant", b, 0.2),
        _Ev("kant", "Kant", "aos-metaphysics", 0.9),  # not an atlas node -> dropped
    ]
    atlas = build_atlas(store, bridge_rows=bridge, thinker_k=6)
    kant = next(t for t in atlas.thinkers if t.id == "kant")
    # only the two atlas positions contribute; weighted centroid in x
    ca = {n.id: n.attention for n in atlas.nodes}
    wx = (0.6 * ca[a][0] + 0.2 * ca[b][0]) / 0.8
    assert abs(kant.attention[0] - wx) < 1e-9
    assert {e.position_id for e in kant.edges} == {a, b}  # demographic dropped


def test_traditions_only_present_leaves():
    # fixture positions include practical-reason-kantian etc. only if in the data;
    # traditions list is a (possibly empty) list of leaves actually present
    atlas = build_atlas(_store_with_a_demographic())
    for t in atlas.traditions:
        assert t.member_ids  # never an empty tradition
        assert all(m in {n.id for n in atlas.nodes} for m in t.member_ids)
