import React, { createContext, useContext, useReducer } from 'react'

// Holds the submitted document (+ any source meta), the confirmed rubric, and
// the analysis result. The three-screen flow fills these in stages:
//   Landing  → SET_DOCUMENT (document + meta, result cleared)
//   Branch   → SET_ANALYSIS (rubric + result, document retained)
// No server, no persistence — analysis is a pure client-side function of
// (document, rubric).

const initialState = {
  document: '',
  meta: {},        // { sourceUrl? } from link mode
  rubric: null,    // the confirmed RubricConfig that produced `result`
  result: null,    // AnalysisResult
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DOCUMENT':
      // New document submitted from the landing screen — reset downstream state.
      return {
        document: action.payload.document,
        meta: action.payload.meta || {},
        rubric: null,
        result: null,
      }
    case 'SET_ANALYSIS':
      // Rubric confirmed on the branch screen — attach result, keep document.
      return {
        ...state,
        rubric: action.payload.rubric,
        result: action.payload.result,
      }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
