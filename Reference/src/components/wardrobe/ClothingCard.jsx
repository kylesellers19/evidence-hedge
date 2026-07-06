import React from 'react'
import { useApp } from '../../context/AppContext'
import { IconCheck, IconTrash } from '../Icons'

function MatchBadge({ score }) {
  if (score === null || score === undefined) return null

  const color = score >= 80
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : score >= 50
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-gray-50 text-gray-500 border-border'

  return (
    <div className={`absolute top-2 left-2 text-[9px] tracking-widest uppercase font-medium px-1.5 py-0.5 border ${color}`}>
      {score}%
    </div>
  )
}

export default function ClothingCard({ item, onRemove }) {
  const { state, dispatch } = useApp()
  const isSelected = state.wardrobe.selectedItems.includes(item.id)

  const handleSelect = () => {
    dispatch({ type: 'TOGGLE_SELECT_WARDROBE_ITEM', payload: item.id })
  }

  return (
    <div
      className={`relative overflow-hidden cursor-pointer group transition-all duration-200 ${
        isSelected ? 'ring-2 ring-gray-900 ring-offset-1' : ''
      }`}
      onClick={handleSelect}
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-linen aspect-[3/4]">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />

        <MatchBadge score={item.matchScore} />

        {/* Selected overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-gray-900/20 flex items-center justify-center">
            <div className="w-8 h-8 bg-gray-900 flex items-center justify-center">
              <IconCheck className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        {/* Remove button */}
        <button
          onClick={e => { e.stopPropagation(); onRemove(item.id) }}
          className="absolute top-2 right-2 w-7 h-7 bg-white/80 hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Remove item"
        >
          <IconTrash className="w-3.5 h-3.5 text-gray-700" />
        </button>
      </div>

      {/* Label */}
      <div className="pt-2 pb-1 px-0.5">
        <p className="text-xs font-sans text-gray-800 leading-snug truncate">{item.name}</p>
        <p className="text-[10px] font-sans text-muted mt-0.5 uppercase tracking-wide">{item.category}</p>
      </div>
    </div>
  )
}
