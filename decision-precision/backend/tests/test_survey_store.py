"""Layer 2 Stage A1: correlation store + fixture loader."""

from __future__ import annotations

from delib.layer2.survey import (
    CorrelationStore,
    DEFAULT_FIXTURE,
    SourceTier,
    load_fixture,
    slugify,
)
import json


def test_slugify_idempotent_over_every_fixture_label():
    data = json.loads(DEFAULT_FIXTURE.read_text())
    labels = {c["a"] for c in data["correlations"]} | {c["b"] for c in data["correlations"]}
    for label in labels:
        s = slugify(label)
        assert s and slugify(s) == s  # non-empty and idempotent


def test_load_fixture_ingests_127_pairs():
    store = CorrelationStore()
    load_fixture(store)
    assert store.count() == 127


def test_pair_is_unordered():
    store = CorrelationStore()
    store.add("God: theism", "Mind: physicalism", -0.52, 1477, SourceTier.PUBLISHED_TABLE)
    a = store.get("God: theism", "Mind: physicalism")
    b = store.get("Mind: physicalism", "God: theism")
    assert a is not None and b is not None
    assert a.r == b.r == -0.52


def test_tier_merge_priority():
    s = CorrelationStore()
    assert s.add("X pos", "Y pos", 0.5, 100, SourceTier.PUBLISHED_TABLE) is True
    assert s.get("X pos", "Y pos").r == 0.5

    # higher tier overwrites
    assert s.add("X pos", "Y pos", 0.6, 120, SourceTier.RESPONSE_DATA) is True
    got = s.get("X pos", "Y pos")
    assert got.r == 0.6 and got.source_tier is SourceTier.RESPONSE_DATA

    # lower tier never displaces a higher one
    assert s.add("X pos", "Y pos", 0.9, 999, SourceTier.PUBLISHED_TABLE) is False
    assert s.get("X pos", "Y pos").r == 0.6

    # a middle tier also can't displace the top
    assert s.add("X pos", "Y pos", 0.8, 500, SourceTier.SITE_SCRAPE) is False
    assert s.get("X pos", "Y pos").r == 0.6


def test_option_ids_are_slugs():
    store = CorrelationStore()
    load_fixture(store)
    ids = store.option_ids()
    assert "god-theism" in ids
    assert all(slugify(i) == i for i in ids)  # every stored id is already a slug
