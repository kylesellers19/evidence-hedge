import React from 'react'
import GenreReading from '../genre/GenreReading.jsx'
import JudgmentSummary from '../genre/JudgmentSummary.jsx'
import { GENRE_LABELS } from '../genre/labels.js'

// How it was judged — the genre reading and the judgment it set, on the brief.
// Rendered above Document profile, in the same register. When the person
// changed the detected genres on the branch screen, the brief says so and
// names what was detected.

export default function JudgmentBasis({ rubric, profile, reading }) {
  const roles = profile?.genre?.roles
  if (!roles) return null
  const adjusted = reading && reading.detected.join() !== reading.chosen.join()
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-4">
        <h2 className="label-tag">How it was judged</h2>
        <span className="label-tag text-gray-400">{adjusted ? 'genres adjusted by you' : 'detected automatically'}</span>
      </div>
      {adjusted && (
        <p className="text-[12px] text-muted leading-relaxed mb-4">
          Detected as {reading.detected.map((g) => GENRE_LABELS[g]).join(' × ')}; judged as{' '}
          {reading.chosen.map((g) => GENRE_LABELS[g]).join(' × ')} at your request.
        </p>
      )}
      <JudgmentSummary rubric={rubric} showFrameworks={false} />
      <div className="mt-6">
        <GenreReading roles={roles} compact />
      </div>
    </section>
  )
}
