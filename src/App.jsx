import React from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useApp } from './context/AppContext.jsx'
import { listRubrics, getRubric, autodetect } from './rubrics/index.js'
import { analyze } from './engine/analyze.js'
import LandingPage from './pages/LandingPage.jsx'
import RubricBranch from './pages/RubricBranch.jsx'
import ResultsPage from './pages/ResultsPage.jsx'

// ── Screen 1: Landing ────────────────────────────────────────────────────────
// The only thing on the index route. Captures the document, then routes to the
// branch screen. (The old cream/gold Header + EntryPage are retired from the
// flow — nothing routes to them — so the landing renders as a bare white room.)
function LandingRoute() {
  const { dispatch } = useApp()
  const navigate = useNavigate()

  const onAnalyze = (text, meta) => {
    dispatch({ type: 'SET_DOCUMENT', payload: { document: text, meta } })
    navigate('/branch')
  }
  return <LandingPage onAnalyze={onAnalyze} />
}

// ── Screen 2: Branch ─────────────────────────────────────────────────────────
// Runs autodetect on the submitted text BEFORE render, hands the branch screen
// the full registry (stubs included) + the detected id. Confirm runs the
// pipeline with the CONFIRMED rubric — never silently the autodetected one.
function BranchRoute() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()

  // Route guard: no document in state → back to the landing page.
  if (!state.document) return <Navigate to="/" replace />

  const rubrics = listRubrics()
  const detectedId = autodetect(state.document)

  const onConfirm = (rubricId) => {
    const rubric = getRubric(rubricId)
    const result = analyze(state.document, rubric)
    dispatch({ type: 'SET_ANALYSIS', payload: { rubric, result } })
    navigate('/results')
  }
  const onBack = () => {
    dispatch({ type: 'RESET' }) // clears the input for a fresh document
    navigate('/')
  }

  return (
    <RubricBranch
      rubrics={rubrics}
      detectedId={detectedId}
      onConfirm={onConfirm}
      onBack={onBack}
    />
  )
}

// ── Screen 3: Results ────────────────────────────────────────────────────────
// Guarded: reaching it without a computed result → back to the landing page.
function ResultsRoute() {
  const { state } = useApp()
  if (!state.document || !state.result) return <Navigate to="/" replace />
  return <ResultsPage />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/branch" element={<BranchRoute />} />
      <Route path="/results" element={<ResultsRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
