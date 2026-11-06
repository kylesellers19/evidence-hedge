// Hybrid-genre document signals — the metrics a mixed document needs that no
// single rubric runs. Each reads the document profile's genre roles
// (profile/genre.js); the hybrid scenarios (rubrics/hybrids.js) list which
// apply, and their frameworks name the standard behind each.
import { spansFor } from './util.js'
import { SPONSORSHIP } from '../lexicons/genre-form.js'

/** @typedef {import('../types.js').Signal} Signal */

// study-traceability — a document that describes someone else's study gives
// the reader a way to find it: a DOI, the journal or its volume line, a link,
// or the report's title. (Reader-fetched text carries no links, so the title
// and venue lines are what usually decide.)
const TRACE = [
  { signal: 'DOI', re: /\bdoi:?\s*10\.\d{4,}\/\S+|doi\.org\/10\.\d{4,}\/\S+/i },
  { signal: 'journal named', re: /\b(?:published|appears?|appeared|reported)\s+(?:online\s+)?(?:today\s+|this\s+week\s+|recently\s+|last\s+\w+\s+)?in\s+(?:the\s+)?(?:journal\s+)?[A-Z][\w&-]+(?:\s+(?:of|and|&|[A-Z][\w&-]+)){0,6}/ },
  { signal: 'journal reference', re: /\bJournal Reference:|\b(?:Citation|Publication|Reference|Source):\s*[A-Z][^\n]{5,120}|\bthe journal\s+[A-Z][\w-]+/ },
  { signal: 'journal volume', re: /\b[A-Z][A-Za-z&]+(?:\s+[A-Z][A-Za-z&]+){1,6},?\s+\d{1,4}\s?\(\d{1,3}\)/ },
  // A titled report from a named publisher is findable by name.
  { signal: 'named report', re: /\b(?:its|their|the)\s+(?:new\s+|latest\s+|(?:19|20)\d{2}\s+)?(?:[A-Z][\w-]*\s+){1,5}(?:Survey|Report|Study|Index|Census)(?:\s+(?:19|20)\d{2})?\b/ },
  { signal: 'link to the study', re: /https?:\/\/(?:doi\.org|[\w.-]*(?:ncbi\.nlm\.nih\.gov|sciencedirect\.com|springer\.com|nature\.com|wiley\.com|plos\.org|frontiersin\.org|mdpi\.com|tandfonline\.com|sagepub\.com|bmj\.com|jamanetwork\.com|thelancet\.com|oup\.com|niehs\.nih\.gov|cell\.com|science\.org|pnas\.org))\/\S+|https?:\/\/\S+\.pdf\b/i },
]
function studyTraceability(doc, claims, citations, posture, ctx = {}) {
  const design = ctx.profile?.design
  if (!design?.inherited) return null
  const found = TRACE.map((t) => ({ signal: t.signal, span: doc.match(t.re)?.[0] })).filter((t) => t.span)
  if (found.length) {
    return {
      id: 'study-traceability',
      severity: 'note',
      positive: true,
      positiveLabel: 'Traceable',
      summary: 'The study it describes can be traced: the document names where it was published or links to it.',
      evidence: found.slice(0, 2).map((t) => `${t.signal}: ${t.span.slice(0, 120)}`),
    }
  }
  return {
    id: 'study-traceability',
    severity: 'note',
    summary: 'Describes a study without a DOI, journal name or link — a reader cannot check the study behind its claims.',
    evidence: design.evidence.slice(0, 1).map((e) => e.span),
  }
}

// sponsorship-disclosure — a paid placement is labeled where a reader meets it
// (FTC native-advertising guide 2015: clear and prominent, in front of or above
// the headline), not only further down.
export const SPONSOR_HEAD_CHARS = 300 // PROVISIONAL — not ratified
function sponsorshipDisclosure(doc) {
  const spans = spansFor(doc, SPONSORSHIP)
  if (!spans.length) return null
  const head = doc.slice(0, SPONSOR_HEAD_CHARS)
  if (SPONSORSHIP.test(head)) {
    return {
      id: 'sponsorship-disclosure',
      severity: 'note',
      positive: true,
      positiveLabel: 'Labeled',
      summary: 'The paid placement is labeled at the top, where a reader meets it.',
      evidence: [head.match(SPONSORSHIP)[0]],
    }
  }
  return {
    id: 'sponsorship-disclosure',
    severity: 'flag',
    summary: 'Sponsorship is disclosed only below the opening — a reader takes the piece as editorial before learning it is paid.',
    evidence: spans.slice(0, 2),
  }
}

// subject-source-dependence — one firm supplies most of a story's attributions.
function subjectSourceDependence(doc, claims, citations, posture, ctx = {}) {
  const stake = ctx.profile?.genre?.roles?.stake
  if (stake?.kind !== 'firm-source') return null
  return {
    id: 'subject-source-dependence',
    severity: 'flag',
    summary: `${stake.source}, a firm, supplies ${Math.round(stake.share * 100)}% of the attributing sentences — the story's evidence is the firm's own account, with no independent voice weighing it.`,
    evidence: stake.evidence.map((e) => e.span).slice(0, 3),
  }
}

// undisclosed-interest — a publisher with a stake in its findings (a firm's own
// research, an advocacy coalition's report) states no interest or sponsor.
const INTEREST = /\b(?:conflicts? of interest|competing (?:financial )?interests?|declarations? of interest|disclosures?\s*:|financial (?:interests?|relationships?|disclosures?)|(?:declare|report)s? no\b|commissioned by|funded by|sponsored by|paid for by|underwritten by)\b/i
function undisclosedInterest(doc, claims, citations, posture, ctx = {}) {
  const roles = ctx.profile?.genre?.roles
  if (!roles) return null
  const firmResearch = roles.speaker?.genre === 'corporate' && roles.evidence?.kind === 'own'
  const advocacy = roles.stake?.kind === 'advocacy'
  if (!firmResearch && !advocacy) return null
  const stated = doc.match(INTEREST)
  if (stated) {
    return {
      id: 'undisclosed-interest',
      severity: 'note',
      positive: true,
      summary: 'States who sponsored the work or what interest its publisher holds.',
      evidence: [stated[0]],
    }
  }
  return {
    id: 'undisclosed-interest',
    severity: 'note',
    summary: advocacy
      ? 'Published by a coalition with an advocacy mission or industry members, with no statement of interest — the reader is not told who stands to gain from its conclusions.'
      : 'A firm reports research on its own field with no statement of interest or sponsorship — the reader is not told what the firm stands to gain from the findings.',
    evidence: (roles.stake?.evidence || roles.speaker?.evidence || []).slice(0, 2).map((e) => e.span),
  }
}

export const signals = {
  'study-traceability': studyTraceability,
  'sponsorship-disclosure': sponsorshipDisclosure,
  'subject-source-dependence': subjectSourceDependence,
  'undisclosed-interest': undisclosedInterest,
}
