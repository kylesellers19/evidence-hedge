import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../components/layout/SiteLayout.jsx'
import { LIST_FIELDS, MAX_SORTS, DIR_WORDS, fieldByKey } from '../list/fields.js'
import { sortEntries, clickHeading, setLevel, defaultDir } from '../list/sort.js'
import { apDate } from '../list/entry.js'
import { loadList, LIST_IS_LIVE } from '../list/store.js'
import { METHOD, scoreAnchor } from '../components/results/briefTop.js'

/**
 * The List — every report weighed and added, with its score.
 *
 * A Delgam data table: sans, tabular figures, a dark rule under the headings,
 * hairlines between rows, the score right-aligned with a grey bar beside it.
 * Sort by up to three columns, from the controls above the table or from the
 * headings (Shift-click adds a column as the next level).
 */

const LEVEL_WORDS = ['Sort by', 'then by', 'then by']

export default function ListPage() {
  usePageTitle('The List')
  const [entries, setEntries] = useState(null) // null while loading
  const [failed, setFailed] = useState(false)
  const [sorts, setSorts] = useState([])

  useEffect(() => {
    let live = true
    loadList()
      .then((rows) => { if (live) setEntries(rows) })
      .catch(() => { if (live) { setFailed(true); setEntries([]) } })
    return () => { live = false }
  }, [])

  const rows = useMemo(() => sortEntries(entries || [], sorts), [entries, sorts])
  const levelOf = (key) => sorts.findIndex((s) => s.key === key)

  return (
    <main className="eh-page eh-list">
      <header className="eh-col">
        <p className="eh-kicker">The List</p>
        <h1 className="eh-hed">Reports weighed for how well their evidence carries their claims</h1>
        <p className="eh-dek">
          Each entry is a report someone ran through Evidence Hedge and chose to add, with the score the
          engine gave it. The score runs from 1 to 10 and measures how well the evidence carries the
          claims as strongly as they are stated, not whether the conclusions are right.
        </p>
      </header>

      <section className="eh-wide" aria-label="The List">
        <SortControls sorts={sorts} onChange={setSorts} />

        <p className="eh-small eh-list-count" aria-live="polite">
          {entries === null
            ? 'Loading The List…'
            : `${rows.length} ${rows.length === 1 ? 'report' : 'reports'}` +
              (sorts.length ? `, sorted by ${describe(sorts)}` : ', newest additions first')}
        </p>

        <div className="eh-table-scroll">
          <table className="eh-data eh-list-table">
            <caption className="eh-sr-only">
              Reports on The List{sorts.length ? `, sorted by ${describe(sorts)}` : ''}. Select a column heading to sort by it; Shift and select to add it as the next sort.
            </caption>
            <thead>
              <tr>
                {LIST_FIELDS.map((f) => {
                  const at = levelOf(f.key)
                  const s = sorts[at]
                  return (
                    <th
                      key={f.key}
                      scope="col"
                      className={f.type === 'number' ? 'n' : undefined}
                      aria-sort={at === 0 ? (s.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      <button
                        type="button"
                        className={at >= 0 ? 'eh-th is-sorted' : 'eh-th'}
                        onClick={(e) => setSorts(clickHeading(sorts, f.key, { add: e.shiftKey }))}
                        title={`Sort by ${f.label.toLowerCase()}; Shift-click to add it as the next sort`}
                      >
                        {f.label}
                        {at >= 0 && (
                          <span className="eh-th-mark" aria-hidden="true">
                            {s.dir === 'asc' ? '↑' : '↓'}
                            {sorts.length > 1 && <sup>{at + 1}</sup>}
                          </span>
                        )}
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id ?? `${r.company}|${r.reportName}`}>
                  <td className="eh-list-company">{r.company}</td>
                  <td>{r.industry}</td>
                  <td>{r.reportType}</td>
                  <td className="eh-list-name">{r.reportName}</td>
                  <td className="eh-list-date">{apDate(r.publishedOn)}</td>
                  <td className="n" title={r.engine ? `Scored by engine ${r.engine}` : undefined}>
                    <ScoreCell score={r.score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {entries !== null && rows.length === 0 && (
          <p className="eh-note eh-list-empty">
            {failed
              ? 'The List could not be loaded just now. Reload the page to try again.'
              : LIST_IS_LIVE
                ? <>No reports yet. <Link to="/">Weigh a report</Link>, and add it from the bottom of its evidence brief.</>
                : 'No reports have been added yet.'}
          </p>
        )}

        {rows.length > 0 && (
          <p className="eh-small">
            Point at a score to see the engine build that produced it. The weights behind every score are
            provisional, and the <Link to="/method">Method</Link> page lists each one.
            {LIST_IS_LIVE && <> To add a report, <Link to="/">weigh it</Link> and use the form at the bottom of its evidence brief.</>}
          </p>
        )}
      </section>
    </main>
  )
}

// Three levels of column and direction. A level opens once the one above it
// is set; choosing "None" clears it and the levels below.
function SortControls({ sorts, onChange }) {
  return (
    <fieldset className="eh-sortbar">
      <legend className="eh-sr-only">Sort The List by up to {MAX_SORTS} columns</legend>
      {Array.from({ length: MAX_SORTS }, (_, level) => {
        const s = sorts[level]
        const open = level <= sorts.length
        const type = s ? fieldByKey[s.key].type : 'text'
        return (
          <div className="eh-sortlevel" key={level}>
            <label>
              <span>{LEVEL_WORDS[level]}</span>
              <select
                className="eh-select"
                value={s?.key || ''}
                disabled={!open}
                onChange={(e) => onChange(setLevel(sorts, level, e.target.value, e.target.value ? defaultDir(e.target.value) : null))}
              >
                <option value="">{level === 0 ? 'Newest additions' : 'None'}</option>
                {LIST_FIELDS.map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </label>
            <label className="eh-sortdir">
              <span className="eh-sr-only">Direction</span>
              <select
                className="eh-select"
                value={s?.dir || ''}
                disabled={!s}
                onChange={(e) => onChange(setLevel(sorts, level, s.key, e.target.value))}
              >
                {!s && <option value="">Direction</option>}
                {s && Object.entries(DIR_WORDS[type]).map(([dir, words]) => (
                  <option key={dir} value={dir}>{words}</option>
                ))}
              </select>
            </label>
          </div>
        )
      })}
      {sorts.length > 0 && (
        <button type="button" className="eh-button is-quiet eh-sortclear" onClick={() => onChange([])}>
          Clear sorting
        </button>
      )}
    </fieldset>
  )
}

// The score links to what it means: the brief shows it rounded, so The List's
// 2.5 is a 3 on the brief and links to the 3.
function ScoreCell({ score }) {
  const pct = Math.max(0, Math.min(1, (score - 1) / 9)) * 100
  const shown = Math.round(score)
  return (
    <span className="eh-score">
      <span className="eh-score-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
      <Link className="eh-score-num eh-score-link" to={`${METHOD}#${scoreAnchor(shown)}`} aria-label={`Score ${score.toFixed(1)}: what a ${shown} means`}>{score.toFixed(1)}</Link>
    </span>
  )
}

function describe(sorts) {
  return sorts
    .map((s) => {
      const words = DIR_WORDS[fieldByKey[s.key].type][s.dir].replace(/^(High|Low|Newest|Oldest)/, (w) => w.toLowerCase())
      return `${fieldByKey[s.key].label.toLowerCase()} (${words})`
    })
    .join(', then ')
}
