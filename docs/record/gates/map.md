# Gate: the map (which question, and why)

Status: **provisional**. The question cluster, its sub-questions and the question's
wording wait for Kyle's labels (sheets listed at the end). Every constant below is
PROVISIONAL, not ratified.

## How the question was chosen

1. Every one of the 1,790 corpus documents became one vector: a quarter its title's
   embedding, three quarters the mean of 60 evenly spaced engine claims outside its front
   matter (all-MiniLM-L6-v2 at revision 1110a24, CPU, one thread).
2. k-means (10 starts, seed 20261127) for k = 8 to 30; the mean silhouette (cosine) picked
   k = 27 (0.1608).
3. Each cluster scored documents x organizations: the spec's "most documents across the
   most organizations".

## The first rule chose a leftover bin

Step 3 alone chose cluster 4 (153 documents, 27 organizations). Its members' mean
silhouette is **−0.0003**: on average they sit as close to another cluster as to their
own. Its titles range from congestion planning to drone mapping of fuel tanks, and 89 of
its 153 documents are undated. That is the bin k-means leaves for documents that fit
nowhere, not a question, and a bin of leftovers will always have the most documents
across the most organizations.

**Change (before any measure was computed):** a cluster must have a mean member
silhouette above 0 (`CLUSTER_MIN_SILHOUETTE`, the definitional bound: members closer to
their own cluster than to the next). Under it the rule chose **cluster 11**: 86
documents, 25 organizations, 73 dated, no organization over 16% of the documents. Its
terms: digital transformation, workflows, data, intelligent building. Runner-up:
cluster 25 (venues and attendance).

Logged as a deviation, not a ratified rule. Both choices are in
`reports/record/cluster-choice.json` (research repo).

## Every cluster

| Cluster | Documents | Organizations | Dated | Largest organization share | Mean silhouette | Score | Terms (c-TF-IDF, firm-name words removed) |
|---|---|---|---|---|---|---|---|
| 4 first rule | 153 | 27 | 64 | 0.37 | -0.0003 | 4,131 | pmo, epc, project controls, program management, commissioning agent, project execution |
| 11 **chosen** | 86 | 25 | 73 | 0.16 | 0.0147 | 2,150 | ehs, digital transformation, firms, workflows, large firms, high high |
| 25 | 86 | 24 | 81 | 0.36 | 0.0005 | 2,064 | attendance, esports, museums, water parks, disney, museum |
| 5 | 85 | 21 | 74 | 0.34 | 0.0297 | 1,785 | green book, breeam, taxonomy, climate-related, transformative outcomes, se |
| 24 | 60 | 21 | 50 | 0.20 | 0.1502 | 1,260 | coworking, structure tone, workplace, wfh, tone, adhd |
| 21 | 87 | 14 | 47 | 0.44 | 0.0270 | 1,218 | hvdc, interconnection, lithium-ion, microgrid, transformer, batteries |
| 14 | 50 | 23 | 40 | 0.14 | 0.1697 | 1,150 | telehealth, ambulatory, population health, patient, patients, ppe |
| 15 | 88 | 13 | 63 | 0.34 | 0.1609 | 1,144 | maas, cav, aam, mobility, micromobility, future mobility |
| 26 | 63 | 17 | 46 | 0.22 | -0.0155 | 1,071 | mass timber, bricks, vibration, timber, floorboards, new materials |
| 6 | 81 | 12 | 81 | 0.30 | 0.1318 | 972 | conditions report, weeks weeks, lead time, holding, lead times, weeks |
| 17 | 74 | 11 | 66 | 0.55 | 0.1355 | 814 | cities index, ieee, city governments, cdp, arid, settlements |
| 20 | 38 | 20 | 31 | 0.18 | -0.0138 | 760 | colour, restrooms, wayfinding, hearing, sensory, deaf |
| 16 | 49 | 15 | 45 | 0.65 | 0.2186 | 735 | biogenic carbon, biogenic, embodied carbon, operational carbon, life carbon, embodied |
| 22 | 55 | 13 | 27 | 0.24 | -0.0394 | 715 | pfas, duct, pfoa, pfos, chlorine, asbestos |
| 1 | 63 | 11 | 47 | 0.38 | 0.0267 | 693 | offshore wind, offshore, ferry, floating, ports, gov au |
| 13 | 134 | 5 | 134 | 0.93 | 0.5482 | 670 | cost index, metropolitan areas, insights market, milwaukee, areas portfolio, calculated quarterly |
| 9 | 50 | 13 | 50 | 0.34 | 0.0715 | 650 | disputes, dispute, brexit, skilled labour, ytd, dispute resolution |
| 19 | 56 | 10 | 40 | 0.34 | 0.2899 | 560 | water companies, digital water, water resilience, water demand, flood protection, water sector |
| 18 | 62 | 8 | 57 | 0.42 | 0.1291 | 496 | modernized, non-modernized, modernized schools, teachers, non-modernized schools, ieq |
| 3 | 37 | 12 | 28 | 0.30 | -0.0850 | 444 | pile, asphalt, weld, bitumen, slope, kn |
| 10 | 46 | 8 | 29 | 0.46 | 0.1553 | 368 | hydrogen, rng, saf, hydrogen production, feedstock, feedstocks |
| 12 | 115 | 3 | 114 | 0.97 | 0.4159 | 345 | look ahead, fabs, market overview, cap rates, libor, escalation impact |
| 7 | 27 | 11 | 23 | 0.44 | 0.0484 | 297 | natural capital, nature positive, rewilding, biodiversity, habitat, species |
| 0 | 16 | 7 | 12 | 0.25 | -0.0343 | 112 | vmt, fcc, nepa, cybersecurity, enforcement, racial |
| 2 | 59 | 1 | 49 | 1.00 | 0.2666 | 59 | pet food, food safety, grayway, pet, clemens, foods |
| 8 | 56 | 1 | 56 | 1.00 | 0.7767 | 56 | journal issue, ri, wong, emas, figs, steelwork |
| 23 | 14 | 1 | 14 | 1.00 | 0.5402 | 14 | costs brief, graeve amy, amy burk, graeve, larry graeve, prepared american |

## What this choice cannot see

- **Firm series pull documents together.** A quarterly series shares its boilerplate, so
  clusters 12, 13 and 23 are each one firm's series. Construction market conditions, the
  corpus's most-published cross-firm question, is split across them and never competes.
  A cross-firm market-conditions map would need series boilerplate removed before
  embedding.
- **Silhouettes are low everywhere** (0.16 overall). Text embeddings of reports rarely
  separate cleanly; the map is a reasonable grouping, not a natural kind. The labeling
  sheet asks Kyle, document by document, whether each belongs.
- **Membership is hard.** A document belongs to one cluster. A report on digital tools
  for hospitals sits in this map or in the health cluster, never both.

## The question as worded on the page

"What are digital tools and data changing in how places are designed, built and run?"
Proposed from the cluster's terms and titles; Kyle to confirm or reword. No number
depends on the wording.

## Labeling sheets waiting for Kyle (research repo, gitignored `data/record/labeling/`)

- `designs-<map>.csv`: each document's design, sample size and whether it belongs on the question.
- `subq-<map>.csv`: 12 claims from each sub-question, to confirm the groups and their labels.
- `newness-<map>.csv`: 150 "new" or "made earlier" decisions with both claims side by side.
