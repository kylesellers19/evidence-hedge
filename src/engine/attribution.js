// ─────────────────────────────────────────────────────────────────────────────
// Attribution — whose finding a sentence reports. Rubric-invariant measurement.
//
//   own-current   the authors reporting their own data or analysis in this
//                 document ("we surveyed", "our analysis", "this study",
//                 "Pew Research Center surveyed"); routes to design detection
//   own-prior     the authors or publisher citing their own earlier work; the
//                 only label the self-citation count reads
//   cited-other   a finding attributed to another source (markers, "et al.",
//                 "according to X", "a study by X", a named organization other
//                 than the publisher with a research verb); unnamed appeals to
//                 other work ("research shows") are cited-other, low confidence
//   quoted        a direct quotation with a speech verb, or reported speech
//   unattributed  no source and no first-person method language
//   undetermined  cues conflict, or are missing where expected (a pronoun
//                 subject with no antecedent); recorded with a reason and never
//                 escalates a flag
//
// Each label carries its cue spans and a confidence (high | low). A claim that
// applies the authors' method to someone else's design or data (a replication)
// is own-current with `buildsOn` naming the prior work.
//
// Context: section (from the nearest heading line; a first-person claim in a
// literature review is low confidence) and paragraph (a pronoun subject, or an
// unnamed "the study" / "participants", takes the attribution of the previous
// attributed sentence in the same paragraph).
//
// Word lists: lexicons/attribution.js (PROVISIONAL — not ratified) and
// lexicons/unscientify_lexicon.json (UnScientify, BSD 3-Clause, notice kept).
// ─────────────────────────────────────────────────────────────────────────────

import LEX from './lexicons/unscientify_lexicon.json' with { type: 'json' }
import {
  RESEARCH_VERBS, OWN_NOUNS_EXTRA, THIS_STUDY_NOUNS, SAMPLE_REFERENCE, DEFINITE_STUDY, OWN_PRIOR, OWN_PRIOR_WEAK,
  ET_AL, ACCORDING_TO_NAMED, ACCORDING_TO_VAGUE, A_STUDY_BY, PUBLISHED_IN, RESEARCHERS_AT, NAMED_ORG, PRIOR_WORK,
  QUOTE, SPEECH_VERB, REPORTED_SPEECH, BUILDS_ON, PRONOUN_SUBJECT, SECTION_KINDS, HEADING_MAX_CHARS, PUBLISHER_FRONT_CHARS,
} from './lexicons/attribution.js'
import { escapeRe } from './signals/util.js'
import { SUPERSCRIPT_MARKER } from './lexicons/linkage.js'

/** @typedef {import('./types.js').Attribution} Attribution */

export const ATTRIBUTION_LABELS = ['own-current', 'own-prior', 'cited-other', 'quoted', 'unattributed', 'undetermined']

// ── Compiled cues ────────────────────────────────────────────────────────────
const plural = (w) => (/(?:sis)$/.test(w) ? w.replace(/sis$/, 'ses') : /[^aeiou]y$/.test(w) ? w.replace(/y$/, 'ies') : /(?:s|x|ch|sh)$/.test(w) ? w + 'es' : w + 's')
const forms = (lemmas) => [...new Set(lemmas.flatMap((w) => [w, plural(w)]))]
const alt = (list) => list.map((w) => (/[\\(]/.test(w) ? w : escapeRe(w).replace(/\\?\s+/g, '\\s+'))).join('|')

const VERB = `(?:${RESEARCH_VERBS.join('|')})`
const FIRST_PERSON_VERB = new RegExp(`\\b(?:[Ww]e|I)\\s+(?:[\\w-]+\\s+){0,2}?${VERB}\\b`)
const OWN_NOUNS = forms([...LEX.authorPossessiveNouns.lemmas, ...OWN_NOUNS_EXTRA])
const POSSESSIVE_OWN = new RegExp(`\\b(?:${LEX.authorPossessives.lower.join('|')})\\s+(?:[\\w-]+\\s+){0,2}?(?:${alt(OWN_NOUNS)})\\b`, 'i')
const CURRENT_STUDY = new RegExp(`\\b(?:the|this)\\s+(?:${LEX.currentStudyAdjectives.lower.join('|')})\\s+(?:${alt(forms(LEX.currentStudyNouns.lemmas))})\\b`, 'i')
const THIS_STUDY = new RegExp(`\\b(?:this|these)\\s+(?:${THIS_STUDY_NOUNS.join('|')})\\b`, 'i')
const AUTHORS_VERB = new RegExp(`\\bthe\\s+(?:${alt(forms(LEX.authorNoun.lemmas))})\\s+(?:[\\w-]+\\s+){0,1}?${VERB}\\b`, 'i')
const SAMPLE = new RegExp(SAMPLE_REFERENCE, 'i')
const DEFINITE = new RegExp(DEFINITE_STUDY, 'i')
const PRIOR_OWN = OWN_PRIOR.map((s) => new RegExp(s, 'i'))
const PRIOR_OWN_WEAK = new RegExp(OWN_PRIOR_WEAK, 'i')

const AUTHOR_YEAR = /\([A-Z][\p{L}.'’-]+(?:\s+(?:et al\.?|and|&)(?:\s+[A-Z][\p{L}.'’-]+)?)?,?\s*(?:19|20)\d{2}[a-z]?(?:[;,][^()]{0,120})?\)|\b[A-Z][\p{L}'’-]+(?:\s+(?:and|&)\s+[A-Z][\p{L}'’-]+)?\s+\((?:19|20)\d{2}[a-z]?\)/u
const NUMERIC = new RegExp(`${LEX.citationRegexes.patterns[0]}|\\[\\d+(?:\\s*[-,]\\s*\\d+)*\\]`)
// UnScientify's parenthesized numeric marker, kept to ranges and lists so "(52)" is not a citation.
const NUMERIC_PAREN = /\(\d{1,3}(?:\s*[–-]\s*\d{1,3}|(?:,\s*\d{1,3})+)\)/
const SUPERSCRIPT_ONE = new RegExp(SUPERSCRIPT_MARKER.source, 'u')
const ETAL = new RegExp(ET_AL, 'i')
const DOI = /\b10\.\d{4,}\/\S+|doi\.org\/\S+/i
const ACCORDING_NAMED = new RegExp(ACCORDING_TO_NAMED)
const ACCORDING_VAGUE = new RegExp(ACCORDING_TO_VAGUE, 'i')
const STUDY_BY = new RegExp(A_STUDY_BY)
const PUB_IN = new RegExp(PUBLISHED_IN)
const RESEARCHERS = new RegExp(RESEARCHERS_AT)
const ORG_VERB = new RegExp(`${NAMED_ORG}[^.;:]{0,60}?\\b${VERB}\\b`)
const PRIOR = PRIOR_WORK.map((s) => new RegExp(s, 'i'))
const QUOTED_RE = new RegExp(QUOTE)
const SPEECH = new RegExp(SPEECH_VERB, 'i')
const REPORTED = new RegExp(REPORTED_SPEECH)
const BUILDS = new RegExp(BUILDS_ON, 'i')
const PRONOUN = new RegExp(PRONOUN_SUBJECT)
const URL_RE = /https?:\/\/[^\s)]+/g

const first = (re, text) => { const m = text.match(re); return m ? { span: m[0].trim(), index: m.index } : null }
// "SMITH: …", "JANE SMITH: …", "Q: …": a speaker's name in capitals, then a
// colon. Labels that are not people (NOTE:, SOURCE:, STEP 2:) are not speakers.
const SPEAKER_LABEL = /^(?!(?:NOTE|NOTES|SOURCE|SOURCES|WARNING|CAUTION|TIP|KEY|SUMMARY|OBJECTIVES?|BACKGROUND|RESULTS?|METHODS?|CONCLUSIONS?|FIGURE|TABLE|STEP|PHASE|GOAL|OUTCOMES?|CHALLENGES?|SOLUTIONS?|PROBLEM|ISSUE|IMPACT|BENEFITS?|LOCATION|CLIENT|PROJECT|SCOPE|STATUS|DATE|UPDATE|NEW|EXAMPLE|DEFINITION|FINDINGS?|INSIGHTS?|TAKEAWAYS?|ACTION|OPPORTUNITY|RISK|PRIORITY)\b)((?:[A-Z][A-Z'’.-]+)(?:\s+[A-Z][A-Z'’.-]+){0,2}|Q|A):\s+\S/

// ── The publisher ────────────────────────────────────────────────────────────

/**
 * Names that identify the publisher: the source host's registrable label, and
 * any org token the provenance profile found that also appears in the front of
 * the body or in the evidence that decided the provenance kind (a name met only
 * later, and only in passing, is someone the document cites). "<Name> Research
 * Institute / Center" also yields "<Name>" ("Gensler research has found").
 * @param {{ org?: string[], publisherHost?: string, evidence?: {span:string}[] }} provenance
 * @param {string} body
 */
export function publisherNames(provenance, body = '') {
  const host = provenance?.publisherHost || ''
  const label = host ? host.split('.').slice(-2, -1)[0] : ''
  const front = (body || '').slice(0, PUBLISHER_FRONT_CHARS)
  const decided = (provenance?.evidence || []).map((e) => e.span || '').join(' \n ')
  const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const names = new Set()
  for (const t of provenance?.org || []) {
    const re = new RegExp(`\\b${escapeRe(t)}`, 'i')
    // With a link, the host decides: a name counts only when it matches the
    // host ("Pew Research Center" on pewresearch.org; not "Gensler" in a trade
    // magazine's story about Gensler). Without one, the front and the
    // provenance evidence decide.
    const ok = label ? squash(t).includes(squash(label)) || squash(label).includes(squash(t)) : re.test(front) || re.test(decided)
    if (ok) {
      names.add(t)
      const core = t.match(/^([A-Z][\w&'’-]{2,})\s+Research\s+(?:Institute|Center|Centre)$/)
      if (core) names.add(core[1])
    }
  }
  return [...names]
}

const namesPublisher = (text, names) => names.some((n) => new RegExp(`\\b${escapeRe(n)}`, 'i').test(text))
// An organization match that is the publisher: it names it, it is part of its
// name ("the Center" for Pew Research Center), or it is a bare institution noun
// ("the Center", "Institute researchers"), which reads as a back-reference.
const BARE_INSTITUTION = /^(?:the\s+)?(?:University|Institute|Center|Centre|Foundation|Association|Agency|Council|Bureau|Department|Group|Lab(?:oratory)?|School|College|Society|Commission|Office|Research)$/i
function isPublisherRef(org, names) {
  const o = (org || '').trim()
  return namesPublisher(o, names) || BARE_INSTITUTION.test(o) || names.some((n) => n.toLowerCase().endsWith(' ' + o.toLowerCase()))
}

// ── One sentence ─────────────────────────────────────────────────────────────

/**
 * Sentence-level cues and label, without paragraph carryover.
 * @param {string} text
 * @param {{ publisher?: string[], section?: string|null }} [ctx]
 * @returns {Attribution & { strength: 'strong'|'weak'|'none', needsAntecedent: boolean }}
 */
export function attributeSentence(text, ctx = {}) {
  const publisher = ctx.publisher || []
  const cues = []
  const add = (cue, hit) => { if (hit) cues.push({ cue, span: hit.span.slice(0, 120) }) }

  // Quotation and reported speech
  const quote = first(QUOTED_RE, text)
  const speech = quote && SPEECH.test(text)
  const reported = !quote && first(REPORTED, text)

  // Own: strong
  const fpv = first(FIRST_PERSON_VERB, text); add('first-person-verb', fpv)
  const poss = first(POSSESSIVE_OWN, text); add('possessive-own', poss)
  const cur = first(CURRENT_STUDY, text); add('current-study', cur)
  const thisStudy = first(THIS_STUDY, text); add('this-study', thisStudy)
  const authors = first(AUTHORS_VERB, text); add('authors-verb', authors)
  let pubVerb = null
  let pubPrior = null
  for (const n of publisher) {
    const name = escapeRe(n)
    pubPrior = pubPrior ||
      first(new RegExp(`\\b${name}(?:['’]s)?\\s+(?:research|studies|work|reports?|surveys?|data|analyses)\\s+(?:has|have)\\s+(?:long\\s+|consistently\\s+|previously\\s+|also\\s+)?${VERB}\\b`, 'i'), text) ||
      first(new RegExp(`\\b${name}['’]s\\s+(?:previous|prior|earlier|past|former)\\s+(?:work|research|studies|reports?|surveys?|analys[ie]s|publications?)\\b`, 'i'), text)
    const m = first(new RegExp(`\\b${name}\\b[^.;:]{0,60}?\\b${VERB}\\b`, 'i'), text)
    if (m && !pubVerb) pubVerb = m
  }
  // "the Center conducted", "Center researchers performed": the publisher by back-reference.
  const orgVerb = text.match(ORG_VERB)
  if (!pubVerb && orgVerb && isPublisherRef(orgVerb[1], publisher)) pubVerb = { span: orgVerb[0], index: orgVerb.index }
  if (pubPrior) pubVerb = null
  add('publisher-verb', pubVerb)
  const strongOwn = !!(fpv || poss || cur || thisStudy || authors || pubVerb)

  // Own: prior
  const priorHit = PRIOR_OWN.map((re) => first(re, text)).find(Boolean) || pubPrior
  add('own-prior', priorHit)
  const priorWeak = !priorHit && first(PRIOR_OWN_WEAK, text)
  add('own-prior-weak', priorWeak)
  // A citation target naming the publisher is the publisher's own earlier work.
  const ownTarget = publisher.length ? (text.match(URL_RE) || []).concat((text.match(AUTHOR_YEAR) || [])).find((t) => namesPublisher(t, publisher)) : null
  if (ownTarget) cues.push({ cue: 'target-names-publisher', span: ownTarget.slice(0, 120) })

  // Other: strong
  const ay = first(AUTHOR_YEAR, text); add('author-year', ay)
  // A superscript marker cites only where the document has a numbered reference
  // list; elsewhere it is a note marker (Pew's "jobs.¹").
  const num = first(NUMERIC, text) || first(NUMERIC_PAREN, text) || (ctx.superscriptMarkers ? first(SUPERSCRIPT_ONE, text) : null); add('numeric-marker', num)
  const etal = first(ETAL, text); add('et-al', etal)
  // A DOI in the front of the body is the document's own (its venue block).
  const doi = ctx.front ? null : first(DOI, text); add('doi', doi)
  const acc = first(ACCORDING_NAMED, text)
  const accOther = acc && !namesPublisher(text.slice(acc.index, acc.index + 80), publisher) ? acc : null
  add('according-to', accOther)
  const by = first(STUDY_BY, text); add('study-by', by)
  const pubIn = first(PUB_IN, text); add('published-in', pubIn)
  let named = null
  for (const re of [RESEARCHERS, ORG_VERB]) {
    const m = text.match(re)
    if (m && !isPublisherRef(m[1] || m[0], publisher)) { named = { span: m[0], index: m.index }; break }
  }
  add('named-source', named)
  const strongOther = !!(ay || num || etal || doi || accOther || by || pubIn || named)

  // Other: weak
  const vague = first(ACCORDING_VAGUE, text) || PRIOR.map((re) => first(re, text)).find(Boolean)
  add('unnamed-source', vague)

  // Own: weak (the document's sample, an unnamed "the study")
  const sample = first(SAMPLE, text); add('sample-reference', sample)
  const definite = first(DEFINITE, text); add('definite-study', definite)
  const pronoun = first(PRONOUN, text.trim()); add('pronoun-subject', pronoun)

  const out = (label, confidence, extra = {}) => ({
    label, confidence, cues, strength: extra.strength || 'none', needsAntecedent: extra.needsAntecedent || null,
    ...(extra.reason ? { reason: extra.reason } : {}),
    ...(extra.buildsOn ? { buildsOn: extra.buildsOn } : {}),
    ...(extra.speaker ? { speaker: extra.speaker } : {}),
  })

  // An interview transcript's speaker label ("BERNSTEIN: …", "Q: …"), or a
  // sentence inside a quotation that runs over several sentences (it opens on a
  // quotation mark, or closes on one it never opened): someone else's words.
  // PROVISIONAL — not ratified.
  const t = text.trim()
  const label = t.match(SPEAKER_LABEL)
  if (label) return out('quoted', 'high', { strength: 'strong', speaker: label[1] })
  if (!quote && (/^[“"]/.test(t) || (/[”"]$/.test(t) && !/[“"]/.test(t)))) return out('quoted', 'low', { strength: 'strong', speaker: speakerOf(text) })

  if ((quote && speech) || reported) {
    const speaker = speakerOf(text)
    // A quoted survey item put to the document's own respondents is the
    // document's own instrument, not someone's statement.
    if (!speaker && sample) return out('own-current', 'low', { strength: 'weak', reason: "a survey item put to the document's own respondents" })
    return out('quoted', quote && speech ? 'high' : 'low', { strength: 'strong', speaker })
  }
  if (priorHit || ownTarget) return out('own-prior', 'high', { strength: 'strong' })
  if (strongOwn && strongOther) {
    const builds = first(BUILDS, text)
    if (builds) {
      add('builds-on', builds)
      return out('own-current', 'high', { strength: 'strong', buildsOn: (ay || num || etal || doi || accOther || by || pubIn || named).span })
    }
    return out('undetermined', 'low', { strength: 'strong', reason: 'own-study and other-source cues in one sentence' })
  }
  if (strongOther) return out('cited-other', 'high', { strength: 'strong' })
  if (strongOwn) {
    const lit = ctx.section === 'literature-review' && (fpv || poss)
    if (lit) return out('own-current', 'low', { strength: 'strong', reason: 'first-person claim in a literature review' })
    if (vague) return out('own-current', 'low', { strength: 'strong', reason: 'own result set beside unnamed other work' })
    return out('own-current', 'high', { strength: 'strong' })
  }
  if (priorWeak) return out('own-prior', 'low', { strength: 'weak' })
  if (vague) return out('cited-other', 'low', { strength: 'weak', reason: 'unnamed source' })
  if (pronoun) return out('undetermined', 'low', { strength: 'weak', needsAntecedent: 'pronoun', reason: 'pronoun subject with no attributed antecedent in the paragraph' })
  if (definite && !sample) return out('own-current', 'low', { strength: 'weak', needsAntecedent: 'definite', reason: 'an unnamed study the document reports' })
  if (sample || definite) return out('own-current', 'low', { strength: 'weak', reason: "the document's own sample" })
  return out('unattributed', 'high')
}

// Cues that name the study a news story or release is about: a following
// "the study" / "the researchers" refers to it.
const NAMES_A_STUDY = new Set(['named-source', 'study-by', 'according-to', 'published-in'])
export const PRONOUN_REACH = 3 // PROVISIONAL — not ratified (sentences back a pronoun may reach)

function speakerOf(text) {
  const m = text.match(/([A-Z][\w.'’-]+(?:\s+[A-Z][\w.'’-]+){0,3})\s*(?:,[^,]{3,80},)?\s+(?:said|says|told|explained|added|noted|argued|wrote)\b/) ||
    text.match(/\b(?:said|says|according\s+to)\s+((?:Dr\.?\s+|Prof\.?\s+)?[A-Z][\w.'’-]+(?:\s+[A-Z][\w.'’-]+){0,3})/)
  return m ? m[1] : null
}

// ── Where each sentence sits ─────────────────────────────────────────────────

/**
 * The body's layout: the whitespace-collapsed text the sentence splitter works
 * on (`norm`), where each paragraph and line starts in it, and the heading lines
 * with their section kind. Shared with the evidence linker (captions, blocks).
 * @param {string} body
 */
export function documentLayout(body) {
  const raw = body || ''
  let norm = ''
  const paraStarts = [0]
  const lines = [] // { start, text }
  let lineStart = 0
  let i = 0
  while (i < raw.length) {
    if (/\s/.test(raw[i])) {
      let j = i
      let newlines = 0
      while (j < raw.length && /\s/.test(raw[j])) { if (raw[j] === '\n') newlines++; j++ }
      if (newlines >= 1) { lines.push({ start: lineStart, text: norm.slice(lineStart).trim() }); lineStart = norm.length + 1 }
      if (newlines >= 2) paraStarts.push(norm.length + 1)
      norm += ' '
      i = j
    } else { norm += raw[i]; i++ }
  }
  lines.push({ start: lineStart, text: norm.slice(lineStart).trim() })
  const headings = lines
    .filter((l) => l.text && l.text.length <= HEADING_MAX_CHARS)
    .map((l) => ({ start: l.start, text: l.text, kind: (SECTION_KINDS.find(([, re]) => re.test(l.text)) || [])[0] }))
    .filter((h) => h.kind)
  const paragraphAt = (at) => {
    let p = 0
    while (p + 1 < paraStarts.length && paraStarts[p + 1] <= at) p++
    return p
  }
  return { norm, paraStarts, lines, headings, paragraphAt }
}

/**
 * Locate sentences (in order) in the body: paragraph index, section kind from
 * the nearest heading line, and offset in the layout's collapsed text.
 * Sentences are substrings of that text (extractClaims' splitter), so they are
 * matched in order with a cursor.
 * @param {string} body
 * @param {string[]} sentences
 * @param {ReturnType<typeof documentLayout>} [layout]
 */
export function locateSentences(body, sentences, layout = documentLayout(body)) {
  const { norm, headings, paragraphAt } = layout
  let cursor = 0
  return sentences.map((s) => {
    const at = norm.indexOf(s, cursor)
    if (at < 0) return { paragraph: null, section: null, offset: null }
    cursor = at + s.length
    let section = null
    for (const h of headings) { if (h.start <= at) section = h.kind; else break }
    return { paragraph: paragraphAt(at), section, offset: at }
  })
}

// ── A document ───────────────────────────────────────────────────────────────

const ATTRIBUTED = new Set(['own-current', 'own-prior', 'cited-other', 'quoted'])

/**
 * Attribute every sentence of the body in order, with section context and
 * paragraph carryover: a pronoun subject ("They found") takes the attribution
 * of the previous attributed sentence in the same paragraph, within
 * PRONOUN_REACH sentences; an unnamed "the study" / "the researchers" takes it
 * only from the sentence just before, when that sentence named another study.
 * @param {string} body
 * @param {string[]} sentences  the body's sentences, in order
 * @param {{ publisher?: string[] }} [ctx]
 * @returns {Attribution[]}
 */
export function attributeSentences(body, sentences, ctx = {}, where = locateSentences(body, sentences)) {
  const out = []
  let antecedent = null // { index, paragraph, attribution }
  sentences.forEach((s, i) => {
    const { paragraph, section, offset } = where[i]
    const front = offset != null && offset < PUBLISHER_FRONT_CHARS
    const a = attributeSentence(s, { publisher: ctx.publisher, superscriptMarkers: ctx.superscriptMarkers, section, front })
    let result = a
    const sameParagraph = antecedent && paragraph != null && antecedent.paragraph === paragraph
    const reaches =
      (a.needsAntecedent === 'pronoun' && sameParagraph && i - antecedent.index <= PRONOUN_REACH) ||
      (a.needsAntecedent === 'definite' && sameParagraph && i - antecedent.index === 1 &&
        antecedent.attribution.label === 'cited-other' && antecedent.attribution.cues.some((c) => NAMES_A_STUDY.has(c.cue)))
    if (reaches) {
      const from = antecedent.attribution
      result = {
        label: from.label, confidence: 'low', cues: [...a.cues, { cue: 'carryover', span: from.cues[0]?.span || from.label }],
        strength: 'weak', needsAntecedent: null, reason: `carried over from the previous attributed sentence in the paragraph (${from.label})`,
        ...(from.speaker ? { speaker: from.speaker } : {}),
      }
    }
    if (ATTRIBUTED.has(result.label) && result.strength === 'strong') antecedent = { index: i, paragraph, attribution: result }
    const { strength, needsAntecedent, ...attribution } = result
    out.push({ ...attribution, section: section || null, paragraph })
  })
  return out
}

/**
 * Attribute the claims of an analysis. Claims are a subsequence of the body's
 * sentences, matched in order by text.
 * @param {string} body
 * @param {{ text: string }[]} claims
 * @param {string[]} sentences  splitSentences(body)
 * @param {{ publisher?: string[] }} ctx
 */
export function attributeClaims(body, claims, sentences, ctx) {
  const layout = documentLayout(body)
  const where = locateSentences(body, sentences, layout)
  const all = attributeSentences(body, sentences, ctx, where)
  let k = 0
  const located = claims.map((c) => {
    while (k < sentences.length && sentences[k] !== c.text) k++
    if (k >= sentences.length) return { attribution: { label: 'undetermined', confidence: 'low', cues: [], reason: 'claim not found among the body sentences', section: null, paragraph: null }, where: { paragraph: null, section: null, offset: null } }
    const out = { attribution: all[k], where: where[k] }
    k++
    return out
  })
  return { claims: located.map((x) => x.attribution), where: located.map((x) => x.where), sentences: all, layout }
}

// ── Self-citation: one counter for the profile and the signal ───────────────

/**
 * Self-citations are citation targets that name the publisher: reference
 * entries and links (the profile's pool), plus the targets of own-prior claims
 * (an author-year citation naming the publisher). An own-prior claim with no
 * target that names the publisher is reported, not counted. First-person
 * method language ("we surveyed") is own-current and never a citation.
 * @param {{ selfCitation: { matched:number, pool:number, targets?: string[] } }} provenance
 * @param {{ text:string, attribution: Attribution }[]} claims
 * @param {string[]} publisher
 */
export function selfCitationCounter(provenance, claims, publisher) {
  const base = provenance.selfCitation || { matched: 0, pool: 0, targets: [] }
  const targets = [...(base.targets || [])]
  let pool = base.pool
  const ownPrior = claims.filter((c) => c.attribution?.label === 'own-prior')
  const extra = []
  for (const c of ownPrior) {
    for (const t of c.text.match(new RegExp(AUTHOR_YEAR.source, 'gu')) || []) {
      if (namesPublisher(t, publisher) && !targets.includes(t)) { extra.push(t); pool++ }
    }
  }
  const matched = base.matched + extra.length
  return {
    matched,
    pool,
    independent: pool - matched,
    share: pool ? Math.round((matched / pool) * 100) / 100 : 0,
    targets: [...targets, ...extra],
    ownPriorClaims: ownPrior.length,
    ownPriorWithoutTarget: ownPrior.filter((c) => !c.attribution.cues.some((x) => x.cue === 'target-names-publisher')).length,
  }
}
