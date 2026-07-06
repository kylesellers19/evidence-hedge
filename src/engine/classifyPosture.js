// ─────────────────────────────────────────────────────────────────────────────
// classifyPosture(text, rubric) → { posture, confidence, evidence }
//
// Runs at branch time (per rubric; re-runs when the user overrides the rubric).
// Lexicon + structure heuristics only — no LLM. `evidence` is the array of
// matched signal descriptions + text spans, so every classification is auditable
// on the branch screen.
//
//   posture     ∈ rubric.postures
//   confidence  0–1 (1 for the single-posture research rubric)
//   evidence    [{ signal, span }]
// ─────────────────────────────────────────────────────────────────────────────

import { YMYL_TERMS } from './lexicons/ymyl.js'

/** @typedef {import('./types.js').RubricConfig} RubricConfig */

// ── match helpers ────────────────────────────────────────────────────────────
function spansFor(text, re) {
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
  const out = []
  let m
  while ((m = rx.exec(text)) !== null) {
    out.push(m[0].trim())
    if (m.index === rx.lastIndex) rx.lastIndex++
  }
  return out
}

// Score a set of {signal, re, weight} groups; collect evidence for matches.
function scoreGroups(text, groups) {
  let score = 0
  const evidence = []
  for (const g of groups) {
    const spans = spansFor(text, g.re)
    if (spans.length) {
      // cap per-signal contribution so one repeated phrase can't dominate
      score += g.weight * Math.min(spans.length, 3)
      evidence.push({ signal: g.signal, span: spans[0] })
    }
  }
  return { score, evidence }
}

const wordCount = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0)
const density = (text, re) => {
  const w = wordCount(text)
  return w ? spansFor(text, re).length / w : 0
}

function confidenceFrom(top, second) {
  if (top <= 0) return 0
  return Math.min(1, Math.round((top / (top + second + 1)) * 100) / 100)
}

// ── Corporate ────────────────────────────────────────────────────────────────
const CORP_RESEARCH_LIKE = [
  { signal: 'methodology vocabulary', re: /\b(our study|survey of|respondents?|the data shows?|methodology|sample size)\b/i, weight: 2 },
  { signal: 'sample-size pattern', re: /\bn\s*=\s*\d+|%\s*of respondents\b/i, weight: 3 },
  { signal: 'chart / table reference', re: /\b(figure|table|chart|exhibit)\s*\d+\b/i, weight: 2 },
]
const CORP_MARKETING = [
  { signal: 'call to action', re: /\b(contact us|learn more|get started|sign up|buy now|request a demo|try (it )?free|book a call)\b/i, weight: 3 },
  { signal: 'uncompared superlative', re: /\b(#1|best-in-class|world-class|unmatched|unrivaled|the best|industry-leading|revolutionary)\b/i, weight: 1 },
]
const CORP_THOUGHT = [
  { signal: 'first-person-plural opinion', re: /\b(we believe|in our view|we think|our view is|we see a)\b/i, weight: 2 },
  { signal: 'future-trend vocabulary', re: /\b(future of|the next (decade|era|generation)|emerging trend|paradigm shift|what's next)\b/i, weight: 2 },
]

function classifyCorporate(text) {
  const rl = scoreGroups(text, CORP_RESEARCH_LIKE)
  const mk = scoreGroups(text, CORP_MARKETING)
  const tl = scoreGroups(text, CORP_THOUGHT)

  // Structure nudges from density.
  const numeric = density(text, /\b\d[\d.,%]*\b/)
  const secondPerson = density(text, /\b(you|your)\b/i)
  if (numeric > 0.06) { rl.score += 2; rl.evidence.push({ signal: 'high numeric density', span: `${(numeric * 100).toFixed(1)}% of words` }) }
  if (numeric < 0.02) tl.score += 1
  if (secondPerson > 0.03) { mk.score += 2; mk.evidence.push({ signal: 'second-person density', span: `${(secondPerson * 100).toFixed(1)}% of words` }) }

  const ranked = [
    { posture: 'research-like', ...rl },
    { posture: 'marketing', ...mk },
    { posture: 'thought-leadership', ...tl },
  ].sort((a, b) => b.score - a.score)

  const [top, second] = ranked
  if (top.score === 0) return { posture: 'marketing', confidence: 0, evidence: [] }
  return { posture: top.posture, confidence: confidenceFrom(top.score, second.score), evidence: top.evidence }
}

// ── General ──────────────────────────────────────────────────────────────────
const GEN_EXPERIENTIAL = [
  { signal: 'anecdote framing', re: /\b(in my experience|when I|for me|I remember|personally|I've found)\b/i, weight: 3 },
  { signal: 'first-person narrative', re: /\bI (was|did|went|tried|found|felt|saw|had|started|learned)\b/i, weight: 2 },
]
const GEN_PRESCRIPTIVE = /\b(you should|you must|you need to|never|always|do not|don't|avoid|make sure to|be sure to)\b/i

function classifyGeneral(text) {
  const exp = scoreGroups(text, GEN_EXPERIENTIAL)
  const iDensity = density(text, /\b(I|my|me|myself)\b/)
  if (iDensity > 0.02) { exp.score += 1; exp.evidence.push({ signal: 'first-person-singular density', span: `${(iDensity * 100).toFixed(1)}% of words` }) }

  const prescriptive = spansFor(text, GEN_PRESCRIPTIVE)
  const ymyl = YMYL_TERMS.filter((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text))

  // Prescription + a consequential (YMYL) domain ⇒ authoritative, even inside an
  // otherwise experiential document.
  if (prescriptive.length > 0 && ymyl.length > 0) {
    return {
      posture: 'authoritative',
      confidence: Math.min(1, 0.6 + 0.1 * Math.min(prescriptive.length + ymyl.length, 4)),
      evidence: [
        { signal: 'prescriptive modal', span: prescriptive[0] },
        { signal: 'YMYL domain term', span: ymyl[0] },
      ],
    }
  }
  if (exp.score === 0) return { posture: 'experiential', confidence: 0, evidence: [] }
  return { posture: 'experiential', confidence: confidenceFrom(exp.score, 0), evidence: exp.evidence }
}

// ── Journalism ───────────────────────────────────────────────────────────────
const J_LABELS = [
  { re: /\b(opinion|editorial|op-ed)\b/i, posture: 'opinion', signal: 'opinion label' },
  { re: /\b(analysis)\b/i, posture: 'opinion', signal: 'analysis label' },
  { re: /\b(sponsored|paid post|advertorial|promoted)\b/i, posture: 'sponsored', signal: 'sponsored label' },
]
const J_ATTRIBUTION = [
  { signal: 'attribution verb', re: /\b(said|according to|told|stated|reported|spokesperson)\b/i, weight: 2 },
]
const J_FIRST_PERSON_ARG = [
  { signal: 'first-person argument', re: /\b(I argue|we argue|in my view|I believe|I think|my view)\b/i, weight: 2 },
]

function classifyJournalism(text) {
  // Explicit labels in headline/kicker position (first ~120 chars) win outright.
  const head = text.slice(0, 120)
  for (const l of J_LABELS) {
    const spans = spansFor(head, l.re)
    if (spans.length) return { posture: l.posture, confidence: 0.95, evidence: [{ signal: l.signal, span: spans[0] }] }
  }
  const news = scoreGroups(text, J_ATTRIBUTION)
  const opinion = scoreGroups(text, J_FIRST_PERSON_ARG)
  if (news.score > opinion.score && news.score > 0) {
    return { posture: 'news', confidence: confidenceFrom(news.score, opinion.score), evidence: news.evidence }
  }
  if (opinion.score > 0) {
    return { posture: 'opinion', confidence: confidenceFrom(opinion.score, news.score), evidence: opinion.evidence }
  }
  return { posture: 'unlabeled', confidence: 0, evidence: [] }
}

// ── dispatch ─────────────────────────────────────────────────────────────────
const CLASSIFIERS = {
  research: () => ({ posture: 'standard', confidence: 1, evidence: [] }),
  corporate: classifyCorporate,
  general: classifyGeneral,
  journalism: classifyJournalism,
}

/**
 * @param {string} text
 * @param {RubricConfig} rubric
 * @returns {{ posture:string, confidence:number, evidence:{signal:string, span:string}[] }}
 */
export function classifyPosture(text, rubric) {
  const fn = CLASSIFIERS[rubric?.id]
  const result = fn ? fn(text || '') : { posture: rubric?.defaultPosture, confidence: 0, evidence: [] }
  // Guard: never return a posture the rubric doesn't declare.
  if (!rubric?.postures?.includes(result.posture)) {
    return { posture: rubric.defaultPosture, confidence: 0, evidence: result.evidence || [] }
  }
  return result
}
