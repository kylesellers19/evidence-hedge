"""Decision-layer constants.

Every number or rule below that is a judgment rather than a definition is marked
``# PROVISIONAL — not ratified`` and listed by :func:`ratification_table`, so the
completion report is generated from the code and cannot drift from it.
"""

from __future__ import annotations

from pydantic import BaseModel

from ..models.enums import EVIDENCE_GRADE_ORDINAL, EvidenceGrade

# --- Uncertainty convention -------------------------------------------------
# Estimates are elicited as three quantiles: P05, P50, P95. The extended
# Pearson-Tukey three-point approximation (Keefer & Bodily 1983) weights them
# 0.185 / 0.63 / 0.185. The weights are published; adopting the P05/P95
# elicitation convention is the judgment.
PT_WEIGHTS: tuple[float, float, float] = (0.185, 0.63, 0.185)  # PROVISIONAL — not ratified (convention choice)

# --- Sensitivity / value of information -------------------------------------
# A cell is "decision-sensitive" for a group when its expected value of partial
# perfect information is at least this many value points (0-100 scale).
EVPPI_MIN_POINTS: float = 1.0  # PROVISIONAL — not ratified

# A group's top choice is "weight-sensitive" on an objective when the current
# weight sits within this distance of a rank-reversal breakpoint.
WEIGHT_MARGIN: float = 0.05  # PROVISIONAL — not ratified

# Exact total EVPI enumerates joint states; above this many uncertain cells per
# alternative it is not computed (requisite modeling: cut the model first).
EVPI_MAX_CELLS_PER_ALTERNATIVE: int = 9  # implementation limit, not a judgment

# --- Evidence adequacy for the precision report -----------------------------
# The weakest basis edge must reach at least this grade for a cell to count as
# adequately evidenced. Uses DELIB's existing ratified ordinal.
ADEQUATE_GRADE: EvidenceGrade = EvidenceGrade.WEAK  # PROVISIONAL — not ratified
ADEQUATE_ORDINAL: int = EVIDENCE_GRADE_ORDINAL[ADEQUATE_GRADE]

# Literature-based edges only count as adequate here when transport to this
# site was judged LIKELY_HOLDS (Cartwright & Hardie 2012).
REQUIRE_TRANSPORT_FOR_LITERATURE: bool = True  # PROVISIONAL — not ratified

# An estimate whose 90% interval is narrower than this fraction of the
# attribute's range, resting on evidence below ADEQUATE_GRADE, is flagged as an
# overconfident interval: stated precision the evidence does not carry.
NARROW_INTERVAL_FRACTION: float = 0.05  # PROVISIONAL — not ratified

# --- Disagreement detection -------------------------------------------------
# Two groups' weight vectors that pick the same top alternative are reported as
# a latent value disagreement when any normalized weight differs by this much.
LATENT_WEIGHT_GAP: float = 0.15  # PROVISIONAL — not ratified

# An even swap is flagged as inconsistent with the same group's swing weights
# when the implied and elicited tradeoff ratios differ by more than this factor.
SWAP_INCONSISTENCY_FACTOR: float = 2.0  # PROVISIONAL — not ratified


class RatificationRow(BaseModel):
    constant: str
    value: str
    status: str
    rationale: str


def ratification_table() -> list[RatificationRow]:
    """Every provisional constant and rule, for Kyle's explicit ratification."""
    p = "PROVISIONAL — not ratified"
    return [
        RatificationRow(
            constant="PT_WEIGHTS", value="P05/P50/P95 at 0.185/0.63/0.185", status=p,
            rationale="Extended Pearson-Tukey (Keefer & Bodily 1983). Alternative: Swanson's rule, "
                      "P10/P50/P90 at 0.3/0.4/0.3. Changes how wide elicited intervals must be.",
        ),
        RatificationRow(
            constant="EVPPI_MIN_POINTS", value=f"{EVPPI_MIN_POINTS} value points (0-100 scale)", status=p,
            rationale="Below this, perfect information about a cell cannot move expected value enough "
                      "to justify investigation. Scale-dependent: tied to the 0-100 value convention.",
        ),
        RatificationRow(
            constant="WEIGHT_MARGIN", value=f"{WEIGHT_MARGIN} (normalized weight)", status=p,
            rationale="How close a weight may sit to a rank reversal before the weight itself is "
                      "treated as a load-bearing assumption.",
        ),
        RatificationRow(
            constant="ADEQUATE_GRADE", value=f"{ADEQUATE_GRADE.value} (ordinal {ADEQUATE_ORDINAL})", status=p,
            rationale="Weakest-link floor a decision-sensitive cell needs to land in MONITOR rather "
                      "than INVESTIGATE. Reuses DELIB's ratified grade ordinal; the cut point is new.",
        ),
        RatificationRow(
            constant="REQUIRE_TRANSPORT_FOR_LITERATURE", value=str(REQUIRE_TRANSPORT_FOR_LITERATURE), status=p,
            rationale="Literature evidence counts as adequate for this site only when transport was "
                      "assessed LIKELY_HOLDS. False would let well-graded but untransported evidence "
                      "settle a cell.",
        ),
        RatificationRow(
            constant="NARROW_INTERVAL_FRACTION", value=f"{NARROW_INTERVAL_FRACTION} of attribute range", status=p,
            rationale="Evidence Hedge's proportionality test applied to estimates: a tight P05-P95 "
                      "interval on weak evidence is stated precision the evidence does not carry.",
        ),
        RatificationRow(
            constant="MEASURED estimates", value="adequate evidence; no basis edges required", status=p,
            rationale="A measured current value (typically the status quo) is an observation, not a "
                      "predicted effect, so the causal evidence floor does not apply. Measurement quality "
                      "itself is not graded here.",
        ),
        RatificationRow(
            constant="LATENT_WEIGHT_GAP", value=f"{LATENT_WEIGHT_GAP} (normalized weight)", status=p,
            rationale="Reports value disagreements that do not change the current choice but could "
                      "under a different alternative set.",
        ),
        RatificationRow(
            constant="SWAP_INCONSISTENCY_FACTOR", value=f"{SWAP_INCONSISTENCY_FACTOR}x", status=p,
            rationale="Cross-check between two elicitation methods (even swaps vs swing weights). "
                      "A factor-of-two gap is a common practitioner tolerance, not a published standard.",
        ),
        RatificationRow(
            constant="Value function default", value="linear between attribute worst and best", status=p,
            rationale="Used when no value_points are elicited. Linear is the standard first "
                      "approximation; risk attitude and diminishing returns need elicited points.",
        ),
        RatificationRow(
            constant="Cell independence", value="uncertain cells treated as independent in EVPI", status=p,
            rationale="Cells that share a basis edge are in fact correlated. Independence understates "
                      "or overstates EVPI depending on sign; flagged per cell in the precision report.",
        ),
        RatificationRow(
            constant="Feasibility under uncertainty", value="constraints screened at P50; P05/P95 crossing = AT_RISK", status=p,
            rationale="Hard constraints are evaluated on the median. AT_RISK alternatives stay ranked "
                      "but are labeled. A chance-constraint rule would be the stricter alternative.",
        ),
        RatificationRow(
            constant="Group pooling", value="never by default; explicit call with a named rule", status=p,
            rationale="Per-group rankings are the default output. Pooled rankings exist only as an "
                      "explicit, labeled act (equal shares or stated shares).",
        ),
        RatificationRow(
            constant="Decision-model writes and the training-data store",
            value="not logged", status=p,
            rationale="DELIB principle 2 logs every human correction. Decision-model content includes "
                      "client interview quotes, so it is held out of the training store until data "
                      "handling is ratified.",
        ),
        RatificationRow(
            constant="Question-kind lexicon", value="regex suggestions, human-confirmed", status=p,
            rationale="Seed questions are typed ALTERNATIVE / UNCERTAINTY / OBJECTIVE by pattern. "
                      "Suggestions only; a frame does not pass until every question is confirmed.",
        ),
        RatificationRow(
            constant="Assumption-candidate template",
            value="'Edge X->Y holds at this site with the direction and size assumed in cell (a, o)'",
            status=p,
            rationale="Generated for decision-sensitive cells resting on elicited-only, untransported, "
                      "or unadjusted edges. Wording is a template, not an analysis.",
        ),
    ]


__all__ = [
    "PT_WEIGHTS",
    "EVPPI_MIN_POINTS",
    "WEIGHT_MARGIN",
    "EVPI_MAX_CELLS_PER_ALTERNATIVE",
    "ADEQUATE_GRADE",
    "ADEQUATE_ORDINAL",
    "REQUIRE_TRANSPORT_FOR_LITERATURE",
    "NARROW_INTERVAL_FRACTION",
    "LATENT_WEIGHT_GAP",
    "SWAP_INCONSISTENCY_FACTOR",
    "RatificationRow",
    "ratification_table",
]
