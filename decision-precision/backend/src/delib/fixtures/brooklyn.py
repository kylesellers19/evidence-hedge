"""The Brooklyn 40-story-tower mock fixture (Phase 2b).

An authored 18-node causal-deliberative graph used as the mock generator's
"answer key". It deliberately contains the elements the brief calls for:

- a reinforcing causal loop: build -> desirability -> rent -> build
- a framework-divergence point: `displacement` (prioritarian -2, aggregate ~0)
- a PARTIAL closure edge: `capacity` -> seed

Seed question:  "What happens if a developer builds a 40-story residential
tower in a mid-rise Brooklyn neighborhood?"
Goal state:     "housing capacity increases without net wellbeing loss to
                 incumbent residents."

The fixture is a fully-valid DelibGraph, so building it also exercises every
insert-time constraint.
"""

from __future__ import annotations

from ..graph import DelibGraph
from ..models.edges import CausalEdge, ClosureEdge, DeliberativeEdge, FramesEdge
from ..models.enums import ClosureSatisfaction, EvidenceGrade
from ..models.nodes import (
    CFIRTags,
    ConsequenceNode,
    DecisionNode,
    ProctorScore,
    ProctorScores,
    SeedNode,
    Valence,
)
from ..models.registries import (
    Framework,
    FrameworkRegistry,
    Stakeholder,
    StakeholderRegistry,
)

SEED_QUESTION = (
    "What happens if a developer builds a 40-story residential tower in a "
    "mid-rise Brooklyn neighborhood?"
)
GOAL_STATE = (
    "housing capacity increases without net wellbeing loss to incumbent residents"
)


# --- small builders ---------------------------------------------------------


def _proctor(**scores: tuple[int, str]) -> ProctorScores:
    return ProctorScores(
        **{k: ProctorScore(score=s, justification=j) for k, (s, j) in scores.items()}
    )


def _v(stakeholder: str, framework: str, sign: int, why: str) -> Valence:
    return Valence(
        stakeholder_id=stakeholder, framework_id=framework, sign=sign, justification=why
    )


def _c(nid, label, ring, gr, valences) -> ConsequenceNode:
    return ConsequenceNode(
        id=nid, label=label, ring=ring, goal_relevance=gr, valences=valences
    )


AGG = "aggregate_utilitarian"
PRI = "prioritarian"


def build_brooklyn_registries() -> tuple[StakeholderRegistry, FrameworkRegistry]:
    sh = StakeholderRegistry()
    for sid, desc in [
        ("incumbents", "existing renters and owners in the neighborhood"),
        ("newcomers", "residents who move into the new units"),
        ("developer", "the developer and construction trades"),
        ("city", "municipal government and tax base"),
        ("small_businesses", "existing local merchants"),
    ]:
        sh.register(Stakeholder(id=sid, description=desc))

    fw = FrameworkRegistry()
    fw.register(Framework(id=AGG, name="Aggregate Utilitarian",
                          rubric="Net welfare summed across stakeholders, equal weight per unit."))
    fw.register(Framework(id=PRI, name="Prioritarian",
                          rubric="Welfare weighted toward the worse-off; harms to incumbents count more."))
    return sh, fw


def build_brooklyn_master() -> DelibGraph:
    sh, fw = build_brooklyn_registries()
    g = DelibGraph(stakeholders=sh, frameworks=fw)

    # --- seed ---------------------------------------------------------------
    g.add_node(
        SeedNode(
            id="seed",
            label="40-story Brooklyn tower",
            question_text=SEED_QUESTION,
            goal_state_text=GOAL_STATE,
            goal_criteria=[
                "net housing capacity increases",
                "no net wellbeing loss to incumbent residents",
            ],
        )
    )

    # --- ring 1: decisions --------------------------------------------------
    g.add_node(
        DecisionNode(
            id="build",
            label="Build the 40-story tower",
            ring=1,
            alternatives=["40-story tower", "10-story mid-rise", "do not build", "mixed-use with retail"],
            cfir_tags=CFIRTags(
                innovation=["high-rise typology in a low-rise context"],
                outer_setting=["housing shortage", "land-use politics"],
                inner_setting=["developer capital structure"],
                process=["ULURP / community board review"],
            ),
            proctor_scores=_proctor(
                acceptability=(2, "strong community-board opposition to height"),
                feasibility=(4, "financing and construction are well-understood"),
                cost=(2, "very high land and construction cost"),
                sustainability=(4, "durable asset with long revenue life"),
                adoption=(3, "contingent on approvals"),
            ),
            unexpanded_child_estimate=6,
        )
    )
    g.add_node(
        DecisionNode(
            id="affordability_mandate",
            label="Attach an affordability requirement",
            ring=1,
            alternatives=["25% affordable", "no mandate", "fee-in-lieu"],
            cfir_tags=CFIRTags(
                outer_setting=["MIH policy"],
                process=["negotiated with city planning"],
            ),
            proctor_scores=_proctor(
                acceptability=(4, "broadly popular with residents"),
                feasibility=(3, "reduces project margin"),
                cost=(3, "cross-subsidized by market units"),
                sustainability=(3, "depends on ongoing regulation"),
                adoption=(3, "common under inclusionary zoning"),
            ),
            unexpanded_child_estimate=2,
        )
    )
    g.add_node(
        DecisionNode(
            id="zoning_variance",
            label="Seek an upzoning / variance",
            ring=1,
            alternatives=["spot upzoning", "as-of-right only", "community-negotiated rezoning"],
            cfir_tags=CFIRTags(
                outer_setting=["zoning code", "local politics"],
                process=["ULURP"],
            ),
            proctor_scores=_proctor(
                acceptability=(2, "rezonings are contentious"),
                feasibility=(3, "precedent exists but slow"),
                cost=(3, "legal and time cost"),
                sustainability=(4, "permanent entitlement"),
                adoption=(3, "case-by-case"),
            ),
            unexpanded_child_estimate=2,
        )
    )

    # --- ring 2: consequences ----------------------------------------------
    g.add_node(_c("capacity", "Net housing capacity increases (~400 units)", 2, 0.9, [
        _v("newcomers", AGG, 2, "large welfare gain from new supply"),
        _v("newcomers", PRI, 1, "some of the gain reaches lower-income newcomers"),
        _v("incumbents", AGG, 1, "modest supply relief"),
    ]))
    g.add_node(_c("desirability", "Neighborhood desirability rises", 2, 0.3, [
        _v("newcomers", AGG, 1, "amenity and status gains"),
    ]))
    g.add_node(_c("construction_disruption", "Multi-year construction disruption", 2, 0.4, [
        _v("incumbents", AGG, -1, "noise, dust, road closures"),
        _v("incumbents", PRI, -1, "burden falls on those who cannot leave"),
    ]))
    g.add_node(_c("tax_revenue", "Municipal property-tax revenue increases", 2, 0.3, [
        _v("city", AGG, 1, "expanded tax base"),
    ]))
    g.add_node(_c("shadow_infrastructure", "Shadowing and strain on local infrastructure", 2, 0.4, [
        _v("incumbents", AGG, 0, "mixed: shadows vs. investment"),
        _v("incumbents", PRI, -1, "reduced light/air for existing residents"),
    ]))
    g.add_node(_c("affordable_units", "Below-market units created", 2, 0.6, [
        _v("newcomers", PRI, 2, "direct benefit to lower-income households"),
        _v("newcomers", AGG, 1, "welfare gain"),
        _v("incumbents", PRI, 1, "some incumbents may qualify"),
    ]))
    g.add_node(_c("construction_jobs", "Construction and trades employment", 2, 0.2, [
        _v("developer", AGG, 1, "jobs and margin"),
    ]))

    # --- ring 3: consequences ----------------------------------------------
    g.add_node(_c("rent", "Area rents rise", 3, 0.5, [
        _v("incumbents", PRI, -2, "rent burden concentrated on the worse-off"),
        _v("incumbents", AGG, 0, "transfers rather than net welfare loss"),
        _v("newcomers", AGG, -1, "higher housing cost for movers-in"),
    ]))
    # THE specified divergence point: prioritarian strongly negative, aggregate ~neutral.
    g.add_node(_c("displacement", "Incumbent displacement and turnover", 3, 0.9, [
        _v("incumbents", PRI, -2, "displacement is a severe harm to the worse-off"),
        _v("incumbents", AGG, 0, "utilitarian nets displaced against in-movers"),
    ]))
    g.add_node(_c("commercial_gentrification", "Local small businesses priced out", 3, 0.5, [
        _v("small_businesses", PRI, -2, "loss of livelihood for marginal merchants"),
        _v("small_businesses", AGG, -1, "net loss of local commercial diversity"),
    ]))
    g.add_node(_c("wealth_effect", "Incumbent homeowners gain equity", 3, 0.4, [
        _v("incumbents", AGG, 1, "asset appreciation for owners"),
        _v("incumbents", PRI, 1, "some benefit reaches modest owners"),
    ]))
    g.add_node(_c("school_investment", "Expanded tax base funds school upgrades", 3, 0.4, [
        _v("incumbents", AGG, 1, "better local services"),
        _v("newcomers", AGG, 1, "better local services"),
    ]))
    g.add_node(_c("transit_crowding", "Subway and transit crowding worsens", 3, 0.3, [
        _v("incumbents", AGG, -1, "longer, more crowded commutes"),
        _v("newcomers", AGG, -1, "shared congestion cost"),
    ]))
    g.add_node(_c("social_fabric", "Erosion of established community networks", 3, 0.6, [
        _v("incumbents", PRI, -2, "loss of social capital hits the worse-off hardest"),
        _v("incumbents", AGG, -1, "net loss of community cohesion"),
    ]))

    # --- framing edges (seed -> ring 1) ------------------------------------
    for target in ("build", "affordability_mandate", "zoning_variance"):
        g.add_edge(FramesEdge(source="seed", target=target))

    # --- deliberative ordering (acyclic) -----------------------------------
    g.add_edge(DeliberativeEdge(source="zoning_variance", target="build"))
    g.add_edge(DeliberativeEdge(source="build", target="affordability_mandate"))

    # --- causal edges -------------------------------------------------------
    def causal(s, t, grade, pol=1, note=None):
        g.add_edge(CausalEdge(source=s, target=t, mechanism_text=note or f"{s} -> {t}",
                              evidence_grade=grade, polarity=pol))

    G = EvidenceGrade
    # ring1 -> ring2
    causal("build", "capacity", G.SUPPORTED, note="more units directly add capacity")
    causal("build", "desirability", G.SUPPORTED, note="new high-end housing raises perceived desirability")
    causal("build", "construction_disruption", G.SUPPORTED)
    causal("build", "tax_revenue", G.WEAK, note="assessed value increases tax base")
    causal("build", "shadow_infrastructure", G.WEAK)
    causal("build", "construction_jobs", G.SUPPORTED)
    causal("affordability_mandate", "affordable_units", G.SUPPORTED)
    # ring2 -> ring3
    causal("desirability", "rent", G.WEAK, note="rising desirability pushes rents up")
    causal("rent", "displacement", G.CONTESTED, note="rent increases -> displacement (contested magnitude)")
    causal("rent", "commercial_gentrification", G.WEAK)
    causal("desirability", "wealth_effect", G.ANALOGICAL)
    causal("tax_revenue", "school_investment", G.SPECULATIVE, note="depends on budget allocation")
    causal("shadow_infrastructure", "transit_crowding", G.WEAK)
    causal("displacement", "social_fabric", G.WEAK)
    # reinforcing loop closes: rents -> more development
    causal("rent", "build", G.ANALOGICAL, note="rising rents attract further development")

    # --- closure ------------------------------------------------------------
    g.add_edge(
        ClosureEdge(
            source="capacity",
            target="seed",
            satisfies=ClosureSatisfaction.PARTIAL,
            justification=(
                "capacity rises (goal met) but incumbent wellbeing is at risk "
                "from rent and displacement (goal only partially met)"
            ),
        )
    )
    return g
