import React from 'react'

// One document-type / rubric card. Everything shown is read off the config —
// the ladder's bottom & top rungs and a compact glyph of the tolerance curve —
// so the four cards visibly differ by their rubric, driven entirely by data.
//
// Selected = black fill + white text (the Reference active-state convention).

function ToleranceGlyph({ ceilings, selected }) {
  // A tiny bar-sparkline of the tolerance ceilings (strict = low/flat,
  // lenient = high). Gold when selected-context wants emphasis, else ink.
  const max = 4
  return (
    <div className="flex items-end gap-0.5 h-4" aria-hidden="true">
      {ceilings.map((c, i) => (
        <span
          key={i}
          className={selected ? 'bg-white/70' : 'bg-gray-300'}
          style={{ width: 4, height: `${(c / max) * 100}%` }}
        />
      ))}
    </div>
  )
}

export default function DocTypeCard({ rubric, selected, onSelect }) {
  const ladder = [...rubric.ladder].sort((a, b) => a.rank - b.rank)
  const bottom = ladder[0]
  const top = ladder[ladder.length - 1]
  const strict = rubric.tolerance.ceilings[0] <= 1

  return (
    <button
      type="button"
      onClick={() => onSelect(rubric.id)}
      aria-pressed={selected}
      className={`text-left border transition-colors duration-200 p-5 h-full flex flex-col ${
        selected
          ? 'bg-gray-900 border-gray-900 text-white'
          : 'bg-white border-border text-gray-900 hover:border-gray-400'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-serif text-lg font-medium tracking-tight">
          {rubric.label}
        </span>
        {rubric.stub && (
          <span className={`label-tag ${selected ? 'text-white/60' : 'text-gray-400'}`}>
            Draft
          </span>
        )}
      </div>

      <p className={`mt-1.5 text-xs leading-snug ${selected ? 'text-white/75' : 'text-muted'}`}>
        {rubric.description}
      </p>

      <div className="mt-4 pt-4 border-t border-current/15 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className={`label-tag ${selected ? 'text-white/55' : ''}`}>Ladder</span>
          <span className="text-[11px] text-right">
            {bottom.label} <span className={selected ? 'text-white/40' : 'text-gray-300'}>→</span> {top.label}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={`label-tag ${selected ? 'text-white/55' : ''}`}>Tolerance</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px]">{strict ? 'Strict' : 'Lenient'}</span>
            <ToleranceGlyph ceilings={rubric.tolerance.ceilings} selected={selected} />
          </div>
        </div>
      </div>
    </button>
  )
}
