// Conference reviews have their own research rubric. They never become an
// engine score, a reader submission, or a rating of a whole session.
export const VERDICTS = ['Supported', 'Overstated', 'Contradicted', 'Unsubstantiated', 'Indeterminate', 'Not empirical']
export const SORTS = ['date-desc', 'date-asc', 'title']
export const normalize = (s = '') => String(s).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
export const terms = (s = '') => normalize(s).match(/[\p{L}\p{N}]+/gu) || []

export function readFilters(params, domains) {
  return {
    q: (params.get('q') || '').slice(0, 250),
    domain: domains.includes(params.get('domain')) ? params.get('domain') : '',
    verdict: VERDICTS.includes(params.get('verdict')) ? params.get('verdict') : '',
    sort: SORTS.includes(params.get('sort')) ? params.get('sort') : 'date-desc',
    view: params.get('view') === 'claims' ? 'claims' : 'sessions',
    show: ['reviewed', 'unreviewed'].includes(params.get('show')) ? params.get('show') : '',
  }
}
export function writeFilter(params, key, value) {
  const next = new URLSearchParams(params)
  if (!value || (key === 'sort' && value === 'date-desc') || (key === 'view' && value === 'sessions')) next.delete(key)
  else next.set(key, value)
  return next
}
export function selectSessions(data, filters, catalogue = false) {
  const wanted = terms(filters.q)
  const match = (s) => wanted.every((t) => normalize(s).includes(t))
  const out = []
  for (const session of data.sessions) {
    if (catalogue ? !session.originalCatalogue : !session.reviewed) continue
    if (filters.domain && filters.domain !== session.domain) continue
    if (filters.show === 'reviewed' && !session.reviewed) continue
    if (filters.show === 'unreviewed' && session.reviewed) continue
    const base = [session.id, session.title, session.event, session.domain, ...session.speakers].join(' ')
    const claims = session.claims.filter((c) => (!filters.verdict || c.verdict === filters.verdict) &&
      match(`${base} ${c.id} ${c.speaker} ${c.statement} ${c.scope} ${c.rationale}`))
    if (session.claims.length ? !claims.length : filters.verdict || !match(base)) continue
    out.push({ session, claims })
  }
  return out.sort((a, b) => {
    const title = a.session.title.localeCompare(b.session.title, 'en')
    if (filters.sort === 'title') return title
    // Sort by the beginning of the sourced date/interval; the display keeps
    // month/range precision rather than inventing an exact delivery day.
    const date = a.session.date.localeCompare(b.session.date)
    return (filters.sort === 'date-asc' ? date : -date) || title
  })
}
const MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
export function formatDate(value = '') {
  if (/^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('/').map(formatDate).join('–')
  if (value.includes(' to ')) return value.split(' to ').map(formatDate).join('–')
  if (/^\d{4}-\d{2}$/.test(value)) return `${MONTHS[Number(value.slice(5)) - 1]} ${value.slice(0, 4)}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${MONTHS[Number(value.slice(5, 7)) - 1]} ${Number(value.slice(8))}, ${value.slice(0, 4)}`
  return value
}
export function clock(seconds) {
  const whole = Math.floor(seconds)
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor(whole / 60) % 60
  const sec = whole % 60
  return `${hours ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
export function formatLocator(loc) {
  if (loc.text) return loc.text
  if (Number.isFinite(loc.start_seconds)) return `${clock(loc.start_seconds)}–${clock(loc.end_seconds)}`
  if (Number.isFinite(loc.start_ms)) return `${clock(loc.start_ms / 1000)}–${clock(loc.end_ms / 1000)}`
  const parts = []
  if (loc.pdf_page || loc.page) parts.push(`PDF page ${loc.pdf_page || loc.page}`)
  if (loc.paragraph_index_on_page != null) parts.push(`paragraph ${loc.paragraph_index_on_page}`)
  if (loc.line_start != null) parts.push(`transcript lines ${loc.line_start}–${loc.line_end}`)
  if (loc.transcript_page_or_paragraph) parts.push(loc.transcript_page_or_paragraph)
  return parts.join(', ') || 'See original source'
}
export function claimSourceUrl(claim) {
  const u = new URL(claim.recordingUrl || claim.sourceUrl)
  if (!['www.youtube.com', 'youtube.com', 'youtu.be'].includes(u.hostname)) return u.href
  const loc = claim.locator
  let seconds = loc.start_seconds ?? (loc.start_ms != null ? loc.start_ms / 1000 : null)
  if (seconds == null && loc.text) {
    const m = loc.text.match(/^(\d{1,2}:\d{2}(?::\d{2})?)/)
    if (m) seconds = m[1].split(':').reduce((n, s) => n * 60 + Number(s), 0)
  }
  if (Number.isFinite(seconds)) u.searchParams.set('t', String(Math.floor(seconds)))
  return u.href
}
export function chronology(evidence) {
  return evidence.availableAtEvent === true ? 'Available before the event'
    : evidence.availableAtEvent === false ? 'Later evidence'
      : 'Event-time availability unresolved'
}
export function validateRelease(data) {
  if (data?.schemaVersion !== 1 || !Array.isArray(data.sessions) || !Array.isArray(data.evidence) ||
      !Array.isArray(data.criteria) || !Array.isArray(data.verdicts) || !data.access || !data.counts || !data.review) {
    throw new Error('The conference release could not be read.')
  }
  return data
}
