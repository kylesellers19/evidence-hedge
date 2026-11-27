import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { slug } from '../filter.js'
import { COMPARE_CONSTANTS as K } from './constants.js'
import { MEASURES } from './data.js'
import { median, pooledRate } from './stats.js'
import { points, rate, slope as fmtSlope, count, flagLabel, possessive } from './format.js'
import { BarCell, TimeCell, IntervalPlot } from './charts.jsx'

const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const flagName = (m) => capital(flagLabel(m, 2))
const VERDICT = { differs: 'Differs', apart: 'Can’t be told apart', few: 'Too few reports' }
const reportsWord = (n) => `${count(n)} ${n === 1 ? 'report' : 'reports'}`
// The List, narrowed to a firm (and a type), and to our audit's entries unless
// readers' reports are in the comparison.
const listHref = (firm, type, readers) => `/list?${new URLSearchParams({ firm, ...(type ? { type: slug(type) } : {}), ...(readers ? {} : { show: 'audit' }) })}`
// Why a firm has no trend: too few dated reports, or all of them in too few years.
const tooFew = (pts) => (pts.length >= K.TREND_MIN_REPORTS
  ? `Too few years (${count(new Set(pts.map((p) => p.x)).size)})`
  : `Too few dated reports (${count(pts.length)})`)
const jitterOf = (id) => ((((Number(id) || 0) * 9301 + 49297) % 233280) / 233280 - 0.5) * 0.6

// The results: the lead as the heading, then one grid with the firms as
// columns (score by report type, flagged claims per 100, over time), the
// text, the numbers behind it, and the closing line.
export default function Results({ data, result, sentences, short, headingRef, readers = false }) {
  const firms = data.firms
  const names = firms.map((f) => f.name)
  const rows = result.rows
  const R = useMemo(() => Object.fromEntries(rows.map((r) => [r.id, r])), [rows])
  const [lead, ...rest] = sentences
  const cols = { gridTemplateColumns: `minmax(9.5em, 1.15fr) repeat(${firms.length}, minmax(0, 1fr)) minmax(0, 0.8fr)` }
  const tone = (i) => (i === 0 ? 'chosen' : 'other')

  // ── score by report type ──────────────────────────────────────────────
  const typeRows = data.types.map((type) => ({
    type,
    cells: firms.map((f) => f.reports.filter((r) => r.type === type).map((r) => r.score)),
    context: data.context.filter((r) => r.type === type).map((r) => r.score),
  }))
  // A type gets its own row when any chosen firm has the minimum in it; a
  // thinner cell shows its count, not a median.
  const comparable = (row) => row.cells.some((c) => c.length >= K.MIN_REPORTS)
  const shownTypes = typeRows.filter(comparable)
  const sparseTypes = typeRows.filter((t) => !comparable(t))
  const [openSparse, setOpenSparse] = useState(false)
  const allRow = { type: null, label: 'All chosen types', cells: firms.map((f) => f.reports.map((r) => r.score)), context: data.context.map((r) => r.score) }
  const scoreRows = [allRow, ...(data.types.length > 1 ? shownTypes : []), ...(data.types.length > 1 && openSparse ? sparseTypes : [])]

  // ── flags ─────────────────────────────────────────────────────────────
  const rateOf = (reports, m) => pooledRate(reports.map((r) => ({ k: r[m], c: r.claims })))
  const flagRows = MEASURES.map((m) => {
    const values = firms.map((f) => rateOf(f.reports, m))
    const ctx = rateOf(data.context, m)
    return { m, values, ctx, max: niceMax(Math.max(1, ...values.filter((v) => v != null), ctx || 0)) }
  })

  // ── over time ─────────────────────────────────────────────────────────
  const timeRows = ['score', ...MEASURES].map((m) => {
    const value = (r) => (m === 'score' ? r.score : (100 * r[m]) / r.claims)
    const pts = (reports) => reports.filter((r) => Number.isInteger(r.year)).map((r) => ({ x: r.year, y: value(r), jitter: jitterOf(r.id) }))
    const perFirm = firms.map((f) => pts(f.reports))
    const ctx = pts(data.context)
    // The years the chosen firms' reports span; the context column shows The
    // List's reports from those years only.
    const xs = perFirm.flat().map((p) => p.x)
    const x0 = xs.length ? Math.min(...xs) : 0, x1 = xs.length ? Math.max(...xs) : 1
    const inRange = ctx.filter((p) => p.x >= x0 && p.x <= x1)
    const all = [...perFirm.flat(), ...inRange]
    const undated = firms.reduce((s, f) => s + f.reports.filter((r) => !Number.isInteger(r.year)).length, 0)
    return { m, perFirm, ctx: inRange, undated, years: xs.length ? (x0 === x1 ? String(x0) : `${x0}–${x1}`) : null,
      x: [x0 - 0.5, x1 + 0.5], yMax: m === 'score' ? 10 : niceMax(Math.max(1, ...all.map((p) => p.y))) }
  })

  const head = (
    <div className="cmp-row cmp-head" role="presentation">
      <div className="cmp-label" />
      {firms.map((f, i) => <div key={f.name} className={`cmp-firm${i === 0 ? ' is-chosen' : ''}`} title={f.name}>{short[i]}</div>)}
      <div className="cmp-firm is-context">All firms on The List</div>
    </div>
  )
  const cellName = (i) => <span className={`cmp-cellname${i === 0 ? ' is-chosen' : ''}`}>{short[i]}</span>

  // Sentences grouped as paragraphs: the firm each one is about.
  const groupOf = (s) => {
    const r = R[s.cites[0]]
    return r?.otherIndex ?? (r?.kind === 'trend' ? 'trend' : 0)
  }
  const paragraphs = []
  for (const s of rest) {
    const g = groupOf(s)
    const last = paragraphs[paragraphs.length - 1]
    if (last && last.g === g) last.items.push(s)
    else paragraphs.push({ g, items: [s] })
  }

  return (
    <section className="cmp-results" aria-labelledby="cmp-lead">
      <h2 id="cmp-lead" className="cmp-lead" tabIndex={-1} ref={headingRef}>{lead.text}</h2>
      <p className="cmp-leadlink"><a href={`#n-${lead.cites[0]}`}>The numbers behind it</a></p>

      <h3 className="cmp-h">Score by report type</h3>
      <div className="cmp-grid" style={cols}>
        {head}
        {scoreRows.map((row) => {
          const chosenMedian = median(row.cells[0])
          return (
            <div className="cmp-row" key={row.type || 'all'}>
              <div className="cmp-label">{row.label || row.type}</div>
              {row.cells.map((scores, i) => (
                <div className={`cmp-cell is-${tone(i)}`} key={names[i]}>
                  {cellName(i)}
                  {scores.length >= (row.type ? K.MIN_REPORTS : 1) ? (
                    <>
                      <BarCell value={median(scores)} min={1} max={10} ticks={scores} mark={i && chosenMedian != null && row.cells[0].length >= (row.type ? K.MIN_REPORTS : 1) ? chosenMedian : null} tone={tone(i)} />
                      <span className="cmp-value"><span className="cmp-num">{points(median(scores))}</span>{' '}
                        <Link className="cmp-n" to={listHref(names[i], row.type || (data.types.length === 1 ? data.types[0] : null), readers)}>{reportsWord(scores.length)}</Link></span>
                    </>
                  ) : scores.length ? (
                    <span className="cmp-value cmp-none"><Link className="cmp-n" to={listHref(names[i], row.type, readers)}>{reportsWord(scores.length)}</Link>, too few for a median</span>
                  ) : <span className="cmp-value cmp-none">No reports</span>}
                </div>
              ))}
              <div className="cmp-cell is-context">
                <span className="cmp-cellname is-context">All firms</span>
                {row.context.length ? (
                  <>
                    <BarCell value={median(row.context)} min={1} max={10} tone="context" />
                    <span className="cmp-value"><span className="cmp-num">{points(median(row.context))}</span> <span className="cmp-n">{reportsWord(row.context.length)}</span></span>
                  </>
                ) : <span className="cmp-value cmp-none">No reports</span>}
              </div>
            </div>
          )
        })}
      </div>
      {data.types.length > 1 && sparseTypes.length > 0 && (
        <p className="cmp-more">
          <button type="button" className="eh-inlinebutton" aria-expanded={openSparse} onClick={() => setOpenSparse(!openSparse)}>
            {openSparse ? 'Hide' : 'Show'} {sparseTypes.length} report {sparseTypes.length === 1 ? 'type' : 'types'} with too few reports to compare
          </button>
        </p>
      )}
      <p className="cmp-key">Median score, 1 to 10. Ticks: reports. Ink line: {names[0]}.</p>
      <HiddenTable caption="Median score by report type, with the number of reports" cols={[...names, 'All firms on The List']}
        rows={scoreRows.map((row) => [row.label || row.type, ...row.cells.map((c) => (c.length ? `${points(median(c))} (${reportsWord(c.length)})` : 'No reports')),
          row.context.length ? `${points(median(row.context))} (${reportsWord(row.context.length)})` : 'No reports'])} />

      <h3 className="cmp-h">Flagged claims per 100 claims</h3>
      <div className="cmp-grid" style={cols}>
        {head}
        {flagRows.map((row, k) => (
          <div className="cmp-row" key={row.m}>
            <div className="cmp-label">{flagName(row.m)}{k === 0 && <span className="cmp-labelnote">Per 100 claims weighed</span>}</div>
            {row.values.map((v, i) => (
              <div className={`cmp-cell is-${tone(i)}`} key={names[i]}>
                {cellName(i)}
                {v != null ? (
                  <>
                    <BarCell value={v} max={row.max} mark={i ? row.values[0] : null} tone={tone(i)} />
                    <span className="cmp-value"><span className="cmp-num">{rate(v)}</span></span>
                  </>
                ) : <span className="cmp-value cmp-none">No reports</span>}
              </div>
            ))}
            <div className="cmp-cell is-context">
              <span className="cmp-cellname is-context">All firms</span>
              {row.ctx != null && <><BarCell value={row.ctx} max={row.max} tone="context" /><span className="cmp-value"><span className="cmp-num">{rate(row.ctx)}</span></span></>}
            </div>
          </div>
        ))}
      </div>
      <p className="cmp-key">Each row on its own scale. Ink line: {names[0]}.</p>
      <HiddenTable caption="Flagged claims per 100 claims weighed" cols={[...names, 'All firms on The List']}
        rows={flagRows.map((row) => [flagName(row.m), ...row.values.map((v) => (v == null ? 'No reports' : rate(v))), row.ctx == null ? '' : rate(row.ctx)])} />

      <h3 className="cmp-h">Over time</h3>
      <div className="cmp-grid" style={cols}>
        {head}
        {timeRows.map((row) => (
          <div className="cmp-row" key={row.m}>
            <div className="cmp-label">{row.m === 'score' ? 'Score' : flagName(row.m)}
              {row.m === 'score' && row.years && <span className="cmp-labelnote">{row.years}</span>}
              {row.m === 'score' && row.undated > 0 && <span className="cmp-labelnote">{count(row.undated)} undated {row.undated === 1 ? 'report' : 'reports'} left out</span>}
            </div>
            {firms.map((f, i) => {
              const t = R[`trend-${row.m}-${i}`]
              return (
                <div className={`cmp-cell is-${tone(i)}`} key={f.name}>
                  {cellName(i)}
                  <TimeCell points={row.perFirm[i]} line={t?.verdict === 'differs' ? { slope: t.estimate, intercept: t.intercept } : null} xDomain={row.x} yMax={row.yMax} tone={tone(i)} />
                  <span className="cmp-value">{t?.eligible && t.estimate != null
                    ? (t.verdict === 'differs'
                      ? <span className="cmp-num">{fmtSlope(t.estimate)} a year</span>
                      : <span className="cmp-none">{fmtSlope(t.estimate)} a year, can’t be told from none</span>)
                    : <span className="cmp-none">{tooFew(row.perFirm[i])}</span>}</span>
                </div>
              )
            })}
            <div className="cmp-cell is-context">
              <span className="cmp-cellname is-context">All firms</span>
              <TimeCell points={row.ctx} line={null} xDomain={row.x} yMax={row.yMax} tone="context" />
              <span className="cmp-value">{result.context[row.m] ? <span className="cmp-none">{fmtSlope(result.context[row.m].slope)} a year</span> : null}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="cmp-key">A dot for each dated report; a line where a trend passes.</p>
      <HiddenTable caption="Trend a year by publication year, Theil–Sen slope" cols={[...names, 'All firms on The List']}
        rows={timeRows.map((row) => [row.m === 'score' ? 'Score' : flagName(row.m), ...firms.map((f, i) => {
          const t = R[`trend-${row.m}-${i}`]
          return t?.eligible && t.estimate != null ? `${fmtSlope(t.estimate)} a year (${count(row.perFirm[i].length)} dated reports)` : tooFew(row.perFirm[i])
        }), result.context[row.m] ? `${fmtSlope(result.context[row.m].slope)} a year` : ''])} />

      {paragraphs.length > 0 && (
        <>
          <h3 className="cmp-h">What the differences say</h3>
          <div className="cmp-text">
            {paragraphs.map((p, k) => (
              <p key={k}>
                {p.items.map((s, i) => (
                  <React.Fragment key={i}>
                    {s.text}{' '}<a className="cmp-cite" href={`#n-${s.cites[0]}`} aria-label={`The numbers behind: ${s.text}`}>Numbers</a>{i < p.items.length - 1 ? ' ' : ''}
                  </React.Fragment>
                ))}
              </p>
            ))}
          </div>
        </>
      )}

      <h3 className="cmp-h">The numbers behind each sentence</h3>
      <Forest rows={rows} names={names} cited={new Set(sentences.flatMap((s) => s.cites))} />

      <p className="cmp-close">
        Compares reports on The List as Evidence Hedge weighed them, not the firms’ work or whether their conclusions are right.{' '}
        <Link to="/method#compare">How the comparison works</Link>
      </p>
    </section>
  )
}

// The forest plot, as a table: one row per estimate, grouped by measure, each
// interval drawn against the no-difference line.
function Forest({ rows, names, cited }) {
  const groups = []
  const add = (label, members, domainOf) => { if (members.length) groups.push({ label, members, domain: domainOf(members) }) }
  const sym = (members, f = (v) => v) => {
    const vals = members.flatMap((r) => [r.lo, r.hi, r.estimate]).filter((v) => v != null && Number.isFinite(v)).map(f)
    const m = Math.max(0.1, ...vals.map(Math.abs)) * 1.1
    return [-m, m]
  }
  const A = names[0]
  const tests = (ms) => { const n = ms[0]?.familySize || 0; return n ? `; Holm-adjusted over ${n} ${n === 1 ? 'test' : 'tests'}` : '' }
  for (const m of ['score', ...MEASURES]) {
    const word = m === 'score' ? 'Score' : flagName(m)
    const of = (kind) => rows.filter((r) => r.measure === m && r.kind === kind)
    const lean = m === 'score' ? `left of the line, ${A} lower` : `left of the line, fewer at ${A}`
    add(m === 'score' ? `Score, points: ${lean}` : `${word}, ratio of rates: ${lean}`, of('pair'), (ms) => sym(ms.filter((r) => !r.zero && r.verdict !== 'few')))
    add(`${word}, report type accounted for`, of('pair-type'), (ms) => sym(ms.filter((r) => !r.zero && r.verdict !== 'few')))
    add(`${word}, trend a year: left of the line, falling`, of('trend').filter((r) => r.eligible), sym)
    add(`${word}, gap between trends a year: left of the line, ${A} lower`, of('trend-gap').filter((r) => r.p != null), sym)
  }
  for (const g of groups) g.label += tests(g.members)
  const label = (r) => (r.kind === 'trend' ? names[r.firmIndex] : r.other)
  // Too few reports: no estimate, so no number to quote.
  const estimate = (r) => {
    const f = r.fmt
    if (r.verdict === 'few' || r.estimate == null || !f.estimate) return ''
    if (r.measure === 'score' && (r.kind === 'pair' || r.kind === 'pair-type')) return `${f.estimate}`
    if (r.kind === 'pair' || r.kind === 'pair-type') return r.zero ? `${f.estimate} per 100` : `${f.size}×`
    return `${f.estimate} a year`
  }
  // The interval in words, naming whose reports it describes.
  const words = (r) => {
    const f = r.fmt
    if (r.lo == null || !f.lo) return ''
    if (r.measure === 'score' && (r.kind === 'pair' || r.kind === 'pair-type')) {
      return f.crossLo != null ? `${r.firm} ${f.crossLo} lower to ${f.crossHi} higher` : `${r.firm} ${f.lo} to ${f.hi} points ${f.dir}`
    }
    if (r.kind === 'pair' || r.kind === 'pair-type') {
      const who = f.more === 'A' ? possessive(r.firm) : possessive(r.other)
      return r.zero ? `${who} ${f.lo} to ${f.hi} more per 100` : `${who} ${f.lo} to ${f.hi} times as many`
    }
    if (f.lo === f.hi && Number(f.lo) === 0) return 'level'
    if (r.kind === 'trend-gap') {
      return f.crossLo != null ? `${r.firm} ${f.crossLo} lower to ${f.crossHi} higher a year` : `${r.firm} ${f.lo} to ${f.hi} ${f.dir === 'risen' ? 'higher' : 'lower'} a year`
    }
    if (f.crossLo != null) return `falling ${f.crossLo} to rising ${f.crossHi} a year`
    return `${f.dir === 'risen' ? 'rising' : 'falling'} ${f.lo} to ${f.hi} a year`
  }
  const WHY = { size: 'Too small a gap to state', lean: 'Report rates lean the other way', interval: 'Interval and p disagree', p: '' }
  return (
    <div className="eh-table-scroll" tabIndex={0} role="region" aria-label="The numbers behind each sentence">
      <table className="eh-data cmp-forest">
        <caption className="eh-sr-only">Every estimate behind the text, with its 95% interval, adjusted p, the reports it rests on and its verdict.</caption>
        <thead>
          <tr>
            <th scope="col">Compared with</th>
            <th scope="col" className="cmp-plotcol">95% interval</th>
            <th scope="col" className="cmp-wordscol">In words</th>
            <th scope="col" className="n">Estimate</th>
            <th scope="col" className="n">Adjusted p</th>
            <th scope="col" className="n">Reports</th>
            <th scope="col">Verdict</th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.label}>
            <tr className="cmp-group"><th scope="rowgroup" colSpan={7}>{g.label}</th></tr>
            {g.members.map((r) => {
              return (
                <tr key={r.id} id={`n-${r.id}`} className={`${cited.has(r.id) ? 'is-cited ' : ''}is-${r.verdict}`}>
                  <th scope="row">{label(r)}</th>
                  <td className="cmp-plotcol" data-label="95% interval">{r.verdict === 'few' ? null : r.zero ? <span className="cmp-none">per 100 claims</span>
                    : <IntervalPlot lo={r.lo} hi={r.hi} est={r.estimate} domain={g.domain} />}</td>
                  <td className="cmp-wordscol">{words(r)}</td>
                  <td className="n" data-label="Estimate">{estimate(r)}</td>
                  <td className="n" data-label="Adjusted p">{r.fmt.pAdj}</td>
                  <td className="n" data-label="Reports">{r.n.map(count).join(' and ')}</td>
                  <td className="cmp-verdict">{VERDICT[r.verdict]}{r.verdict === 'apart' && WHY[r.why] ? <span className="cmp-why">{WHY[r.why]}</span> : null}</td>
                </tr>
              )
            })}
          </tbody>
        ))}
      </table>
    </div>
  )
}

function HiddenTable({ caption, cols, rows }) {
  return (
    <div className="eh-sr-only">
      <table>
        <caption>{caption}</caption>
        <thead><tr><th scope="col">Row</th>{cols.map((c) => <th scope="col" key={c}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}><th scope="row">{r[0]}</th>{r.slice(1).map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

function niceMax(v) {
  const steps = [1, 2, 2.5, 5, 10]
  const p = 10 ** Math.floor(Math.log10(v))
  for (const s of steps) if (s * p >= v) return s * p
  return 10 * p
}
