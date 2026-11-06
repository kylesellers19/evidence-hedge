// Display copy for the genre reading (engine/profile/genre.js): role names,
// what fills each role, and the genre hues (rubrics/accents.js).
import { RUBRIC_ACCENTS } from '../../rubrics/accents.js'
import { GENRE_LABELS } from '../../rubrics/hybrids.js'

export { GENRE_LABELS }
export const GENRE_ORDER = ['research', 'corporate', 'journalism', 'general']
export const genreHue = (g) => RUBRIC_ACCENTS[g] || 'var(--eh-hairline)'

export const PROVENANCE_LABELS = {
  'peer-reviewed-journal': 'Peer-reviewed journal',
  'academic-press-office': 'Academic press office',
  government: 'Government',
  'nonprofit-research': 'Nonprofit research',
  'firm-vendor': 'Firm or vendor',
  'news-outlet': 'News outlet',
  'trade-press': 'Trade press',
  individual: 'Individual',
  unknown: 'Unknown',
}

export const ROLE_META = {
  speaker: { label: 'Speaker', question: 'Who publishes it', empty: 'Unknown — no publisher host or text cues name one' },
  form: { label: 'Form', question: 'What it presents itself as', empty: 'No distinct form beyond the speaker’s own' },
  stake: { label: 'Stake', question: 'Whose interest the evidence serves', empty: 'None beyond the speaker’s own' },
  evidence: { label: 'Evidence', question: 'What study stands behind it', empty: 'No study of its own or described' },
}

const FORM_LABELS = {
  sponsored: 'Sponsored content',
  'press-release': 'Press release',
  'research-paper': 'Research paper — abstract, methods, results',
  reporting: 'Reporting — byline and attributed sources',
  column: 'Column or blog on a news site',
  'research-report': 'Research-style report — survey and methods vocabulary',
  marketing: 'Marketing page',
  blog: 'Blog post',
}

const humanize = (s) => s.replace(/-/g, ' ')

const DESIGN_LABELS = {
  rct: 'randomized controlled trial',
  'controlled-experiment': 'controlled experiment',
  'quasi-experimental': 'quasi-experimental',
  'cohort-longitudinal': 'cohort / longitudinal',
  'repeated-cross-sectional': 'repeated cross-sectional',
  'cross-sectional': 'cross-sectional',
  'pre-post-uncontrolled': 'uncontrolled before-and-after',
  'case-qualitative': 'case or qualitative',
  modeling: 'modeling',
  'systematic-review': 'systematic review',
  'narrative-review': 'narrative review',
}

/** One line for what fills a role. */
export function roleText(role, r) {
  if (!r) return ROLE_META[role].empty
  switch (role) {
    case 'speaker': return PROVENANCE_LABELS[r.kind] || humanize(r.kind)
    case 'form': return FORM_LABELS[r.kind] || humanize(r.kind)
    case 'stake': return r.kind === 'firm-source'
      ? `${r.source}, a firm, supplies ${Math.round(r.share * 100)}% of the attributing sentences`
      : 'An advocacy mission or industry membership behind the publisher'
    case 'evidence': return `${r.kind === 'own' ? 'Its own study' : 'A study it describes'} — ${DESIGN_LABELS[r.design] || humanize(r.design)}`
    default: return ''
  }
}
