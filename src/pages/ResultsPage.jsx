import React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import PatternSection from '../components/results/PatternSection.jsx'
import DistributionBar from '../components/results/DistributionBar.jsx'

// The one-page evidence brief — a standalone editorial report, three layers
// top to bottom, serving three readers at once:
//   1. Verdict       — plain-language, Newsreader display-serif headline
//   2. Patterns      — named patterns + verbatim examples (the heart)
//   3. Distribution  — the structural ladder view, understated (the analyst)
// Shares the global token source: navy accent, hairline rules, mono figures.
export default function ResultsPage() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  if (!state.result) return <Navigate to="/" replace />

  const { result, rubric } = state
  const { summary, patterns } = result
  const { flagCounts } = summary
  const flaggedTotal = flagCounts['unsupported-assertion'] + flagCounts.overconfident

  const onNew = () => {
    dispatch({ type: 'RESET' })
    navigate('/')
  }

  return (
    <main className="max-w-brief mx-auto px-6 py-12 page-enter">
      {/* Masthead */}
      <button
        onClick={onNew}
        className="font-sans text-xs text-muted hover:text-gray-900 transition-colors mb-6"
      >
        ← New document
      </button>
      <div className="flex items-baseline justify-between gap-3">
        <p className="label-tag">Evidence brief</p>
        <p className="label-tag text-gray-400">
          Judged as <span className="text-navy">{rubric.label}</span>
          {rubric.stub && ' · draft rubric'}
        </p>
      </div>

      {/* ── Layer 1: Verdict ─────────────────────────────────────────────── */}
      <h1 className="font-serif text-3xl sm:text-4xl font-medium leading-tight tracking-tight text-gray-900 mt-4">
        {summary.verdict}
      </h1>
      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-5 text-[11px] text-muted">
        <span><span className="text-gray-900 font-medium font-mono">{summary.totalClaims}</span> claims weighed</span>
        <span><span className="text-gray-900 font-medium font-mono">{summary.strongClaims}</span> read as strong</span>
        <span><span className="text-gray-900 font-medium font-mono">{flaggedTotal}</span> flagged</span>
      </div>

      <hr className="brief-rule" />

      {/* ── Layer 2: Named patterns (the heart) ──────────────────────────── */}
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="label-tag">Patterns found</h2>
        <span className="label-tag text-gray-400">
          {patterns.length} {patterns.length === 1 ? 'pattern' : 'patterns'}
        </span>
      </div>

      {patterns.length > 0 ? (
        patterns.map(p => <PatternSection key={p.key} pattern={p} />)
      ) : (
        <p className="text-sm text-muted leading-relaxed">
          No confidence-evidence mismatches surfaced. Every strong claim was backed in
          proportion to its certainty, by this rubric's standard.
        </p>
      )}

      <hr className="brief-rule" />

      {/* ── Layer 3: Evidence-hierarchy distribution (understated) ───────── */}
      <h2 className="label-tag mb-4">Evidence distribution</h2>
      <DistributionBar distribution={summary.distribution} />
      <p className="text-[11px] text-gray-400 mt-4 leading-relaxed max-w-prose">
        How this document's claims spread across the {rubric.label.toLowerCase()} ladder,
        strongest evidence to unsourced.
      </p>
    </main>
  )
}
