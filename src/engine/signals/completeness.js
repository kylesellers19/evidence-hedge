// Reporting-completeness document signals (note severity), after STROBE (von
// Elm et al. 2007), AXIS (Downes et al. 2016), CHERRIES (Eysenbach 2004) and
// the AAPOR disclosure standards, plus three reporting patterns (Lazarus et al.
// 2015 spin; subgroup and covariate-set selection). They apply only to a
// document that reports its OWN empirical study — a press release or news
// story inherits the study and is not where its methods live.
import { spansFor } from './util.js'

/** @typedef {import('../types.js').Signal} Signal */

const QUANT = ['rct', 'controlled-experiment', 'quasi-experimental', 'cohort-longitudinal', 'repeated-cross-sectional', 'cross-sectional', 'pre-post-uncontrolled', 'modeling']
const SURVEY = ['repeated-cross-sectional', 'cross-sectional', 'cohort-longitudinal']
const EXPERIMENT = ['rct', 'controlled-experiment', 'quasi-experimental', 'cohort-longitudinal']
const EMPIRICAL = [...QUANT, 'case-qualitative']

// id → { label, standards, applies (designs), present (regex) }. PROVISIONAL — not ratified.
export const COMPLETENESS_CHECKS = [
  { id: 'confidence-intervals', label: 'confidence intervals or margin of error', standards: 'STROBE 16 · AXIS 11 · AAPOR', applies: QUANT,
    present: /\b(?:95\s?%\s?(?:CI|confidence intervals?)|confidence intervals?|CI\s*[:=]?\s*[[(]?-?\d|standard errors?|margin of (?:sampling )?error|±\s?\d)/i },
  { id: 'fieldwork-dates', label: 'fieldwork dates', standards: 'STROBE 5 · AAPOR · CHERRIES', applies: EMPIRICAL,
    present: /\b(?:conducted|fielded|collected|carried out|took place|surveyed|recruited|enrolled|interviewed)\b[^.]{0,80}\b(?:19|20)\d{2}\b|\b(?:in|during|from|between)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(?:\d{1,2},?\s+)?(?:19|20)\d{2}\b/i },
  { id: 'sample-source', label: 'sample source and recruitment', standards: 'STROBE 6 · AXIS 5 · CHERRIES', applies: EMPIRICAL,
    present: /\b(?:recruited (?:from|through|via|at)|sampled from|drawn from|sampling frame|probability[- ]based|convenience sample|opt-?in|randomly (?:sampled|selected)|recruitment|panel (?:of|members)|American Trends Panel)\b/i },
  { id: 'response-rate', label: 'response rate', standards: 'AXIS 13 · CHERRIES · AAPOR', applies: SURVEY,
    present: /\b(?:response|completion|participation|cooperation) rates?\b|\b\d+(?:\.\d+)?\s?% (?:of those (?:invited|contacted|sampled)|responded)\b/i },
  { id: 'weighting', label: 'weighting', standards: 'AAPOR · CHERRIES', applies: SURVEY,
    present: /\bweight(?:ed|ing|s)\b/i },
  { id: 'missing-data', label: 'missing data or sample-size accounting', standards: 'STROBE 12c, 13 · AXIS 14', applies: QUANT,
    present: /\bmissing (?:data|values|responses)\b|\bimput(?:ation|ed)\b|\blost to follow-up\b|\bdropped out\b|\bexcluded\b[^.]{0,60}\b(?:incomplete|missing|did not)\b|\bcomplete(?:d)? (?:responses|cases)\b/i },
  { id: 'preregistration', label: 'preregistration', standards: 'STROBE 4 · CONSORT', applies: EXPERIMENT,
    present: /\bpre-?regist(?:ered|ration)\b|\bregistered (?:at|with|on|in)\b|\bClinicalTrials\.gov\b|\btrial registration\b|\bAsPredicted\b|\bOSF\b/i },
  { id: 'data-availability', label: 'data availability', standards: 'STROBE 22 · AAPOR', applies: EMPIRICAL,
    present: /\bdata (?:are |is )?(?:publicly )?(?:available|availability)\b|\bavailable (?:up)?on (?:reasonable )?request\b|\bopen data\b|\bdata sharing\b|\bsupplement(?:al|ary) (?:data|materials?|information)\b|\btopline\b|\bdataset\b[^.]{0,40}\bavailable\b/i },
  { id: 'funding-conflicts', label: 'funding or conflicts statement', standards: 'STROBE 22 · AXIS 19, 20', applies: EMPIRICAL,
    present: /\bfund(?:ed|ing)\b|\bsupported by\b|\bgrants?\b|\bcompeting (?:financial )?interests?\b|\bconflicts? of interest\b|\bsponsor(?:ed|ship)?\b|\bprimary funder\b/i },
]

const ownStudy = (profile) => profile && !profile.design.inherited && EMPIRICAL.includes(profile.design.design)

// completeness-gaps — what an own-study report leaves out.
function completenessGaps(doc, claims, citations, posture, ctx = {}) {
  const profile = ctx.profile
  if (!ownStudy(profile)) return null
  const design = profile.design.design
  const missing = COMPLETENESS_CHECKS.filter((c) => c.applies.includes(design) && !c.present.test(doc))
  if (!missing.length) return null
  return {
    id: 'completeness-gaps',
    severity: 'note',
    completeness: true,
    summary: `For a ${design.replace(/-/g, ' ')} study, the report does not state: ${missing.map((m) => m.label).join('; ')}.`,
    evidence: missing.map((m) => `${m.label} — ${m.standards}`),
    count: missing.length,
  }
}

// equivalence-from-nonsignificance — "no significant difference, so equivalent" (Lazarus 2015 spin).
const EQUIVALENCE = [
  /\b(?:no|not|non)[- ](?:statistically\s+)?significant(?:ly)?\s+(?:\w+\s+){0,4}(?:difference|differ|effect|association|change|impact)[^.]{0,140}\b(?:therefore|thus|so|indicating|suggesting|showing|demonstrating|confirming|meaning)\b[^.]{0,80}\b(?:equivalent|the same|no (?:effect|difference|impact|harm)|safe|comparable|as effective|does not affect)\b/i,
  /\b(?:equivalent|as effective as|comparable to|no different from)\b[^.]{0,100}\b(?:p\s*[>=]\s*0?\.\d|not statistically significant|non-?significant)\b/i,
]
function equivalenceFromNonsignificance(doc, claims, citations, posture, ctx = {}) {
  if (!ownStudy(ctx.profile)) return null
  const spans = EQUIVALENCE.flatMap((re) => spansFor(doc, re))
  if (!spans.length) return null
  return { id: 'equivalence-from-nonsignificance', severity: 'note', completeness: true,
    summary: 'Treats a non-significant difference as evidence of no difference or equivalence — absence of evidence read as evidence of absence.',
    evidence: spans.slice(0, 2).map((s) => s.slice(0, 220)) }
}

// subgroup-selection — significance claimed in a subgroup while the overall comparison is not significant.
const SUBGROUP_SIG = /\b(?:among|in|for)\s+(?:the\s+)?(?:subgroup|women|men|younger|older|those (?:with|who)|participants (?:with|who)|high-\w+|low-\w+)\b[^.]{0,100}\bsignificant(?:ly)?\b/i
const OVERALL_NS = /\b(?:overall|whole sample|full sample|all participants)\b[^.]{0,80}\b(?:no|not)\s+(?:statistically\s+)?significant/i
function subgroupSelection(doc, claims, citations, posture, ctx = {}) {
  if (!ownStudy(ctx.profile)) return null
  if (!(SUBGROUP_SIG.test(doc) && OVERALL_NS.test(doc))) return null
  return { id: 'subgroup-selection', severity: 'note', completeness: true,
    summary: 'Reports a significant effect in a subgroup while the overall comparison is not significant — check whether the subgroup was prespecified.',
    evidence: [doc.match(SUBGROUP_SIG)[0].slice(0, 200), doc.match(OVERALL_NS)[0].slice(0, 200)] }
}

// covariate-inconsistency — different adjustment sets across analyses.
const ADJUSTED = /\badjust(?:ed|ing)\s+for\s+([^.;]{3,160})/gi
function covariateInconsistency(doc, claims, citations, posture, ctx = {}) {
  if (!ownStudy(ctx.profile)) return null
  const sets = [...doc.matchAll(ADJUSTED)].map((m) => new Set(m[1].toLowerCase().split(/,|\band\b|\bor\b/).map((w) => w.trim()).filter((w) => w.length > 2)))
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const a = sets[i], b = sets[j]
      const inter = [...a].filter((x) => b.has(x)).length
      const union = new Set([...a, ...b]).size
      if (a.size >= 2 && b.size >= 2 && union && inter / union < 0.5) {
        return { id: 'covariate-inconsistency', severity: 'note', completeness: true,
          summary: 'Analyses adjust for different covariate sets without saying why — the adjustment may have been chosen after seeing results.',
          evidence: [[...a].join(', ').slice(0, 160), [...b].join(', ').slice(0, 160)] }
      }
    }
  }
  return null
}

// self-disclaimed-causality — the document itself disclaims a causal reading.
// A note with zero weight: it never lowers or raises the score.
function selfDisclaimedCausality(doc, claims, citations, posture, ctx = {}) {
  const d = ctx.profile?.design
  if (!d?.selfDisclaimsCausality) return null
  return { id: 'self-disclaimed-causality', severity: 'note', informational: true,
    summary: 'The document disclaims a causal reading of its own results. Recorded only: a disclaimer does not offset causal claims made elsewhere.',
    evidence: d.disclaimerEvidence }
}

export const signals = {
  'completeness-gaps': completenessGaps,
  'equivalence-from-nonsignificance': equivalenceFromNonsignificance,
  'subgroup-selection': subgroupSelection,
  'covariate-inconsistency': covariateInconsistency,
  'self-disclaimed-causality': selfDisclaimedCausality,
}
