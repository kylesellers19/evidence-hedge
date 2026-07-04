# Evidence source capture commands

The `*.SYNTHETIC.json` fixtures here are hand-authored to the exact response shape
of each API, so the parsers are validated offline. To replace them with REAL
captures (recorded once, replayed forever), run the commands below and drop the
output next to the synthetic files (without the `.SYNTHETIC` marker), then point the
tests at the real captures. Raw bytes are what the plugins cache and reparse — do
not pretty-print or edit them.

Live calls are yours to run (they spend credits/quota).

## OpenAlex (semantic search; pass the claim text as `search`)
```
curl -s 'https://api.openalex.org/works?search=rent%20increases%20cause%20displacement&per-page=10&mailto=YOUR_EMAIL' \
  > openalex_rent_displacement.json
# with a key: add &api_key=YOUR_OPENALEX_KEY
```

## Semantic Scholar (search + publication types)
```
curl -s 'https://api.semanticscholar.org/graph/v1/paper/search?query=rent%20increases%20cause%20displacement&limit=10&fields=title,year,abstract,venue,externalIds,publicationTypes' \
  > s2_rent_displacement.json
# citation intents for one paper (contrasting citations => CONTRADICTED signal):
curl -s 'https://api.semanticscholar.org/graph/v1/paper/PAPER_ID/citations?fields=intents,isInfluential&limit=100' \
  > s2_citations.json
```

## PubMed E-utilities (health-typed claims only)
```
curl -s 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=housing%20instability%20health&retmode=json&retmax=10' \
  > pubmed_esearch.json
# then esummary for the returned PMIDs (publication-type tags = study design):
curl -s 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=PMID1,PMID2&retmode=json' \
  > pubmed_esummary.json
# add &api_key=YOUR_NCBI_KEY to raise the rate limit
```
