import React, { useMemo, useRef, useState } from 'react'
import { useWidth } from './useWidth.js'
import { fmt, fmtInterval, isShown, labelled, nearest } from './model.js'

// Coverage share against share of new findings, one point per organization, with the
// line where the two are equal. The selected organization in navy, the others grey,
// independent research as open rings. Labels only for the selected organization and
// the extremes; the nearest point answers the pointer; a click selects. One tab stop:
// arrow keys move through the points in reading order, Enter selects. The same
// numbers sit in the table under the figure.
export default function Scatter({ q, selectedId, onSelect, xKey, yKey }) {
  const box = useRef(null)
  const W = useWidth(box, 700)
  const narrow = W < 520
  const H = Math.round(Math.min(460, Math.max(300, W * 0.62)))
  const m = { t: 16, r: narrow ? 18 : 28, b: 46, l: narrow ? 44 : 54 }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const [hot, setHot] = useState(null)
  const [cursor, setCursor] = useState(-1)

  const xm = q.measures.find((d) => d.key === xKey)
  const ym = q.measures.find((d) => d.key === yKey)

  const pts = useMemo(() => q.organizations
    .filter((o) => isShown(o.values[xKey]) && isShown(o.values[yKey]))
    .map((o) => ({ id: o.id, label: o.label, kind: o.kind, x: o.values[xKey].value, y: o.values[yKey].value, o })), [q, xKey, yKey])

  const max = Math.max(0.05, ...pts.map((p) => Math.max(p.x, p.y))) * 1.08
  const nice = niceMax(max)
  const sx = (v) => m.l + (v / nice) * iw
  const sy = (v) => m.t + ih - (v / nice) * ih
  const placed = pts.map((p) => ({ ...p, sx: sx(p.x), sy: sy(p.y) }))
  const order = [...placed].sort((a, b) => a.sx - b.sx || a.sy - b.sy)
  const show = labelled(placed, selectedId)
  const ticks = [0, nice / 4, nice / 2, (3 * nice) / 4, nice]

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    setHot(nearest(placed, e.clientX - r.left, e.clientY - r.top))
  }
  const onKey = (e) => {
    if (!order.length) return
    let i = cursor
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = Math.min(order.length - 1, i + 1)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = Math.max(0, i - 1)
    else if (e.key === 'Home') i = 0
    else if (e.key === 'End') i = order.length - 1
    else if ((e.key === 'Enter' || e.key === ' ') && hot) { e.preventDefault(); onSelect(hot.id); return }
    else if (e.key === 'Escape') { setHot(null); return }
    else return
    e.preventDefault()
    setCursor(i)
    setHot(order[i])
  }

  if (pts.length < 3) {
    return (
      <p className="rec-state" role="status">
        {pts.length === 0
          ? (q.organizations.every((o) => o.values[xKey]?.gate === 'pending')
            ? `${xm.label} is not measured yet, so this figure of ${xm.label.toLowerCase()} against ${ym.label.toLowerCase()} waits for it.`
            : q.organizations.some((o) => o.values[xKey]?.gate === 'too_few')
              ? `No independent news article about these reports was found in the sources searched, so the figure of ${xm.label.toLowerCase()} against ${ym.label.toLowerCase()} has nothing to plot.`
              : 'No organization has both measures yet, so there is nothing to plot.')
          : 'Too few organizations have both measures to plot.'}
      </p>
    )
  }

  const tipLeft = hot ? Math.min(Math.max(hot.sx + 12, 0), W - 200) : 0
  const tipTop = hot ? Math.max(hot.sy - 70, 0) : 0
  const sel = placed.find((p) => p.id === selectedId)

  return (
    <figure className="rec-figure" ref={box}>
      <svg
        className="rec-plot"
        width={W}
        height={H}
        role="group"
        aria-roledescription="scatter plot"
        aria-label={`${xm.label} against ${ym.label}, one point per organization. Use the arrow keys to move between points and Enter to select one. The table below lists the same values.`}
        tabIndex={0}
        onPointerMove={onMove}
        onPointerLeave={() => setHot(null)}
        onClick={() => hot && onSelect(hot.id)}
        onKeyDown={onKey}
        onBlur={() => { setHot(null); setCursor(-1) }}
      >
        {ticks.map((t) => (
          <g key={`x${t}`}>
            <line className="grid" x1={sx(t)} x2={sx(t)} y1={m.t} y2={m.t + ih} />
            <text className="tick" x={sx(t)} y={m.t + ih + 16} textAnchor={t === 0 ? 'start' : 'middle'}>{fmt(t, 'share')}</text>
          </g>
        ))}
        {ticks.map((t) => (
          <g key={`y${t}`}>
            <line className="grid" x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} />
            {t > 0 && <text className="tick" x={m.l - 6} y={sy(t) + 4} textAnchor="end">{fmt(t, 'share')}</text>}
          </g>
        ))}
        <line className="equal" x1={sx(0)} y1={sy(0)} x2={sx(nice)} y2={sy(nice)} />
        <text className="eq-label" x={sx(nice) - 4} y={sy(nice) + 14} textAnchor="end">Equal shares</text>
        <text className="axis-label" x={m.l + iw} y={H - 6} textAnchor="end">{xm.label} →</text>
        <text className="axis-label" x={m.l} y={m.t - 4} textAnchor="start" transform={`rotate(0)`}>↑ {ym.label}</text>
        {placed.filter((p) => p.id !== selectedId).map((p) => (
          <circle key={p.id} className={`pt${p.kind === 'independent' ? ' ring' : ''}${hot?.id === p.id ? ' hot' : ''}`} cx={p.sx} cy={p.sy} r={5} />
        ))}
        {sel && <circle className={`pt sel${sel.kind === 'independent' ? ' ring' : ''}${hot?.id === sel.id ? ' hot' : ''}`} cx={sel.sx} cy={sel.sy} r={6.5} />}
        {placed.filter((p) => show.has(p.id)).map((p) => {
          const right = p.sx < m.l + iw * 0.7
          return (
            <text key={`l${p.id}`} className={`lbl${p.id === selectedId ? ' sel' : ''}`} x={p.sx + (right ? 9 : -9)} y={p.sy - 8} textAnchor={right ? 'start' : 'end'}>
              {short(p.label)}
            </text>
          )
        })}
      </svg>
      {hot && (
        <div className="rec-tooltip" style={{ left: tipLeft, top: tipTop }} aria-hidden="true">
          <b>{hot.label}</b>
          <div>{xm.label} <span className="rec-num">{fmt(hot.x, 'share')}</span></div>
          <div>{ym.label} <span className="rec-num">{fmt(hot.y, 'share')}</span></div>
          <div className="rec-num" style={{ color: 'var(--rec-ink-3)' }}>{hot.o.documents} documents</div>
        </div>
      )}
      <p className="rec-sr" aria-live="polite">{hot ? `${hot.label}: ${xm.label} ${fmt(hot.x, 'share')}, ${ym.label} ${fmt(hot.y, 'share')}. Press Enter to select.` : ''}</p>
      <div className="rec-key" aria-hidden="true">
        <span><i className="k-sel" />Selected</span>
        <span><i className="k-oth" />Other organizations</span>
        {pts.some((p) => p.kind === 'independent') && <span><i className="k-ring" />Independent research</span>}
      </div>
      <details className="rec-details">
        <summary>The figure as a table</summary>
        <div className="rec-scroll" tabIndex={0} role="region" aria-label="The figure as a table">
          <table className="rec-table">
            <thead>
              <tr><th scope="col">Organization</th><th scope="col" className="n">{xm.label}</th><th scope="col" className="n">{ym.label}</th><th scope="col" className="n">Documents</th></tr>
            </thead>
            <tbody>
              {[...placed].sort((a, b) => a.o.n - b.o.n).map((p) => (
                <tr key={p.id}>
                  <th scope="row" style={{ fontWeight: p.id === selectedId ? 600 : 400 }}>{p.label}{p.kind === 'independent' ? ' (independent)' : ''}</th>
                  <td className="n rec-num">{fmt(p.x, 'share')} <span className="rec-basis" style={{ display: 'inline' }}>{fmtInterval(p.o.values[xKey], 'share')}</span></td>
                  <td className="n rec-num">{fmt(p.y, 'share')} <span className="rec-basis" style={{ display: 'inline' }}>{fmtInterval(p.o.values[yKey], 'share')}</span></td>
                  <td className="n rec-num">{p.o.documents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}

function niceMax(v) {
  const steps = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1]
  return steps.find((s) => s >= v) || 1
}

function short(label) {
  return label
}
