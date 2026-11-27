import React from 'react'
import Mark from './Mark.jsx'
import { STATES, fmt, fmtInterval } from './model.js'

// The four views under the figure. They open in place; none adds a heading.

export function OpenGroundView({ q }) {
  const rows = q.open_ground?.rows || []
  if (!rows.length) return <p className="rec-state">Open ground is not estimated yet.</p>
  const has = (r) => r.residual && r.residual.value !== null && r.residual.value !== undefined
  const vals = rows.filter(has).flatMap((r) => [r.residual.lo ?? r.residual.value, r.residual.hi ?? r.residual.value, r.residual.value])
  const domain = vals.length ? [Math.min(0, ...vals) - 0.2, Math.max(0, ...vals) + 0.2] : [-1, 1]
  return (
    <>
      <p>{q.open_ground.summary}</p>
      <table className="rec-table stack og">
        <caption className="rec-sr">Sub-questions by how far news demand runs ahead of the documents that answer them, with 95% intervals.</caption>
        <thead>
          <tr>
            <th scope="col">Sub-question</th>
            <th scope="col" className="n">Demand gap</th>
            <th scope="col" className="n">95% interval</th>
            <th scope="col" className="n">Years of past</th>
            <th scope="col"><span className="rec-sr">Mark: dot is the gap, line the interval, tick zero</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.subq}>
              <th scope="row" className="c-name" style={{ fontWeight: 500 }}>
                {r.label}
                <span className="rec-basis">{r.basis}{r.saturated ? `; demand stopped rising in ${r.saturated}` : ''}</span>
              </th>
              <td className="n v">
                {has(r) ? fmt(r.residual.value, 'score', { signed: true })
                  : <span className="rec-state" title={r.residual?.reason || ''}>{STATES[r.residual?.gate] || 'Pending'}</span>}
              </td>
              <td className="n ci">{has(r) ? fmtInterval(r.residual, 'score') : ''}</td>
              <td className="n med yrs">{r.depth_years === null || r.depth_years === undefined ? '—' : r.depth_years.toFixed(1)}</td>
              <td className="mark">{has(r) ? <Mark cell={r.residual} median={0} domain={domain} signed /> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

export function FirstView({ q, org }) {
  const rows = q.first_claims?.rows || []
  return (
    <>
      <p>{q.first_claims?.summary}</p>
      {rows.length > 0 && (
        <div className="rec-scroll" tabIndex={0} role="region" aria-label="“First” claims table">
          <table className="rec-table">
            <caption className="rec-sr">Claims to be first, each checked against earlier documents in the map.</caption>
            <thead>
              <tr>
                <th scope="col">Organization</th>
                <th scope="col">Claimed first in</th>
                <th scope="col">Verdict</th>
                <th scope="col">Checked against</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={r.org === org.id ? { fontWeight: 600 } : undefined}>
                  <th scope="row" style={{ fontWeight: 'inherit' }}>{r.org_label}<span className="rec-basis">{r.ref}</span></th>
                  <td>{r.stated}</td>
                  <td>{r.verdict}</td>
                  <td style={{ fontSize: 13, color: 'var(--rec-ink-2)' }}>{r.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

export function ClaimsView({ q, org }) {
  const c = q.claims?.[org.id]
  if (!c) return <p className="rec-state">No claims are recorded for {org.label}.</p>
  return (
    <>
      <p>{q.claims_summary}</p>
      <table className="rec-table">
        <caption className="rec-sr">{`What happened to ${org.label}'s claims.`}</caption>
        <thead>
          <tr><th scope="col">{org.label}</th><th scope="col" className="n">Claims</th><th scope="col" className="n">Share</th></tr>
        </thead>
        <tbody>
          {c.rows.map((r) => (
            <tr key={r.key}>
              <th scope="row" style={{ fontWeight: r.indent ? 400 : 500, paddingLeft: r.indent ? 16 : 0 }}>{r.label}</th>
              <td className="n rec-num">{r.n === null ? <span className="rec-state">{STATES[r.gate] || 'Pending'}</span> : r.n.toLocaleString('en-US')}</td>
              <td className="n rec-num">{r.share === null || r.share === undefined ? '' : fmt(r.share, 'share')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {c.designs?.length > 0 && (
        <table className="rec-table" style={{ marginTop: 18 }}>
          <caption className="rec-sr">{`${org.label}'s documents by study design.`}</caption>
          <thead>
            <tr><th scope="col">Design</th><th scope="col" className="n">Documents</th><th scope="col" className="n">Stated sample, median</th></tr>
          </thead>
          <tbody>
            {c.designs.map((d) => (
              <tr key={d.design}>
                <th scope="row" style={{ fontWeight: 400 }}>{d.design}</th>
                <td className="n rec-num">{d.documents}</td>
                <td className="n rec-num">{d.sample_median ? d.sample_median.toLocaleString('en-US') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

export function MethodView({ q, file }) {
  const me = q.method
  return (
    <>
      <p className="rec-note">How the Record measures. The Method page in the site’s menu covers the evidence brief.</p>
      <dl className="rec-dl">
        {q.measures.map((m) => (
          <React.Fragment key={m.key}>
            <dt>{m.label}</dt>
            <dd>{m.definition}</dd>
            {m.how && <dd>{m.how}</dd>}
            {m.cite && <dd className="rec-cite">{m.cite}</dd>}
          </React.Fragment>
        ))}
        {(me.models || []).map((mo) => (
          <React.Fragment key={mo.name}>
            <dt>{mo.name}</dt>
            <dd>{mo.what}</dd>
            <dd><span style={{ fontWeight: 500 }}>Assumes</span> {mo.assumes}</dd>
            <dd><span style={{ fontWeight: 500 }}>Fails when</span> {mo.fails}</dd>
            {mo.cite && <dd className="rec-cite">{mo.cite}</dd>}
          </React.Fragment>
        ))}
      </dl>
      <table className="rec-table" style={{ marginTop: 24 }}>
        <caption className="rec-sr">Each gate an input must pass before an organization is named.</caption>
        <thead><tr><th scope="col">Input</th><th scope="col">Status</th><th scope="col">Detail</th></tr></thead>
        <tbody>
          {(me.gates || []).map((g) => (
            <tr key={g.name}>
              <th scope="row" style={{ fontWeight: 500 }}>{g.name}</th>
              <td>{STATES[g.status] || g.status}</td>
              <td style={{ fontSize: 13, color: 'var(--rec-ink-2)' }}>{g.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(me.findings || []).length > 0 && (
        <div className="rec-scroll" tabIndex={0} role="region" aria-label="Research analyses" style={{ marginTop: 24 }}>
          <table className="rec-table">
            <caption className="rec-sr">Research analyses at this map's scale. None is a measure of one organization.</caption>
            <thead><tr><th scope="col">Analysis</th><th scope="col">Status</th><th scope="col">At this scale</th></tr></thead>
            <tbody>
              {me.findings.map((f) => (
                <tr key={f.name}>
                  <th scope="row" style={{ fontWeight: 500 }}>{f.name}</th>
                  <td style={{ whiteSpace: 'nowrap' }}>{STATES[f.gate] || f.gate}</td>
                  <td style={{ fontSize: 13, color: 'var(--rec-ink-2)' }}>{f.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {me.objection && (
        <dl className="rec-dl">
          <dt>The strongest objection</dt>
          <dd>{me.objection.text}</dd>
          <dd><span style={{ fontWeight: 500 }}>Answer</span> {me.objection.answer}</dd>
        </dl>
      )}
      {(me.limits || []).length > 0 && (
        <dl className="rec-dl">
          <dt>What these figures cannot show</dt>
          {me.limits.map((l) => <dd key={l}>{l}</dd>)}
        </dl>
      )}
      <p className="rec-note" style={{ marginTop: 24 }}>
        Map build <span className="rec-num">{q.build.map_build_hash}</span> · engine <span className="rec-num">{q.build.engine_version}</span> · window <span className="rec-num">{q.build.window.join(' to ')}</span> · {me.constants_provisional} constants provisional, none ratified · file schema <span className="rec-num">{file.schema}</span>
      </p>
    </>
  )
}
