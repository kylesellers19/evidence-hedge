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
