import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePageTitle } from '../components/layout/SiteLayout.jsx'
import { LIST_FIELDS, MAX_SORTS, DIR_WORDS, INDUSTRIES, REPORT_TYPES, fieldByKey } from '../list/fields.js'
import { clickHeading, setLevel, defaultDir } from '../list/sort.js'
import { apDatePartial } from '../list/entry.js'
import { NO_FILTERS, ORIGINS, SCORE_BANDS, isFiltered, readParams, writeParams, searchWords } from '../list/filter.js'
import { loadPage, loadFirm, LIST_IS_LIVE, PAGE_SIZE } from '../list/store.js'
import { METHOD, scoreAnchor } from '../components/results/briefTop.js'

/**
 * The List — every report weighed and added, with its score.
 *
 * A Delgam data table: sans, tabular figures, a dark rule under the headings,
 * hairlines between rows, the score right-aligned with a grey bar beside it.
 * Search firm and report names, narrow by industry, report type, score and
 * who added the entry, or select a firm's name for that firm alone. Sort by up
 * to three columns, from the controls above the table or from the headings
 * (Shift-click adds a column as the next level). The address holds every
 * choice (src/list/filter.js), so a view can be shared and Back undoes it.
 */

const LEVEL_WORDS = ['Sort by', 'then by', 'then by']
// Typing reaches the address, and the table, after this pause.
const SEARCH_PAUSE_MS = 250
// The write-up of the corpus audit the "From our corpus audit" entries come from.
const AUDIT_REPORT = 'https://github.com/kylesellers19/evidence-hedge/blob/main/checks/reports/corpus-audit-cleanup.md'

export default function ListPage() {
  usePageTitle('The List')
  const [params, setParams] = useSearchParams()
  const { filters, sorts } = useMemo(() => readParams(params), [params])
  const [rows, setRows] = useState(null) // null while the first page loads
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [more, setMore] = useState(false)
  const [firm, setFirm] = useState(null) // { company, count, median } for a firm's view
  const [text, setText] = useState(filters.q)
  const findRef = useRef(null)

  // Every change is a new address; typing replaces it rather than adding one
  // to the history for each pause.
  const go = (next, { replace = false } = {}) => setParams(writeParams(params, { filters, sorts, ...next }), { replace })
  const setSorts = (next) => go({ sorts: next })
  const setFilter = (key, value) => go({ filters: { ...filters, [key]: value } })
  const firmHref = (company) => `?${writeParams(params, { filters: { ...NO_FILTERS, firm: company }, sorts })}`

  // What is typed reaches the address after a pause, unless its words are the
  // ones already searched; Back and Forward bring their own search back into
  // the box. A filter chosen mid-pause restarts it, so neither undoes the other.
  useEffect(() => {
    if (searchWords(text).join(' ') === searchWords(filters.q).join(' ')) return
    const t = setTimeout(() => go({ filters: { ...filters, q: text } }, { replace: true }), SEARCH_PAUSE_MS)
    return () => clearTimeout(t)
  }, [text, params]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setText(filters.q) }, [filters.q])

  // The table sorts and filters; each change asks it for a first page again.
  // The rows on screen stay until the new ones arrive.
  const asked = JSON.stringify({ filters: { ...filters, q: searchWords(filters.q) }, sorts })
  useEffect(() => {
    let live = true
    setLoading(true)
    loadPage({ sorts, filters })
      .then((p) => { if (live) { setRows(p.rows); setTotal(p.total); setFailed(false) } })
      .catch(() => { if (live) { setFailed(true); setRows([]); setTotal(0) } })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [asked]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!filters.firm) { setFirm(null); return }
    let live = true
    loadFirm(filters.firm)
      .then((f) => { if (live) setFirm({ company: filters.firm, ...f }) })
      .catch(() => { if (live) setFirm(null) })
    return () => { live = false }
  }, [filters.firm])

  function showMore() {
    setMore(true)
    loadPage({ sorts, filters, offset: rows.length })
      .then((p) => { setRows((r) => [...r, ...p.rows]); setTotal(p.total) })
      .catch(() => setFailed(true))
      .finally(() => setMore(false))
  }

  function clearFilters() {
    setText('')
    go({ filters: NO_FILTERS })
  }

  const levelOf = (key) => sorts.findIndex((s) => s.key === key)
  const shown = rows || []
  const filtered = isFiltered(filters)

  return (
    <main className="eh-page eh-list">
      <header className="eh-col">
        <p className="eh-kicker">The List</p>
        <h1 className="eh-hed">Reports weighed claim by claim against their evidence</h1>
        <p className="eh-dek">
          Each entry is a report run through Evidence Hedge: by a reader who chose to add it, or by us, when we
          weighed every freely available report from the architecture, engineering and construction firms in
          our corpus. The score runs from 1 to 10. It is ten times the share of a report’s claims that stay
          within what their evidence shows, not a judgment of whether its conclusions are right.
        </p>
      </header>

      <section className="eh-wide" aria-label="The List">
        <div className="eh-listfind" role="search" ref={findRef}>
          <label className="eh-listsearch">
            <span>Search</span>
            <input
              className="eh-input"
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setText('') }}
              placeholder="Firm or report name"
              maxLength={200}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="eh-listfilters">
            <Filter label="Industry" value={filters.industry} onChange={(v) => setFilter('industry', v)}
              options={[['', 'Any industry'], ...INDUSTRIES.map((v) => [v, v])]} />
            <Filter label="Report type" value={filters.type} onChange={(v) => setFilter('type', v)}
              options={[['', 'Any type'], ...REPORT_TYPES.map((v) => [v, v])]} />
            <Filter label="Score" value={filters.score} onChange={(v) => setFilter('score', v)}
              options={[['', 'Any score'], ...SCORE_BANDS.map((b) => [b.key, b.label])]} />
            <Filter label="Show" value={filters.show} onChange={(v) => setFilter('show', v)} options={ORIGINS} />
            {filtered && (
              <button type="button" className="eh-button is-quiet eh-listclear" onClick={clearFilters}>
                Clear search and filters
              </button>
            )}
          </div>
        </div>
        <SortControls sorts={sorts} onChange={setSorts} />

        {filters.firm && (
          <p className="eh-list-firm">
            <strong>{filters.firm}</strong>
            {firm?.company === filters.firm && firm.count > 0 && (
              <>{` has ${num(firm.count)} ${firm.count === 1 ? 'report' : 'reports'} on The List`}
                {firm.median !== null && `, with a median score of ${firm.median.toFixed(1)}`}.</>
            )}{' '}
            <button type="button" className="eh-inlinebutton" onClick={() => setFilter('firm', '')}>Show every firm</button>
          </p>
        )}

        <p className="eh-small eh-list-count" aria-live="polite">
          {rows === null
            ? 'Loading The List…'
            : `${num(total)} ${total === 1 ? 'report' : 'reports'}` +
              (filters.firm ? ` by ${filters.firm}` : '') +
              (filters.show ? ` ${ORIGINS.find(([v]) => v === filters.show)[1].toLowerCase()}` : '') +
              (searchWords(filters.q).length ? ` matching “${filters.q.trim()}”` : '') +
              narrowedBy(filters) +
              (sorts.length ? `, sorted by ${describe(sorts)}` : ', newest additions first') +
              (total > shown.length ? `; showing ${num(shown.length)}` : '')}
        </p>

        <div className={loading && rows !== null ? 'eh-table-scroll is-loading' : 'eh-table-scroll'} aria-busy={loading}>
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
              {shown.map((r) => (
                <tr key={r.id ?? `${r.company}|${r.reportName}`}>
                  <td className="eh-list-company">
                    {filters.firm
                      ? r.company
                      : <Link to={firmHref(r.company)} onClick={() => findRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })}
                          title={`Show only ${r.company}’s reports`}>{r.company}</Link>}
                  </td>
                  <td>{r.industry}</td>
                  <td>{r.reportType}</td>
                  <td className="eh-list-name">
                    {r.sourceUrl ? <a href={r.sourceUrl} rel="noopener noreferrer">{r.reportName}</a> : r.reportName}
                    {r.origin === 'audit' && <span className="eh-list-origin">Corpus audit</span>}
                  </td>
                  <td className="eh-list-date">{apDatePartial(r.publishedOn, r.publishedPrecision)}</td>
                  <td className="n" title={r.engine ? `Scored by engine ${r.engine}${r.claims != null ? `: ${r.claims - r.flagged} of ${r.claims} claims hold` : ''}` : undefined}>
                    <ScoreCell score={r.score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows !== null && total > shown.length && !failed && (
          <p><button type="button" className="eh-button is-quiet" onClick={showMore} disabled={more || loading}>
            {more ? 'Loading…' : `Show ${num(Math.min(PAGE_SIZE, total - shown.length))} more`}
          </button></p>
        )}

        {rows !== null && shown.length === 0 && (
          <p className="eh-note eh-list-empty">
            {failed
              ? 'The List could not be loaded just now. Reload the page to try again.'
              : filtered
                ? <>No reports match. <button type="button" className="eh-inlinebutton" onClick={clearFilters}>Clear the search and filters</button> to see every report.</>
              : LIST_IS_LIVE
                ? <>No reports yet. <Link to="/">Weigh a report</Link>, and add it from the bottom of its evidence brief.</>
                : 'No reports have been added yet.'}
          </p>
        )}

        {shown.length > 0 && (
          <>
            <p className="eh-small">
              Point at a score to see the engine build that produced it and how many claims held. A firm’s name
              shows only that firm’s reports, and a report’s
              name links to the report itself. The rules behind every score are provisional, and
              the <Link to="/method">Method</Link> page lists each one.
              {LIST_IS_LIVE && <> To add a report, <Link to="/">weigh it</Link> and use the form at the bottom of its evidence brief.</>}
            </p>
            {filters.show !== 'reader' && (
              <p className="eh-small">
                Reports marked “Corpus audit” were weighed as their PDFs upload, by the engine build named on
                each score. How we collected them, read each one and checked the engine against them
                is in <a href={AUDIT_REPORT}>the audit report</a>.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  )
}

const num = (n) => Number(n).toLocaleString('en-US')

// The filters a count line names by their column, joined as Delgam joins a
// list: no serial comma.
function narrowedBy(f) {
  const names = [f.industry && 'industry', f.type && 'report type', f.score && 'score'].filter(Boolean)
  if (!names.length) return ''
  return `, narrowed by ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]}`
}

function Filter({ label, value, options, onChange }) {
  return (
    <label className="eh-listfilter">
      <span>{label}</span>
      <select className="eh-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, words]) => <option key={v} value={v}>{words}</option>)}
      </select>
    </label>
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
