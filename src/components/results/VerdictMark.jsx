import React from 'react'
import { Link } from 'react-router-dom'
import ParticleMark from '../ParticleMark.jsx'
import { METHOD, scoreAnchor } from './briefTop.js'
import { accentFor } from '../../rubrics/accents.js'

// The verdict mark — the landing sphere carried onto the results page as the
// product's visual throughline. Its SIZE and COLOR INTENSITY (+ coherence)
// encode the document's overall quality, annotated with a technical-drawing
// bracket, leader line, and a text box carrying the score and one-line summary.
//
// PROVISIONAL visual constants — surface in the completion report.
const SIZE_MIN = 96
const SIZE_MAX = 220
// The bracket spans the mark as drawn, not its lattice. ParticleMark puts its
// sphere at radius 0.30 × size (a 0.6 × size lattice) and pushes particles off
// it by up to 0.6 lattice units as coherence falls, so a low score draws a
// wider cloud. Fitted to the horizontal span holding 98% of particles in a
// simulation of ParticleMark's own placement (coherence 1 → 0.62, 0.5 → 0.75,
// 0 → 0.95 of size), and capped at the canvas. PROVISIONAL — not ratified.
const drawnDiameter = (coherence) => Math.min(1, 0.6 + 0.35 * Math.pow(1 - coherence, 1.2))
// Pull the bracket up into the canvas's empty margin below the cloud, leaving
// 0.06 × size of air; a dispersed cloud fills the canvas and leaves none.
const bracketLift = (diameter) => Math.max(0, (1 - diameter) / 2 - 0.06)

// Score → visual mapping. Quality NEVER introduces a new hue; it only
// desaturates (intensity) and disperses (coherence) the rubric's OWN color.
// If a different mapping is ratified later, only these three lines change:
const markSize = (score) => SIZE_MIN + ((score - 1) / 9) * (SIZE_MAX - SIZE_MIN) // 1→96px, 10→220px
const markIntensity = (score) => (score - 1) / 9                                  // 1→0 (gray), 10→1 (full hue)
const markCoherence = (score) => (score - 1) / 9                                  // 1→0 (dispersed), 10→1 (lattice)

// A document with no claims has no score: the smallest mark, no hue, and
// neither gathered nor scattered.
const UNSCORED_COHERENCE = 0.5

export default function VerdictMark({ score, rubricId }) {
  const s = score.score
  const scored = s != null
  const size = Math.round(scored ? markSize(s) : SIZE_MIN)
  const hue = accentFor(rubricId)
  const coherence = scored ? markCoherence(s) : UNSCORED_COHERENCE
  const drawn = drawnDiameter(coherence)
  const diameter = Math.round(size * drawn)
  const lift = Math.round(size * bracketLift(drawn))

  return (
    <section className="flex flex-col items-center text-center mb-10" aria-label="Overall quality">
      <ParticleMark
        size={size}
        hue={hue}
        intensity={scored ? markIntensity(s) : 0}
        coherence={coherence}
      />

      {/* Dimension bracket — spans the mark as drawn (square end ticks,
          hairline, low emphasis). Pulled up under the cloud. */}
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

      {/* Annotation box — white, square, a hairline border (no shadow, as on
          delgam.org). Score in tabular serif figures, summary in sans. */}
      <div
        className="bg-white border border-border px-5 py-3"
        style={{ maxWidth: 320 }}
      >
        <div className="font-serif font-bold text-2xl text-gray-900 leading-none tabular-nums">
          {scored ? (
            // The number links to what that score means (Method, "What makes a 1 through a 10").
            <Link className="eh-score-link" to={`${METHOD}#${scoreAnchor(score.display)}`} aria-label={`Score ${score.display} of 10: what a ${score.display} means`}>
              {score.display} / 10
            </Link>
          ) : 'No score'}
        </div>
        <p className="font-sans text-[13px] text-muted leading-snug mt-2">
          {score.summary}
        </p>
      </div>
    </section>
  )
}
