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

/**
 * How much asserted strength a given evidence rank is *allowed* before it is a
 * mismatch. ceilings[rank] = max tier.weight permitted at that rung.
 * @typedef  {Object} ToleranceCurve
 * @property {number[]} ceilings         indexed by rung.rank
 * @property {number}   nearNullRank     at/below this rank an over-assertion is
 *                                        an unsupported-assertion, not overconfident
 */

/**
 * Claim-extraction sensitivity config.
 * @typedef  {Object} ExtractionConfig
 * @property {number}   sensitivity      0–1 threshold for what counts as a claim
 * @property {number}   minClaimLength   minimum characters
 * @property {{ boosters: string[], hedges: string[] }} assertivenessCues
 */

/**
 * A pluggable rubric — the four fields, plus identity for the entry card.
 * @typedef  {Object} RubricConfig
 * @property {string}           id
 * @property {string}           label
 * @property {string}           description
 * @property {boolean}          [stub]   true = shape complete, values are drafts
 * @property {Rung[]}           ladder
 * @property {Tier[]}           tiers
 * @property {string}           defaultTier   tier.key used when no cues match
 * @property {ExtractionConfig} extraction
 * @property {ToleranceCurve}   tolerance
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
 * @typedef  {Object} AnalysisResult
 * @property {Claim[]}   claims
 * @property {Pattern[]} patterns
 * @property {Object}    summary
 * @property {string}    summary.verdict        plain-language headline sentence(s)
 * @property {number}    summary.totalClaims
 * @property {number}    summary.strongClaims
 * @property {Object<FlagType, number>} summary.flagCounts
 * @property {{ rung: Rung, count: number }[]} summary.distribution
 */

export {} // types-only module
