// ─────────────────────────────────────────────────────────────────────────────
// profileProvenance(body, { sourceUrl, references, text }) → who is speaking
//
//   kind: peer-reviewed-journal | academic-press-office | government |
//         nonprofit-research | firm-vendor | news-outlet | trade-press |
//         individual | unknown
//   evidence: [{ signal, span }]   every input that moved the decision
//   publisherHost, org             for own-site URLs and self-citation share
//   selfCitationShare              share of references + claim URLs that name
//                                  the publisher's own organization or domain
//
// Order of evidence: (1) the document's OWN venue block — DOI, journal line,
// received/accepted dates in the body, never DOIs inside the reference list;
// (2) the link's host, or with no link the web address the document gives as
// its own (ownHost, read on the whole text); (3) text cues, never read in a
// reference entry. Rubric-invariant. AACODS grounds the criterion (rubric
// provenance footer).
// ─────────────────────────────────────────────────────────────────────────────

import { PUBLISHER_HOSTS, HOST_SUFFIX_KINDS } from '../lexicons/publishers.js'
import { spansFor } from '../signals/util.js'
import { isReferenceEntry } from '../measure/segment.js'

export const PROVENANCE_KINDS = ['peer-reviewed-journal', 'academic-press-office', 'government', 'nonprofit-research', 'firm-vendor', 'news-outlet', 'trade-press', 'individual', 'unknown']
export const VENUE_MIN = 3 // PROVISIONAL — not ratified (venue-block points for a journal)
export const TEXT_MIN = 3  // PROVISIONAL — not ratified (text-cue points to name a kind)

export function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, '') } catch { return '' }
}
function hostKind(host) {
  if (!host) return null
  const parts = host.split('.')
  for (let i = 0; i < parts.length - 1; i++) {
    const k = PUBLISHER_HOSTS[parts.slice(i).join('.')]
    if (k) return k
  }
  for (const [re, kind] of HOST_SUFFIX_KINDS) if (re.test(host)) return kind
  return null
}

// With no link, the document's own web address stands in for the link's host,
// so an uploaded file is read like its link: a domain or email domain on its
// first or last OWN_EDGE_CHARS characters (cover, back cover, contacts) whose
// name is the copyright holder's, else the email domain most used there.
// Social, webmail and link-shortener hosts never count. PROVISIONAL — not ratified.
export const OWN_EDGE_CHARS = 3000
const OWN_TLD = '(?:com|org|net|edu|gov|io|co|ai|us|uk|ca|au|nz|ie|de|fr|nl|se|dk|no|fi|es|it|ch|at|be|sg|hk|cn|jp|in|ae|sa|qa|za|br|mx|eu|info|biz|global|design|studio|group|build|engineering|construction|consulting|archi|world)'
const OWN_DOMAIN = new RegExp(`(?<![@\\w.-])(?:https?:\\/\\/)?(?:www\\.)?((?:[a-z0-9][a-z0-9-]*\\.)+${OWN_TLD})\\b(?![.\\w-]*@)`, 'gi')
const OWN_EMAIL = new RegExp(`[\\w.+-]+@((?:[a-z0-9][a-z0-9-]*\\.)+${OWN_TLD})\\b`, 'gi')
const NOT_OWN = /^(?:(?:dx\.)?doi\.org|linkedin\.com|twitter\.com|x\.com|facebook\.com|instagram\.com|youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|flickr\.com|pinterest\.com|medium\.com|issuu\.com|bit\.ly|ow\.ly|tinyurl\.com|gmail\.com|outlook\.com|hotmail\.com|yahoo\.com|creativecommons\.org|wikipedia\.org)$/

// The registrable name of a host: "gensler" for www.gensler.com, "arup" for arup.co.uk.
function hostLabel(host) {
  const p = host.split('.')
  return (p.length >= 3 && /^(?:co|com|org|ac|gov|net)$/.test(p[p.length - 2]) ? p[p.length - 3] : p[p.length - 2]) || p[0]
}

// "© 2024 Turner Construction Company" → turner, turnerconstruction, …
function copyrightNames(body) {
  const names = new Set()
  for (const m of body.matchAll(/(?:©|\(c\)|copyright)\s*(?:©\s*)?(?:(?:19|20)\d{2}\s*[,–-]?\s*)?([^\n]{0,80})/gi)) {
    const words = m[1].toLowerCase().replace(/&/g, ' and ').split(/[^a-z0-9]+/).filter((w) => w && !/^(?:19|20)\d{2}$/.test(w))
    if (words[0] === 'the') words.shift()
    for (const ws of [words, words.filter((w) => w !== 'and')]) for (let k = 1; k <= Math.min(4, ws.length); k++) names.add(ws.slice(0, k).join(''))
  }
  return names
}

export function ownHost(body) {
  const text = body || ''
  const edges = text.length > 2 * OWN_EDGE_CHARS ? [text.slice(0, OWN_EDGE_CHARS), text.slice(-OWN_EDGE_CHARS)] : [text]
  const all = new Map()
  const emails = new Map()
  const tally = (map, d) => { d = d.toLowerCase().replace(/^www\./, ''); if (!NOT_OWN.test(d)) map.set(d, (map.get(d) || 0) + 1) }
  for (const part of edges) {
    for (const m of part.matchAll(OWN_DOMAIN)) tally(all, m[1])
    for (const m of part.matchAll(OWN_EMAIL)) { tally(all, m[1]); tally(emails, m[1]) }
  }
  const names = copyrightNames(text)
  const ranked = (map) => [...map].sort((a, b) => b[1] - a[1]).map(([d]) => d)
  const holder = ranked(all).find((d) => hostLabel(d).length >= 3 && names.has(hostLabel(d).replace(/-/g, '')))
  if (holder) return { host: holder, via: 'copyright line' }
  const email = ranked(emails)[0]
  return email ? { host: email, via: 'contact email' } : null
}

// The document's own journal block (front of the body, or its dates anywhere in the body).
const VENUE = [
  { signal: 'own DOI line', re: /\bdoi:?\s*10\.\d{4,}\/\S+|https?:\/\/doi\.org\/10\.\d{4,}\/\S+/i, points: 2, front: true },
  { signal: 'journal volume line', re: /\b(?:19|20)\d{2}(?:\s[A-Z][a-z]{2}(?:\s\d{1,2})?)?;\s?\d+\(\d+\):\s?e?\d+|\|\s?\((?:19|20)\d{2}\)\s\d+:\d+|\b\d{1,4}\(\d{1,3}\):\s?\d+/, points: 1, front: true },
  { signal: 'received / accepted dates', re: /\bReceived:?\s*[^.;]{3,30}[;.]\s*(?:Revised[^.;]{3,30}[;.]\s*)?Accepted:?\s*\d|\bReceived\s+(?:19|20)\d{2}\s[A-Z][a-z]{2}\s\d{1,2};\s*Accepted/i, points: 2, front: false },
  { signal: 'peer review / open access', re: /\bpeer[- ]reviewed\b|\bOPEN\s+ACCESS\b|\bjournal homepage\b/, points: 1, front: true },
  { signal: 'abstract + keywords', re: /\bAbstract\b[\s\S]{0,4000}\bKeywords?\s*:/, points: 1, front: true },
]
const FRONT_CHARS = 6000

// Text cues per kind (points each, capped at 3 hits per cue). "Foundation" counts
// only in a name ("the Kresge Foundation", "Foundation for …"): in building
// reports it is mostly the structure's foundation.
const TEXT_CUES = {
  'academic-press-office': [
    [/\bfor immediate release\b/i, 3], [/\bstory source:|\bmaterials provided by\b/i, 3], [/\bmedia contacts?\b/i, 1],
    [/\bpress release\b|\bnews release\b/i, 1],
  ],
  'nonprofit-research': [
    [/\bPew Research Center\b/, 3], [/\b(?:non-?profit|nonpartisan|non-partisan|not-for-profit)\b/i, 2], [/\bthink tank\b|\bfact tank\b/i, 2],
    [/\bcoalition\b/i, 1], [/\b[Tt]he\s+(?:(?:[A-Z][\w.'’-]*|&)\s+){1,5}Foundation\b|\bFoundation\s+for\s+[A-Z]/, 1],
  ],
  government: [
    [/\b(?:U\.S\.|United States)\s+(?:Department|Environmental Protection Agency|Government)\b/, 2], [/\bofficial website of the\b/i, 2], [/\bpublic domain\b/i, 1],
  ],
  'firm-vendor': [
    [/\b(?:add to cart|shop now|buy now|request a demo|contact sales|free shipping|checkout|our products|our clients|our solutions|our customers)\b/i, 2],
    [/©\s*(?:19|20)\d{2}\s+[\w&.,'’ -]{2,40}\b(?:Inc|LLC|Ltd|Corporation|Corp|GmbH|Oy|Company)\b/i, 2],
    [/\bPosted by\s+[A-Z]\w+\s+on\b/, 1], [/\b[A-Z][a-z]+\s+Research\s+Institute\b/, 1],
  ],
  'news-outlet': [[/\bstaff (?:writer|reporter)\b|\bcorrespondent\b|\(AP\)|\(Reuters\)/i, 2], [/\bcontributed (?:to this )?report(?:ing)?\b/i, 2]],
  'trade-press': [[/\b(?:senior|contributing|managing|executive)?\s?editor\b/i, 1], [/\bmagazine\b|\be-?newsletter\b/i, 1]],
  individual: [[/\bmy (?:blog|newsletter|substack)\b/i, 3]],
}

// A press release from a university/school is the academic press office;
// from anyone else, the issuing firm.
const ACADEMIC = /\b(?:University|College|School of [A-Z]|Institute of Technology|Medical School|T\.H\. Chan)\b/

function venueEvidence(body) {
  const front = body.slice(0, FRONT_CHARS)
  const out = []
  let points = 0
  for (const v of VENUE) {
    const m = (v.front ? front : body).match(v.re)
    if (m) { points += v.points; out.push({ signal: v.signal, span: m[0].slice(0, 120) }) }
  }
  return { points, evidence: out }
}

// A cited source names someone else ("Pew Research Center, 2010"), so
// paragraphs that read as reference entries are left out.
function textScores(body) {
  const ownWords = body.split(/\n\n+/).filter((p) => !isReferenceEntry(p.replace(/\s+/g, ' '))).join('\n\n')
  const scores = {}
  const evidence = {}
  for (const [kind, cues] of Object.entries(TEXT_CUES)) {
    for (const [re, pts] of cues) {
      const spans = spansFor(ownWords, re)
      if (!spans.length) continue
      scores[kind] = (scores[kind] || 0) + pts * Math.min(spans.length, 3)
      ;(evidence[kind] ||= []).push({ signal: `text: ${re.source.slice(0, 40)}`, span: spans[0].slice(0, 120) })
    }
  }
  return { scores, evidence }
}

// Organization tokens for self-citation: the host's registrable label, plus a
// named publisher in the text.
function orgTokens(host, body) {
  const tokens = new Set()
  if (host) {
    const parts = host.split('.')
    const label = parts.length >= 2 ? parts[parts.length - 2] : parts[0]
    if (label && label.length >= 3 && !/^(?:co|com|org|ac|edu|gov)$/.test(label)) tokens.add(label)
  }
  for (const m of body.matchAll(/\b(Pew Research Center|[A-Z][A-Za-z]+ Research Institute|Harvard T\.H\. Chan School of Public Health)\b/g)) tokens.add(m[1])
  return [...tokens]
}

// The pool and match the self-citation counter starts from (attribution.js
// selfCitationCounter adds own-prior claims' targets; the profile and the
// self-citation signal both read the result).
export function selfCitationShare(org, references, claimUrls) {
  const pool = [...references.map((r) => r.text || r), ...claimUrls]
  if (!org.length || pool.length === 0) return { share: 0, matched: 0, pool: pool.length, targets: [] }
  const res = org.map((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'))
  const targets = pool.filter((p) => res.some((re) => re.test(p)))
  return { share: Math.round((targets.length / pool.length) * 100) / 100, matched: targets.length, pool: pool.length, targets: targets.map((t) => t.slice(0, 160)) }
}

/**
 * @param {string} body  document text without its reference list
 * @param {{ sourceUrl?: string, references?: {text:string}[], claimUrls?: string[], text?: string }} [options]
 *   text: the whole document. The own address is read on its edges, since a back
 *   cover after the reference list is not in the body; on the body's edges when
 *   the whole text gives none (an address just before the reference list).
 */
export function profileProvenance(body, { sourceUrl = '', references = [], claimUrls = [], text = body } = {}) {
  const own = sourceUrl ? null : ownHost(text) || ownHost(body)
  const host = hostOf(sourceUrl) || own?.host || ''
  const venue = venueEvidence(body)
  const { scores, evidence: textEvidence } = textScores(body)
  const fromHost = hostKind(host)
  let kind = 'unknown'
  const evidence = []

  if (venue.points >= VENUE_MIN) {
    kind = 'peer-reviewed-journal'
    evidence.push(...venue.evidence)
  } else {
    // Text cues that name a kind outright beat a generic host suffix (.com).
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
    const [topKind, topPts] = ranked[0] || [null, 0]
    const hostIsSpecific = !!host && Object.keys(PUBLISHER_HOSTS).some((h) => host === h || host.endsWith('.' + h))
    // A firm's own address (.com …) outranks nonprofit cues: firms mention the
    // nonprofits, coalitions and foundations they work with.
    const cuesOverride = topPts >= TEXT_MIN && !(topKind === 'nonprofit-research' && fromHost === 'firm-vendor')
    if (fromHost && (hostIsSpecific || !cuesOverride)) {
      kind = fromHost
      evidence.push(own ? { signal: 'own web address', span: `${host} (${own.via})` } : { signal: 'publisher host', span: host })
    } else if (topPts >= TEXT_MIN) {
      kind = topKind
      evidence.push(...(textEvidence[topKind] || []))
    }
    // A release from a university press office vs a firm's own.
    if (kind === 'academic-press-office' && !ACADEMIC.test(body)) kind = fromHost === 'academic-press-office' ? kind : 'firm-vendor'
    if (kind === 'firm-vendor' && (scores['academic-press-office'] || 0) >= TEXT_MIN && ACADEMIC.test(body) && !hostIsSpecific) {
      kind = 'academic-press-office'
      evidence.push(...(textEvidence['academic-press-office'] || []))
    }
  }
  const org = orgTokens(host, body)
  return {
    kind,
    evidence,
    publisherHost: host,
    org,
    selfCitation: selfCitationShare(org, references, claimUrls),
    scores,
    venuePoints: venue.points,
  }
}
