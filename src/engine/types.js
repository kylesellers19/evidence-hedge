// ─────────────────────────────────────────────────────────────────────────────
// Shared engine type contracts (JSDoc).
//
// These typedefs define the boundary between the RUBRIC REGISTRY (pure config)
// and the SHARED SCORING ENGINE (all the verbs). The engine reads values off a
// RubricConfig it is handed — it never imports a rubric by name and never
// branches on document type. Adding a fifth rubric = one new config + one
// registry line, touching zero engine code.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One rung on a rubric's evidence-strength ladder, bottom (rank 0) → top.
 * `match` is what lets the ladder — not the engine — decide what counts as this
 * grade of evidence. gradeEvidence walks rungs top→bottom and returns the first
 * whose `match` hits the claim's detected citations/keywords.
 * @typedef  {Object} Rung
 * @property {string} key
 * @property {string} label
 * @property {number} rank              0 = unsourced (near-null), higher = stronger
 * @property {'supported'|'partial'|'unsupported'} tint   maps to a grade-badge tint
 * @property {{ types?: string[], keywords?: string[] }} [match]
 */

/**
 * One claim-strength / assertiveness band, bottom → top by weight.
 * `cues` are the lexical signals measureAssertiveness scans for.
 * @typedef  {Object} Tier
 * @property {string}   key
 * @property {string}   label
 * @property {number}   weight           1 = hedged … 4 = absolute
 * @property {string[]} cues
 */

/** @typedef {'none'|'note'|'flag'|'critical'} NullSeverity */

/**
 * How much asserted strength a given evidence rank is *allowed* before it is a
 * mismatch — now posture-aware, and paired with a nullSeverity function that
 * replaces the old scalar `nearNullRank`.
 * @typedef  {Object} ToleranceConfig
 * @property {Object.<string, number[]>} ceilings
 *   key 'default' REQUIRED; posture keys override it wholesale (explicit tables,
 *   no arithmetic offsets). Same rank-indexed direction as before —
 *   ceilings[posture][rung.rank] = max tier.weight permitted at that rung. Every
 *   array's length must equal the ladder length.
 * @property {(tierIndex:number, posture:string, disclosed:boolean) => NullSeverity} nullSeverity
 *   severity of an ABSENCE of evidence at the asserted tier under the posture;
 *   `disclosed` = the absence is openly hedged/stated (honest hedging rewarded).
 */

/**
 * One grounding of a rubric criterion in an external standard.
 * @typedef  {Object} ProvenanceEntry
 * @property {string} criterion   which rubric criterion this standard grounds
 * @property {string} standard    name of the external standard
 * @property {string} citation    human-readable citation
 * @property {string} url         may be '' for print-only citations (e.g. Hyland)
 */

/**
 * Claim-extraction sensitivity config.
 * @typedef  {Object} ExtractionConfig
 * @property {number}   sensitivity      0–1 threshold for what counts as a claim
 * @property {number}   minClaimLength   minimum characters
 * @property {{ boosters: string[], hedges: string[] }} assertivenessCues
 */

/**
 * Posture unions (documented values; the validator enforces membership):
 *   corporate:  'marketing' | 'thought-leadership' | 'research-like'
 *   general:    'experiential' | 'authoritative'
 *   journalism: 'news' | 'opinion' | 'sponsored' | 'unlabeled'
 *   research:   'standard'
 *
 * A pluggable rubric.
 * @typedef  {Object} RubricConfig
 * @property {string}           id
 * @property {string}           label
 * @property {string}           description
 * @property {string}           documentNoun    was undocumented; now contractual
 * @property {boolean}          [stub]          true = shape complete, values are drafts
 * @property {Rung[]}           ladder
 * @property {Tier[]}           tiers
 * @property {string}           defaultTier     tier.key used when no cues match
 * @property {ExtractionConfig} extraction
 * @property {ToleranceConfig}  tolerance
 * @property {string[]}         postures        valid posture keys for this rubric
 * @property {string}           defaultPosture  ∈ postures
 * @property {string[]}         documentSignals signal names (registered in signals/)
 * @property {ProvenanceEntry[]} provenance
 */

/**
 * A raw citation token detected in a claim (rubric-agnostic detection).
 * @typedef  {Object} Citation
 * @property {string} type   'numeric' | 'author-year' | 'url' | 'doi' | 'phrase'
 * @property {string} raw
 */

/**
 * The explanation object every flag carries.
 * @typedef  {Object} Explanation
 * @property {Tier}        tierAsserted
 * @property {Rung}        rungReached
 * @property {number}      ceiling
 * @property {string}      posture       active posture key at flag time
 */

/** @typedef {'unsupported-assertion'|'overconfident'} FlagType */

/**
 * @typedef  {Object} Claim
 * @property {number}        id
 * @property {string}        text
 * @property {Citation[]}    citations
 * @property {Tier}          tier         claim-strength (measureAssertiveness)
 * @property {Rung}          rung         evidence grade (gradeEvidence)
 * @property {?FlagType}     flag         null if within tolerance
 * @property {?Explanation}  explanation
 */

/**
 * A named pattern surfaced on the brief, with verbatim examples from the doc.
 * @typedef  {Object} Pattern
 * @property {FlagType} key
 * @property {string}   name
 * @property {string}   description   how the writing manufactures false confidence
 * @property {string[]} examples      2–3 verbatim lines from the document
 * @property {number}   count
 */

/**
 * A DOCUMENT-level signal — feeds the verdict and renders in its own results
 * section; never attaches to a sentence. Distinct from per-claim flags.
 * @typedef  {Object} Signal
 * @property {string}            id
 * @property {'note'|'flag'}     severity
 * @property {string}            summary
 * @property {string[]}          evidence   matched text spans (auditable)
 */

/**
 * @typedef  {Object} AnalysisResult
 * @property {Claim[]}   claims
 * @property {Pattern[]} patterns
 * @property {Signal[]}  signals               document-level signals (Part C)
 * @property {string}    posture               active posture the analysis ran under
 * @property {Object}    summary
 * @property {string}    summary.verdict        plain-language headline sentence(s)
 * @property {number}    summary.totalClaims
 * @property {number}    summary.strongClaims
 * @property {Object<FlagType, number>} summary.flagCounts
 * @property {{ rung: Rung, count: number }[]} summary.distribution
 */

export {} // types-only module
