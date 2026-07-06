import React, { useRef, useState } from 'react'
import { addWardrobeItem } from '../../services/wardrobeService'
import { IconCamera, IconPlus } from '../Icons'

const CATEGORIES = ['Top', 'Bottom', 'Dress', 'Outerwear', 'Shoes', 'Bag', 'Accessory']
const FORMALITY_LABELS = ['Very Casual', 'Casual', 'Smart Casual', 'Formal', 'Very Formal']
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'All Seasons']

export default function UploadZone({ onAdd }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  // file: raw File object kept for upload; preview: blob URL for <img>
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)

  const [meta, setMeta] = useState({ name: '', category: 'Top', formality: 3, seasons: ['All Seasons'], tags: '' })
  const [step, setStep] = useState('idle')         // idle | meta | uploading
  const [uploadError, setUploadError] = useState(null)

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    setMeta({ name: '', category: 'Top', formality: 3, seasons: ['All Seasons'], tags: '' })
    setStep('idle')
    setUploadError(null)
  }

  const processFile = f => {
    if (!f || !f.type.startsWith('image/')) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStep('meta')
    setUploadError(null)
  }

  const handleFiles = files => {
    if (files?.[0]) processFile(files[0])
  }

  const handleDrop = e => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleSave = async () => {
    if (!file) return
    setStep('uploading')
    setUploadError(null)

    try {
      const tags = meta.tags.split(',').map(t => t.trim()).filter(Boolean)
      const item = await addWardrobeItem(file, {
        name: meta.name,
        category: meta.category,
        formality: meta.formality,
        seasons: meta.seasons,
        tags,
      })
      onAdd(item)
      reset()
    } catch (err) {
      setUploadError(err.message || 'Upload failed — please try again.')
      setStep('meta')
    }
  }

  const toggleSeason = s => {
    setMeta(prev => ({
      ...prev,
      seasons: prev.seasons.includes(s)
        ? prev.seasons.filter(x => x !== s)
        : [...prev.seasons.filter(x => x !== 'All Seasons'), s],
    }))
  }

  if (step === 'meta' || step === 'uploading') {
    const uploading = step === 'uploading'

    return (
      <div className="bg-white border border-border p-5">
        <div className="flex gap-4">
          {/* Preview thumbnail with upload overlay */}
          <div className="w-24 h-32 flex-shrink-0 overflow-hidden bg-linen relative">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <svg className="w-6 h-6 animate-spin text-gray-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <label className="label-tag block mb-1">Name</label>
              <input
                type="text"
                value={meta.name}
                onChange={e => setMeta(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Black blazer"
                className="field-input text-sm"
                disabled={uploading}
              />
            </div>
            <div>
              <label className="label-tag block mb-2">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setMeta(p => ({ ...p, category: cat }))}
                    disabled={uploading}
                    className={`text-[10px] tracking-editorial uppercase px-2.5 py-1 border transition-colors ${
                      meta.category === cat
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'border-border text-muted hover:border-gray-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="label-tag block mb-2">
              Formality — {FORMALITY_LABELS[meta.formality - 1]}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={meta.formality}
              onChange={e => setMeta(p => ({ ...p, formality: +e.target.value }))}
              className="w-full accent-gray-900"
              disabled={uploading}
            />
          </div>

          <div>
            <label className="label-tag block mb-2">Season</label>
            <div className="flex flex-wrap gap-1.5">
              {SEASONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSeason(s)}
                  disabled={uploading}
                  className={`text-[10px] tracking-editorial uppercase px-2.5 py-1 border transition-colors ${
                    meta.seasons.includes(s)
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'border-border text-muted hover:border-gray-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-tag block mb-1">Tags (optional)</label>
            <input
              type="text"
              value={meta.tags}
              onChange={e => setMeta(p => ({ ...p, tags: e.target.value }))}
              placeholder="floral, silk, evening — comma separated"
              className="field-input text-sm"
              disabled={uploading}
            />
          </div>
        </div>

        {/* Upload error message */}
        {uploadError && (
          <div className="mt-4 px-3 py-2.5 bg-red-50 border border-red-200 flex items-start gap-2">
            <span className="text-red-500 text-xs leading-none mt-0.5 flex-shrink-0">✕</span>
            <p className="font-sans text-xs text-red-700 leading-relaxed">{uploadError}</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={reset}
            disabled={uploading}
            className="btn-outline flex-1 py-3 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={uploading}
            className="btn-primary flex-1 py-3 disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Add to Wardrobe'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`border-2 border-dashed transition-colors cursor-pointer ${
        dragging ? 'border-gray-900 bg-linen' : 'border-border hover:border-gray-400'
      }`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
      <div className="py-10 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 border border-border flex items-center justify-center text-gray-400">
          <IconCamera className="w-6 h-6" />
        </div>
        <div>
          <p className="font-sans text-sm text-gray-700">
            Upload a clothing item
          </p>
          <p className="font-sans text-xs text-muted mt-1">
            Tap to browse or drag & drop
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <IconPlus className="w-3.5 h-3.5 text-gray-400" />
          <span className="label-tag">Add item</span>
        </div>
      </div>
    </div>
  )
}
