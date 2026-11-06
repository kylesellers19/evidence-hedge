import React from 'react'
import { ROLE_META, GENRE_LABELS, genreHue, roleText } from './labels.js'

// The genre reading — the four roles (speaker, form, stake, evidence), each in
// the hue of the genre that fills it. Shared by the branch screen and the
// brief. Same register as Document profile: hairline rules, no fills, spans in
// mono. The strip on top is the blend: one segment per role.

const ROLES = ['speaker', 'form', 'stake', 'evidence']

// Provenance text cues carry a regex source as their signal; show only the span.
const readable = (e) => (e.signal && !e.signal.startsWith('text:') ? `${e.signal} · ` : '')

export function BlendStrip({ roles }) {
  return (
    <div className="flex h-1.5 w-full gap-px" aria-hidden="true">
      {ROLES.map((role) => (
        <span
          key={role}
          className="flex-1"
          style={{ background: roles[role] ? genreHue(roles[role].genre) : 'var(--eh-hairline)', opacity: roles[role] ? 1 : 0.45 }}
        />
      ))}
    </div>
  )
}

export function GenreChip({ genre }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-sans text-[10px] tracking-widest uppercase whitespace-nowrap" style={{ color: genreHue(genre) }}>
      <span className="inline-block w-2 h-2" style={{ background: genreHue(genre) }} />
      {GENRE_LABELS[genre]}
    </span>
  )
}

export default function GenreReading({ roles, compact = false }) {
  return (
    <div>
      <BlendStrip roles={roles} />
      <dl className="mt-3 border-b border-border">
        {ROLES.map((role) => {
          const r = roles[role]
          return (
            <div key={role} className="grid grid-cols-[5.5rem_1fr] sm:grid-cols-[8.5rem_1fr] gap-x-4 py-3 border-t border-border">
              <dt>
                <span className="block font-sans text-[11px] tracking-wide uppercase text-gray-400">{ROLE_META[role].label}</span>
                {!compact && <span className="hidden sm:block font-sans text-[11px] text-gray-400 mt-0.5 leading-snug">{ROLE_META[role].question}</span>}
              </dt>
              <dd className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {r
                    ? <GenreChip genre={r.genre} />
                    : <span className="font-sans text-[10px] tracking-widest uppercase text-gray-300">None</span>}
                  <span className={`text-sm leading-relaxed ${r ? 'text-gray-900' : 'text-gray-400'}`}>{roleText(role, r)}</span>
                </div>
                {r?.evidence?.length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {r.evidence.slice(0, compact ? 1 : 2).map((e, i) => (
                      <li key={i} className="font-mono text-[11px] text-gray-500 leading-relaxed break-words">
                        {readable(e)}“{e.span}”
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
