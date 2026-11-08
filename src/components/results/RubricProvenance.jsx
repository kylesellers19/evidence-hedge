import React from 'react'
import { signalTitle } from '../../engine/signals/titles.js'
import { PATTERN_META } from '../../engine/patterns.js'
import { GENRE_LABELS } from '../genre/labels.js'

// Rubric provenance footer — always visible, at the bottom. Auditable grounding
// is the product differentiator: each criterion is shown in Libre Franklin, the
// citation in Source Serif, URLs as plain understated links. No colored backgrounds.
// A hybrid (rubrics/hybrids.js) lists its own frameworks first, each with what
// it measures here, then each genre's standards, then the shared measures.

const measureName = (id) => PATTERN_META[id]?.name || signalTitle(id)

function Entry({ p }) {
  return (
    <li>
      <p className="font-sans text-[11px] tracking-wide uppercase text-gray-400">{p.criterion}</p>
      <p className="font-serif text-[15px] text-gray-800 leading-snug mt-1">{p.citation}</p>
      {p.scope === 'hybrid' && (
        <p className="font-sans text-[11px] mt-1 text-gray-500">
          {p.measures?.length
            ? <>Measured here by: <span className="text-gray-800">{p.measures.map(measureName).join(' · ')}</span></>
            : 'Cited for this mix — not yet measured by Evidence Hedge.'}
        </p>
      )}
      {p.url && (
        <a href={p.url} target="_blank" rel="noreferrer noopener" className="font-sans text-xs text-muted hover:text-accent underline underline-offset-2 break-all">
          {p.url}
        </a>
      )}
    </li>
  )
}

export default function RubricProvenance({ provenance = [], rubricLabel }) {
  if (provenance.length === 0) return null
  // Groups in the order the hybrid lists them: its own, its genres in role order, shared.
  const scoped = provenance.some((p) => p.scope)
  const groups = scoped
    ? [...new Set(provenance.map((p) => p.scope))].map((scope) => ({ scope, entries: provenance.filter((p) => p.scope === scope) }))
    : [{ scope: null, entries: provenance }]
  const heading = (scope) => scope === 'hybrid' ? 'Frameworks for this mix'
    : scope === 'shared' ? 'Shared measurement standards'
    : `${GENRE_LABELS[scope]} standards`

  return (
    <footer className="mt-12 pt-8 border-t border-border">
      <p className="label-tag mb-5">Rubric provenance — {rubricLabel}</p>
      {groups.map((g) => (
        <div key={g.scope || 'all'} className={g.scope ? 'mb-8' : ''}>
          {g.scope && <p className="label-tag text-gray-400 mb-4">{heading(g.scope)}</p>}
          <ul className="space-y-5">
            {g.entries.map((p, i) => <Entry key={i} p={p} />)}
          </ul>
        </div>
      ))}
    </footer>
  )
}
