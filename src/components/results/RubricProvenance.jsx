import React from 'react'

// Rubric provenance footer — always visible, at the bottom. Auditable grounding
// is the product differentiator: each criterion is shown in IBM Plex Sans, the
// citation in Newsreader, URLs as plain understated links. No colored backgrounds.

export default function RubricProvenance({ provenance = [], rubricLabel }) {
  if (provenance.length === 0) return null
  return (
    <footer className="mt-12 pt-8 border-t border-border">
      <p className="label-tag mb-5">Rubric provenance — {rubricLabel}</p>
      <ul className="space-y-5">
        {provenance.map((p, i) => (
          <li key={i}>
            <p className="font-sans text-[11px] tracking-wide uppercase text-gray-400">
              {p.criterion}
            </p>
            <p className="font-serif text-[15px] text-gray-800 leading-snug mt-1">
              {p.citation}
            </p>
            {p.url && (
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-sans text-xs text-muted hover:text-navy underline underline-offset-2 break-all"
              >
                {p.url}
              </a>
            )}
          </li>
        ))}
      </ul>
    </footer>
  )
}
