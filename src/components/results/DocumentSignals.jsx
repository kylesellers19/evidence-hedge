import React from 'react'

// Document-level signals — their own layer, ABOVE the per-claim patterns.
// Same visual register: hairline rules, square corners, navy accent, no colored
// backgrounds. A flag uses a navy left-rule; a note/positive uses a hairline one.

const TITLES = {
  'limitations-absent': 'Limitations absent',
  'abstract-body-confidence-delta': 'Abstract outruns the body',
  'secondary-evidence-dominance': 'Discursive evidence dominance',
  'platitude-density': 'Platitude density',
  'self-citation-dominance': 'Self-citation dominance',
  'register-mismatch': 'Register mismatch',
  'per-claim-sourcing': 'Per-claim sourcing',
  'label-transparency': 'Label transparency',
  'method-disclosure': 'Method disclosure',
  'perspective-plurality': 'Perspective plurality',
  'right-of-reply': 'Right of reply',
  'anonymous-sourcing': 'Anonymous sourcing',
  'posture-gate': 'No expert claims',
}

const titleFor = (s) => TITLES[s.id] || s.id.replace(/-/g, ' ')

function SignalTag({ signal }) {
  if (signal.positive) return <span className="label-tag text-navy">Disclosed ✓</span>
  if (signal.severity === 'flag') return <span className="label-tag text-navy">Flag</span>
  return <span className="label-tag text-gray-400">Note</span>
}

export default function DocumentSignals({ signals }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="label-tag">Document signals</h2>
        <span className="label-tag text-gray-400">
          {signals.length} {signals.length === 1 ? 'signal' : 'signals'}
        </span>
      </div>

      {signals.length === 0 ? (
        <p className="text-sm text-muted leading-relaxed">
          No document-level signals surfaced for this rubric.
        </p>
      ) : (
        <ul className="space-y-6">
          {signals.map((s) => (
            <li
              key={s.id}
              className={`pl-4 border-l-2 ${s.severity === 'flag' ? 'border-navy' : 'border-border'}`}
            >
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <h3 className="font-serif text-lg font-medium tracking-tight text-gray-900">
                  {titleFor(s)}
                </h3>
                <SignalTag signal={s} />
              </div>
              <p className="text-sm text-muted leading-relaxed max-w-prose">{s.summary}</p>
              {s.evidence?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {s.evidence.map((e, i) => (
                    <li key={i} className="font-mono text-[11px] text-gray-500 leading-relaxed">
                      “{e}”
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
