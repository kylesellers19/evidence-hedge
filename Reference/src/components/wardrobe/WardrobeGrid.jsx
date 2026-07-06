import React from 'react'
import ClothingCard from './ClothingCard'

export default function WardrobeGrid({ items, onRemove }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-serif text-lg text-gray-400 italic">Your wardrobe is empty</p>
        <p className="font-sans text-xs text-muted mt-2">Upload clothing items above to get outfit suggestions</p>
      </div>
    )
  }

  return (
    <div>
      {/* Sort indicator */}
      {items.some(i => i.matchScore !== null) && (
        <div className="flex items-center justify-between mb-4">
          <p className="label-tag text-gray-400">Sorted by match score</p>
          <p className="label-tag text-gray-400">{items.length} items</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map(item => (
          <ClothingCard key={item.id} item={item} onRemove={onRemove} />
        ))}
      </div>
    </div>
  )
}
