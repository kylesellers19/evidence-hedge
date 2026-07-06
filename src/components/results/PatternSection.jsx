import React from 'react'

// One named pattern: its name, a one-line description of how the writing
// manufactures false confidence, and 2–3 verbatim example lines from the
// document. The researcher reads the logic; the general reader reads the
// examples. Flagged example lines carry the left gold-border highlight.
export default function PatternSection({ pattern }) {
  return (
    <section className="mb-8 last:mb-0">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <h3 className="font-serif text-xl font-medium tracking-tight text-gray-900">
          {pattern.name}
        </h3>
        <span className="label-tag whitespace-nowrap">
          {pattern.count} {pattern.count === 1 ? 'instance' : 'instances'}
        </span>
      </div>

      <p className="text-sm text-muted leading-relaxed max-w-prose mb-4">
        {pattern.description}
      </p>

      <p className="label-tag mb-2.5">From this document</p>
      <ul className="space-y-3">
        {pattern.examples.map((line, i) => (
          <li key={i} className="example-line">
            “{line}”
          </li>
        ))}
      </ul>
    </section>
  )
}
