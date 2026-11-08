import React from 'react'
import { getRubric } from '../../rubrics/index.js'
import { signalTitle } from '../../engine/signals/titles.js'
import { GENRE_LABELS } from './labels.js'
import { GenreChip } from './GenreReading.jsx'

// How the document is judged: the genres in play, the scenario, the evidence
// standard and why, the audits the mix adds, and the frameworks behind them.
// `rubric` is a genre config or a hybrid composed by rubrics/hybrids.js.

const ORIGIN_LABEL = { ...GENRE_LABELS, hybrid: 'This mix', shared: 'Every genre' }
const ORIGINS = ['research', 'corporate', 'journalism', 'general', 'hybrid', 'shared']

function Line({ term, children }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] sm:grid-cols-[8.5rem_1fr] gap-x-4 py-3 border-t border-border">
      <dt className="font-sans text-[11px] tracking-wide uppercase text-gray-400 pt-0.5">{term}</dt>
      <dd className="min-w-0 text-sm text-gray-900 leading-relaxed">{children}</dd>
    </div>
  )
}

export default function JudgmentSummary({ rubric, showFrameworks = true }) {
  const h = rubric.hybrid
  const base = getRubric(rubric.base || rubric.id)
  const genres = h ? h.genres : [base.id]
  const ladder = [...base.ladder].sort((a, b) => a.rank - b.rank).map((r) => r.label)
  const groups = ORIGINS
    .map((o) => ({ origin: o, ids: (h?.audits || []).filter((a) => a.from === o).map((a) => a.id) }))
    .filter((g) => g.ids.length)
  const frameworks = (rubric.provenance || []).filter((p) => p.scope === 'hybrid')

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {genres.map((g, i) => (
          <React.Fragment key={g}>
            {i > 0 && <span className="font-serif text-lg text-gray-300" aria-hidden="true">×</span>}
            <GenreChip genre={g} />
          </React.Fragment>
        ))}
      </div>
      <p className="font-serif text-2xl font-medium tracking-tight text-gray-900 mt-2 leading-snug">
        {h ? h.scenarios.map((s) => s.name).join(' · ') : base.description}
      </p>

      <dl className="mt-4 border-b border-border">
        <Line term="Held to">
          <span className="font-medium">The {base.label.toLowerCase()} evidence standard.</span>{' '}
          {h ? h.why : `One genre fills every role, so the ${base.label.toLowerCase()} rubric applies as written.`}
          <span className="block font-mono text-[11px] text-gray-500 mt-1 break-words">{ladder.join(' → ')}</span>
        </Line>
        <Line term="Audited for">
          {base.label} audits ({base.documentSignals.length})
          {groups.length > 0 ? ', plus:' : h ? '; this mix adds none.' : '.'}
          {groups.map((g) => (
            <span key={g.origin} className="block mt-1">
              <span className="font-sans text-[11px] tracking-wide uppercase text-gray-400">{ORIGIN_LABEL[g.origin]}</span>{' '}
              {g.ids.map(signalTitle).join(' · ')}
            </span>
          ))}
        </Line>
        {showFrameworks && h && (
          <Line term="Grounded in">
            {frameworks.length > 0 && (
              <span className="block font-sans text-[11px] text-gray-400 mb-1">Measured: an audit here checks it. Cited: it frames the mix, nothing measures it yet.</span>
            )}
            {frameworks.length === 0 ? (
              <span className="text-gray-500">No framework specific to this mix — the standards of each genre apply (listed at the foot of the brief).</span>
            ) : (
              <ul className="space-y-1">
                {frameworks.map((f) => (
                  <li key={f.key} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">{f.standard}</span>
                    <span className={`shrink-0 font-sans text-[10px] tracking-widest uppercase ${f.measures?.length ? 'text-accent' : 'text-gray-400'}`}>
                      {f.measures?.length ? 'measured' : 'cited'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Line>
        )}
      </dl>
    </div>
  )
}
