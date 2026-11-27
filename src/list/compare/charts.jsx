import React, { useRef } from 'react'
import { useWidth } from '../../record/useWidth.js'

// Hand-built marks for the compare grid. The chosen firm draws in ink, the
// others in a grey that reaches 3:1, the context column in the lightest grey;
// every value a mark shows is also printed beside it and listed in a hidden
// table, so the SVGs are hidden from screen readers.

// A bar on a shared scale, with one thin tick per report under it (a barcode
// of every report behind the median) and, in another firm's cell, a short ink
// tick at the chosen firm's value.
export function BarCell({ value, max, min = 0, ticks = [], mark = null, tone = 'other' }) {
  const x = (v) => ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100
  return (
    <svg className={`cmp-bar is-${tone}`} viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <line className="cmp-axis" x1="0" x2="100" y1="12.5" y2="12.5" vectorEffect="non-scaling-stroke" />
      {value != null && <rect className="cmp-barfill" x="0" y="3" width={Math.max(0.6, x(value))} height="9" />}
      {ticks.map((t, i) => <line key={i} className="cmp-tick" x1={x(t)} x2={x(t)} y1="15" y2="23" vectorEffect="non-scaling-stroke" />)}
      {mark != null && <line className="cmp-mark" x1={x(mark)} x2={x(mark)} y1="0" y2="14" vectorEffect="non-scaling-stroke" />}
    </svg>
  )
}

// A small chart of one firm's reports by publication year: a faint dot per
// report and the Theil–Sen line through them, on scales shared across the row.
export function TimeCell({ points, line, xDomain, yMax, tone = 'other' }) {
  const box = useRef(null)
  const W = useWidth(box, 160)
  const H = 64
  const pad = 4
  const [x0, x1] = xDomain
  const sx = (v) => pad + ((v - x0) / Math.max(1, x1 - x0)) * (W - 2 * pad)
  const sy = (v) => H - pad - (Math.max(0, Math.min(yMax, v)) / yMax) * (H - 2 * pad)
  const from = line ? Math.min(...points.map((p) => p.x)) : null
  const to = line ? Math.max(...points.map((p) => p.x)) : null
  return (
    <div className="cmp-time" ref={box}>
      <svg className={`cmp-timechart is-${tone}`} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
        <line className="cmp-axis" x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} />
        {points.map((p, i) => <circle key={i} className="cmp-dot" cx={sx(p.x + (p.jitter || 0))} cy={sy(p.y)} r="1.7" />)}
        {line && from !== to && (
          <line className="cmp-trend" x1={sx(from)} x2={sx(to)} y1={sy(line.intercept + line.slope * from)} y2={sy(line.intercept + line.slope * to)} />
        )}
      </svg>
    </div>
  )
}

// One row's interval against the no-difference line, on the group's scale.
export function IntervalPlot({ lo, hi, est, domain }) {
  const [d0, d1] = domain
  const x = (v) => ((Math.max(d0, Math.min(d1, v)) - d0) / (d1 - d0)) * 100
  const zero = x(0)
  return (
    <svg className="cmp-interval" viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <line className="cmp-zero" x1={zero} x2={zero} y1="0" y2="14" vectorEffect="non-scaling-stroke" />
      {lo != null && hi != null && <line className="cmp-ci" x1={x(lo)} x2={x(hi)} y1="7" y2="7" vectorEffect="non-scaling-stroke" />}
      {est != null && Number.isFinite(est) && <rect className="cmp-est" x={x(est) - 0.9} y="3" width="1.8" height="8" />}
    </svg>
  )
}
