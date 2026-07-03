# Evidence hierarchies — grounding DELIB's six grades

Status: **design accepted** (drives Phase 4/5 grader). The Phase-1 ordinal is
already implemented per §2; the pluggable registry (§3) and the richer edge
representation (§4) are Phase 4/5 work.

## 1. The core insight — DELIB's grades collapse three axes

The scholarly hierarchies keep three independent dimensions separate; DELIB's
six grades are a pragmatic projection of them:

1. **Direction / verdict** — what the evidence says: supports, conflicts, refutes
   (GRADE inconsistency; Cochrane "evidence of no effect vs. no evidence of effect").
2. **Certainty / strength** — how much you trust that verdict (GRADE 4 levels;
   SMS 1–5; Nesta 1–5).
3. **Directness / provenance** — direct empirical test vs. analogical (right
   question, wrong context) vs. mechanistic/theory-only (GRADE indirectness;
   OCEBM Level 5).

`SUPPORTED/WEAK` live on the certainty axis; `CONTESTED/CONTRADICTED` on the
direction axis; `ANALOGICAL/SPECULATIVE` on the directness axis. This is why the
last two feel "off the main empirical axis."

## 2. Confirmed ordinal (implemented in `models/enums.py`)

`EVIDENCE_GRADE_ORDINAL` — higher = more warrant to rely on the causal claim:

| Int | Grade | Definition | Anchor levels |
|---:|---|---|---|
| 5 | SUPPORTED | Direct, consistent, moderate–high certainty **for** the effect | GRADE High/Mod · OCEBM 1–2 · SMS 4–5 · Nesta 3–4 · WWC Strong/Mod · IPCC robust+high |
| 4 | WEAK | Direct but low-certainty support (small/imprecise/high-RoB) | GRADE Low/Very-Low · OCEBM 3–4 · SMS 1–2 · WWC Promising |
| 3 | ANALOGICAL | Real empirical evidence, transported from an analogous context | GRADE indirectness · J-PAL generalizability |
| 2 | SPECULATIVE | No empirical test; mechanism/theory-of-change only | OCEBM Level 5 · Nesta L1 · Project Oracle S1 · WWC Tier 4 |
| 1 | CONTESTED | Direct evidence exists but **conflicts** (unexplained heterogeneity) | GRADE inconsistency · IPCC robust-evidence/low-agreement |
| 0 | CONTRADICTED | Good evidence of **no / opposite** effect | Cochrane Handbook Ch. 15 §15.6.4 |

**Flagged config choice:** `SPECULATIVE (2) > CONTESTED (1)`. An untested-but-
plausible mechanism keeps forward warrant; contested direct evidence has shown
the effect is unreliable. Reasonable experts dispute this one adjacency; if you
prefer "any direct signal outranks none," swap them. It is the single constant
in `enums.py` precisely so this is a one-line change.

**Note on informativeness inversion:** for *belief in the claim*, CONTRADICTED = 0.
But on an *evidential-value* axis, a contradiction is highly informative. If a UI
view ever ranks "how much did we learn," expose a second derived score there;
keep 0 for propagation.

## 3. Pluggable, domain-selected hierarchies (Phase 4/5)

Mirror the framework-rubric pattern. Three parts:

1. **Domain → hierarchy registry** (`hierarchies/registry.yaml`): `default: grade`;
   clinical/public_health → `grade`, implementation → `epoc`, public_policy &
   urban_planning & social_program → `maryland_sms`/`nesta`, economics →
   `identification_hierarchy`, environment/climate → `ipcc_confidence`.
2. **One markdown+frontmatter rubric per hierarchy** — the pluggable unit. Each
   declares native levels, a **crosswalk to DELIB's six grades**, and provenance
   (`source`, `url`). Loaded at runtime exactly like framework rubrics.
3. **Grader split into two halves:**
   - *Shared, hierarchy-agnostic* → computes **direction** (GRADE inconsistency
     → CONTESTED; "evidence of no effect" → CONTRADICTED). Identical across
     domains.
   - *Hierarchy-specific* → computes **certainty + provenance** via the selected
     rubric's crosswalk (SUPPORTED/WEAK/ANALOGICAL/SPECULATIVE).

Per-edge resolution: read branch `domain` → load rubric (fallback `grade`) →
shared module tries direction (short-circuits to CONTESTED/CONTRADICTED) → else
hierarchy module sets certainty/provenance → emit
`{grade, warrant_int, certainty, direction, provenance, hierarchy_id, source_url}`.
Carrying `hierarchy_id` + `source_url` makes every grade auditable to a named
framework — the point of grounding DELIB in this literature.

## 4. Richer edge representation (Phase 4/5 refactor of CausalEdge)

Store **two integers + one enum**, derive the ordinal:

- `direction`: `SUPPORTS | CONFLICTS | REFUTES`
- `certainty`: 0–4 (Very-Low → High), GRADE
- `provenance`: `DIRECT | ANALOGICAL | MECHANISTIC`

Keep the single `evidence_grade` enum + `EVIDENCE_GRADE_ORDINAL` as the derived
sort key for the graph queries; the three fields become the auditable backing.
Optional signed variant for path multiplication: SUPPORTED +3 … CONTRADICTED −2.

## Sources (primary)

- GRADE Handbook — https://gdt.gradepro.org/app/handbook/handbook.html · Working Group https://www.gradeworkinggroup.org/
- Cochrane Handbook Ch. 14–15 — https://training.cochrane.org/handbook/current/chapter-15
- Guyatt et al., GRADE Guidelines 7 (inconsistency), J Clin Epidemiol 2011;64(12):1294 — https://pubmed.ncbi.nlm.nih.gov/21803546/
- OCEBM 2011 Levels of Evidence — https://www.cebm.ox.ac.uk/resources/levels-of-evidence/ocebm-levels-of-evidence
- Murad et al., New evidence pyramid, BMJ EBM 2016;21(4):125 — https://ebm.bmj.com/content/21/4/125
- Maryland SMS (What Works Growth) — https://whatworksgrowth.org/resource-library/the-maryland-scientific-methods-scale-sms/
- Nesta Standards of Evidence — https://www.nesta.org.uk/feature/innovation-methods/standards-evidence/
- HM Treasury Magenta Book (2020) — https://www.gov.uk/government/publications/the-magenta-book
- What Works Clearinghouse / ESSA tiers — https://ies.ed.gov/ncee/wwc/essa
- Cochrane EPOC resources — https://epoc.cochrane.org/resources/epoc-resources-review-authors
- CFIR (Damschroder 2009) — https://implementationscience.biomedcentral.com/articles/10.1186/1748-5908-4-50
- Proctor et al. 2011 (implementation outcomes) — https://pmc.ncbi.nlm.nih.gov/articles/PMC3068522/
- IPCC uncertainty guidance (Mastrandrea 2010) — https://www.ipcc.ch/site/assets/uploads/2018/05/uncertainty-guidance-note.pdf
- Angrist & Pischke, Credibility Revolution, JEP 2010 — https://www.nber.org/system/files/working_papers/w15794/w15794.pdf
- J-PAL generalizability framework — https://www.povertyactionlab.org/blog/5-24-17/practical-framework-evidence-informed-policy-addressing-generalizability-puzzle
