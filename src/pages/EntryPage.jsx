import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { listRubrics, getRubric } from '../rubrics/index.js'
import { autodetect } from '../rubrics/autodetect.js'
import { analyze } from '../engine/analyze.js'
import DocumentInput from '../components/entry/DocumentInput.jsx'
import DocTypeCard from '../components/entry/DocTypeCard.jsx'

export default function EntryPage() {
  const navigate = useNavigate()
  const { dispatch } = useApp()

  const [text, setText] = useState('')
  const [selected, setSelected] = useState('auto') // 'auto' | rubric id
  const rubrics = listRubrics()

  // Live preview of what auto-detect would pick, once there's text to judge.
  const detectedId = useMemo(
    () => (text.trim().length > 40 ? autodetect(text) : null),
    [text],
  )

  const canRun = text.trim().length > 0 && (selected !== 'auto' || !!detectedId)

  const run = () => {
    if (!canRun) return
    const rubricId = selected === 'auto' ? autodetect(text) : selected
    const rubric = getRubric(rubricId)
    const result = analyze(text, rubric)
    dispatch({ type: 'SET_ANALYSIS', payload: { document: text, rubric, result } })
    navigate('/brief')
  }

  return (
    <main className="max-w-brief mx-auto px-6 py-12 page-enter">
      {/* Lede */}
      <p className="label-tag">Evidence brief</p>
      <h1 className="editorial-heading text-3xl mt-2 mb-3">
        Find the claims that read like conclusions but cite nothing.
      </h1>
      <p className="text-sm text-muted leading-relaxed max-w-prose">
        Paste a document and choose how it should be judged. Evidence Hedge weighs each
        claim's confidence against the evidence it actually cites, and hands you a
        one-page brief of the patterns it found.
      </p>

      {/* Document input */}
      <div className="mt-10">
        <DocumentInput value={text} onChange={setText} />
      </div>

      {/* Document type selection */}
      <div className="mt-10">
        <div className="flex items-baseline justify-between mb-3">
          <p className="label-tag">Judge as</p>
          {selected === 'auto' && detectedId && (
            <p className="label-tag text-gray-400">
              Detected · <span className="text-gold-600">{getRubric(detectedId).label}</span>
            </p>
          )}
        </div>

        {/* Auto-detect option — gold accent = the tool's signal language */}
        <button
          type="button"
          onClick={() => setSelected('auto')}
          aria-pressed={selected === 'auto'}
          className={`w-full text-left border p-4 mb-3 transition-colors duration-200 flex items-center justify-between gap-3 ${
            selected === 'auto'
              ? 'border-gold-500 bg-gold-300/10'
              : 'border-border bg-white hover:border-gray-400'
          }`}
        >
          <div>
            <span className="font-serif text-base font-medium tracking-tight">Auto-detect</span>
            <span className="block text-xs text-muted mt-0.5">
              Let the document's own signals choose the rubric.
            </span>
          </div>
          <span className={`label-tag ${selected === 'auto' ? 'text-gold-600' : 'text-gray-300'}`}>
            {detectedId && selected === 'auto' ? getRubric(detectedId).label : 'Recommended'}
          </span>
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rubrics.map(r => (
            <DocTypeCard
              key={r.id}
              rubric={r}
              selected={selected === r.id}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      {/* Run */}
      <div className="mt-10 flex items-center gap-4">
        <button onClick={run} disabled={!canRun} className="btn-primary">
          Weigh the evidence
        </button>
        {!text.trim() && (
          <span className="label-tag text-gray-400">Paste a document to begin</span>
        )}
      </div>
    </main>
  )
}
