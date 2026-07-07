import React from 'react'
import ParticleMark from '../ParticleMark.jsx'
import { accentFor } from '../../rubrics/accents.js'

// The verdict mark — the landing sphere carried onto the results page as the
// product's visual throughline. Its SIZE and COLOR INTENSITY (+ coherence)
// encode the document's overall quality, annotated with a technical-drawing
// bracket, leader line, and a text box carrying the score and one-line summary.
//
// PROVISIONAL visual constants — surface in the completion report.
const SIZE_MIN = 96
const SIZE_MAX = 220
const BRACKET_DIAMETER_FACTOR = 0.6 // sphere nominal diameter (2R) as a fraction of size
const BRACKET_LIFT_FACTOR = 0.14    // pull the bracket up under the sphere (canvas has bottom whitespace)

// Score → visual mapping. Quality NEVER introduces a new hue; it only
// desaturates (intensity) and disperses (coherence) the rubric's OWN color.
// If a different mapping is ratified later, only these three lines change:
const markSize = (score) => SIZE_MIN + ((score - 1) / 9) * (SIZE_MAX - SIZE_MIN) // 1→96px, 10→220px
const markIntensity = (score) => (score - 1) / 9                                  // 1→0 (gray), 10→1 (full hue)
const markCoherence = (score) => (score - 1) / 9                                  // 1→0 (dispersed), 10→1 (lattice)

export default function VerdictMark({ score, rubricId }) {
  const s = score.score
  const size = Math.round(markSize(s))
  const hue = accentFor(rubricId)
  const diameter = Math.round(size * BRACKET_DIAMETER_FACTOR)
  const lift = Math.round(size * BRACKET_LIFT_FACTOR)

  return (
    <section className="flex flex-col items-center text-center mb-10" aria-label="Overall quality">
      <ParticleMark
        size={size}
        hue={hue}
        intensity={markIntensity(s)}
        coherence={markCoherence(s)}
      />

      {/* Dimension bracket — literally spans the mark's diameter (square end
          ticks, hairline, low emphasis). Pulled up under the sphere. */}
      <svg
        width={diameter}
        height="12"
        viewBox={`0 0 ${diameter} 12`}
        className="text-gray-300 block"
        style={{ marginTop: -lift }}
        aria-hidden="true"
      >
        <g stroke="currentColor" strokeWidth="1" strokeLinecap="square" fill="none" vectorEffect="non-scaling-stroke">
          <line x1="0.5" y1="2.5" x2={diameter - 0.5} y2="2.5" />
          <line x1="0.5" y1="2.5" x2="0.5" y2="10" />
          <line x1={diameter - 0.5} y1="2.5" x2={diameter - 0.5} y2="10" />
        </g>
      </svg>

      {/* 1px leader from the bracket midpoint down to the annotation box. On
          narrow widths this is the vertical leader; the box stays below. */}
      <div className="w-px bg-gray-300" style={{ height: 16 }} aria-hidden="true" />

      {/* Annotation box — true white, square, separated by a whisper shadow
          only (no border). Score in mono, summary in sans. Nothing else. */}
      <div
        className="bg-white px-5 py-3"
        style={{ boxShadow: '0 1px 2px rgba(23,24,26,0.05)', maxWidth: 320 }}
      >
        <div className="font-mono text-2xl text-gray-900 leading-none tabular-nums">
          {score.display} / 10
        </div>
        <p className="font-sans text-[13px] text-muted leading-snug mt-2">
          {score.summary}
        </p>
      </div>
    </section>
  )
}
