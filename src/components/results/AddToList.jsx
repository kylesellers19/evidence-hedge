import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { INDUSTRIES, REPORT_TYPES } from '../../list/fields.js'
import { draftEntry, validateEntry, buildEntry, docHash, LIMITS } from '../../list/entry.js'
import { addToList, LIST_IS_LIVE } from '../../list/store.js'
import { ENGINE_VERSION } from '../../engine/version.js'

// The last part of the evidence brief: add this report to The List. The engine
// cannot tell who published a report or when, so the person fills those in;
// the report type and name start from what the engine and the upload suggest.
// Shown only when The List is live (src/list/store.js).
export default function AddToList({ text, meta, result }) {
  const initial = useMemo(() => draftEntry({ text, meta, result }), [text, meta, result])
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | added | duplicate | failed
  const today = new Date().toISOString().slice(0, 10)

  if (!LIST_IS_LIVE || !result?.documentScore) return null
  const score = result.documentScore.score

  const set = (key) => (e) => {
    setDraft({ ...draft, [key]: e.target.value })
    if (errors[key]) setErrors({ ...errors, [key]: undefined })
  }

  async function submit(e) {
    e.preventDefault()
    const found = validateEntry(draft, { today })
    setErrors(found)
    if (Object.keys(found).length) return
    setStatus('sending')
    const entry = buildEntry(draft, { score, engine: ENGINE_VERSION, docHash: await docHash(text) })
    const res = await addToList(entry)
    setStatus(res.ok ? 'added' : res.reason === 'duplicate' ? 'duplicate' : 'failed')
  }

  if (status === 'added' || status === 'duplicate') {
    return (
      <section className="eh-addlist" aria-live="polite">
        <p className="label-tag">The List</p>
        <p className="eh-addlist-done">
          {status === 'added'
            ? <>Added, with its score of {score.toFixed(1)}. <Link to="/list">See it on The List</Link>.</>
            : <>This report is already on The List. <Link to="/list">See The List</Link>.</>}
        </p>
      </section>
    )
  }

  const field = (key, label, control) => (
    <label className="eh-field">
      <span>{label}</span>
      {control}
      {errors[key] && <em className="eh-field-error" id={`${key}-error`}>{errors[key]}</em>}
    </label>
  )
  const aria = (key) => (errors[key] ? { 'aria-invalid': true, 'aria-describedby': `${key}-error` } : {})

  return (
    <section className="eh-addlist" aria-labelledby="addlist-h">
      <p className="label-tag">The List</p>
      <h2 id="addlist-h" className="eh-addlist-h">Add this report to The List</h2>
      <p className="eh-addlist-dek">
        The List shows every report added, with its score of{' '}
        <span className="tabular-nums font-semibold">{score.toFixed(1)}</span>, so anyone can sort and
        compare them. Fill in who published it and when; the engine cannot read those reliably.
      </p>

      <form onSubmit={submit} noValidate className="eh-addlist-form">
        {field('company', 'Company or organization',
          <input className="eh-input" value={draft.company} onChange={set('company')} maxLength={LIMITS.company} autoComplete="organization" {...aria('company')} />)}
        {field('industry', 'Industry',
          <select className="eh-select" value={draft.industry} onChange={set('industry')} {...aria('industry')}>
            <option value="">Choose one</option>
            {INDUSTRIES.map((x) => <option key={x}>{x}</option>)}
          </select>)}
        {field('reportType', 'Report type',
          <select className="eh-select" value={draft.reportType} onChange={set('reportType')} {...aria('reportType')}>
            <option value="">Choose one</option>
            {REPORT_TYPES.map((x) => <option key={x}>{x}</option>)}
          </select>)}
        {field('publishedOn', 'Publication date',
          <input className="eh-input" type="date" value={draft.publishedOn} onChange={set('publishedOn')} max={today} min="1900-01-01" {...aria('publishedOn')} />)}
        <div className="eh-addlist-wide">
          {field('reportName', 'Report name',
            <input className="eh-input" value={draft.reportName} onChange={set('reportName')} maxLength={LIMITS.reportName} {...aria('reportName')} />)}
        </div>

        <div className="eh-addlist-wide eh-addlist-actions">
          <button type="submit" className="eh-button" disabled={status === 'sending'}>
            {status === 'sending' ? 'Adding…' : 'Add to The List'}
          </button>
          {status === 'failed' && (
            <p className="eh-field-error" role="alert">The List did not take the entry. Check your connection and try again.</p>
          )}
        </div>
      </form>

      <p className="eh-addlist-note">
        We send only these details, the score, the engine build and a fingerprint of the text (a one-way
        hash that keeps the same report from being listed twice). The text itself stays in your browser.
      </p>
    </section>
  )
}
