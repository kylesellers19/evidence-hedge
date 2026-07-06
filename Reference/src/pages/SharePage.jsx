import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import ShareModal from '../components/share/ShareModal'
import { IconShare, IconHeart } from '../components/Icons'

export default function SharePage() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  const { selectedItems } = state.wardrobe
  const wardrobeItems = state.wardrobe.items
  const selected = wardrobeItems.filter(i => selectedItems.includes(i.id))
  const savedInspirations = state.savedInspirations

  const hasContent = selected.length > 0 || savedInspirations.length > 0
  const allShareItems = [...selected, ...savedInspirations.slice(0, 4 - selected.length)]

  return (
    <div className="page-enter pb-24 min-h-screen">
      <div className="max-w-lg mx-auto px-5 pt-6">
        {!hasContent ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 border border-border flex items-center justify-center mb-6">
              <IconShare className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-serif text-xl text-gray-400 italic">No look selected yet</p>
            <p className="font-sans text-sm text-muted mt-2 max-w-xs leading-relaxed">
              Save inspiration from the moodboard or select items from your wardrobe to create a look.
            </p>
            <div className="flex flex-col gap-3 mt-8 w-full max-w-xs">
              <button className="btn-primary w-full" onClick={() => navigate('/inspire')}>
                Browse Inspiration
              </button>
              <button className="btn-outline w-full" onClick={() => navigate('/looks')}>
                View Saved Looks
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Selected wardrobe items */}
            {selected.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <p className="label-tag">My Outfit</p>
                  <button
                    onClick={() => dispatch({ type: 'CLEAR_WARDROBE_SELECTION' })}
                    className="text-[10px] tracking-editorial uppercase text-muted hover:text-gray-700 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {selected.map(item => (
                    <div key={item.id} className="relative">
                      <div className="aspect-[3/4] overflow-hidden bg-linen">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-xs font-sans text-gray-700 mt-1.5 truncate">{item.name}</p>
                      <p className="text-[10px] font-sans text-muted uppercase tracking-wide">{item.category}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saved inspirations */}
            {savedInspirations.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <p className="label-tag">Saved Inspiration</p>
                  <IconHeart className="w-3 h-3 text-gray-400" filled />
                </div>
                <div className="masonry-grid">
                  {savedInspirations.map(item => (
                    <div key={item.id} className="masonry-item">
                      <div className="overflow-hidden bg-linen">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full object-cover"
                          style={{ aspectRatio: `${item.aspectRatio || 0.75}` }}
                        />
                      </div>
                      {item.title && (
                        <p className="text-xs font-sans text-muted mt-1 line-clamp-1">{item.title}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Share CTA */}
            <div className="sticky bottom-20 left-0 right-0">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-gold-500">✦</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <button
                className="btn-primary w-full flex items-center justify-center gap-3"
                onClick={() => setShowModal(true)}
              >
                <IconShare className="w-4 h-4" />
                Share This Look
              </button>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <ShareModal
          items={allShareItems}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
