// ─────────────────────────────────────────────────────────────────────────────
// The List — its columns and the fixed vocabularies behind two of them.
//
// Industry and report type are chosen from fixed lists, not typed, so that
// sorting groups like with like ("White paper" never splits from "Whitepaper").
// Pure data: imported by the page, the add form and checks/list.test.mjs.
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_SORTS = 3

// type sets how a column compares and how its directions are worded.
export const LIST_FIELDS = [
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'industry', label: 'Industry', type: 'text' },
  { key: 'reportType', label: 'Report type', type: 'text' },
  { key: 'reportName', label: 'Report name', type: 'text' },
  { key: 'publishedOn', label: 'Publication date', type: 'date' },
  { key: 'score', label: 'Score', type: 'number' },
]

export const fieldByKey = Object.fromEntries(LIST_FIELDS.map((f) => [f.key, f]))

// The direction a column takes when first chosen, and the words for each.
export const DEFAULT_DIR = { text: 'asc', date: 'desc', number: 'desc' }
export const DIR_WORDS = {
  text: { asc: 'A to Z', desc: 'Z to A' },
  date: { desc: 'Newest first', asc: 'Oldest first' },
  number: { desc: 'High to low', asc: 'Low to high' },
}

export const INDUSTRIES = [
  'Communication services',
  'Consumer goods and retail',
  'Education and research',
  'Energy',
  'Financial services',
  'Government and public sector',
  'Health care and life sciences',
  'Industrials',
  'Information technology',
  'Materials',
  'Media and publishing',
  'Nonprofit and advocacy',
  'Professional services and consulting',
  'Real estate',
  'Utilities',
  'Other',
]

export const REPORT_TYPES = [
  'Research report',
  'Survey report',
  'White paper',
  'Industry or market report',
  'Annual or impact report',
  'Policy brief',
  'Academic paper',
  'Press release',
  'News article',
  'Opinion or commentary',
  'Blog post',
  'Marketing material',
  'Sponsored content',
  'Other',
]

// The engine's reading of a document's form (profile.genre.roles.form.kind,
// src/engine/profile/genre.js) suggests a report type; the person confirms it.
export const REPORT_TYPE_FOR_FORM = {
  'press-release': 'Press release',
  'research-paper': 'Academic paper',
  'research-report': 'Research report',
  reporting: 'News article',
  column: 'Opinion or commentary',
  marketing: 'Marketing material',
  sponsored: 'Sponsored content',
  blog: 'Blog post',
}
