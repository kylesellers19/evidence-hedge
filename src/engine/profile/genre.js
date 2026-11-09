// ─────────────────────────────────────────────────────────────────────────────
// profileGenre(body, { sourceUrl, provenance, design }) → the genres a document mixes
//
// A document is read on four roles, each filled by at most one genre
// (research | corporate | journalism | general):
//   speaker   who publishes it — the provenance kind's genre
//   form      what the text presents itself as: sponsored content, a press
//             release, a research paper, reporting or a column, a research-
//             style report, marketing, a blog post
//   stake     whose interest the evidence serves when the speaker does not
//             announce it: a firm that supplies most of a story's attributions,
//             or an advocacy mission or industry membership behind a
//             nonprofit's (or an unknown publisher's) report (corporate)
//   evidence  what study stands behind it — the document's own or one it
//             describes (research), from profile/design.js
//   components  the distinct genres, in role order. One genre is a single-genre
//               document; two or more is a hybrid (rubrics/hybrids.js decides
//               how it is judged).
//
// Each role: { genre, kind, evidence: [{ signal, span }] }, or null when
// nothing fills it. A weak form (marketing calls to action, reporting without a
// byline) counts only when nobody known is speaking, so site chrome on a
// journal or news page never makes a hybrid. Rubric-invariant.
// ─────────────────────────────────────────────────────────────────────────────

import {
  GENRE_MARKERS, GENRE_MIN, BYLINE, BYLINE_CHARS, SPONSORSHIP, BLOG_PATH, BLOG_TEXT,
  ADVOCACY_CUES, ADVOCACY_MIN, NON_ADVOCACY, ATTRIBUTION_PATTERNS, SOURCE_STOPWORDS,
  SOURCE_MIN_COUNT, SOURCE_MIN_SHARE, FIRM_NEAR,
} from '../lexicons/genre-form.js'
import { PUBLISHER_HOSTS, PATH_GENRES } from '../lexicons/publishers.js'
import { pressReleaseScore, researchLikeRegister, PRESS_MIN } from '../classifyPosture.js'
import { hostOf } from './provenance.js'

export const GENRES = ['research', 'corporate', 'journalism', 'general']
export const ROLES = ['speaker', 'form', 'stake', 'evidence']

// Who is speaking → genre. An unknown speaker fills no role. PROVISIONAL — not ratified.
export const SPEAKER_GENRE = {
  'firm-vendor': 'corporate',
  'academic-press-office': 'corporate',
  'news-outlet': 'journalism',
  'trade-press': 'journalism',
  'peer-reviewed-journal': 'research',
  government: 'research',
  'nonprofit-research': 'research',
  individual: 'general',
}

// Form → genre. `weak` forms count only when the speaker is unknown or an individual.
export const FORM_GENRE = {
  sponsored: 'corporate',
  'press-release': 'corporate',
  'research-paper': 'research',
  reporting: 'journalism',
  column: 'journalism',
  'research-report': 'research',
  marketing: 'corporate',
  blog: 'general',
}

const markers = (text, list) => list.map((re) => text.match(re)).filter(Boolean).map((m) => m[0].trim().slice(0, 80))
const pathOf = (url) => { try { return new URL(url).pathname } catch { return '' } }

// The first form that holds, in this order: a paid placement or a release
// outranks the register it borrows; IMRaD structure outranks a byline; a byline
// outranks research vocabulary (a story about a survey is still a story).
function readForm(body, { sourceUrl, speaker }) {
  const anonymous = !speaker || speaker === 'general'
  const path = pathOf(sourceUrl)
  const sponsored = body.match(SPONSORSHIP)
  if (sponsored) return { kind: 'sponsored', evidence: [{ signal: 'sponsorship cue', span: sponsored[0] }] }

  const press = pressReleaseScore(body)
  const pressPath = PATH_GENRES.find(([re, g]) => g === 'press-release' && re.test(path))
  const pressMarks = markers(body, GENRE_MARKERS.press)
  if (press.score >= PRESS_MIN || pressPath || pressMarks.length >= GENRE_MIN) {
    const evidence = press.evidence.map((e) => ({ signal: e.signal, span: e.span }))
    if (pressPath) evidence.unshift({ signal: 'press-release path', span: path })
    return { kind: 'press-release', evidence: evidence.length ? evidence : pressMarks.map((span) => ({ signal: 'press-release marker', span })) }
  }

  const research = markers(body, GENRE_MARKERS.research)
  if (research.length >= GENRE_MIN) return { kind: 'research-paper', evidence: research.slice(0, 4).map((span) => ({ signal: 'research structure', span })) }

  // A newsroom's own form needs no byline: it adds no genre the speaker lacks.
  const journalism = markers(body, GENRE_MARKERS.journalism)
  const byline = body.slice(0, BYLINE_CHARS).match(BYLINE)
  if (journalism.length >= GENRE_MIN && (byline || anonymous || speaker === 'journalism')) {
    return { kind: 'reporting', evidence: [...(byline ? [{ signal: 'byline', span: byline[0] }] : []), ...journalism.slice(0, 3).map((span) => ({ signal: 'reporting marker', span }))] }
  }
  const columnPath = PATH_GENRES.find(([re, g]) => g === 'opinion' && re.test(path))
  if (speaker === 'journalism' && columnPath) return { kind: 'column', evidence: [{ signal: 'column path', span: path }] }

  if (researchLikeRegister(body)) return { kind: 'research-report', evidence: [{ signal: 'research register', span: (body.match(/\b(?:survey of|respondents?|methodology|sample size|n\s*=\s*\d+)[^.]{0,60}/i) || [''])[0] }] }

  const marketing = markers(body, GENRE_MARKERS.marketing)
  if ((anonymous || speaker === 'corporate') && marketing.length >= GENRE_MARKERS.marketing.length) {
    return { kind: 'marketing', evidence: marketing.map((span) => ({ signal: 'marketing cue', span })) }
  }

  const blog = BLOG_PATH.test(path) ? { signal: 'blog path', span: path } : (body.match(BLOG_TEXT) ? { signal: 'posted-by line', span: body.match(BLOG_TEXT)[0] } : null)
  if (blog) return { kind: 'blog', evidence: [blog] }
  return null
}

const MONTHS = /^(?:January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/
const sentencesOf = (t) => t.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)
const ATTRIBUTION_ANY = new RegExp(ATTRIBUTION_PATTERNS.map((re) => re.source).join('|'))

// The source most attribution sentences name, and whether it is a firm.
export function dominantSource(body, { sourceUrl = '' } = {}) {
  const attributed = sentencesOf(body || '').filter((s) => ATTRIBUTION_ANY.test(s))
  if (attributed.length < SOURCE_MIN_COUNT) return null
  const counts = new Map()
  for (const s of attributed) {
    const tokens = new Set((s.match(/\b[A-Z][\w&-]{2,}/g) || []).map((t) => t.replace(/[’']s$/, '')).filter((t) => !SOURCE_STOPWORDS.has(t) && !MONTHS.test(t)))
    for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1)
  }
  const [token, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || []
  if (!token || count < SOURCE_MIN_COUNT) return null
  const share = Math.round((count / attributed.length) * 100) / 100
  if (share < SOURCE_MIN_SHARE) return null
  const label = token.toLowerCase()
  const firmHost = Object.entries(PUBLISHER_HOSTS).some(([h, k]) => k === 'firm-vendor' && label.length >= 3 && h.split('.')[0].startsWith(label))
  const firmText = body.match(FIRM_NEAR(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  const ownHost = hostOf(sourceUrl).split('.').includes(label)
  return {
    token, count, of: attributed.length, share,
    firm: !ownHost && (firmHost || !!firmText),
    evidence: [
      { signal: 'attribution share', span: `${token} in ${count} of ${attributed.length} attributing sentences` },
      ...(firmText ? [{ signal: 'named as a firm', span: firmText[0].slice(0, 100) }] : firmHost ? [{ signal: 'firm host', span: `${label} — listed publisher host` }] : []),
      ...attributed.filter((s) => s.includes(token)).slice(0, 2).map((s) => ({ signal: 'attribution', span: s.slice(0, 160) })),
    ],
  }
}

// Advocacy cues count only for publishers whose kind leaves their interest open:
// a journal article or a government report that discusses advocacy is not one.
const ADVOCACY_KINDS = new Set(['nonprofit-research', 'individual', 'unknown'])

function readStake(body, { speaker, kind, sourceUrl }) {
  // A firm's or press office's own interest is announced by who it is.
  if (speaker === 'corporate') return null
  if (speaker === 'journalism' || speaker === 'general' || !speaker) {
    const src = dominantSource(body, { sourceUrl })
    if (src?.firm) return { kind: 'firm-source', source: src.token, share: src.share, evidence: src.evidence }
  }
  if (ADVOCACY_KINDS.has(kind || 'unknown')) {
    if (NON_ADVOCACY.test(body)) return null
    const cues = ADVOCACY_CUES.map((re) => body.match(re)).filter(Boolean)
    if (cues.length >= ADVOCACY_MIN) return { kind: 'advocacy', evidence: cues.slice(0, 3).map((m) => ({ signal: 'advocacy or membership cue', span: m[0] })) }
  }
  return null
}

/**
 * @param {string} body  document text without its reference list
 * @param {{ sourceUrl?: string, provenance: { kind: string, evidence: {signal:string, span:string}[] }, design: { design: string, inherited: boolean, evidence: {signal:string, span:string}[] } }} options
 */
export function profileGenre(body, { sourceUrl = '', provenance, design }) {
  const text = body || ''
  const speakerGenre = SPEAKER_GENRE[provenance?.kind] || null
  const roles = {
    speaker: speakerGenre ? { genre: speakerGenre, kind: provenance.kind, evidence: provenance.evidence.slice(0, 2) } : null,
    form: null,
    stake: null,
    evidence: null,
  }
  const form = readForm(text, { sourceUrl, speaker: speakerGenre })
  if (form) roles.form = { genre: FORM_GENRE[form.kind], ...form }
  // With no link, the web address the document gives as its own stands in (profile/provenance.js).
  const ownUrl = provenance?.publisherHost ? `https://${provenance.publisherHost}/` : ''
  const stake = readStake(text, { speaker: speakerGenre, kind: provenance?.kind, sourceUrl: sourceUrl || ownUrl })
  if (stake) roles.stake = { genre: 'corporate', ...stake }
  if (design && design.design !== 'none-reported') {
    roles.evidence = { genre: 'research', kind: design.inherited ? 'inherited' : 'own', design: design.design, evidence: design.evidence.slice(0, 2) }
  }
  const components = []
  for (const r of ROLES) if (roles[r] && !components.includes(roles[r].genre)) components.push(roles[r].genre)
  return { roles, components, hybrid: components.length > 1 }
}
