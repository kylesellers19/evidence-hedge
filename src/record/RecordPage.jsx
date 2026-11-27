import React, { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './record.css'
import { usePageTitle } from '../components/layout/SiteLayout.jsx'
import Mark from './Mark.jsx'
import Scatter from './Scatter.jsx'
import { DATA_URL, STATES, defaultOrg, fmt, fmtInterval, isShown, markDomain, orgById, sentence } from './model.js'
import { ClaimsView, FirstView, MethodView, OpenGroundView } from './Views.jsx'

const VIEWS = [
  { key: 'open', label: 'Open ground' },
  { key: 'first', label: '“First” claims' },
  { key: 'claims', label: 'Claims' },
  { key: 'method', label: 'Method' },
]

// The Record: who asked, who added, who was heard. Reads record.json and nothing else.
export default function RecordPage() {
  usePageTitle('The Record')
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [params, setParams] = useSearchParams()

  // The page re-tokens the site frame while it is open (record.css).
  useEffect(() => {
    document.documentElement.dataset.page = 'record'
    return () => { delete document.documentElement.dataset.page }
  }, [])

  const load = useCallback(() => {
    setState({ status: 'loading', data: null, error: null })
    fetch(`${import.meta.env.BASE_URL}${DATA_URL}`, { cache: 'no-cache' })
      .then((r) => { if (!r.ok) throw new Error(`The record file returned ${r.status}.`); return r.json() })
      .then((data) => {
        if (!data?.questions?.length) throw new Error('The record file holds no question.')
        setState({ status: 'ready', data, error: null })
      })
      .catch((e) => setState({ status: 'error', data: null, error: e.message || 'The record could not be read.' }))
  }, [])
  useEffect(() => { load() }, [load])

  if (state.status === 'loading') {
    return <main className="rec"><div className="rec-col"><p className="rec-status" role="status">Loading the record…</p></div></main>
  }
  if (state.status === 'error') {
    return (
      <main className="rec">
        <div className="rec-col rec-status" role="alert">
          <p>The record could not be loaded. {state.error}</p>
          <button type="button" className="rec-retry" onClick={load}>Try again</button>
        </div>
      </main>
    )
  }
  const q = state.data.questions[0]
  return <Question q={q} params={params} setParams={setParams} file={state.data} />
}

function Question({ q, params, setParams, file }) {
  const fallback = useMemo(() => defaultOrg(q), [q])
  const org = orgById(q, params.get('org')) || fallback
  const view = VIEWS.some((v) => v.key === params.get('view')) ? params.get('view') : null
  const set = (patch) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }
  const selectId = useId()
  const panelId = useId()
  const ordered = [...q.organizations].sort((a, b) => a.n - b.n)

  return (
    <main className="rec">
      <div className="rec-col">
        <h1 className="rec-q">{q.question}</h1>
        <p className="rec-dek">Who asked, who added, who was heard.</p>
        {file.provisional && (
          <p className="rec-provisional">
            Figures are provisional, and organizations are unnamed until every input behind a figure passes its check.
          </p>
        )}

        <div className="rec-pick">
          <label htmlFor={selectId}>Organization</label>
          <span className="rec-selectwrap">
            <select id={selectId} className="rec-select" value={org.id} onChange={(e) => set({ org: e.target.value })}>
              {ordered.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </span>
        </div>
        <p className="rec-sentence" aria-live="polite">{sentence(q, org)}</p>

        <h2 className="rec-h2">The statement</h2>
        <Statement q={q} org={org} />

        <h2 className="rec-h2">Heard and added</h2>
        <Scatter q={q} selectedId={org.id} onSelect={(id) => set({ org: id })} xKey={q.figure.x} yKey={q.figure.y} />

        <div className="rec-switch" role="group" aria-label="More about this question">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              aria-expanded={view === v.key}
              aria-controls={panelId}
              onClick={() => set({ view: view === v.key ? null : v.key })}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div id={panelId} className="rec-panel" hidden={!view}>
          {view === 'open' && <OpenGroundView q={q} />}
          {view === 'first' && <FirstView q={q} org={org} />}
          {view === 'claims' && <ClaimsView q={q} org={org} />}
          {view === 'method' && <MethodView q={q} file={file} />}
        </div>
      </div>
    </main>
  )
}

function Statement({ q, org }) {
  return (
    <table className="rec-table stack">
      <caption className="rec-sr">{`The statement for ${org.label}: each measure's value, its 95% interval, the field median and the counts behind it.`}</caption>
      <thead>
        <tr>
          <th scope="col">Measure</th>
          <th scope="col" className="n">Value</th>
          <th scope="col" className="n">95% interval</th>
          <th scope="col" className="n">Field median</th>
          <th scope="col"><span className="rec-sr">Mark: dot is the value, line the interval, tick the field median</span></th>
        </tr>
      </thead>
      <tbody>
        {q.measures.filter((m) => m.row !== false).map((m) => (
          <Row key={m.key} q={q} m={m} cell={org.values[m.key]} />
        ))}
      </tbody>
    </table>
  )
}

function Row({ q, m, cell }) {
  const tipId = useId()
  const med = q.field?.[m.key]?.median
  const shown = isShown(cell)
  const domain = markDomain(q, m.key, m.unit)
  const signed = m.unit === 'points' || m.unit === 'score'
  return (
    <tr>
      <th scope="row" className="c-name">
        <span className="rec-term">
          <button type="button" aria-describedby={tipId}>{m.label}</button>
          <span id={tipId} role="tooltip" className="rec-tip">{m.definition}</span>
        </span>
        <span className="rec-basis">{cell?.basis || ''}</span>
      </th>
      <td className="n v">
        {shown ? fmt(cell.value, m.unit, { signed }) : <span className="rec-state" title={cell?.reason || ''}>{STATES[cell?.gate] || 'Pending'}</span>}
        {shown && m.unit === 'points' && <span className="rec-sr"> points</span>}
      </td>
      <td className="n ci">{shown ? fmtInterval(cell, m.unit) : ''}</td>
      <td className="n med">{med !== null && med !== undefined ? fmt(med, m.unit, { signed }) : '—'}</td>
      <td className="mark">{shown ? <Mark cell={cell} median={med} domain={domain} signed={signed} /> : null}</td>
    </tr>
  )
}
