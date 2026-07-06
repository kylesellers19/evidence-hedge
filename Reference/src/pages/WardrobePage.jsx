import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { track } from '../lib/analytics'
import { removeWardrobeItem } from '../services/wardrobeService'
import { rankWardrobeItems } from '../services/matchingService'
import UploadZone from '../components/wardrobe/UploadZone'
import WardrobeGrid from '../components/wardrobe/WardrobeGrid'

export default function WardrobePage() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const { occasion } = state
  const { items: rawItems, selectedItems, loading: wardrobeLoading, error: wardrobeError } = state.wardrobe

  // Track which item is mid-delete so the UI can reflect it
  const [removingId, setRemovingId] = useState(null)

  // Rank items locally against the current occasion — no extra DB round-trip
  const displayItems = useMemo(
    () => occasion ? rankWardrobeItems(rawItems, occasion) : rawItems,
    [rawItems, occasion]
  )

  // UploadZone has already uploaded to storage + inserted to DB.
  // Prepend the returned item to global state — no re-fetch needed.
  const handleAdd = newItem => {
    track('wardrobe_item_added', { category: newItem.category ?? null })
    dispatch({ type: 'SET_WARDROBE_ITEMS', payload: [newItem, ...rawItems] })
  }

  const handleRemove = async id => {
    setRemovingId(id)
    try {
      await removeWardrobeItem(id)
      dispatch({ type: 'SET_WARDROBE_ITEMS', payload: rawItems.filter(i => i.id !== id) })
      if (selectedItems.includes(id)) {
        dispatch({ type: 'TOGGLE_SELECT_WARDROBE_ITEM', payload: id })
      }
    } catch (err) {
      console.error('[WardrobePage] Remove failed:', err.message)
      // Surface the error briefly — a more polished approach could toast here
      dispatch({ type: 'SET_WARDROBE_ERROR', payload: err.message })
    } finally {
      setRemovingId(null)
    }
  }

  const selectedCount = selectedItems.length

  return (
    <div className="page-enter pb-32">
      <div className="max-w-lg mx-auto px-5">

        {/* Occasion context */}
        {occasion ? (
          <div className="py-4 border-b border-border mb-6">
            <p className="label-tag mb-1">Matching for</p>
            <p className="font-serif text-base font-medium text-gray-900">
              {occasion.type} · {occasion.dressCode}
            </p>
            <p className="font-sans text-xs text-muted mt-0.5">
              Tap items to select them for your outfit
            </p>
          </div>
        ) : (
          <div className="py-4 border-b border-border mb-6">
            <p className="font-sans text-sm text-muted">
              Set an occasion to see match scores.{' '}
              <button onClick={() => navigate('/')} className="underline underline-offset-2 text-gray-700">
                Set occasion →
              </button>
            </p>
          </div>
        )}

        {/* Upload zone */}
        <div className="mb-6">
          <p className="label-tag mb-3">Add Item</p>
          <UploadZone onAdd={handleAdd} />
        </div>

        {/* Loading state */}
        {wardrobeLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <svg className="w-7 h-7 animate-spin text-gray-300" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <p className="font-sans text-xs text-muted tracking-wide">Loading your wardrobe…</p>
          </div>
        )}

        {/* Error state */}
        {wardrobeError && !wardrobeLoading && (
          <div className="border border-red-200 bg-red-50 px-4 py-3 mb-6">
            <p className="font-sans text-xs text-red-700 leading-relaxed">
              <span className="font-medium">Could not load wardrobe.</span>{' '}
              {wardrobeError}
            </p>
            <button
              onClick={() => {
                dispatch({ type: 'SET_WARDROBE_LOADING', payload: true })
                import('../services/wardrobeService')
                  .then(m => m.loadWardrobe())
                  .then(items => dispatch({ type: 'SET_WARDROBE_ITEMS', payload: items }))
                  .catch(err => dispatch({ type: 'SET_WARDROBE_ERROR', payload: err.message }))
              }}
              className="font-sans text-xs text-red-600 underline underline-offset-2 mt-2 block"
            >
              Try again →
            </button>
          </div>
        )}

        {/* Wardrobe grid */}
        {!wardrobeLoading && !wardrobeError && displayItems.length > 0 && (
          <div className="mb-6">
            <p className="label-tag mb-3">
              {occasion ? 'Your Wardrobe — Ranked by Match' : 'Your Wardrobe'}
            </p>
            <WardrobeGrid items={displayItems} onRemove={handleRemove} removingId={removingId} />
          </div>
        )}

        {/* Empty state */}
        {!wardrobeLoading && !wardrobeError && displayItems.length === 0 && (
          <div className="text-center py-16">
            <p className="font-serif text-lg text-gray-400 italic">Your wardrobe is empty</p>
            <p className="font-sans text-xs text-muted mt-2">Upload clothing items above to get outfit suggestions</p>
          </div>
        )}

        {/* No occasion, but has items */}
        {!occasion && displayItems.length > 0 && (
          <div className="border border-border bg-linen p-4 mt-4">
            <p className="font-sans text-xs text-muted">
              ✦ Set an occasion to unlock outfit matching and match scores.
            </p>
          </div>
        )}
      </div>

      {/* Sticky CTA when items are selected */}
      {selectedCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 px-5 pb-3 z-30">
          <div className="max-w-lg mx-auto">
            <div className="bg-gray-900 text-white p-4 flex items-center justify-between shadow-2xl">
              <div>
                <p className="font-sans text-xs text-gray-400">Selected</p>
                <p className="font-serif text-sm font-medium">
                  {selectedCount} item{selectedCount > 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => dispatch({ type: 'CLEAR_WARDROBE_SELECTION' })}
                  className="text-xs tracking-editorial uppercase text-gray-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => navigate('/share')}
                  className="bg-white text-gray-900 text-xs tracking-editorial uppercase px-5 py-2 hover:bg-gray-100 transition-colors"
                >
                  Share Look →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
