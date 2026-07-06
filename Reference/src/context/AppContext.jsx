import React, { createContext, useContext, useReducer, useEffect } from 'react'
import supabase from '../lib/supabase'
import { loadWardrobe } from '../services/wardrobeService'

const AppContext = createContext(null)

const SESSION_KEY = 'gigi_occasion'

// occasion shape:
// {
//   venue, venueLocation, venueTypes, isPrivateResidence,
//   occasionType,                                          ← user-only (Wedding, Night Out, etc.)
//   gender,                                                ← user-only (Men, Women, Gender Neutral)
//   size,                                                  ← user-only, optional (XS, M, Plus, "32W", etc.)
//   dressCode, timeOfDay, season,                          ← user overrides (null = not set)
//   inferredDressCode, inferredTimeOfDay, inferredSeason,  ← from Claude (via SET_STYLE_INFERENCE)
//   styleBrief, aestheticKeywords, colorPalette, avoidList ← from Claude
//   relevantOccasionTypes                                  ← from Claude (filters occasion type chips)
// }
//
// Effective values (read by components):
//   effectiveDressCode = dressCode  || inferredDressCode
//   effectiveTimeOfDay = timeOfDay  || inferredTimeOfDay
//   effectiveSeason    = season     || inferredSeason

function getStoredOccasion() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const initialState = {
  occasion: getStoredOccasion(),
  inspiration: {
    items: [],
    loading: false,
    error: null,
    activeSource: 'all',
  },
  wardrobe: {
    items: [],
    selectedItems: [],
    loading: false,
    error: null,
  },
  savedInspirations: [],
}

function reducer(state, action) {
  switch (action.type) {
    // Full occasion reset — called from HomePage when a venue is selected.
    // User-specific fields reset to null so the user re-picks on RefinePage.
    case 'SET_OCCASION':
      return {
        ...state,
        occasion: {
          occasionType: null,
          gender: null,
          size: null,
          relevantOccasionTypes: [],
          ...action.payload,
        },
      }

    case 'SET_OCCASION_TYPE':
      return {
        ...state,
        occasion: state.occasion
          ? { ...state.occasion, occasionType: action.payload }
          : { occasionType: action.payload },
      }

    case 'SET_GENDER':
      return {
        ...state,
        occasion: state.occasion
          ? { ...state.occasion, gender: action.payload }
          : { gender: action.payload },
      }

    case 'SET_SIZE':
      return {
        ...state,
        occasion: state.occasion
          ? { ...state.occasion, size: action.payload }
          : { size: action.payload },
      }

    // Merges Claude-inferred fields into occasion without overwriting user overrides
    case 'SET_STYLE_INFERENCE':
      return {
        ...state,
        occasion: state.occasion
          ? { ...state.occasion, ...action.payload }
          : action.payload,
      }

    // Sets a user-specified filter override (dressCode, timeOfDay, or season).
    // Pass null for a key to clear the override and revert to inferred.
    case 'SET_OCCASION_OVERRIDE':
      return {
        ...state,
        occasion: state.occasion
          ? { ...state.occasion, ...action.payload }
          : action.payload,
      }

    // Legacy alias — kept for backward compatibility
    case 'SET_OCCASION_FILTERS':
      return {
        ...state,
        occasion: state.occasion
          ? { ...state.occasion, ...action.payload }
          : action.payload,
      }

    // ── Inspiration ────────────────────────────────────────────────────────────
    case 'SET_INSPIRATION_LOADING':
      return { ...state, inspiration: { ...state.inspiration, loading: action.payload } }

    case 'SET_INSPIRATION_ITEMS':
      return { ...state, inspiration: { ...state.inspiration, items: action.payload, loading: false, error: null } }

    case 'SET_INSPIRATION_ERROR':
      return { ...state, inspiration: { ...state.inspiration, error: action.payload, loading: false } }

    case 'SET_INSPIRATION_SOURCE':
      return { ...state, inspiration: { ...state.inspiration, activeSource: action.payload } }

    case 'TOGGLE_SAVE_INSPIRATION': {
      const id = action.payload
      const isSaved = state.savedInspirations.some(i => i.id === id)
      const item = state.inspiration.items.find(i => i.id === id)
      return {
        ...state,
        savedInspirations: isSaved
          ? state.savedInspirations.filter(i => i.id !== id)
          : item ? [...state.savedInspirations, item] : state.savedInspirations,
        inspiration: {
          ...state.inspiration,
          items: state.inspiration.items.map(i =>
            i.id === id ? { ...i, saved: !isSaved } : i
          ),
        },
      }
    }

    // ── Wardrobe ───────────────────────────────────────────────────────────────
    case 'SET_WARDROBE_LOADING':
      return { ...state, wardrobe: { ...state.wardrobe, loading: action.payload, error: null } }

    case 'SET_WARDROBE_ERROR':
      return { ...state, wardrobe: { ...state.wardrobe, error: action.payload, loading: false } }

    case 'SET_WARDROBE_ITEMS':
      return { ...state, wardrobe: { ...state.wardrobe, items: action.payload, loading: false, error: null } }

    case 'TOGGLE_SELECT_WARDROBE_ITEM': {
      const id = action.payload
      const isSelected = state.wardrobe.selectedItems.includes(id)
      return {
        ...state,
        wardrobe: {
          ...state.wardrobe,
          selectedItems: isSelected
            ? state.wardrobe.selectedItems.filter(i => i !== id)
            : [...state.wardrobe.selectedItems, id],
        },
      }
    }

    case 'CLEAR_WARDROBE_SELECTION':
      return { ...state, wardrobe: { ...state.wardrobe, selectedItems: [] } }

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        dispatch({ type: 'SET_WARDROBE_LOADING', payload: true })
        loadWardrobe()
          .then(items => dispatch({ type: 'SET_WARDROBE_ITEMS', payload: items }))
          .catch(err  => dispatch({ type: 'SET_WARDROBE_ERROR', payload: err.message }))
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: 'SET_WARDROBE_ITEMS', payload: [] })
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    try {
      if (state.occasion) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.occasion))
      } else {
        sessionStorage.removeItem(SESSION_KEY)
      }
    } catch {}
  }, [state.occasion])

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
