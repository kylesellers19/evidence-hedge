// ─────────────────────────────────────────────────────────────────────────────
// One entry on The List: what the add form sends, and nothing more.
//
// The entry carries the details the person confirms (company, industry, report
// type, report name, publication date), the score and the engine build that
// produced it, and a SHA-256 fingerprint of the text so the same report is not
// listed twice. The document's text never leaves the browser; a check holds
// that (checks/list.test.mjs).
// ─────────────────────────────────────────────────────────────────────────────

import { INDUSTRIES, REPORT_TYPES, REPORT_TYPE_FOR_FORM } from './fields.js'

export const LIMITS = { company: 120, reportName: 300 }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

// The form's starting values, from what the engine and the upload already know.
export function draftEntry({ text = '', meta = {}, result = null } = {}) {
  const form = result?.profile?.genre?.roles?.form?.kind
  return {
    company: '',
    industry: '',
    reportType: REPORT_TYPE_FOR_FORM[form] || '',
    reportName: guessReportName(text, meta),
    publishedOn: '',
  }
}

// A file's name, tidied, or else the document's first short line.
export function guessReportName(text, meta = {}) {
  if (meta.filename) {
    const name = clean(meta.filename.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_+]+/g, ' ').replace(/\s*\(\d+\)$/, ''))
    if (name) return name.slice(0, LIMITS.reportName)
  }
  const first = String(text).split('\n').map(clean).find((l) => l.length >= 8)
  return first && first.length <= 140 ? first : ''
}

// Problems with a draft, by field; an empty object means it can be sent.
export function validateEntry(draft, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const errors = {}
  const company = clean(draft.company)
  const reportName = clean(draft.reportName)
  if (!company) errors.company = 'Name the company or organization that published it.'
  else if (company.length > LIMITS.company) errors.company = `Keep it under ${LIMITS.company} characters.`
  if (!INDUSTRIES.includes(draft.industry)) errors.industry = 'Choose an industry.'
  if (!REPORT_TYPES.includes(draft.reportType)) errors.reportType = 'Choose a report type.'
  if (!reportName) errors.reportName = 'Give the report’s title.'
  else if (reportName.length > LIMITS.reportName) errors.reportName = `Keep it under ${LIMITS.reportName} characters.`
  if (!ISO_DATE.test(draft.publishedOn || '')) errors.publishedOn = 'Give the date it was published.'
  else if (draft.publishedOn > today) errors.publishedOn = 'That date is in the future.'
  else if (draft.publishedOn < '1900-01-01') errors.publishedOn = 'Check the year.'
  return errors
}

// The record sent to The List. Only these fields; never the text.
export function buildEntry(draft, { score, engine, docHash }) {
  return {
    company: clean(draft.company),
    industry: draft.industry,
    reportType: draft.reportType,
    reportName: clean(draft.reportName),
    publishedOn: draft.publishedOn,
    score: Math.round(Number(score) * 10) / 10,
    engine: String(engine),
    docHash,
  }
}

// SHA-256 of the text as the engine read it, in hex. One-way: the text cannot
// be recovered from it, but the same text always gives the same fingerprint.
export async function docHash(text) {
  const bytes = new TextEncoder().encode(String(text))
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Associated Press dates, as Delgam writes them: "Oct. 29, 2026". Built from
// the ISO parts, so no time zone can move the day.
const AP_MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
export function apDate(iso) {
  if (!ISO_DATE.test(iso || '')) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${AP_MONTHS[m - 1]} ${d}, ${y}`
}

// A date known only to its month or year (most reports print no day): "Nov.
// 2023", "2019". Unknown when the report gives none.
export function apDatePartial(iso, precision = 'day') {
  if (precision === 'unknown' || !ISO_DATE.test(iso || '')) return precision === 'unknown' ? 'Unknown' : ''
  const [y, m] = iso.split('-').map(Number)
  if (precision === 'year') return String(y)
  if (precision === 'month') return `${AP_MONTHS[m - 1]} ${y}`
  return apDate(iso)
}
