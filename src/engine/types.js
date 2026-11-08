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
 * One claim-strength / assertiveness band, bottom → top by weight. The four
 * bands are SHARED by every rubric (engine/measure/certainty.js TIERS): claim
 * strength is measurement, read from Hyland hedges/boosters, never judgment.
 * `cues` lists the lexicon for display.
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
 * @property {string[]} [measures] hybrid frameworks only: the signals or flags it
 *                                 grounds here ([] = cited, not yet measured)
 * @property {string} [scope]      on a hybrid: 'hybrid' | a genre id | 'shared'
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
 * @property {string}           defaultTier     tier.key used when no cues match ('measured')
 * @property {string}           ownResultRung   ladder rung key an own-result claim reaches
 *                                              on the document's own evidence
 * @property {ExtractionConfig} extraction
 * @property {ToleranceConfig}  tolerance
 * @property {string[]}         postures        valid posture keys for this rubric
 * @property {string}           defaultPosture  ∈ postures
 * @property {string[]}         documentSignals signal names (registered in signals/)
 * @property {ProvenanceEntry[]} provenance
 *
 * A hybrid judgment (rubrics/hybrids.js composeRubric) is a RubricConfig built
 * from its standard's config, plus:
 * @property {string}  [base]         id of the rubric whose ladder applies
 * @property {string}  [genreNote]    the scenario's one-line genre note
 * @property {boolean} [promotional]  verdict speaks of the copy, not "the evidence"
 * @property {{ scenarios:{id:string,name:string}[], genres:string[], standard:string, why:string, audits:{id:string,from:string}[] }} [hybrid]
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
 * @property {Attribution} [attribution] whose finding the claim reports (attribution.js)
 * @property {Evidence}    [evidence]    the claim's links to its evidence (linkEvidence.js)
 */

/**
 * One link from a claim to the evidence it leans on (engine/linkEvidence.js).
 * @typedef  {Object} EvidenceLink
 * @property {'marker'|'footnote'|'caption'|'hyperlink'|'section-scope'|'proximity'|'speaker'} basis  how it was made
 * @property {string} anchor   the text in or near the claim that made it
 * @property {{kind:'reference'|'unresolved-marker'|'note'|'own-study'|'source'|'figure'|'url'|'same-sentence'|'speaker'}} target
 * @property {'high'|'low'} confidence
 */

/**
 * One field of a claim record (engine/claimRecord.js).
 * @typedef  {Object} RecordField
 * @property {*}       value
 * @property {?('predicted'|'gold'|'weak'|'published-human')} tier  the label tier the value carries
 * @property {?string} span    the text it came from
 * @property {'resolved'|'unresolved'} status
 * @property {string}  [reason] why it is unresolved
 */

/**
 * A claim as a structured record, comparable across documents (compareClaims.js).
 * @typedef  {Object} ClaimRecord
 * @property {string} text
 * @property {RecordField} causal_strength
 * @property {RecordField} certainty
 * @property {RecordField} attribution
 * @property {RecordField} evidence
 * @property {RecordField} generic
 * @property {RecordField} present_tense
 * @property {RecordField} action_guiding
 * @property {RecordField} identification_strategy
 * @property {RecordField} population
 * @property {RecordField} exposure
 * @property {RecordField} comparator
 * @property {RecordField} outcome
 * @property {RecordField} timeframe
 * @property {RecordField} setting
 * @property {RecordField} genre
 */

/**
 * @typedef  {Object} Evidence
 * @property {'linked'|'unlinked'|'undetermined'} status
 * @property {EvidenceLink[]} links
 * @property {string[]} tried     the bases the claim's attribution routes through
 * @property {string}   [reason]  why it is unlinked or undetermined
 */

/**
 * Whose finding a sentence reports (engine/attribution.js). Measurement:
 * identical under every rubric.
 * @typedef  {Object} Attribution
 * @property {'own-current'|'own-prior'|'cited-other'|'quoted'|'unattributed'|'undetermined'} label
 * @property {'high'|'low'}  confidence
 * @property {{cue:string, span:string}[]} cues   the spans behind the label
 * @property {string}  [reason]    why the label is low confidence or undetermined
 * @property {string}  [buildsOn]  the prior work an own-current claim applies its method to
 * @property {string}  [speaker]   for quoted claims, when named
 * @property {?string} [section]   section kind from the nearest heading
 * @property {?number} [paragraph] paragraph index in the body
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
 * @property {{tier:string, hedges:string[], boosters:string[], attitude:string[]}} certainty
 * @property {'method'|'own-result'|'background'|'interpretation'|'recommendation'|'other'} function
 * @property {{register:'none'|'correlational'|'conditional-causal'|'direct-causal', cues:{root:string, strength:number}[], strength:number, conditioned:boolean}} register
 * @property {{strength:'none'|'weak'|'strong', cues:string[]}} recommendation
 *   certainty / function / register / recommendation are MEASUREMENT
 *   (engine/measure/): identical under every rubric.
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
 * @property {Object}    profile   provenance, design, genre (engine/profile/)
 * @property {{text:string, via:'reference-list'|'pattern'}[]} references
 *   reference entries dropped from the claims (no linking to claims)
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
