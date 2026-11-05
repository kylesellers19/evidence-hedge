# Decision layer

From individual questions, their consequences, and user-group interviews to a
recorded decision, with every step's artifact inspectable. Package:
`backend/src/delib/decision/`. HTTP: `/api/decision`. UI: `#/decision`.

## The thesis

Evidence Hedge asks whether a document's confidence is proportionate to its
evidence. The decision layer asks the converse: whether the evidence a decision
demands is proportionate to how much the decision depends on it. That is value
of information (Howard 1966). The precision report (step 10) puts every
consequence cell in one of four quadrants:

| | Evidence adequate | Evidence weak |
|---|---|---|
| **Decision-sensitive** | MONITOR: set a signpost | INVESTIGATE: learn before deciding |
| **Not sensitive** | SETTLED | TOLERATE: weak evidence that cannot move the choice |

The same proportionality test is applied to estimates: a tight P05–P95
interval resting on weak evidence is flagged as an overconfident interval.

## Rules the layer enforces

1. **The unit is a decision, not a question.** Questions are typed as an
   ALTERNATIVE to compare, an UNCERTAINTY to model, or an OBJECTIVE to measure.
   A question plus its consequences is one row of a consequence table with no
   comparator; a decision needs at least two alternatives, including the status quo.
2. **Facts and values stay apart.** Every interview statement is typed as a value
   (objective, means, constraint), a fact (causal belief, fact claim,
   uncertainty), an option, or out of frame. Factual disagreements route to
   evidence; value disagreements route to tradeoffs; frame disagreements route
   back to framing.
3. **Heterogeneity is not disagreement.** Two groups reporting opposite effects
   on themselves are recorded as effect differences on the edge, not a dispute.
4. **Interview beliefs are hypotheses.** An edge whose only basis is elicited
   belief keeps Layer 1's grade (usually SPECULATIVE) and is annotated
   ELICITED_BELIEF; it never outranks external evidence.
5. **Literature must transport.** A well-graded edge counts as adequate here only
   when transport to this site was assessed (Cartwright & Hardie 2012).
6. **Groups are never pooled by default.** Rankings are per group. A pooled
   ranking is an explicit, labeled call with a stated rule.
7. **Some values do not trade off.** Objectives can be CONSTRAINTs (thresholds)
   rather than weighted. This is where orders of worth that resist a common
   measure belong.
8. **Orders of worth check completeness.** A register invoked on the decision's
   consequences but expressed by no fundamental objective is a step-4 gap.
9. **People set weights and estimates.** Nothing in this layer calls an LLM.
   Machine-coded statements, when added, stay suggestions until verified, and
   can never set probabilities, weights, or rankings.
10. **A decision record is tied to its analysis.** It stores the analysis hash;
    if the model changes afterward, the decision-quality check fails.

## The twelve steps

| # | Step | Artifact (model) | Computed | Grounding |
|---|---|---|---|---|
| 1 | Frame | `DecisionFrame`: statement, owner, givens / focus / deferred, boundary, typed questions | question-type suggestions | Spetzler, Winter & Meyer 2016; Ulrich 1983 |
| 2 | Elicit | `UserGroup`, `Interview`, `Statement` (quote-anchored) | coverage gaps: uninterviewed groups, unredacted interviews, group formats without individual-first elicitation | Keeney 1992; Eden & Ackermann 1998; Hemming et al. 2018 |
| 3 | Separate facts from values | `Statement.type` and links | partition; unlinked statements | Gregory et al. 2012 |
| 4 | Objectives | `Objective` (fundamental hierarchy, means network), `Attribute` (measure, range, value function) | leaves, constraints, who raised what, order-of-worth gaps | Keeney 1992; Keeney & Gregory 2005; Boltanski & Thévenot 2006 |
| 5 | Alternatives | `Alternative` (one option per focus decision) | strategy table; missing status quo, duplicates, incomplete rows | Keeney 1992 |
| 6 | Causal model | the DelibGraph + `LoopTreatment` | influence-diagram projection, decision-relevant subgraph, untreated loops, unmeasured consequences | Howard & Matheson 1984; Pearl 2009 |
| 7 | Edge evidence | `EdgeEvidenceCard`: basis, causal form, confounders, group effects, support factors, transport | candidate confounders (common ancestors), minimal backdoor sets, card gaps | Pearl 2009; Cartwright & Hardie 2012; Layer 1 grading |
| 8 | Consequence table | `ConsequenceCell` with P05/P50/P95 `Estimate`, basis edges, per-group estimates | completeness, weakest-link evidence floor, quote-to-value trace | Hammond, Keeney & Raiffa 1999; Keefer & Bodily 1983 |
| 9 | Tradeoffs | `SwingWeights` per group, `EvenSwap` | constraint screen, point/robust dominance, per-group rankings, even-swap tracks with consistency checks, explicit pooling | Hammond, Keeney & Raiffa 1998; von Winterfeldt & Edwards 1986 |
| 10 | Sensitivity and value of information | — | weight-stability intervals, tornado, EVPPI per cell, exact EVPI, precision report | Howard 1966; Phillips 1984 |
| 11 | Robustness | `Assumption` with `Signpost`s, shaping and hedging actions | load-bearing status, assumption candidates, planning gaps | Dewar 2002 |
| 12 | Decision record | `DecisionRecord`: choice, rationale, group positions and dissent, premortem, review triggers, analysis hash | decision-quality checklist | Spetzler, Winter & Meyer 2016; Klein 2007 |

Step status is mechanical: EMPTY, PARTIAL (artifacts exist, gaps remain), or
COMPLETE (no gaps). The decision-quality checklist checks presence and
consistency, not quality.

## Conventions

- **Values** are on a 0–100 scale: V_g(a) = 100 · Σ w_gi · v_i(x_ai). EVPI is in
  value points, not money.
- **Estimates** are three quantiles, weighted 0.185 / 0.63 / 0.185.
- **Ranges matter.** Swing weights depend on each attribute's worst-to-best
  range, so an estimate outside the range is rejected with an instruction to
  widen it and re-elicit the weights.
- **Graph references are reported, not rejected.** The live graph grows by
  progressive disclosure, so a model can refer to nodes not yet revealed.
- **The additive model assumes preferential independence.** Whether each group
  was checked is recorded, not inferred.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/decision/new` | start a model on the current graph (seed question added as an unconfirmed suggestion) |
| GET / PUT / DELETE | `/api/decision` | read, replace (schema + integrity validated, 422 on error), clear |
| GET | `/api/decision/analysis` | every step's artifacts, checklist, step status, ratification table |
| GET | `/api/decision/steps` | step status only |
| GET | `/api/decision/trace?alternative_id&objective_id` | quote → statement → edge → evidence → estimate → value |
| GET | `/api/decision/edges/confounders?source&target` | candidate confounders and a minimal backdoor set |
| POST | `/api/decision/pooled` | explicit pooled ranking (`{"shares": null}` = equal) |
| POST | `/api/decision/record` | record the decision against the current analysis hash |
| GET | `/api/decision/ratification` | provisional constants |
| GET | `/api/decision/schema` | JSON Schema for authoring a model (also `docs/decision-model.schema.json`) |

The model is held in memory, like the deliberation session. Decision-model
writes are not logged to the training-data store; see the ratification table.

## Not in this change set

- **LLM coding of transcripts into statements.** Waits on ratified data
  handling: transcripts would reach third-party providers through LiteLLM, and
  principle 2 would log them as training data.
- **Evidence Hedge's hedge/booster lexicon for `stated_confidence`.** Human-coded
  for now. Porting is a cross-app change.
- **Persistence of decision models beyond the process,** and per-user sessions.
- **Pilot on a real decision.** Needs real, redacted interview material. The
  tests use synthetic structural builders only, and no constant is tuned
  against them.
- **Adaptive pathways beyond signposts.** Staged alternatives with tipping
  points (Haasnoot et al. 2013) are not modeled yet.

## Ratification table (generated from `config.ratification_table()`)

Every row is PROVISIONAL — not ratified.

| Constant | Value | Rationale |
|---|---|---|
| `PT_WEIGHTS` | P05/P50/P95 at 0.185/0.63/0.185 | Extended Pearson-Tukey (Keefer & Bodily 1983). Alternative: Swanson's rule, P10/P50/P90 at 0.3/0.4/0.3. Changes how wide elicited intervals must be. |
| `EVPPI_MIN_POINTS` | 1.0 value points (0-100 scale) | Below this, perfect information about a cell cannot move expected value enough to justify investigation. Scale-dependent: tied to the 0-100 value convention. |
| `WEIGHT_MARGIN` | 0.05 (normalized weight) | How close a weight may sit to a rank reversal before the weight itself is treated as a load-bearing assumption. |
| `ADEQUATE_GRADE` | WEAK (ordinal 4) | Weakest-link floor a decision-sensitive cell needs to land in MONITOR rather than INVESTIGATE. Reuses DELIB's ratified grade ordinal; the cut point is new. |
| `REQUIRE_TRANSPORT_FOR_LITERATURE` | True | Literature evidence counts as adequate for this site only when transport was assessed LIKELY_HOLDS. False would let well-graded but untransported evidence settle a cell. |
| `NARROW_INTERVAL_FRACTION` | 0.05 of attribute range | Evidence Hedge's proportionality test applied to estimates: a tight P05-P95 interval on weak evidence is stated precision the evidence does not carry. |
| `LATENT_WEIGHT_GAP` | 0.15 (normalized weight) | Reports value disagreements that do not change the current choice but could under a different alternative set. |
| `SWAP_INCONSISTENCY_FACTOR` | 2.0x | Cross-check between two elicitation methods (even swaps vs swing weights). A factor-of-two gap is a common practitioner tolerance, not a published standard. |
| `Value function default` | linear between attribute worst and best | Used when no value_points are elicited. Linear is the standard first approximation; risk attitude and diminishing returns need elicited points. |
| `Cell independence` | uncertain cells treated as independent in EVPI | Cells that share a basis edge are in fact correlated. Independence understates or overstates EVPI depending on sign; flagged per cell in the precision report. |
| `Feasibility under uncertainty` | constraints screened at P50; P05/P95 crossing = AT_RISK | Hard constraints are evaluated on the median. AT_RISK alternatives stay ranked but are labeled. A chance-constraint rule would be the stricter alternative. |
| `Group pooling` | never by default; explicit call with a named rule | Per-group rankings are the default output. Pooled rankings exist only as an explicit, labeled act (equal shares or stated shares). |
| `Decision-model writes and the training-data store` | not logged | DELIB principle 2 logs every human correction. Decision-model content includes client interview quotes, so it is held out of the training store until data handling is ratified. |
| `Question-kind lexicon` | regex suggestions, human-confirmed | Seed questions are typed ALTERNATIVE / UNCERTAINTY / OBJECTIVE by pattern. Suggestions only; a frame does not pass until every question is confirmed. |
| `Assumption-candidate template` | 'Edge X->Y holds at this site with the direction and size assumed in cell (a, o)' | Generated for decision-sensitive cells resting on elicited-only, untransported, or unadjusted edges. Wording is a template, not an analysis. |

## References

- Boltanski, L. & Thévenot, L. (2006). *On Justification: Economies of Worth.* Princeton University Press.
- Cartwright, N. & Hardie, J. (2012). *Evidence-Based Policy: A Practical Guide to Doing It Better.* Oxford University Press.
- Dewar, J. A. (2002). *Assumption-Based Planning: A Tool for Reducing Avoidable Surprises.* Cambridge University Press.
- Eden, C. & Ackermann, F. (1998). *Making Strategy: The Journey of Strategic Management.* Sage.
- Gregory, R., Failing, L., Harstone, M., Long, G., McDaniels, T. & Ohlson, D. (2012). *Structured Decision Making: A Practical Guide to Environmental Management Choices.* Wiley-Blackwell.
- Haasnoot, M., Kwakkel, J. H., Walker, W. E. & ter Maat, J. (2013). Dynamic adaptive policy pathways. *Global Environmental Change* 23(2).
- Hammond, J. S., Keeney, R. L. & Raiffa, H. (1998). Even swaps: A rational method for making trade-offs. *Harvard Business Review* 76(2).
- Hammond, J. S., Keeney, R. L. & Raiffa, H. (1999). *Smart Choices.* Harvard Business School Press.
- Hemming, V., Burgman, M. A., Hanea, A. M., McBride, M. F. & Wintle, B. C. (2018). A practical guide to structured expert elicitation using the IDEA protocol. *Methods in Ecology and Evolution* 9(1).
- Howard, R. A. (1966). Information value theory. *IEEE Transactions on Systems Science and Cybernetics* 2(1).
- Howard, R. A. & Matheson, J. E. (1984). Influence diagrams. In *Readings on the Principles and Applications of Decision Analysis*, vol. II. Strategic Decisions Group. Republished in *Decision Analysis* 2(3), 2005.
- Hyland, K. (2005). *Metadiscourse: Exploring Interaction in Writing.* Continuum.
- Keefer, D. L. & Bodily, S. E. (1983). Three-point approximations for continuous random variables. *Management Science* 29(5).
- Keeney, R. L. (1992). *Value-Focused Thinking: A Path to Creative Decisionmaking.* Harvard University Press.
- Keeney, R. L. & Gregory, R. S. (2005). Selecting attributes to measure the achievement of objectives. *Operations Research* 53(1).
- Klein, G. (2007). Performing a project premortem. *Harvard Business Review* 85(9).
- Pearl, J. (2009). *Causality: Models, Reasoning, and Inference* (2nd ed.). Cambridge University Press.
- Phillips, L. D. (1984). A theory of requisite decision models. *Acta Psychologica* 56.
- Spetzler, C., Winter, H. & Meyer, J. (2016). *Decision Quality: Value Creation from Better Business Decisions.* Wiley.
- Ulrich, W. (1983). *Critical Heuristics of Social Planning.* Haupt.
- von Winterfeldt, D. & Edwards, W. (1986). *Decision Analysis and Behavioral Research.* Cambridge University Press.
