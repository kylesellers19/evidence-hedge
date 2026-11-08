// ─────────────────────────────────────────────────────────────────────────────
// Sorting The List by up to three columns.
//
// A sort is an ordered array of { key, dir }, at most MAX_SORTS long: the first
// decides, the second breaks its ties, the third breaks theirs. With no sort,
// entries keep the order they arrive in (newest additions first). Blank values
// sort last in either direction, so a missing date never heads the list.
// ─────────────────────────────────────────────────────────────────────────────

import { MAX_SORTS, DEFAULT_DIR, fieldByKey } from './fields.js'

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })
const blank = (v) => v === null || v === undefined || v === ''

function compareValues(a, b, type) {
  if (type === 'number') return Number(a) - Number(b)
  if (type === 'date') return a < b ? -1 : a > b ? 1 : 0 // ISO dates compare as strings
  return collator.compare(String(a), String(b))
}

export function sortEntries(entries, sorts) {
  const levels = sorts.filter((s) => fieldByKey[s.key]).slice(0, MAX_SORTS)
  if (!levels.length) return entries.slice()
  return entries
    .map((entry, i) => ({ entry, i }))
    .sort((x, y) => {
      for (const { key, dir } of levels) {
        const a = x.entry[key]
        const b = y.entry[key]
        if (blank(a) || blank(b)) {
          if (blank(a) && blank(b)) continue
          return blank(a) ? 1 : -1
        }
        const c = compareValues(a, b, fieldByKey[key].type)
        if (c !== 0) return dir === 'desc' ? -c : c
      }
      return x.i - y.i // stable: ties keep their arrival order
    })
    .map(({ entry }) => entry)
}

export const defaultDir = (key) => DEFAULT_DIR[fieldByKey[key].type]

// A click on a column heading. A plain click sorts by that column alone, or
// flips its direction when it already is the only sort. With add (Shift-click)
// the column joins as the next level, flips if it is already a level, or takes
// the last level's place once three are set.
export function clickHeading(sorts, key, { add = false } = {}) {
  const at = sorts.findIndex((s) => s.key === key)
  const flip = (s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' })
  if (!add) {
    if (sorts.length === 1 && at === 0) return [flip(sorts[0])]
    return [{ key, dir: defaultDir(key) }]
  }
  if (at >= 0) return sorts.map((s, i) => (i === at ? flip(s) : s))
  const next = { key, dir: defaultDir(key) }
  return sorts.length < MAX_SORTS ? [...sorts, next] : [...sorts.slice(0, MAX_SORTS - 1), next]
}

// Set one level from the sort controls: a column (or none) and a direction.
// Choosing none drops that level and the levels after it; choosing a column
// already used at another level removes it there.
export function setLevel(sorts, level, key, dir) {
  if (!key) return sorts.slice(0, level)
  const kept = sorts.slice(0, MAX_SORTS).map((s, i) => (i === level ? null : s))
  const others = kept.filter((s, i) => s && s.key !== key && i < level)
  const after = kept.filter((s, i) => s && s.key !== key && i > level)
  return [...others, { key, dir: dir || defaultDir(key) }, ...after].slice(0, MAX_SORTS)
}
