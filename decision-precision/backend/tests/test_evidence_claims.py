"""Phase 5 step 1: the claim store — normalized keying, grade snapshots, reuse."""

from __future__ import annotations

from delib.evidence import Citation, ClaimStore, claim_hash, normalize_claim


def test_normalize_collapses_case_and_punctuation():
    assert normalize_claim("Rent increases  cause DISPLACEMENT!") == "rent increases cause displacement"
    # same normalized text -> same hash
    assert claim_hash("Rent increases cause displacement.") == claim_hash("rent increases cause displacement")


def test_different_claims_get_different_hashes():
    assert claim_hash("rents rise") != claim_hash("rents fall")


def test_intern_is_idempotent_and_keyed_on_normalized_text():
    store = ClaimStore()
    h1 = store.intern("Rent increases cause displacement.")
    h2 = store.intern("rent increases   cause displacement")  # same claim, different surface
    assert h1 == h2
    assert store.count() == 1  # one claim, not two


def test_grade_snapshot_written_and_read_back():
    store = ClaimStore()
    h = store.intern("new supply lowers rents")
    rec = store.set_grade(
        h,
        grade_components={"design_tier": 0.8, "consistency": "CONSISTENT_SUPPORT"},
        evidence_grade="SUPPORTED",
        citations=[Citation(source="openalex", doi="10.1/x", title="A study", year=2020)],
        graded_at=1_700_000_000.0,
    )
    assert rec.evidence_grade == "SUPPORTED"
    assert rec.graded_at == 1_700_000_000.0
    assert rec.citations[0].doi == "10.1/x"
    # persisted view matches
    again = store.get_by_text("New supply lowers rents.")
    assert again is not None and again.evidence_grade == "SUPPORTED"


def test_regrade_overwrites_prior_snapshot():
    store = ClaimStore()
    h = store.intern("c")
    store.set_grade(h, grade_components=None, evidence_grade="WEAK", citations=[], graded_at=1.0)
    store.set_grade(h, grade_components=None, evidence_grade="SUPPORTED", citations=[], graded_at=2.0)
    rec = store.get(h)
    assert rec is not None and rec.evidence_grade == "SUPPORTED" and rec.graded_at == 2.0


def test_store_compounds_across_reopen(tmp_path):
    db = tmp_path / "claims.sqlite"
    s1 = ClaimStore(db)
    h = s1.intern("persisted claim")
    s1.set_grade(h, grade_components=None, evidence_grade="SUPPORTED", citations=[], graded_at=1.0)
    # a fresh store over the same file sees the graded claim (compounds across graphs)
    s2 = ClaimStore(db)
    assert s2.count() == 1 and s2.get(h).evidence_grade == "SUPPORTED"
