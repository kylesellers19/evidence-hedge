import React from 'react'

// Paste surface for the source document. Underline-style field treatment from
// the Reference system, scaled up to a reading-sized textarea, with a tracked
// uppercase micro-label above it.
export default function DocumentInput({ value, onChange }) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label htmlFor="doc" className="label-tag">Source text</label>
        <span className="label-tag text-gray-400">
          {words ? `${words} words` : 'Paste a document'}
        </span>
      </div>
      <textarea
        id="doc"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Paste the document you want to weigh — a paper, a report, an article…"
        rows={12}
        spellCheck={false}
        className="w-full bg-white border border-border focus:border-gray-900 focus:outline-none transition-colors duration-200 p-4 text-sm leading-relaxed text-gray-900 placeholder-gray-400 resize-y"
      />
    </div>
  )
}
