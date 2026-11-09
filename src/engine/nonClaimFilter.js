// ─────────────────────────────────────────────────────────────────────────────
// Non-claim filter (Phase-1 ratified rules, tiered).
//
//   DROP (hard exclusion, regardless of likelihood):
//     · disclosure/legal boilerplate (lexicon)
//     · bylines / datelines / metadata (regex + no predicate)
//     · contents lines: a run of dot leaders ("Overview ........ 3")
//     · nav / UI chrome (≤4 words + no finite verb + no terminal punctuation +
//       CTA lexicon) — GUARDED by the imperative-advice / YMYL lexicons so real
//       short advice survives
//     · captions and credits, copyright lines, signposting about the document
//       itself, calls to action (advice-guarded), verbless title lines
//       (engine cleanup, Nov. 2026; PROVISIONAL — not ratified)
//
//   DEMOTE (subtract from claimLikelihood, not drop):
//     · title-case headings (short + no terminal punct + majority-capitalized) —
//       EXEMPT under the journalism rubric (headlines are genuine claims)
//     · figure / table captions ("Figure 1: …")
//
//   EXCLUDED from v1: mission/values-statement dropping (too high a false-
//   exclusion risk on quantified pledges) — those flow through untouched.
//
// Every predicate is exported so each rule is independently testable.
// ─────────────────────────────────────────────────────────────────────────────

import { phraseRe, wordRe } from './signals/util.js'
import { BOILERPLATE } from './lexicons/boilerplate.js'
import { NAV_CTA } from './lexicons/nav-cta.js'
import { IMPERATIVE_ADVICE } from './lexicons/imperative-advice.js'
import { YMYL_TERMS } from './lexicons/ymyl.js'

// A permissive finite-verb probe for the nav-chrome rule (a true nav item has none).
// Shared with the reader's site-chrome line stripper (src/ingest/chromeLines.js).
export const FINITE_VERB =
  /\b(?:is|are|was|were|be|will|would|can|cannot|can't|does|do|did|has|have|had|shows?|proves?|makes?|found|reported|said|grew|rose|fell|reduced|increased|caused|leads?|means?|offers?|provides?)\b/i
const TERMINAL = /[.!?]["')]?$/

const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length
const anyPhrase = (text, list) => list.some((p) => phraseRe(p).test(text))

// ── DROP predicates ──────────────────────────────────────────────────────────
export function isBoilerplate(s) {
  return anyPhrase(s, BOILERPLATE)
}

export function isBylineOrMeta(s) {
  const t = s.trim()
  if (/^[Bb]y\s+[A-Z][a-z]+(?:\s+[A-Z][a-z.'-]+){0,2}\s*$/.test(t)) return true // "By Jane Doe"
  if (/\b\d+\s*min(?:ute)?s?\s+read\b/i.test(t)) return true                 // "5 min read"
  if (/^(?:posted|updated|published)\s+(?:on\s+)?/i.test(t)) return true
  if (/^share\s+(?:on|this)\b/i.test(t)) return true
  // Bare date lines.
  if (/^(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\s*$/i.test(t)) return true
  if (/^\d{4}-\d{2}-\d{2}\s*$/.test(t)) return true
  return false
}

// A table-of-contents line: dot leaders between an entry and its page number.
export function isContentsLine(s) {
  return /\.{5,}|(?:\. ){4,}\.|…{2,}/.test(s)
}

export function hasAdviceGuard(s) {
  return anyPhrase(s, IMPERATIVE_ADVICE) || YMYL_TERMS.some((term) => wordRe(term).test(s))
}

export function isNavChrome(s) {
  if (wordCount(s) > 4) return false
  if (FINITE_VERB.test(s)) return false
  if (TERMINAL.test(s.trim())) return false
  return anyPhrase(s, NAV_CTA)
}

// A caption or credit: it opens by naming what it labels, then a number or a
// separator ("Figure 3: …", "Table 2 – …", "Source: …", "Photo courtesy of …").
// It describes a figure; the claims it repeats are made, and judged, in the
// body. "Figure 2 shows that …" has no separator and stays a sentence.
const CAPTION_LEAD = /^(?:figure|fig\.?|table|exhibit|chart|graph|map|diagram|plate|image|photo(?:graph)?|rendering|illustration|infographic|source|credit|note)s?\s*(?:\d+[a-z]?(?:\.\d+)*|[IVX]{1,4})?\s*(?:[:|–—]|\s-\s|\.\s)/i
const CREDIT = /^(?:photo(?:graph)?s?|images?|renderings?|illustrations?)\s+(?:by|courtesy|credit|©)|\b(?:photo|image|rendering|illustration)s?\s+(?:courtesy\s+of|credit:?|©)\s/i
export function isCaption(s) {
  const t = s.trim()
  return CAPTION_LEAD.test(t) || (CREDIT.test(t) && wordCount(t) <= 30)
}

// A copyright line, wherever it falls on the page.
export function isCopyright(s) {
  return /©|\(c\)\s*(?:19|20)\d{2}|\bcopyright\s+(?:©\s*)?(?:19|20)\d{2}/i.test(s)
}

// Signposting: a sentence about the document itself, not about the world
// ("This report explores …", "In this issue, we …", "… are discussed below").
// It owes no evidence, so it is not weighed.
const DOC_NOUN = '(?:report|paper|study|survey|document|issue|edition|guide|white ?paper|brief|article|brochure|booklet|publication|section|chapter|appendix|toolkit|playbook|handbook|piece|post|newsletter|series|book|summary|poster)'
const SIGNPOSTS = [
  new RegExp(`^(?:this|the (?:following|present|current|next)) ${DOC_NOUN}\\b[^.]{0,60}?\\b(?:explores?|examines?|describes?|presents?|outlines?|provides?|offers?|summari[sz]es?|discusses?|reviews?|introduces?|highlights?|covers?|looks? at|sets? out|details?|focus(?:es)?|aims?|seeks?|intends?|is (?:organi[sz]ed|structured|divided|intended|designed|meant))\\b`, 'i'),
  new RegExp(`^in (?:this|the following|the next|each|the remainder of this) ${DOC_NOUN}s?\\b`, 'i'),
  /^(?:the following|below|above),?\s+(?:we|are|is|sections?|pages?|chapters?|table|figure)\b/i,
  /\b(?:are|is) (?:discussed|described|presented|shown|summari[sz]ed|outlined|detailed|explored|listed|illustrated)(?: in (?:more |further )?detail)? (?:below|above|in (?:the )?(?:following|next) (?:section|chapter|pages?)|in (?:section|chapter|appendix|figure|table|exhibit)\s*[\dA-Z])/i,
  /^(?:see|refer to) (?:figure|table|section|chapter|appendix|page|exhibit)\b/i,
  /^(?:read on|let['’]?s (?:take a look|explore|look|dive|begin)|we (?:begin|start|conclude|close|end) (?:by|with|this))\b/i,
]
export function isSignpost(s) {
  return SIGNPOSTS.some((re) => re.test(s.trim()))
}

// A call to action or an invitation: what the reader should do with the
// publisher (get in touch, visit, download, sign up), not a claim about the
// world. Short ones are nav chrome (isNavChrome); these run longer. Real
// advice survives through the advice guard.
const CALLS = [
  /^(?:to learn more|for more (?:information|details|insights?)|learn more|find out more|read more|download|visit|click|scan|subscribe|sign up|register|join us|get in touch|reach out|contact|call us|email us|e-mail us|follow us|let['’]?s talk|talk to us|speak (?:to|with) (?:us|our|one of)|ask us|connect with us|explore (?:our|more))\b/i,
  /^(?:please (?:contact|visit|reach|get in touch|call|email|let us know|take the time|feel free)|we (?:invite|encourage) you to|we welcome (?:further |your )?(?:inquir|question|feedback|comment|conversation))/i,
  /\b(?:contact|visit|email|e-mail|call|reach|talk to|speak with) (?:us|our (?:team|experts?|office|specialists?|people))\b/i,
  /\b(?:visit|see|go to|available (?:at|on))\s+(?:www\.|https?:\/\/|\S+\.(?:com|org|net|co)\b)/i,
  /^if you (?:have|would like|are interested|want|wish|need)\b[^.]{0,100}\b(?:contact|reach|email|call|visit|let us know|talk|get in touch)\b/i,
]
export function isCallToAction(s) {
  return CALLS.some((re) => re.test(s.trim()))
}

// A title or reference line with no verb: a subtitle after a colon, a
// publication's name, and nothing asserted ("The sunken billions: The economic
// justification for fisheries reform."). With closing punctuation it slips
// past isLabel; with a colon and no verb it is still a title.
const MORE_VERBS = /\b(?:suggests?|indicates?|reflects?|ensures?|delivers?|drives?|remains?|represents?|results?|causes?|requires?|allows?|helps?|needs?|saves?|costs?|grows?|rises?|falls?|became|become|becomes|continues?|expects?|predicts?|estimates?)\b/i
export function isTitleLine(s) {
  const t = s.trim()
  // A figure with a percentage or a unit is a finding, not a title.
  if (/\d\s*(?:%|percent|per cent|x\b|times\b|kwh|mwh|mw\b|tons?\b|tonnes?\b|\$)|\$\s*\d/i.test(t)) return false
  if (!/\S:\s+[A-Z“"‘']/.test(t) || wordCount(t) > 25 || FINITE_VERB.test(t) || MORE_VERBS.test(t)) return false
  // A title reads as one: most of its words capitalized, or a publication's
  // marks (a quoted title, a year, a link, "Retrieved"). "Rachael McCarrison:
  // Impactful benchmarking starts with …" is a person's statement, not a title.
  const words = t.split(/\s+/).filter((w) => /^[\p{L}“"‘']/u.test(w) && !/^(?:a|an|the|and|or|of|for|to|in|on|at|by|with|from|as|vs\.?)$/i.test(w))
  const capitalized = words.filter((w) => /^[“"‘']?\p{Lu}/u.test(w)).length
  return capitalized / Math.max(1, words.length) >= 0.6 || /[“"‘][^”"’]{6,}[”"’]|\b(?:19|20)\d{2}\b|https?:\/\/|www\.|\bretrieved\b/i.test(t)
}

// A chart or table row read as a sentence ("Average Max Min -22% -17% -27% …",
// a run of years, a price table): mostly numbers. A sentence that reports a
// figure has words around it. PROVISIONAL — not ratified.
export const DATA_ROW_MIN_NUMBERS = 5
export const DATA_ROW_SHARE = 0.4
export function isDataRow(s) {
  const tokens = s.trim().split(/\s+/).filter(Boolean)
  const numbers = tokens.filter((w) => /\d/.test(w)).length
  if (numbers < DATA_ROW_MIN_NUMBERS) return false
  const share = numbers / tokens.length
  return share >= 0.6 || (share >= DATA_ROW_SHARE && !FINITE_VERB.test(s) && !MORE_VERBS.test(s))
}

// ── DEMOTE predicates ────────────────────────────────────────────────────────
export function isTitleCaseHeading(s) {
  const t = s.trim()
  if (TERMINAL.test(t)) return false
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length === 0 || words.length > 10) return false
  const capitalized = words.filter((w) => /^[A-Z]/.test(w)).length
  return capitalized / words.length > 0.6
}

export function isFigureCaption(s) {
  return /^(?:figure|fig\.?|table|chart|exhibit)\s*\d+\b/i.test(s.trim())
}

// ── Combined tier decisions ──────────────────────────────────────────────────
export function isDropped(s) {
  return isBoilerplate(s) || isBylineOrMeta(s) || isContentsLine(s) || (isNavChrome(s) && !hasAdviceGuard(s)) ||
    isCaption(s) || isCopyright(s) || isSignpost(s) || (isCallToAction(s) && !hasAdviceGuard(s)) || isTitleLine(s) || isDataRow(s)
}

// Penalty subtracted from claimLikelihood; enough to sink a borderline heading
// below the extraction sensitivity threshold. PROVISIONAL.
export const DEMOTE_PENALTY = 0.2

export function demotionPenalty(s, rubricId) {
  let pen = 0
  if (isFigureCaption(s)) pen += DEMOTE_PENALTY
  if (isTitleCaseHeading(s) && rubricId !== 'journalism') pen += DEMOTE_PENALTY
  return pen
}

// Classify a sentence for auditing/measurement: which rule (if any) acted.
export function classifyNonClaim(s, rubricId) {
  if (isBoilerplate(s)) return { action: 'drop', rule: 'boilerplate' }
  if (isBylineOrMeta(s)) return { action: 'drop', rule: 'byline-meta' }
  if (isContentsLine(s)) return { action: 'drop', rule: 'contents-line' }
  if (isNavChrome(s) && !hasAdviceGuard(s)) return { action: 'drop', rule: 'nav-chrome' }
  if (isCaption(s)) return { action: 'drop', rule: 'caption' }
  if (isCopyright(s)) return { action: 'drop', rule: 'copyright' }
  if (isSignpost(s)) return { action: 'drop', rule: 'signpost' }
  if (isCallToAction(s) && !hasAdviceGuard(s)) return { action: 'drop', rule: 'call-to-action' }
  if (isTitleLine(s)) return { action: 'drop', rule: 'title-line' }
  if (isDataRow(s)) return { action: 'drop', rule: 'data-row' }
  if (isFigureCaption(s)) return { action: 'demote', rule: 'figure-caption' }
  if (isTitleCaseHeading(s) && rubricId !== 'journalism') return { action: 'demote', rule: 'title-heading' }
  return { action: 'keep', rule: null }
}
