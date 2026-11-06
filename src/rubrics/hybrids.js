// ─────────────────────────────────────────────────────────────────────────────
// Hybrid scenarios — how a document that mixes genres is judged.
//
// profileGenre (engine/profile/genre.js) reads four roles (speaker, form,
// stake, evidence) and lists the genres that fill them. One genre: that
// rubric, unchanged. Two or more: every scenario below whose genres the
// document carries and whose `when` holds. The first match sets the standard;
// every match adds its audits and frameworks. No match (often a genre added
// on the branch screen that no role supports): the speaker's own standard,
// each other genre adding its own rubric's audits, and the brief says so.
//
// Each scenario is pure config:
//   standard    the rubric whose evidence ladder, tiers and ceilings the claims
//               are held to — the one that grades evidence in the voice of
//               whoever is accountable for the claims — and `why`, one sentence
//   audits      document signals run IN ADDITION to every signal of the
//               standard rubric. A hybrid never drops one, so its score is never
//               above the standard rubric's own (checks/hybrid.test.mjs).
//   frameworks  keys into rubrics/frameworks.js: the standards and research
//               behind the scenario's audits
//   name, noun, note, promotional   copy for the branch screen and the brief
//
// composeRubric() turns the matches into an ordinary RubricConfig, so analyze()
// and scoreDocument() run unchanged. PROVISIONAL — not ratified.
// ─────────────────────────────────────────────────────────────────────────────

import { research } from './research.config.js'
import { corporate } from './corporate.config.js'
import { journalism } from './journalism.config.js'
import { general } from './general.config.js'
import { FRAMEWORKS } from './frameworks.js'
import { SHARED_PROVENANCE } from '../engine/profile/standards.js'
import { SIGNAL_ORIGIN } from '../engine/signals/index.js'

const BASE = { research, corporate, journalism, general }
export const GENRE_LABELS = { research: 'Research', corporate: 'Corporate', journalism: 'Journalism', general: 'General web' }

const speakerIs = (r, g) => r.speaker?.genre === g
const formIs = (r, ...kinds) => kinds.includes(r.form?.kind)
const evidenceIs = (r, kind) => r.evidence?.kind === kind
const stakeIs = (r, kind) => r.stake?.kind === kind
const noKnownSpeaker = (r) => !r.speaker || r.speaker.genre === 'general'

/** In priority order: the first match sets the standard. */
export const HYBRIDS = [
  {
    id: 'sponsored-content',
    genres: ['corporate', 'journalism'],
    when: (r) => formIs(r, 'sponsored'),
    name: 'Sponsored content in an editorial format',
    noun: 'sponsored article',
    standard: 'corporate',
    why: 'A paid placement speaks for its sponsor, so its claims are graded as the sponsor’s own until it cites independent evidence.',
    audits: ['sponsorship-disclosure', 'per-claim-sourcing', 'label-transparency'],
    frameworks: ['ftc-deceptive-formats-2015', 'ftc-native-guide-2015', 'wojdynski-evans-2016'],
    note: 'Read as sponsored content: advertising in an editorial format, held to its sponsor’s evidence standard.',
    promotional: true,
  },
  {
    id: 'press-release-study',
    genres: ['corporate', 'research'],
    when: (r) => formIs(r, 'press-release'),
    name: 'Press release reporting a study',
    noun: 'press release',
    standard: 'corporate',
    why: 'A release relays a study in its issuer’s voice: its results count as self-reported until it cites the study itself.',
    audits: ['limitations-absent', 'abstract-body-confidence-delta', 'study-traceability'],
    frameworks: ['sumner-2014', 'woloshin-2009', 'yavchitz-2012', 'trust-project-references'],
    note: 'Read as a press release about a study: check the study before repeating its claims.',
    promotional: true,
  },
  {
    id: 'brand-journalism',
    genres: ['corporate', 'journalism'],
    when: (r) => speakerIs(r, 'corporate') && formIs(r, 'reporting', 'column'),
    name: 'A firm’s own content in a news format',
    noun: 'article',
    standard: 'corporate',
    why: 'The firm is the speaker, so its claims are graded as its own however news-like the format.',
    audits: ['per-claim-sourcing', 'perspective-plurality', 'sponsorship-disclosure'],
    frameworks: ['ftc-deceptive-formats-2015'],
    note: 'Read as brand journalism: a firm’s content in a news format, held to the firm’s evidence standard.',
    promotional: true,
  },
  {
    id: 'firm-sourced-news',
    genres: ['corporate', 'journalism'],
    when: (r) => stakeIs(r, 'firm-source'),
    name: 'News built on a firm’s own account',
    noun: 'article',
    standard: 'journalism',
    why: 'It is reporting, so its claims are graded on the journalism ladder; how much of the sourcing comes from the firm it covers is audited on its own.',
    audits: ['subject-source-dependence', 'platitude-density'],
    frameworks: ['healthnewsreview-criteria', 'schwitzer-2008', 'lewis-2008'],
    note: 'Read as news that relies on the firm it covers: its claims should trace to sources beyond that firm.',
  },
  {
    id: 'firm-research',
    genres: ['corporate', 'research'],
    when: (r) => stakeIs(r, 'advocacy') || (speakerIs(r, 'corporate') && (evidenceIs(r, 'own') || formIs(r, 'research-paper', 'research-report'))),
    name: 'Research published by a firm or interest group',
    noun: 'research report',
    standard: 'corporate',
    why: 'Its findings come from a publisher with a stake in them: they count as self-reported until a third party or peer review checks them.',
    audits: ['limitations-absent', 'abstract-body-confidence-delta', 'undisclosed-interest'],
    frameworks: ['lundh-2017', 'icmje-coi', 'aapor-ti', 'gpp-2022', 'icc-esomar-2025', 'iso-20252'],
    note: 'Read as research from an interested publisher: held to research reporting standards, with its own data graded as self-reported.',
  },
  {
    id: 'vendor-study',
    genres: ['corporate', 'research'],
    when: (r) => speakerIs(r, 'corporate') && evidenceIs(r, 'inherited') && !formIs(r, 'press-release', 'sponsored'),
    name: 'A seller citing a study',
    noun: 'page',
    standard: 'corporate',
    why: 'The page sells and the study is its evidence: claims are graded in the seller’s voice, and the study must be one a reader can find.',
    audits: ['study-traceability', 'limitations-absent'],
    frameworks: ['ftc-substantiation-1984', 'ftc-health-2022', 'trust-project-references'],
    note: 'Read as a seller’s page citing a study: check that the study supports this product and this claim.',
    promotional: true,
  },
  {
    id: 'science-news',
    genres: ['journalism', 'research'],
    name: 'News about a study',
    noun: 'article',
    standard: 'journalism',
    why: 'It is reporting, so its claims are graded on the journalism ladder; the study’s design still caps how much cause they may claim.',
    audits: ['limitations-absent', 'abstract-body-confidence-delta', 'study-traceability'],
    frameworks: ['healthnewsreview-criteria', 'schwitzer-2008', 'sumner-2014', 'yavchitz-2012', 'trust-project-references'],
    note: 'Read as news about a study: its claims should trace to the study and stay within what its design shows.',
  },
  {
    id: 'content-marketing',
    genres: ['corporate', 'general'],
    when: (r) => speakerIs(r, 'corporate'),
    name: 'A firm’s blog or explainer',
    noun: 'post',
    standard: 'corporate',
    why: 'The firm is the speaker, so its advice and claims are graded as its own, whatever the blog format.',
    audits: [],
    frameworks: ['ftc-substantiation-1984', 'ftc-endorsement-2023'],
    note: 'Read as content marketing: a firm’s own blog post, held to the firm’s evidence standard.',
    promotional: true,
  },
  {
    id: 'independent-research',
    genres: ['general', 'research'],
    when: (r) => formIs(r, 'research-paper', 'research-report'),
    name: 'Research by an individual, outside a journal',
    noun: 'paper',
    standard: 'research',
    why: 'It takes the form of research, so it is held to research evidence; no venue has reviewed it.',
    audits: [],
    frameworks: [],
    note: 'Read as research outside a journal: held to research evidence standards, with no peer review behind it.',
  },
  {
    id: 'research-explainer',
    genres: ['general', 'research'],
    when: noKnownSpeaker,
    name: 'An individual explaining a study',
    noun: 'post',
    standard: 'general',
    why: 'It is a personal post, so the general-web ladder applies; the study must be findable and its limits stated.',
    audits: ['study-traceability', 'limitations-absent'],
    frameworks: ['ihc-key-concepts', 'trust-project-references'],
    note: 'Read as a personal explainer of a study: the study should be findable and its limits stated.',
  },
  {
    id: 'independent-reporting',
    genres: ['general', 'journalism'],
    when: noKnownSpeaker,
    name: 'Independent reporting outside a newsroom',
    noun: 'article',
    standard: 'journalism',
    why: 'It takes the form of reporting, so its claims should trace to named, documented sources; no newsroom stands behind it.',
    audits: [],
    frameworks: [],
    note: 'Read as independent reporting: held to journalism sourcing standards, with no newsroom behind it.',
  },
]

// No scenario fits: the speaker's own standard (else the first genre); each
// other genre adds its own rubric's audits. The posture-gate is a verdict, not
// an audit, so it never joins a mix.
function fallbackScenario(genres, roles) {
  const standard = roles.speaker && genres.includes(roles.speaker.genre) ? roles.speaker.genre : genres[0]
  const others = genres.filter((g) => g !== standard)
  return {
    id: 'mixed',
    genres,
    name: 'Mixed genres with no specific scenario',
    noun: BASE[standard].documentNoun,
    standard,
    why: `No hybrid scenario fits this mix, so its claims are held to the ${GENRE_LABELS[standard].toLowerCase()} standard and ${others.map((g) => GENRE_LABELS[g].toLowerCase()).join(' and ')} add${others.length === 1 ? 's' : ''} only ${others.length === 1 ? 'its' : 'their'} own audits.`,
    audits: others.flatMap((g) => BASE[g].documentSignals).filter((id) => id !== 'posture-gate'),
    frameworks: [],
    note: '',
  }
}

const unique = (list) => [...new Set(list)]
const uniqueBy = (list, key) => { const seen = new Set(); return list.filter((x) => (seen.has(key(x)) ? false : (seen.add(key(x)), true))) }

/**
 * The scenarios a document's genres and roles match, as one RubricConfig.
 * @param {Object[]} scenarios  matched scenarios, the primary first
 * @param {string[]} genres     the genres in play, in role order
 */
export function composeRubric(scenarios, genres) {
  const primary = scenarios[0]
  const base = BASE[primary.standard]
  const audits = unique(scenarios.flatMap((s) => s.audits)).filter((id) => !base.documentSignals.includes(id))
  const hybridEntries = unique(scenarios.flatMap((s) => s.frameworks)).map((k) => ({ ...FRAMEWORKS[k], key: k, scope: 'hybrid' }))
  const genreEntries = genres.flatMap((g) => BASE[g].provenance.filter((p) => !SHARED_PROVENANCE.includes(p)).map((p) => ({ ...p, scope: g })))
  const sharedEntries = SHARED_PROVENANCE.map((p) => ({ ...p, scope: 'shared' }))
  return {
    ...base,
    id: `hybrid:${scenarios.map((s) => s.id).join('+')}`,
    base: base.id,
    label: genres.map((g) => GENRE_LABELS[g]).join(' × '),
    description: scenarios.map((s) => s.name).join(' · '),
    documentNoun: primary.noun,
    documentSignals: [...base.documentSignals, ...audits],
    genreNote: primary.note,
    promotional: !!primary.promotional,
    provenance: uniqueBy([...hybridEntries, ...genreEntries, ...sharedEntries], (p) => p.standard),
    hybrid: {
      scenarios: scenarios.map((s) => ({ id: s.id, name: s.name })),
      genres,
      standard: base.id,
      why: primary.why,
      audits: audits.map((id) => ({ id, from: SIGNAL_ORIGIN[id] })),
    },
  }
}

/**
 * How a document is judged, from its genre roles and the genres in play
 * (detected, or set on the branch screen).
 * @param {Record<string, {genre:string, kind:string}|null>} roles
 * @param {string[]} genres
 */
export function judgmentFor(roles = {}, genres = []) {
  if (genres.length <= 1) {
    const id = genres[0] || 'general'
    return { hybrid: false, genres: [id], standard: id, scenarios: [], rubric: BASE[id] }
  }
  const matches = HYBRIDS.filter((s) => s.genres.every((g) => genres.includes(g)) && (!s.when || s.when(roles)))
  const scenarios = matches.length ? matches : [fallbackScenario(genres, roles)]
  return { hybrid: true, genres, standard: scenarios[0].standard, scenarios, rubric: composeRubric(scenarios, genres) }
}

/** Every scenario composed on its own genres — for the contract validator. */
export function listHybridRubrics() {
  return HYBRIDS.map((s) => composeRubric([s], s.genres))
}
