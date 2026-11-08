import React, { useMemo } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useApp } from './context/AppContext.jsx'
import { judgmentFor } from './rubrics/index.js'
import { routeDocument } from './rubrics/route.js'
import { analyze } from './engine/analyze.js'
import { validateText } from './ingest/validateText.js'
import SiteLayout from './components/layout/SiteLayout.jsx'
import LandingPage from './pages/LandingPage.jsx'
import RubricBranch from './pages/RubricBranch.jsx'
import ResultsPage from './pages/ResultsPage.jsx'
import ListPage from './pages/ListPage.jsx'
import MethodPage from './pages/MethodPage.jsx'
import ContactPage from './pages/ContactPage.jsx'

// ── Screen 1: Landing ────────────────────────────────────────────────────────
// The only thing on the index route. Captures the document, then routes to the
// branch screen. (The old cream/gold Header + EntryPage are retired from the
// flow — nothing routes to them.) The site masthead floats over it, so the
// landing still renders as a bare white room.
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
// Routes the submitted text BEFORE render — its genre roles and the judgment
// they imply (one rubric, or a hybrid) — and hands the branch screen the route.
// Confirm runs the pipeline with the CONFIRMED genres: the judgment is
// recomposed from them, never silently the detected one.
function BranchRoute() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()

  // Route guard: no document in state → back to the landing page. A reader
  // error body or a bot-check wall is not a document and never reaches analyze()
  // (the landing page already refuses both; this holds for any other route in).
  const sourceUrl = state.meta?.sourceUrl || ''
  const check = state.document ? validateText(state.document) : { ok: false }
  // Routing: the genre roles (the link's host feeds the speaker), then the judgment.
  const route = useMemo(
    () => (check.ok ? routeDocument(state.document, { sourceUrl }) : null),
    [check.ok, state.document, sourceUrl],
  )
  if (!state.document || !check.ok) return <Navigate to="/" replace />

  // The CONFIRMED genres and posture travel into the pipeline.
  const onConfirm = (genres, posture) => {
    const { rubric } = judgmentFor(route.profile.genre.roles, genres)
    const result = analyze(state.document, rubric, posture, { sourceUrl })
    dispatch({ type: 'SET_ANALYSIS', payload: { rubric, result, reading: { detected: route.judgment.genres, chosen: genres } } })
    navigate('/results')
  }
  const onBack = () => {
    dispatch({ type: 'RESET' }) // clears the input for a fresh document
    navigate('/')
  }

  return (
    <RubricBranch
      route={route}
      text={state.document}
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

// Every screen sits inside the site frame: the masthead (The List, Method,
// Contact at top right) and the footer.
export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/branch" element={<BranchRoute />} />
        <Route path="/results" element={<ResultsRoute />} />
        <Route path="/list" element={<ListPage />} />
        <Route path="/method" element={<MethodPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
