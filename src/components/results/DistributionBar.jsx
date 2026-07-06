import React from 'react'

// Layer 3 — the structural view, understated. How the document's claims spread
// across the rubric's evidence ladder, well-sourced → unsourced. A compact row
// of counts with a single proportional bar, not a dashboard.

const TINT_BAR = {
  supported: 'bg-emerald-300',
  partial: 'bg-amber-300',
  unsupported: 'bg-gray-300',
}
const TINT_DOT = {
  supported: 'bg-emerald-500',
  partial: 'bg-amber-500',
  unsupported: 'bg-gray-400',
}

export default function DistributionBar({ distribution }) {
  // Show strongest evidence at the top, unsourced at the bottom.
  const rows = [...distribution].sort((a, b) => b.rung.rank - a.rung.rank)
  const total = distribution.reduce((n, d) => n + d.count, 0) || 1
  const max = Math.max(...distribution.map(d => d.count), 1)

  return (
    <div className="space-y-2">
      {rows.map(({ rung, count }) => (
        <div key={rung.key} className="flex items-center gap-3">
          <span className={`w-1.5 h-1.5 shrink-0 ${TINT_DOT[rung.tint]}`} />
          <span className="w-44 shrink-0 text-[11px] text-gray-600">{rung.label}</span>
          <div className="flex-1 h-2 bg-linen">
            <div
              className={`h-full ${TINT_BAR[rung.tint]}`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-[11px] text-gray-500 font-mono">
            {count}
          </span>
          <span className="w-10 shrink-0 text-right text-[10px] text-gray-400 font-mono">
            {Math.round((count / total) * 100)}%
          </span>
        </div>
      ))}
    </div>
  )
}
