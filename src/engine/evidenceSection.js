// ─────────────────────────────────────────────────────────────────────────────
// buildEvidenceSection(result, rubric, { pages }) → the brief's evidence
// section, as docs/evidence-section.md lays it out. It answers four questions,
// in order: how much of this stands on anything (the bar), which claims to
// check first, where they are (pages, or twelfths of pasted text), and what the
// claims lean on (one row per kind of source).
//
// Read-only, after every judgment: it reads the claims as analyze() left them
// and the evidence map's grounds (evidenceMap.js), and changes nothing.
// analyze() never imports this file. The results page (EvidenceSection.jsx)
// and the brief recorder (checks/lib/brief.mjs) both call it.
//
// Every claim gets one of four verdicts, read from the engine, first match:
//   fact        Stated as fact, nothing cited   flag unsupported-assertion
//   overstates  Overstates its source           flag overconfident, or causal overreach
//   method      (counted, not shown)            a method statement
//   backed      Backed by a source              rung rank > 0
//   cautious    Said cautiously, nothing cited  rung rank 0
// "Needs checking" is fact plus overstates. Reason lines come from fixed
// templates, 12 words or fewer. Rankings and the quotable filter are
// PROVISIONAL — not ratified.
// ─────────────────────────────────────────────────────────────────────────────

import { buildEvidenceMap } from './evidenceMap.js'
import { termSpans } from './measure/certainty.js'
import { causalCueSpans, registerRank } from './measure/causalRegister.js'
import { pageLocator } from './pages.js'

/** The four verdicts, in the bar's order. */
export const VERDICTS = [
  { key: 'backed', label: 'Backed by a source', bar: ['backed by a source', 'backed by a source'], needs: false },
  { key: 'overstates', label: 'Overstates its source', bar: ['overstates its source', 'overstate their source'], needs: true },
  { key: 'fact', label: 'Stated as fact, nothing cited', bar: ['stated as fact, nothing cited', 'stated as fact, nothing cited'], needs: true },
  { key: 'cautious', label: 'Said cautiously, nothing cited', bar: ['said cautiously, nothing cited', 'said cautiously, nothing cited'], needs: false },
]
const NEEDS = new Set(VERDICTS.filter((v) => v.needs).map((v) => v.key))
export const GATED_SENTENCE = 'Written from experience, so no claim here owes a source.'
export const CHECK_FIRST = 6   // PROVISIONAL — not ratified (3 shown, then 3 more)
export const PARTS = 12        // twelfths of pasted text
export const SOURCE_ROWS = 8   // at most, "Nothing" last
export const REASON_WORDS = 12

// ── Verdicts ─────────────────────────────────────────────────────────────────
export function verdictOf(c) {
  if (c.flag === 'unsupported-assertion') return 'fact'
  if (c.flag === 'overconfident' || c.overreach) return 'overstates'
  if (c.function === 'method') return 'method'
  return c.rung.rank > 0 ? 'backed' : 'cautious'
}

// ── Short names: the source a reason line names ──────────────────────────────
const PLAIN_DESIGN = {
  rct: 'a randomized trial',
  'controlled-experiment': 'a controlled experiment',
  'quasi-experimental': 'a quasi-experiment',
  'cohort-longitudinal': 'a cohort study',
  'repeated-cross-sectional': 'repeated surveys',
  'cross-sectional': 'a one-time survey',
  'pre-post-uncontrolled': 'a before-and-after study',
  'case-qualitative': 'a case study',
  modeling: 'a model',
  'systematic-review': 'a systematic review',
  'narrative-review': 'a narrative review',
}
const host = (s) => String(s).replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0]
// "(Nanda, 2024)" → "Nanda, 2024"; "[12]" → "source [12]"; a URL → its host.
const markName = (mark) => {
  const m = String(mark || '').trim()
  if (/^https?:\/\/|^www\./.test(m)) return host(m)
  if (/^\[.*\]$/.test(m)) return `source ${m}`
  return m.startsWith('(') ? m.replace(/^\(\s*/, '').replace(/\s*\)$/, '') : m // "Gifford (2011)" stays whole
}

function shortSource(m, ctx) {
  switch (m.kind) {
    case 'reference':
    case 'unresolved': return markName(m.via?.mark || m.link?.anchor)
    case 'link':
      if (m.link?.basis === 'footnote') return `note ${String(m.targetId).split(':')[1]}`
      if (m.link?.basis === 'caption') return 'its source line'
      return host(m.targetSpan || m.targetLabel)
    case 'proximity': return markName(m.link?.anchor)
    case 'speaker': return m.targetLabel && m.targetLabel !== 'An unnamed speaker' ? m.targetLabel : 'a quoted speaker'
    case 'own': return 'its own study'
    case 'own-implied': return String(m.targetId).startsWith('figure:') ? m.targetLabel.replace(/ in the document$/, '') : ctx.ownWork
    case 'described-study': return 'the study it reports'
    case 'publisher': return 'its own earlier work'
    case 'keyword': return 'a kind of source it names'
    case 'unnamed': return 'research it never names'
    default: return null
  }
}

// ── Reason lines ─────────────────────────────────────────────────────────────
const words = (s) => s.trim().split(/\s+/).length
const fit = (line, fallback) => (words(line) <= REASON_WORDS ? line : fallback)

function overreachReason(c, short) {
  const ex = c.overreach.explanation
  const design = PLAIN_DESIGN[ex.design]
  if (registerRank(ex.causalRegister) > registerRank(ex.designCeiling.maxRegister)) {
    if (!design) return 'Claims a cause, but no study is reported.'
    return ex.designCeiling.maxRegister === 'conditional-causal'
      ? `States a cause outright; ${design} can only suggest one.`
      : `Claims a cause; ${design} can only show a link.`
  }
  if (short) return fit(`Turns ${short} into advice it can’t support.`, 'Turns its source into advice it can’t support.')
  return design ? `Gives advice ${design} can’t support.` : 'Gives advice, but no study is reported.'
}

/** One claim's reason line, from a template: 12 words or fewer. */
function reasonOf(c, m, verdict, ctx) {
  const short = shortSource(m, ctx)
  switch (verdict) {
    case 'fact':
      if (m.kind === 'unresolved' && short) return fit(`Cites ${short}, which isn’t in its references.`, 'Cites a source that isn’t in its references.')
      if (m.kind === 'proximity') return 'Stated as fact. The citation nearby isn’t tied to it.'
      if (c.certainty?.boosters?.length) return 'Stated as proven. Nothing is cited.'
      if (c.register?.register === 'direct-causal') return 'States a cause. Nothing is cited.'
      return 'Stated as fact. Nothing is cited.'
    case 'overstates':
      if (c.flag === 'overconfident') return fit(`Cites ${short || 'a source'}, but says more than it can show.`, 'Cites a source, but says more than it can show.')
      return overreachReason(c, short)
    case 'backed':
      if (m.kind === 'unresolved') return fit(`Backed by ${short}, which isn’t in its references.`, 'Backed by a source that isn’t in its references.')
      return fit(`Backed by ${short || 'a source'}.`, 'Backed by a source.')
    case 'cautious': {
      const hedge = (c.certainty?.hedges || []).find((h) => !/^not /.test(h))
      return hedge ? fit(`Said cautiously (“${hedge}”), so it stands without a source.`, 'Said cautiously, so it stands without a source.') : 'Said cautiously, so it stands without a source.'
    }
    default:
      return 'Describes its methods, so it isn’t judged.'
  }
}

// ── The words that make a claim firm: boosters, causal cues, and the advice
// itself when advice is what overstates ──────────────────────────────────────
function underlinesOf(c, verdict) {
  const text = c.text
  // Only the cue word: a causal pattern can take a preposition along ("effects on").
  const trim = ({ index, length }) => {
    const m = text.slice(index, index + length).match(/^((?:on|of|in|to|for|with|by|from|at|that)\s+)?(.*?)(\s+(?:on|of|in|to|for|with|by|from|at|that))?$/is)
    return m && m[2] ? { index: index + (m[1] || '').length, length: m[2].length } : { index, length }
  }
  const spans = [...termSpans(text, c.certainty?.boosters || [])]
  if (c.register && c.register.register !== 'none') spans.push(...causalCueSpans(text).map(trim))
  const ex = c.overreach?.explanation
  const advice = verdict === 'overstates' && ex && registerRank(ex.causalRegister) <= registerRank(ex.designCeiling.maxRegister)
  if (advice) {
    for (const cue of c.recommendation?.cues || []) {
      const i = text.toLowerCase().indexOf(cue.toLowerCase())
      if (i >= 0) spans.push({ index: i, length: cue.length })
    }
  }
  // Merge overlaps; keep separate words separate.
  const sorted = spans.filter((s) => s && s.length > 0).map((s) => [s.index, s.index + s.length]).sort((a, b) => a[0] - b[0])
  const out = []
  for (const [a, b] of sorted) {
    const last = out[out.length - 1]
    if (last && a <= last[1]) last[1] = Math.max(last[1], b)
    else out.push([a, b])
  }
  return out
}

// ── Quotable: one clean sentence a reader can take in at a glance. PDF text
// spliced across columns or pages is skipped for the ranked lists (it is still
// counted, mapped and listed in full). PROVISIONAL — not ratified. ──────────
const FUNCTION_WORD = 'The|A|An|This|These|Those|It|Its|In|On|For|By|As|We|Our|Some|Many|Most|When|While|With|From|And|But|Or|If|To|Of|At|There|Such|Their|They|However|Moreover|Furthermore|Additionally|Therefore|Thus'
const SPLICED = [
  /https?:\/\/|www\./i,                                 // a URL
  /[•▪●◦■□►]/,                                          // a bullet
  /\b\p{L}+- \p{Ll}/u,                                  // a word broken at a line end: "recog- nition"
  /\b(?:\p{Lu} ){3,}/u,                                 // letter-spaced heading: "I N D E X"
  new RegExp(`[a-z,;] (?:${FUNCTION_WORD})\\b(?! [A-Z])`), // a capitalized function word mid-sentence
  /\b\p{Ll}{2,}\p{Lu}\p{Ll}/u,                          // fused words: "decisionsAnd"
  /\b\d+(?:\.\d+)+\s+\p{Lu}.*\b\d+(?:\.\d+)+\s/u,       // a contents list: "1.1. Intro 1.2. …"
  /\s(?:sions?|tions?|ments?|ness|ings?|ally|ities|ity|ous|ences?|ances?|ated|ations?|ical|ogy)\b/i, // a word's end, cut off: "cohe- … sion"
  /\p{Ll}-\p{Lu}\p{Ll}/u,                               // a broken word running into the next column: "envi-Environment"
  /\b(?:Table|Figure|Fig\.|Image|Photo|Source)\s*\d*\s*:/, // a caption or credit mid-sentence
  /[?!]\s+\p{Ll}/u,                                     // another sentence's end, mid-sentence: "health? shape"
]
// Shape alone: one sentence of reasonable length that starts and ends as one.
function shapely(t) {
  if (t.length < 60 || t.length > 440) return false
  if (!/^["“(]?\p{Lu}/u.test(t) || !/[.!?]["”)]?$/.test(t)) return false
  const w = t.split(/\s+/)
  if (w.length < 8) return false
  return w.filter((x) => /^\p{Lu}/u.test(x)).length / w.length <= 0.35 // a title, not a sentence
}
// The document's own words, to recognize what a splice leaves behind.
export function vocabularyOf(texts) {
  const count = new Map()
  const lower = new Set()
  for (const t of texts) {
    for (const w of String(t).match(/\p{L}[\p{L}’'-]*/gu) || []) {
      const k = w.toLowerCase()
      count.set(k, (count.get(k) || 0) + 1)
      if (/^\p{Ll}/u.test(w)) lower.add(k)
    }
  }
  return { count, lower, words: [...count.keys()].filter((k) => k.length >= 8) }
}
// A lowercase word that is only the end of a longer word the document uses,
// found once, or far less often than the whole word: "envi- … ronmental"
// (7 times, against 118 "environmental").
const fragment = (w, vocab) => {
  const n = vocab.count.get(w) || 0
  if (w.length < 4 || !n) return false
  return vocab.words.some((k) => k.length >= w.length + 3 && k.endsWith(w)
    && (n === 1 || (w.length >= 7 && vocab.count.get(k) >= 10 * n)))
}
// A word found once that is a piece the document never uses as a word, run
// into one it does: "deter" + "challenges". Word-forming prefixes are not pieces.
const PREFIXES = new Set(['multi', 'neuro', 'socio', 'psycho', 'bio', 'eco', 'geo', 'inter', 'intra', 'trans', 'micro', 'macro', 'hyper', 'hypo', 'super', 'sub', 'pre', 'post', 'anti', 'counter', 'over', 'under', 'non', 'semi', 'self', 'cross', 'cardio', 'physio', 'photo', 'thermo', 'electro', 'mis', 'dis', 'out', 'mid', 'tele', 'auto', 'poly', 'mono', 'pseudo', 'proto', 'extra', 'ultra', 'infra'])
const fused = (w, vocab) => {
  if (w.length < 9 || vocab.count.get(w) !== 1) return false
  for (let i = 3; i <= w.length - 5; i++) {
    const a = w.slice(0, i)
    if (!vocab.count.has(a) && !PREFIXES.has(a) && vocab.count.has(w.slice(i))) return true
  }
  return false
}
/**
 * @param {string} text
 * @param {{ lower: Set<string>, count: Map<string, number>, words: string[] }} [vocab]
 *   the document's words (vocabularyOf): one it uses in lowercase, capitalized
 *   after a lowercase word ("stress Neurobiological"), is the start of another
 *   line spliced in, and a word's cut-off end gives a split word away
 */
export function quotable(text, vocab = vocabularyOf([])) {
  const t = String(text || '').trim()
  if (!shapely(t) || SPLICED.some((re) => re.test(t))) return false
  // Not a name ("of Public Health"): the capitalized word runs on into lowercase.
  for (const m of t.matchAll(/\p{Ll}[\p{L}’'-]*,?\s+(\p{Lu}\p{Ll}+)(?=\s+\p{Ll})/gu)) if (vocab.lower.has(m[1].toLowerCase())) return false
  for (const w of t.match(/(?<![\p{L}’'-])\p{Ll}+(?![\p{L}’'-])/gu) || []) if (fragment(w, vocab) || fused(w, vocab)) return false
  return true
}

// ── Where: a page of the PDF, or a twelfth of the text ───────────────────────
function placesOf(claims, pages) {
  if (pages && pages.length) {
    const locate = pageLocator(pages)
    let last = 1
    const page = claims.map((c) => { const p = locate(c.text).page ?? last; last = p; return p })
    return { unit: 'page', count: pages.length, of: page.map((p) => p - 1), label: (k) => `Page ${k + 1}` }
  }
  const para = []
  let last = 0
  for (const c of claims) { last = c.attribution?.paragraph ?? last; para.push(last) }
  const total = Math.max(0, ...para) + 1
  const count = Math.min(PARTS, total)
  return { unit: 'part', count, of: para.map((p) => Math.min(count - 1, Math.floor((p * count) / total))), label: (k) => `Part ${k + 1} of ${count}` }
}

// ── What the claims lean on: one row per kind of source ──────────────────────
function sourceLabels(ctx) {
  return {
    reference: ['Its reference list', 'a citation that matches an entry'],
    link: ['Links and notes', 'a URL, DOI, footnote or source line'],
    own: ['Its own study', 'its results, pointed to'],
    'own-implied': [`Its own ${ctx.ownNoun}`, ctx.ownSub],
    'described-study': ['The study it reports', 'named in the text, with no citation'],
    speaker: ['People it quotes', 'a named or unnamed speaker'],
    unresolved: ['Citations it never lists', '(Author, year) with no matching entry'],
    proximity: ['A citation nearby', 'in the same sentence, not tied to the claim'],
    publisher: ['Its own earlier work', 'its publisher’s own pages'],
    keyword: ['A kind of source, named', '“analysts”, “an independent survey”'],
    unnamed: ['“Research shows”', 'research it never names'],
    none: ['Nothing', 'no citation, link or named source'],
  }
}
// The rows' order, as the target sets it: what it cites, then sources it only
// names, then its own work, then research it never names, "Nothing" last.
const SOURCE_ORDER = ['reference', 'link', 'unresolved', 'proximity', 'speaker', 'described-study', 'keyword', 'own', 'own-implied', 'publisher', 'unnamed', 'none']

/**
 * @param {object} result   analyze() output
 * @param {object} rubric   the rubric analyze() ran under
 * @param {{ pages?: string[]|null, documentNoun?: string }} [options]
 */
export function buildEvidenceSection(result, rubric, options = {}) {
  const claims0 = result.claims || []
  const gated = (result.signals || []).some((s) => s.gate)
  if (gated) return { gated: true, sentence: GATED_SENTENCE, total: claims0.length }

  const map = buildEvidenceMap(result, rubric)
  const design = result.profile?.design?.design
  const inherited = !!result.profile?.design?.inherited
  const noun = rubric.documentNoun || 'document'
  const review = design === 'narrative-review' || design === 'systematic-review'
  const ctx = {
    ownWork: review ? 'its own review' : 'its own data',
    ownNoun: review ? 'review' : inherited ? 'figures' : 'data or figures',
    ownSub: review ? `the ${noun.split(' ').pop()}’s own reading of the field` : 'read as its own result, nothing pointed to',
  }

  const where = placesOf(claims0, options.pages)
  const vocab = vocabularyOf(claims0.map((c) => c.text))
  const claims = claims0.map((c, index) => {
    const m = map.claims[index]
    const verdict = verdictOf(c)
    const underline = NEEDS.has(verdict) ? underlinesOf(c, verdict) : []
    return {
      index,
      text: c.text,
      verdict,
      needs: NEEDS.has(verdict),
      reason: reasonOf(c, m, verdict, ctx),
      underline,
      kind: m.kind,
      place: where.of[index],
      quotable: quotable(c.text, vocab),
      shapely: shapely(String(c.text).trim()),
      firm: c.tier.weight,
      cues: underline.length,
      group: NEEDS.has(verdict) ? groupOf(c, m, verdict) : null,
    }
  })

  const counts = Object.fromEntries([...VERDICTS.map((v) => [v.key, 0]), ['method', 0]])
  for (const c of claims) counts[c.verdict]++
  const needs = claims.filter((c) => c.needs)

  // Check these first: quotable claims that need checking, taken in turn from
  // each kind of problem so the first three are not all alike; within a kind,
  // the firmest first (tier, then the words that make it firm), then the
  // shortest, then document order. With fewer than three quotable, sentences of
  // the right shape fill in.
  let ranked = rankNeeds(needs.filter((c) => c.quotable))
  if (ranked.length < 3) ranked = [...ranked, ...rankNeeds(needs.filter((c) => !c.quotable && c.shapely))]
  const checkFirst = ranked.slice(0, CHECK_FIRST).map((c) => c.index)
  const rankOf = new Map(ranked.map((c, i) => [c.index, i]))

  // Where they are.
  const places = Array.from({ length: where.count }, (_, k) => ({ key: k, label: where.label(k), claims: [], needs: 0 }))
  for (const c of claims) {
    if (c.verdict === 'method') continue
    places[c.place].claims.push(c.index)
    if (c.needs) places[c.place].needs++
  }
  for (const p of places) {
    const examples = p.claims.filter((i) => rankOf.has(i)).sort((a, b) => rankOf.get(a) - rankOf.get(b))
    p.example = examples[0] ?? null
  }
  const opensOnPlace = places.reduce((best, p) => (p.needs > best.needs ? p : best), places[0]).key

  // What they lean on.
  const labels = sourceLabels(ctx)
  const byKind = new Map()
  for (const c of claims) {
    if (c.verdict === 'method') continue
    if (!byKind.has(c.kind)) byKind.set(c.kind, [])
    byKind.get(c.kind).push(c)
  }
  let kinds = SOURCE_ORDER.filter((k) => byKind.has(k))
  const others = []
  if (kinds.length > SOURCE_ROWS) {
    // Keep the largest rows; gather the rest into one, still before "Nothing".
    const named = kinds.filter((k) => k !== 'none')
    const keep = new Set([...named].sort((a, b) => byKind.get(b).length - byKind.get(a).length).slice(0, SOURCE_ROWS - 2))
    for (const k of named) if (!keep.has(k)) others.push(k)
    kinds = kinds.filter((k) => !others.includes(k))
  }
  const rowOf = (key, label, sub, members) => {
    const n = (v) => members.filter((c) => c.verdict === v).length
    const quotables = members.filter((c) => c.quotable)
    const bad = quotables.filter((c) => c.needs).sort((a, b) => (rankOf.get(a.index) ?? 1e9) - (rankOf.get(b.index) ?? 1e9)).slice(0, 2)
    const good = quotables.filter((c) => !c.needs).sort((a, b) => b.firm - a.firm || a.text.length - b.text.length || a.index - b.index).slice(0, bad.length >= 2 ? 1 : 3 - bad.length)
    return {
      key, label, sub,
      claims: members.length,
      backed: n('backed'), overstates: n('overstates'), fact: n('fact'), cautious: n('cautious'),
      needs: members.filter((c) => c.needs).length,
      examples: [...bad, ...good].map((c) => c.index),
    }
  }
  const rows = []
  for (const k of kinds) {
    if (k === 'none' && others.length) rows.push(rowOf('other', 'Other sources', 'links, notes, quotes and the like', others.flatMap((o) => byKind.get(o))))
    rows.push(rowOf(k, labels[k][0], labels[k][1], byKind.get(k)))
  }
  if (others.length && !kinds.includes('none')) rows.push(rowOf('other', 'Other sources', 'links, notes, quotes and the like', others.flatMap((o) => byKind.get(o))))
  const opensOnRow = rows.length ? rows.reduce((best, r) => (r.needs > best.needs ? r : best), rows[0]).key : null

  return {
    gated: false,
    total: claims.length,
    counts,
    needs: needs.length,
    dek: dekOf(counts, claims.length),
    methods: methodsLine(counts.method),
    claims,
    checkFirst,
    allNeeds: needs.map((c) => c.index),
    where: { unit: where.unit, places, opensOn: opensOnPlace },
    sources: { rows, opensOn: opensOnRow },
  }
}

// The kind of problem a claim has, for taking the first claims in turn.
const GROUP_ORDER = ['proven', 'cause', 'overstates', 'unlisted', 'nearby', 'fact']
function groupOf(c, m, verdict) {
  if (verdict === 'overstates') return 'overstates'
  if (m.kind === 'unresolved') return 'unlisted'
  if (m.kind === 'proximity') return 'nearby'
  if (c.certainty?.boosters?.length) return 'proven'
  if (c.register?.register === 'direct-causal') return 'cause'
  return 'fact'
}
function rankNeeds(list) {
  const queues = GROUP_ORDER.map((g) => list.filter((c) => c.group === g)
    .sort((a, b) => b.firm - a.firm || b.cues - a.cues || a.text.length - b.text.length || a.index - b.index))
  const out = []
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) out.push(q.shift())
  return out
}

// The dek: the largest problem first, then the second.
function dekOf(counts, total) {
  const said = {
    fact: [(n) => `${n} of ${total} claims ${n === 1 ? 'is' : 'are'} stated as fact with nothing cited.`, (n) => `Another ${n} ${n === 1 ? 'is' : 'are'} stated as fact with nothing cited.`],
    overstates: [(n) => `${n} of ${total} claims ${n === 1 ? 'says more than the source it cites' : 'say more than the source they cite'}.`, (n) => `Another ${n} ${n === 1 ? 'says more than the source it cites' : 'say more than the source they cite'}.`],
  }
  const problems = ['fact', 'overstates'].filter((k) => counts[k] > 0).sort((a, b) => counts[b] - counts[a])
  if (!problems.length) return total === 1 ? 'Its one claim doesn’t need checking.' : `None of its ${total} claims needs checking.`
  return problems.map((k, i) => said[k][i === 0 ? 0 : 1](counts[k])).join(' ')
}

function methodsLine(n) {
  if (!n) return null
  return n === 1 ? '1 more sentence describes its methods and isn’t judged.' : `${n} more sentences describe its methods and aren’t judged.`
}
