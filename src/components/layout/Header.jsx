import React from 'react'
import { Link, useLocation } from 'react-router-dom'

// Sticky translucent cream header with a serif wordmark + tracked tagline —
// the Reference header pattern, adapted to a single-product analysis tool.
export default function Header() {
  const onBrief = useLocation().pathname === '/brief'

  return (
    <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-brief mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="font-serif text-xl font-medium tracking-tight text-gray-900 leading-none">
            Evidence Hedge
          </span>
          <span className="hidden sm:block label-tag border-l border-border pl-3">
            Confidence vs. evidence
          </span>
        </Link>
        {onBrief && (
          <Link to="/" className="btn-ghost -mr-4">
            New brief
          </Link>
        )}
      </div>
    </header>
  )
}
