"""Phase 5 step 2: source plugins against recorded fixtures (offline)."""

from __future__ import annotations

from pathlib import Path

from delib.evidence.sources import (
    OpenAlexSource,
    PubMedSource,
    RetrievedPaper,
    SemanticScholarSource,
    merge_on_doi,
    normalize_doi,
)
from delib.layer2.cache import SparqlCache

FIX = Path(__file__).resolve().parents[1] / "data" / "fixtures" / "evidence"


def _fixture_fetcher(name: str):
    text = (FIX / name).read_text(encoding="utf-8")
    calls = {"n": 0}

    def fetch(_url: str) -> str:
        calls["n"] += 1
        return text

    return fetch, calls


def test_normalize_doi_strips_scheme_and_lowercases():
    assert normalize_doi("https://doi.org/10.1/X") == "10.1/x"
    assert normalize_doi("doi:10.2/Y") == "10.2/y"
    assert normalize_doi(None) is None


# --- OpenAlex ---------------------------------------------------------------


def test_openalex_parses_and_reconstructs_abstract():
    fetch, _ = _fixture_fetcher("openalex_rent_displacement.SYNTHETIC.json")
    papers = OpenAlexSource(mailto="x@y.z").search("rent displacement", cache=SparqlCache(), fetcher=fetch)
    assert len(papers) == 2
    p = papers[0]
    assert p.doi == "10.1000/rent1"  # normalized from the doi.org URL
    assert p.abstract == "Rent increases are associated with displacement"  # inverted index rebuilt
    assert p.venue == "Journal of Urban Economics" and p.year == 2019


def test_openalex_query_passes_claim_text_and_key():
    src = OpenAlexSource(api_key="KEY", mailto="x@y.z")
    url = src.build_url("rent increases cause displacement", 10)
    assert "search=rent" in url and "api_key=KEY" in url


# --- caching: raw stored before parse, reparse offline ----------------------


def test_raw_cached_before_parse_and_reused():
    fetch, calls = _fixture_fetcher("openalex_rent_displacement.SYNTHETIC.json")
    cache = SparqlCache()
    src = OpenAlexSource()
    src.search("q", cache=cache, fetcher=fetch)
    assert calls["n"] == 1 and cache.count() == 1  # raw bytes cached
    src.search("q", cache=cache, fetcher=fetch)  # same query -> served from cache
    assert calls["n"] == 1  # no second network call


# --- Semantic Scholar -------------------------------------------------------


def test_s2_parses_publication_types():
    fetch, _ = _fixture_fetcher("s2_rent_displacement.SYNTHETIC.json")
    papers = SemanticScholarSource().search("rent displacement", cache=SparqlCache(), fetcher=fetch)
    assert {p.doi for p in papers} == {"10.1000/rent1", "10.1000/rent2"}
    meta = next(p for p in papers if p.doi == "10.1000/rent2")
    assert "Meta-Analysis" in meta.publication_types


def test_s2_citation_intents_count_contrasting():
    raw = (FIX / "s2_citations.SYNTHETIC.json").read_text()
    supporting, contrasting = SemanticScholarSource.parse_citation_intents(raw)
    assert supporting == 2 and contrasting == 1


# --- PubMed -----------------------------------------------------------------


def test_pubmed_esearch_yields_pmids():
    raw = (FIX / "pubmed_esearch.SYNTHETIC.json").read_text()
    assert PubMedSource.pmids(raw) == ["30000001", "30000002"]


def test_pubmed_esummary_parses_pubtypes_and_doi():
    raw = (FIX / "pubmed_esummary.SYNTHETIC.json").read_text()
    papers = PubMedSource().parse(raw)
    assert len(papers) == 2
    sr = next(p for p in papers if "Systematic Review" in p.publication_types)
    assert sr.doi == "10.2000/health1" and sr.year == 2020


# --- merge on DOI -----------------------------------------------------------


def test_merge_unions_sources_and_fields_on_doi():
    openalex = OpenAlexSource().parse((FIX / "openalex_rent_displacement.SYNTHETIC.json").read_text())
    s2 = SemanticScholarSource().parse((FIX / "s2_rent_displacement.SYNTHETIC.json").read_text())
    merged = merge_on_doi(openalex + s2)
    # rent1 appears in BOTH sources -> one merged paper carrying both
    rent1 = next(m for m in merged if m.doi == "10.1000/rent1")
    assert set(rent1.sources) == {"openalex", "s2"}
    assert "Review" in rent1.publication_types  # unioned from s2
    assert rent1.abstract is not None  # filled from whichever source had it
    # the DOI-less OpenAlex paper stays distinct
    assert any(m.doi is None and m.title.startswith("Housing supply") for m in merged)


def test_merge_keeps_doiless_papers_separate():
    a = RetrievedPaper(source="s2", doi=None, title="No DOI paper")
    b = RetrievedPaper(source="openalex", doi=None, title="No DOI paper")
    # different sources, no DOI -> not merged (keyed by source+title)
    assert len(merge_on_doi([a, b])) == 2


# --- multiplexer: fan-out + health routing ----------------------------------


def _routing_fetcher():
    def fetch(url: str) -> str:
        if "openalex" in url:
            return (FIX / "openalex_rent_displacement.SYNTHETIC.json").read_text()
        if "semanticscholar" in url:
            return (FIX / "s2_rent_displacement.SYNTHETIC.json").read_text()
        if "eutils" in url:
            return (FIX / "pubmed_esummary.SYNTHETIC.json").read_text()
        return "{}"

    return fetch


def test_multiplexer_merges_across_sources():
    from delib.evidence import MultiplexerRetriever

    r = MultiplexerRetriever(
        [OpenAlexSource(), SemanticScholarSource()], SparqlCache(), _routing_fetcher()
    )
    merged = r.retrieve("rent increases cause displacement")
    rent1 = next(m for m in merged if m.doi == "10.1000/rent1")
    assert set(rent1.sources) == {"openalex", "s2"}


def test_pubmed_only_runs_for_health_typed_claims():
    from delib.evidence import MultiplexerRetriever

    r = MultiplexerRetriever([PubMedSource()], SparqlCache(), _routing_fetcher())
    assert r.retrieve("rent policy", health_typed=False) == []  # skipped
    assert len(r.retrieve("housing instability health", health_typed=True)) == 2
