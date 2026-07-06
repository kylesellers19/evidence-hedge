import React, { useState } from 'react'
import { IconX, IconDownload } from '../Icons'

const PLATFORMS = [
  {
    id: 'instagram',
    label: 'Instagram',
    color: 'from-purple-500 via-pink-500 to-yellow-400',
    textColor: 'text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    color: 'from-black to-gray-800',
    textColor: 'text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.79a8.18 8.18 0 004.78 1.52V6.86a4.85 4.85 0 01-1.01-.17z" />
      </svg>
    ),
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    color: 'from-red-600 to-red-700',
    textColor: 'text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
      </svg>
    ),
  },
]

// Load an image CORS-safely:
// - base64 data URLs: load directly (already same-origin)
// - remote URLs: fetch → blob → object URL so canvas.toDataURL() isn't tainted
function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (src.startsWith('data:')) {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('base64 image failed to load'))
      img.src = src
    } else {
      fetch(src)
        .then(r => {
          if (!r.ok) throw new Error(`fetch ${r.status}`)
          return r.blob()
        })
        .then(blob => {
          const url = URL.createObjectURL(blob)
          const img = new Image()
          img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
          img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('blob image failed to load')) }
          img.src = url
        })
        .catch(reject)
    }
  })
}

// Draw an image cropped to fill a rectangle (object-fit: cover behaviour).
function drawCover(ctx, img, x, y, w, h) {
  const imgAspect = img.naturalWidth / img.naturalHeight
  const cellAspect = w / h
  let sx, sy, sw, sh
  if (imgAspect > cellAspect) {
    // Image is wider than the cell — crop left/right
    sh = img.naturalHeight
    sw = sh * cellAspect
    sx = (img.naturalWidth - sw) / 2
    sy = 0
  } else {
    // Image is taller than the cell — crop top/bottom
    sw = img.naturalWidth
    sh = sw / cellAspect
    sx = 0
    sy = (img.naturalHeight - sh) / 2
  }
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
  ctx.restore()
}

export default function ShareModal({ items, onClose }) {
  const [shared, setShared] = useState(null)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const COLS = 2
      const PAD = 24
      const GAP = 10
      const HEADER_H = 72
      const CANVAS_W = 800
      const CELL_W = Math.floor((CANVAS_W - PAD * 2 - GAP * (COLS - 1)) / COLS)
      const CELL_H = Math.round(CELL_W * (4 / 3)) // portrait ratio

      const itemCount = Math.max(items.length, 1)
      const rows = Math.ceil(itemCount / COLS)
      const CANVAS_H = HEADER_H + rows * CELL_H + (rows - 1) * GAP + PAD

      const canvas = document.createElement('canvas')
      canvas.width = CANVAS_W
      canvas.height = CANVAS_H
      const ctx = canvas.getContext('2d')

      // Background
      ctx.fillStyle = '#FAFAF8'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // Header text
      ctx.fillStyle = '#0A0A0A'
      ctx.font = 'italic 26px "Playfair Display", Georgia, serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('My Gigi Look', CANVAS_W / 2, HEADER_H / 2)

      // Thin divider below header
      ctx.strokeStyle = '#E0E0DA'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(PAD, HEADER_H - 10)
      ctx.lineTo(CANVAS_W - PAD, HEADER_H - 10)
      ctx.stroke()

      // Placeholder rects for items that fail to load
      for (let i = 0; i < items.length; i++) {
        const col = i % COLS
        const row = Math.floor(i / COLS)
        const x = PAD + col * (CELL_W + GAP)
        const y = HEADER_H + row * (CELL_H + GAP)
        ctx.fillStyle = '#EBEBEA'
        ctx.fillRect(x, y, CELL_W, CELL_H)
      }

      // Load all images concurrently — failed images leave the placeholder rect
      const results = await Promise.allSettled(items.map(item => loadImage(item.imageUrl)))

      results.forEach((result, i) => {
        if (result.status !== 'fulfilled') return
        const col = i % COLS
        const row = Math.floor(i / COLS)
        const x = PAD + col * (CELL_W + GAP)
        const y = HEADER_H + row * (CELL_H + GAP)
        drawCover(ctx, result.value, x, y, CELL_W, CELL_H)
      })

      const link = document.createElement('a')
      link.download = 'my-gigi-look.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('[ShareModal] Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async platform => {
    if (platform === 'pinterest') {
      const url = encodeURIComponent(window.location.href)
      const desc = encodeURIComponent('My outfit pick via Gigi ✦')
      window.open(`https://pinterest.com/pin/create/button/?url=${url}&description=${desc}`, '_blank')
      setShared('pinterest')
      return
    }

    // For Instagram and TikTok: use Web Share API or fallback to download
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Gigi Look',
          text: 'Check out my outfit pick! ✦ #Gigi #OOTD',
          url: window.location.href,
        })
        setShared(platform)
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleDownload()
        }
      }
    } else {
      // Desktop fallback: copy link
      try {
        await navigator.clipboard.writeText(window.location.href)
        setShared(platform)
      } catch {
        handleDownload()
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:w-full sm:max-w-sm bg-white z-10 p-6 sm:rounded-none">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center hover:bg-linen">
          <IconX className="w-4 h-4" />
        </button>

        <h2 className="font-serif text-xl font-medium mb-1">Share your look</h2>
        <p className="font-sans text-xs text-muted mb-6">
          {items.length > 0 ? `${items.length} item${items.length > 1 ? 's' : ''} selected` : 'Share your outfit inspiration'}
        </p>

        {/* Preview strip */}
        {items.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
            {items.map(item => (
              <div key={item.id} className="w-16 h-20 flex-shrink-0 overflow-hidden bg-linen">
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* Platform buttons */}
        <div className="space-y-3">
          {PLATFORMS.map(platform => (
            <button
              key={platform.id}
              onClick={() => handleShare(platform.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${platform.color} ${platform.textColor} transition-opacity hover:opacity-90 active:opacity-75`}
            >
              {platform.icon}
              <span className="font-sans text-sm font-medium">
                {shared === platform.id ? '✓ Link copied!' : `Share to ${platform.label}`}
              </span>
            </button>
          ))}

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center gap-3 px-4 py-3 border border-border hover:bg-linen transition-colors text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IconDownload className="w-5 h-5" />
            <span className="font-sans text-sm">
              {downloading ? 'Preparing image…' : 'Save to Camera Roll'}
            </span>
          </button>
        </div>

        <p className="text-[10px] text-gray-400 text-center mt-5 font-sans">
          On mobile, the native share sheet will appear.
        </p>
      </div>
    </div>
  )
}
