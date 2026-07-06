import React, { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { IconHeart } from '../Icons'

export default function InspirationCard({ item }) {
  const { state, dispatch } = useApp()
  const [loaded, setLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const isSaved = state.savedInspirations.some(i => i.id === item.id)

  const handleSave = e => {
    e.stopPropagation()
    dispatch({ type: 'TOGGLE_SAVE_INSPIRATION', payload: item.id })
  }

  const fallbackUrl = `https://picsum.photos/seed/${item.id}/400/600`

  return (
    <div className="masonry-item">
      <div className="relative overflow-hidden bg-linen group">
        {/* Skeleton */}
        {!loaded && !imgError && (
          <div className="skeleton w-full" style={{ paddingBottom: `${(1 / (item.aspectRatio || 0.75)) * 100}%` }} />
        )}

        <img
          src={imgError ? fallbackUrl : item.imageUrl}
          alt={item.title}
          className={`w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
          style={{ aspectRatio: `${item.aspectRatio || 0.75}` }}
          onLoad={() => setLoaded(true)}
          onError={() => { setImgError(true); setLoaded(true) }}
          loading="lazy"
        />

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Save button */}
        <button
          onClick={handleSave}
          className={`absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${
            isSaved
              ? 'bg-white text-gray-900 shadow-md'
              : 'bg-white/70 text-gray-700 opacity-0 group-hover:opacity-100'
          }`}
          aria-label={isSaved ? 'Unsave' : 'Save'}
        >
          <IconHeart className="w-3.5 h-3.5" filled={isSaved} />
        </button>

        {/* Source badge */}
        <div className="absolute top-2.5 left-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="bg-white/80 backdrop-blur-sm text-[9px] tracking-widest uppercase font-sans px-2 py-1 text-gray-700">
            {item.sourceDisplayName}
          </span>
        </div>
      </div>

      {/* Caption */}
      {item.title && (
        <div className="pt-2 pb-1">
          <p className="text-xs text-muted font-sans leading-snug line-clamp-1">{item.title}</p>
          {item.credit && (
            <p className="text-[10px] text-gray-400 font-sans mt-0.5">— {item.credit}</p>
          )}
        </div>
      )}
    </div>
  )
}
