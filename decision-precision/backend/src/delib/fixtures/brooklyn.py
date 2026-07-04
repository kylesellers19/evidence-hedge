"""The Brooklyn 40-story-tower mock fixture (Phase 2b).

An authored 18-node causal-deliberative graph used as the mock generator's
"answer key". It deliberately contains the elements the brief calls for:

- a reinforcing causal loop: build -> desirability -> rent -> build
- register clashes within nodes (e.g. `displacement`: MARKET vs CIVIC vs DOMESTIC)
- a tradition tension across an edge: rent (utilitarian) -> displacement (kantian)
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
from ..models.enums import ClosureSatisfaction, CodingStatus, Confidence, EvidenceGrade, Register
from ..models.nodes import (
    CFIRTags,
    ConsequenceNode,
    DecisionNode,
    ProctorScore,
    ProctorScores,
    RegisterEngagement,
    SeedNode,
    TraditionAttribution,
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


_HI, _MOD = Confidence.HIGH, Confidence.MODERATE


def _reg(register: Register, marker: str, why: str, conf: Confidence = _MOD) -> RegisterEngagement:
    return RegisterEngagement(register=register, signature_marker=marker, justification=why, confidence=conf)


def _trad(tradition: str, marker: str, why: str, conf: Confidence = _MOD) -> TraditionAttribution:
    return TraditionAttribution(tradition=tradition, signature_marker=marker, justification=why, confidence=conf)


def _c(nid, label, ring, gr, registers=(), traditions=(), coding=CodingStatus.PENDING) -> ConsequenceNode:
    return ConsequenceNode(
        id=nid, label=label, ring=ring, goal_relevance=gr,
        registers=list(registers), traditions=list(traditions), coding_status=coding,
    )


# tradition leaf ids (Layer-2 leaves reused on the deliberation canvas)
UTIL = "utilitarian_aggregate"
KANT = "kantian_deontological"
LIBK = "libertarian_nozickian"
VIRT = "virtue_ethical"


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

    # Frameworks are vestigial now that consequences are coded by register /
    # tradition, but the registry infrastructure is retained (the mock reads it).
    fw = FrameworkRegistry()
    fw.register(Framework(id="aggregate_utilitarian", name="Aggregate Utilitarian",
                          rubric="Net welfare summed across stakeholders, equal weight per unit."))
    fw.register(Framework(id="prioritarian", name="Prioritarian",
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
    # capacity: MARKET vs CIVIC clash (supply-as-asset vs housing-as-collective-good)
    g.add_node(_c("capacity", "Net housing capacity increases (~400 units)", 2, 0.9,
        registers=[
            _reg(Register.MARKET, "~400 units", "new supply as marketable stock", _HI),
            _reg(Register.CIVIC, "housing capacity increases", "housing as a collective provision"),
        ],
        traditions=[_trad(UTIL, "large welfare gain from new supply", "aggregate welfare improves", _HI)],
        coding=CodingStatus.HUMAN_VERIFIED,
    ))
    # desirability: MARKET + FAME — a recognized COMPROMISE, so suppressed (no clash)
    g.add_node(_c("desirability", "Neighborhood desirability rises", 2, 0.3,
        registers=[
            _reg(Register.MARKET, "perceived desirability", "amenity value capitalized in prices"),
            _reg(Register.FAME, "status gains", "reputation of the neighborhood"),
        ],
    ))
    # construction_disruption: INDUSTRIAL vs DOMESTIC clash
    g.add_node(_c("construction_disruption", "Multi-year construction disruption", 2, 0.4,
        registers=[
            _reg(Register.INDUSTRIAL, "multi-year construction", "the works as a technical undertaking"),
            _reg(Register.DOMESTIC, "those who cannot leave", "disruption to home and settled life"),
        ],
    ))
    # tax_revenue: MARKET vs CIVIC clash
    g.add_node(_c("tax_revenue", "Municipal property-tax revenue increases", 2, 0.3,
        registers=[
            _reg(Register.MARKET, "expanded tax base", "value realized as revenue"),
            _reg(Register.CIVIC, "municipal", "public fisc for collective ends"),
        ],
    ))
    # shadow_infrastructure: INDUSTRIAL vs GREEN clash
    g.add_node(_c("shadow_infrastructure", "Shadowing and strain on local infrastructure", 2, 0.4,
        registers=[
            _reg(Register.INDUSTRIAL, "strain on local infrastructure", "load on technical systems"),
            _reg(Register.GREEN, "reduced light/air", "loss of environmental quality"),
        ],
    ))
    # affordable_units: MARKET vs CIVIC clash
    g.add_node(_c("affordable_units", "Below-market units created", 2, 0.6,
        registers=[
            _reg(Register.CIVIC, "below-market units", "provision for those priced out"),
            _reg(Register.MARKET, "cross-subsidized by market units", "financed through the deal"),
        ],
        traditions=[_trad(UTIL, "welfare gain", "net welfare of housed households")],
    ))
    # construction_jobs: MARKET + INDUSTRIAL — a recognized COMPROMISE, suppressed
    g.add_node(_c("construction_jobs", "Construction and trades employment", 2, 0.2,
        registers=[
            _reg(Register.MARKET, "jobs and margin", "labor market and returns"),
            _reg(Register.INDUSTRIAL, "trades employment", "skilled technical work"),
        ],
    ))

    # --- ring 3: consequences ----------------------------------------------
    # rent: utilitarian framing -> attacks displacement's kantian framing downstream
    g.add_node(_c("rent", "Area rents rise", 3, 0.5,
        registers=[_reg(Register.MARKET, "area rents rise", "price signal in the housing market", _HI)],
        traditions=[_trad(UTIL, "transfers rather than net welfare loss", "harms net against gains")],
        coding=CodingStatus.HUMAN_VERIFIED,
    ))
    # displacement: MARKET vs CIVIC vs DOMESTIC (three-way clash); kantian tradition
    g.add_node(_c("displacement", "Incumbent displacement and turnover", 3, 0.9,
        registers=[
            _reg(Register.MARKET, "priced out", "allocation by ability to pay"),
            _reg(Register.CIVIC, "right to remain", "membership in a community"),
            _reg(Register.DOMESTIC, "turnover", "severed neighborhood bonds"),
        ],
        traditions=[_trad(KANT, "a severe harm to the worse-off", "displacement as an inviolable wrong", _HI)],
        coding=CodingStatus.HUMAN_VERIFIED,
    ))
    # commercial_gentrification: MARKET vs DOMESTIC; libertarian tradition
    g.add_node(_c("commercial_gentrification", "Local small businesses priced out", 3, 0.5,
        registers=[
            _reg(Register.MARKET, "priced out", "commercial rent competition"),
            _reg(Register.DOMESTIC, "local merchants", "long-standing local ties"),
        ],
        traditions=[_trad(LIBK, "loss of livelihood for marginal merchants", "voluntary-exchange displacement")],
    ))
    # wealth_effect: MARKET; libertarian property tradition
    g.add_node(_c("wealth_effect", "Incumbent homeowners gain equity", 3, 0.4,
        registers=[_reg(Register.MARKET, "asset appreciation", "owners' capital gains")],
        traditions=[_trad(LIBK, "asset appreciation for owners", "property entitlements")],
    ))
    # school_investment: CIVIC; utilitarian
    g.add_node(_c("school_investment", "Expanded tax base funds school upgrades", 3, 0.4,
        registers=[_reg(Register.CIVIC, "better local services", "public goods provision")],
        traditions=[_trad(UTIL, "better local services", "welfare of residents")],
    ))
    # transit_crowding: INDUSTRIAL + CIVIC — a recognized COMPROMISE, suppressed
    g.add_node(_c("transit_crowding", "Subway and transit crowding worsens", 3, 0.3,
        registers=[
            _reg(Register.INDUSTRIAL, "transit crowding", "capacity of the network"),
            _reg(Register.CIVIC, "shared congestion cost", "burden on the public"),
        ],
    ))
    # social_fabric: CIVIC vs DOMESTIC clash; virtue tradition (attacked by displacement's kantian)
    g.add_node(_c("social_fabric", "Erosion of established community networks", 3, 0.6,
        registers=[
            _reg(Register.CIVIC, "community networks", "civic association"),
            _reg(Register.DOMESTIC, "loss of social capital", "dense particular ties"),
        ],
        traditions=[_trad(VIRT, "erosion of established community networks", "corrosion of communal character")],
    ))

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
