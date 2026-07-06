import React from 'react'
import InspirationCard from './InspirationCard'
import FilterBar from './FilterBar'
import { useApp } from '../../context/AppContext'

function SkeletonCard({ height = 'h-64' }) {
  return (
    <div className="masonry-item">
      <div className={`skeleton w-full ${height}`} />
    </div>
  )
}

const SKELETON_HEIGHTS = ['h-64', 'h-48', 'h-72', 'h-56', 'h-64', 'h-80', 'h-48', 'h-64']

export default function MoodBoard({ items, loading, error }) {
  const { state, dispatch } = useApp()
  const { activeSource } = state.inspiration

  const filteredItems = activeSource === 'all'
    ? items
    : items.filter(item => item.source === activeSource)

  const handleSourceChange = source => {
    dispatch({ type: 'SET_INSPIRATION_SOURCE', payload: source })
  }

  return (
    <div>
      <FilterBar activeSource={activeSource} onSourceChange={handleSourceChange} />

      <div className="px-4 pt-4">
        {error && (
          <div className="text-center py-12">
            <p className="font-sans text-sm text-muted">Could not load inspiration.</p>
            <p className="font-sans text-xs text-gray-400 mt-1">{error}</p>
          </div>
        )}

        {loading && (
          <div className="masonry-grid">
            {SKELETON_HEIGHTS.map((h, i) => (
              <SkeletonCard key={i} height={h} />
            ))}
          </div>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <div className="text-center py-16">
            <p className="font-serif text-lg text-gray-400">No inspiration found</p>
            <p className="font-sans text-xs text-muted mt-2">Try a different source or occasion</p>
          </div>
        )}

        {!loading && !error && filteredItems.length > 0 && (
          <div className="masonry-grid">
            {filteredItems.map(item => (
              <InspirationCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
