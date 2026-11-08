// ─────────────────────────────────────────────────────────────────────────────
// Claim records (change set 5): every claim as a structured record that can be
// compared across documents — original finding, academic conclusion or press
// release, commercial restatement.
//
//   causal_strength          0–3, from the engine's causal register through the
//                            change set 1 mapping (PROVISIONAL — not ratified;
//                            each value says so)
//   certainty                the engine's certainty tier
//   attribution              change set 3 (read, not edited)
//   evidence                 change set 4 links (read, not edited)
//   generic, present_tense,  scope markers (lexicons/claim-record.js)
//   action_guiding
//   identification_strategy  what the document claims the study did
//   population, exposure,    human coding in POTATO: null, unresolved, until
//   comparator, outcome,     coded (gold records arrive from the research repo)
//   timeframe, setting
//   genre                    the document's stage: research | academic
//                            conclusion | press release | commercial
//
// Every field is { value, tier, span, status: 'resolved' | 'unresolved',
// reason? }: the label tier (predicted for the engine, gold for coded fields),
// and the span the value came from. Rubric-invariant; the analysis's flags and
// score never read a record.
// ─────────────────────────────────────────────────────────────────────────────

import { causalRegister } from './measure/causalRegister.js'
import { measureCertainty } from './measure/certainty.js'
import { recommendationStrength } from './measure/recommendation.js'
import {
  IDENTIFICATION_STRATEGIES, DESIGN_STRATEGY, RESULT_PRESENT, RESULT_PAST, QUANTIFIER, SAMPLE_REF, ACTION_GUIDING,
} from './lexicons/claim-record.js'

/** @typedef {import('./types.js').ClaimRecord} ClaimRecord */

// Engine causal register → causal strength 0–3: the change set 1 mapping
// (checks/lib/mapping.mjs REGISTER_STRENGTH; a check keeps the two equal).
// PROVISIONAL — not ratified.
export const CAUSAL_STRENGTH = { none: 0, correlational: 1, 'conditional-causal': 2, 'direct-causal': 3 }
export const CERTAINTY_RANK = { hedged: 1, measured: 2, assertive: 3, absolute: 4 }
export const SCOPE_MARKERS = ['generic', 'present_tense', 'action_guiding']
export const CODED_FIELDS = ['population', 'exposure', 'comparator', 'outcome', 'timeframe', 'setting']
export const RECORD_FIELDS = ['causal_strength', 'certainty', 'attribution', 'evidence', ...SCOPE_MARKERS, 'identification_strategy', ...CODED_FIELDS, 'genre']
export const RECORD_GENRES = ['research', 'academic conclusion', 'press release', 'commercial']

const STRATEGIES = IDENTIFICATION_STRATEGIES.map(([k, src]) => [k, new RegExp(src, 'i')])
const PRESENT = new RegExp(RESULT_PRESENT, 'i')
const PAST = new RegExp(RESULT_PAST, 'i')
const QUANT = new RegExp(QUANTIFIER, 'i')
const SAMPLE = new RegExp(SAMPLE_REF, 'i')
const ACTION = new RegExp(ACTION_GUIDING, 'i')

const resolved = (value, tier, span = null, extra = {}) => ({ value, tier, span: span ? String(span).slice(0, 160) : null, status: 'resolved', ...extra })
const unresolved = (reason) => ({ value: null, tier: null, span: null, status: 'unresolved', reason })
const hit = (re, text) => { const m = text.match(re); return m ? m[0] : null }

/** Scope markers on one sentence. */
export function scopeMarkers(text, recommendation = recommendationStrength(text)) {
  const present = hit(PRESENT, text)
  const past = hit(PAST, text)
  const presentTense = !!present && !(past && text.search(PAST) < text.search(PRESENT))
  const quant = hit(QUANT, text)
  const sample = hit(SAMPLE, text)
  const action = recommendation.strength !== 'none' ? recommendation.cues[0] || 'recommendation' : hit(ACTION, text)
  return {
    generic: resolved(presentTense && !quant && !sample, 'predicted', presentTense ? present : null, { ...(quant ? { bound: quant } : {}), ...(sample ? { sample } : {}) }),
    present_tense: resolved(presentTense, 'predicted', present),
    action_guiding: resolved(!!action, 'predicted', action),
  }
}

/** The strategy a sentence names, or, for the document's own study, the one its design names. */
export function identificationStrategy(text, { ownStudy = false, design = null } = {}) {
  for (const [k, re] of STRATEGIES) { const m = text.match(re); if (m) return resolved(k, 'predicted', m[0]) }
  if (ownStudy && design && DESIGN_STRATEGY[design.design]) return resolved(DESIGN_STRATEGY[design.design], 'predicted', design.evidence?.[0]?.span || design.design, { via: 'own-study design' })
  return unresolved('no identification strategy named in the claim or its own study')
}

/**
 * The document's stage, from the genre profile's roles: a press release by its
 * form or press-office speaker; commercial when a firm speaks or holds the
 * stake; research when a research speaker presents its own study (a journal
 * paper's discussion or conclusion is an academic conclusion). News and general
 * web are none of the four.
 * @param {{ genre: { roles: Record<string, ?{genre:string, kind:string}> }, provenance: { kind: string } }} profile
 * @param {{ section?: ?string }} [claim]
 */
export function documentGenre(profile, claim = {}) {
  const r = profile?.genre?.roles || {}
  const span = (role) => r[role] ? `${role}: ${r[role].genre} (${r[role].kind})` : null
  if (r.form?.kind === 'press-release' || profile?.provenance?.kind === 'academic-press-office') return resolved('press release', 'predicted', span('form') || 'speaker: academic press office')
  if (r.speaker?.genre === 'corporate') return resolved('commercial', 'predicted', span('speaker'))
  if (r.stake?.genre === 'corporate') return resolved('commercial', 'predicted', span('stake'))
  if (r.speaker?.genre === 'research') {
    const academic = profile.provenance.kind === 'peer-reviewed-journal'
    if (academic && claim.section === 'discussion') return resolved('academic conclusion', 'predicted', `${span('speaker')}; discussion / conclusion section`)
    return resolved('research', 'predicted', span('speaker'))
  }
  return unresolved(`the document is ${r.speaker?.genre || 'of unknown genre'}: none of research, academic conclusion, press release, commercial`)
}

/**
 * @param {{ text:string, register:{register:string, cues?:{root:string}[]}, certainty:{tier:string}, recommendation:{strength:string, cues:string[]},
 *   attribution?: import('./types.js').Attribution, evidence?: import('./types.js').Evidence, section?: ?string }} claim
 * @param {{ profile?: object, design?: object, genre?: object }} [doc]
 * @returns {ClaimRecord}
 */
export function buildClaimRecord(claim, doc = {}) {
  const reg = claim.register.register
  const a = claim.attribution
  const e = claim.evidence
  const ownStudy = !!e?.links?.some((l) => l.target?.kind === 'own-study') || a?.label === 'own-current'
  const record = {
    text: claim.text,
    causal_strength: resolved(CAUSAL_STRENGTH[reg], 'predicted', claim.register.cues?.[0]?.root || reg, { register: reg, mapping: 'provisional' }),
    certainty: resolved(claim.certainty.tier, 'predicted', null, { rank: CERTAINTY_RANK[claim.certainty.tier] }),
    attribution: !a ? unresolved('no attribution (sentence outside an analysis)')
      : a.label === 'undetermined' ? { ...unresolved(a.reason || 'undetermined'), value: 'undetermined' }
      : resolved(a.label, 'predicted', a.cues?.[0]?.span || null, { confidence: a.confidence }),
    evidence: !e ? unresolved('no evidence links (sentence outside an analysis)')
      : e.status === 'linked' ? resolved(e.links, 'predicted', e.links[0]?.anchor || null, { status: 'resolved', linkStatus: e.status })
      : { ...unresolved(e.reason || e.status), value: e.links, linkStatus: e.status },
    ...scopeMarkers(claim.text, claim.recommendation),
    identification_strategy: identificationStrategy(claim.text, { ownStudy, design: doc.design }),
    ...Object.fromEntries(CODED_FIELDS.map((f) => [f, unresolved('not coded (human coding in POTATO)')])),
    genre: doc.genre || (doc.profile ? documentGenre(doc.profile, claim) : unresolved('no document profile')),
  }
  return record
}

/**
 * A record for a bare sentence (a press-release or abstract line in a published
 * pair): measurement only; attribution, evidence and genre unresolved unless given.
 * @param {string} text
 * @param {{ genre?: string }} [opts]
 */
export function recordFromSentence(text, opts = {}) {
  return buildClaimRecord(
    { text, register: causalRegister(text), certainty: measureCertainty(text), recommendation: recommendationStrength(text) },
    { genre: opts.genre ? resolved(opts.genre, 'published-human', null) : unresolved('a sentence outside a document') },
  )
}
