import React, { useRef } from 'react'
import { useWidth } from './useWidth.js'

// The dot-and-interval mark: the organization's estimate (dot), its 95% interval
// (line) and the field median (tick), on the row's own scale. The row's cells say
// the same in words and numbers, so the drawing is hidden from assistive technology.
export default function Mark({ cell, median, domain, signed }) {
  const ref = useRef(null)
  const W = Math.max(60, useWidth(ref, 200))
  const H = 22
  const [lo, hi] = domain
  const x = (v) => 5 + ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * (W - 10)
  const has = cell && cell.value !== null && cell.value !== undefined
  return (
    <div ref={ref}>
      <svg className="rec-mark" width={W} height={H} aria-hidden="true" focusable="false">
        <line className="axis" x1="0" x2={W} y1={H / 2} y2={H / 2} />
        {signed && lo < 0 && hi > 0 && <line className="zero" x1={x(0)} x2={x(0)} y1="3" y2={H - 3} />}
        {median !== null && median !== undefined && (
          <line className="med" x1={x(median)} x2={x(median)} y1="4" y2={H - 4} />
        )}
        {has && cell.lo !== null && cell.lo !== undefined && (
          <line className="iv" x1={x(cell.lo)} x2={x(cell.hi)} y1={H / 2} y2={H / 2} />
        )}
        {has && <circle className="dot" cx={x(cell.value)} cy={H / 2} r="4" />}
      </svg>
    </div>
  )
}
