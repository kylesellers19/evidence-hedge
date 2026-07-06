import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { callStyleProxy } from '../services/styleIntelligenceService'
import { saveLook, unsaveLook, saveItem, unsaveItem, insertTasteSignal, fetchSavedLooks, fetchSavedItems } from '../services/savedLooksService'
import SavePrompt from '../components/SavePrompt'
import { track } from '../lib/analytics'

// ─── Budget config ─────────────────────────────────────────────────────────────
const BUDGET_OPTIONS   = ['$0', '$75', '$150', '$300', '$500+']
const BUDGET_SUBLABELS = ['Style what I own', 'One piece', 'A few key pieces', 'Full outfit', 'Splurge']
// -1 = show no shop items (style what I own); 0-3 = max tier
const BUDGET_TIER_MAX  = { '$0': -1, '$75': 0, '$150': 1, '$300': 2, '$500+': 3 }

function getShoppableItemTier(item) {
  const text = (item.label + ' ' + item.query).toLowerCase()
  if (/gown|couture|crystal|chandelier|opera|beaded|metallic clutch/.test(text)) return 3
  if (/formal|silk|clutch|evening|stiletto|pearl|diamond|strappy heel/.test(text)) return 2
  if (/midi|blazer|structured|chain|block heel|pointed toe/.test(text)) return 1
  return 0
}

function filterByBudget(items, budget) {
  const maxTier = BUDGET_TIER_MAX[budget]
  if (maxTier < 0) return []
  if (budget === '$500+') return items
  return items.filter(item => getShoppableItemTier(item) <= maxTier)
}

// ─── Estimated cost ────────────────────────────────────────────────────────────
function estimatedCost(budget, count) {
  if (budget === '$0')    return null
  if (budget === '$75')   return 'Est. ~$75'
  if (budget === '$150')  return 'Est. ~$150'
  if (budget === '$300')  return 'Est. ~$300'
  if (budget === '$500+') return `Est. ~$${count * 130}`
  return null
}

// ─── Unsplash compliance ───────────────────────────────────────────────────────
// Unsplash API guidelines require:
//   1. A download trigger ping whenever a user opens a photo.
//   2. "Photo by [Name] on Unsplash" attribution with linked photographer + Unsplash.

function triggerUnsplashDownload(photoId) {
  const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
  if (!photoId || !key) return
  fetch(`https://api.unsplash.com/photos/${photoId}/download?client_id=${key}`)
    .catch(() => {})
}

const UNSPLASH_UTM = 'utm_source=gigi&utm_medium=referral'

function UnsplashCredit({ photo, color = 'rgba(255,255,255,0.65)', fontSize = '9px' }) {
  const photographerHref = photo.photographerUrl
    ? `${photo.photographerUrl}?${UNSPLASH_UTM}`
    : `https://unsplash.com/?${UNSPLASH_UTM}`
  const unsplashHref = `https://unsplash.com/?${UNSPLASH_UTM}`

  return (
    <p style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize, color, margin: 0, lineHeight: 1.4,
    }}>
      Photo by{' '}
      <a
        href={photographerHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{ color: 'inherit', textDecoration: 'underline' }}
      >
        {photo.credit || 'Photographer'}
      </a>
      {' '}on{' '}
      <a
        href={unsplashHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{ color: 'inherit', textDecoration: 'underline' }}
      >
        Unsplash
      </a>
    </p>
  )
}

// ─── Budget Slider ─────────────────────────────────────────────────────────────
function BudgetSlider({ value, onChange, onSettle }) {
  const trackRef   = useRef(null)
  const isDragging = useRef(false)
  const [liveIndex, setLiveIndex] = useState(-1)

  const selectedIndex = BUDGET_OPTIONS.indexOf(value)
  const displayIndex  = liveIndex >= 0 ? liveIndex : selectedIndex

  const getIndexAtX = useCallback((clientX) => {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 4)
  }, [])

  const onPtrDown = useCallback((e) => {
    isDragging.current = true
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (_) {}
    const idx = getIndexAtX(e.clientX)
    setLiveIndex(idx)
    onChange(BUDGET_OPTIONS[idx])
    onSettle?.(BUDGET_OPTIONS[idx])
  }, [getIndexAtX, onChange, onSettle])

  const onPtrMove = useCallback((e) => {
    if (!isDragging.current) return
    const idx = getIndexAtX(e.clientX)
    setLiveIndex(prev => { if (prev !== idx) onChange(BUDGET_OPTIONS[idx]); return idx })
  }, [getIndexAtX, onChange])

  const onPtrUp = useCallback((e) => {
    if (!isDragging.current) return
    isDragging.current = false
    const idx = getIndexAtX(e.clientX)
    const final = Math.max(0, Math.min(4, idx >= 0 ? idx : liveIndex >= 0 ? liveIndex : 4))
    setLiveIndex(-1)
    onChange(BUDGET_OPTIONS[final])
    onSettle?.(BUDGET_OPTIONS[final])
  }, [getIndexAtX, liveIndex, onChange, onSettle])

  const thumbPct = displayIndex >= 0 ? (displayIndex / 4) * 100 : 100

  return (
    <div>
      {/* Active sublabel */}
      <p style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase',
        color: '#C9A96E', margin: '0 0 10px', textAlign: 'center',
      }}>
        {BUDGET_SUBLABELS[displayIndex >= 0 ? displayIndex : selectedIndex]}
      </p>

      {/* Drag track */}
      <div
        ref={trackRef}
        onPointerDown={onPtrDown}
        onPointerMove={onPtrMove}
        onPointerUp={onPtrUp}
        style={{ position: 'relative', height: '28px', touchAction: 'none', cursor: 'grab' }}
      >
        {/* Base track */}
        <div style={{
          position: 'absolute', left: 0, right: 0,
          top: '50%', height: '1.5px',
          background: '#E0E0DA', transform: 'translateY(-50%)',
        }} />
        {/* Filled track */}
        <div style={{
          position: 'absolute', left: 0, width: `${thumbPct}%`,
          top: '50%', height: '1.5px',
          background: '#C9A96E', transform: 'translateY(-50%)',
          transition: isDragging.current ? 'none' : 'width 0.15s ease',
        }} />

        {/* Stop markers */}
        {BUDGET_OPTIONS.map((_, i) => {
          const isActive = i === displayIndex
          const isPast   = displayIndex >= 0 && i < displayIndex
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${(i / 4) * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width:  isActive ? '18px' : '7px',
                height: isActive ? '18px' : '7px',
                borderRadius: '50%',
                background: (isActive || isPast) ? '#C9A96E' : '#D4D0CA',
                boxShadow: isActive
                  ? '0 0 0 5px rgba(201,169,110,0.18), 0 1px 6px rgba(0,0,0,0.16)'
                  : 'none',
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                pointerEvents: 'none',
              }}
            />
          )
        })}
      </div>

      {/* Dollar labels */}
      <div style={{ position: 'relative', height: '20px', marginTop: '4px' }}>
        {BUDGET_OPTIONS.map((opt, i) => {
          const isActive = i === displayIndex
          const isFirst  = i === 0
          const isLast   = i === 4
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${(i / 4) * 100}%`,
                top: 0,
                transform: isFirst ? 'none' : isLast ? 'translateX(-100%)' : 'translateX(-50%)',
                textAlign: isFirst ? 'left' : isLast ? 'right' : 'center',
              }}
            >
              <p style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: isActive ? '13px' : '11px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#C9A96E' : '#BBBBBB',
                margin: 0, whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}>
                {opt}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Heart icon ───────────────────────────────────────────────────────────────
function HeartIcon({ filled, size = 15 }) {
  return filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#C9A96E" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

// ─── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ item, onShopClick, isSaved, onHeart }) {
  return (
    <div style={{ background: '#FAFAF8', border: '1px solid #E8E8E4', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', paddingTop: '133.33%', background: '#EDE9E4', overflow: 'hidden' }}>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.label}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#C9A96E', fontSize: '20px', opacity: 0.45 }}>✦</span>
          </div>
        )}
        {onHeart && (
          <button
            onClick={e => { e.stopPropagation(); onHeart() }}
            aria-label={isSaved ? 'Unsave item' : 'Save item'}
            style={{
              position: 'absolute', top: '6px', right: '6px',
              width: '26px', height: '26px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.36)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <HeartIcon filled={!!isSaved} size={12} />
          </button>
        )}
      </div>
      <div style={{ padding: '10px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '12px', fontWeight: 500, color: '#111',
          lineHeight: 1.3, flex: 1, margin: 0,
        }}>
          {item.label}
        </p>
        <a
          href={item.amazonLink}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => onShopClick?.(item)}
          style={{
            display: 'block', textAlign: 'center',
            background: '#0A0A0A', color: 'white',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase',
            padding: '7px 8px', textDecoration: 'none',
          }}
        >
          Shop on Amazon →
        </a>
      </div>
    </div>
  )
}

// ─── Look Modal ────────────────────────────────────────────────────────────────
function LookModal({ photo, shopItems, budget, onBudgetChange, onBudgetSettle, onClose, onNavigateWardrobe, onShopClick, isLookSaved, onHeartLook, savedItemMap, onHeartItem }) {
  const filtered = filterByBudget(shopItems, budget)
  const costLabel = budget !== '$0' && filtered.length > 0
    ? estimatedCost(budget, filtered.length)
    : null

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.74)',
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 12px 48px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#FAF8F3', width: '100%', maxWidth: '440px',
        position: 'relative', flexShrink: 0,
      }}>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: '10px', right: '10px', zIndex: 10,
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.42)', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '13px', lineHeight: 1,
          }}
        >
          ✕
        </button>

        {/* Photo — fixed 3:4 ratio */}
        <div style={{ position: 'relative', paddingTop: '133.33%', background: '#EDE9E4', overflow: 'hidden' }}>
          <img
            src={photo.imageUrl}
            alt={photo.title || 'Outfit inspiration'}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'top center',
            }}
          />

          {/* Estimated cost badge — overlaid on the photo, top-left corner */}
          {costLabel && (
            <div style={{
              position: 'absolute', top: '10px', left: '10px',
              background: 'rgba(0,0,0,0.58)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              padding: '5px 12px', borderRadius: '20px',
              pointerEvents: 'none',
            }}>
              <p style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '11px', letterSpacing: '0.04em',
                color: 'white', margin: 0, fontWeight: 500,
              }}>
                {costLabel}
              </p>
            </div>
          )}

          {/* Heart — save this look */}
          {onHeartLook && (
            <button
              onClick={e => { e.stopPropagation(); onHeartLook() }}
              aria-label={isLookSaved ? 'Unsave look' : 'Save look'}
              style={{
                position: 'absolute', bottom: '10px', right: '10px', zIndex: 10,
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.42)', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <HeartIcon filled={!!isLookSaved} size={17} />
            </button>
          )}

          {/* Unsplash attribution — required by Unsplash API guidelines */}
          {photo.credit && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '28px 12px 10px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.48), transparent)',
            }}>
              <UnsplashCredit photo={photo} color="rgba(255,255,255,0.65)" fontSize="10px" />
            </div>
          )}
        </div>

        {/* Budget slider — usable with modal open */}
        <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid #EAE4DA' }}>
          <p style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase',
            color: '#B8A88A', margin: '0 0 6px', textAlign: 'center',
          }}>
            Budget for this look
          </p>
          <BudgetSlider value={budget} onChange={onBudgetChange} onSettle={onBudgetSettle} />
        </div>

        {/* Shop section */}
        <div style={{ padding: '16px 16px 20px', borderBottom: '1px solid #EAE4DA' }}>
          {budget === '$0' ? (
            <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
              <p style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '17px', color: '#3A3A3A', margin: '0 0 6px', fontStyle: 'italic', lineHeight: 1.4 }}>
                Style this look from your wardrobe.
              </p>
              <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px', color: '#9B9B9B', margin: '0 0 16px' }}>
                Open your wardrobe to pull pieces that match this vibe.
              </p>
              <button
                onClick={onNavigateWardrobe}
                style={{
                  border: '1.5px solid #0A0A0A', background: 'none', color: '#0A0A0A',
                  padding: '10px 20px', fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Open Wardrobe →
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '12px', color: '#AAAAAA', textAlign: 'center', padding: '16px 0', margin: 0 }}>
              No items in this budget range.
            </p>
          ) : (
            <>
              <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9B9B9B', margin: '0 0 8px' }}>
                Shop this look
              </p>
              <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '10px', color: '#AAAAAA', textAlign: 'center', fontStyle: 'italic', margin: '0 0 12px', lineHeight: 1.55 }}>
                ✦ Gigi earns a small commission on qualifying purchases — it never influences our recommendations.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {filtered.map(item => (
                  <ProductCard
                    key={item.query}
                    item={item}
                    onShopClick={onShopClick}
                    isSaved={savedItemMap?.has(item.amazonLink)}
                    onHeart={onHeartItem ? () => onHeartItem(item) : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Privacy policy link */}
        <div style={{ padding: '10px 16px 14px', textAlign: 'center' }}>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '9px', letterSpacing: '0.10em',
              color: '#C9A96E', textDecoration: 'none',
            }}
          >
            Privacy Policy
          </a>
        </div>

      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function InspirationPage() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const { occasion } = state

  const { user } = useAuth()
  const normalizedDescriptorsRef = useRef(null)

  const [photos, setPhotos]           = useState([])
  const [shopItems, setShopItems]     = useState([])
  const [loading, setLoading]         = useState(false)
  const [budget, setBudget]           = useState('$500+')
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [savedLookMap, setSavedLookMap] = useState(new Map()) // imageUrl → dbId | 'pending'
  const [savedItemMap, setSavedItemMap] = useState(new Map()) // amazonLink → dbId | 'pending'
  const [promptPending, setPromptPending] = useState(null)   // { type: 'look'|'item', photo?, item?, parentLookId? }

  const occasionKey = occasion ? JSON.stringify({
    venue:              occasion.venue              || '',
    venueLocation:      occasion.venueLocation      || '',
    venueTypes:         occasion.venueTypes         || [],
    isPrivateResidence: !!occasion.isPrivateResidence,
    occasionType:       occasion.occasionType       || null,
    gender:             occasion.gender             || null,
    size:               occasion.size               || null,
    dressCode:          occasion.dressCode          || null,
    timeOfDay:          occasion.timeOfDay          || null,
    season:             occasion.season             || null,
  }) : null

  useEffect(() => {
    if (!loading && photos.length === 0 && !!occasion) {
      console.warn('[InspirationPage] Empty state — photos array is empty. Occasion set:', !!occasion)
    }
  }, [loading, photos.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load existing saves when the user logs in
  useEffect(() => {
    if (!user) return
    Promise.all([fetchSavedLooks(user.id), fetchSavedItems(user.id)]).then(([looks, items]) => {
      setSavedLookMap(new Map(looks.map(l => [l.image_url, l.id])))
      setSavedItemMap(new Map(items.map(i => [i.product_url, i.id])))
    })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!occasion) return
    setLoading(true)
    callStyleProxy(occasion, user?.id ?? null)
      .then(result => {
        console.log('[InspirationPage] callStyleProxy resolved —',
          'photos:', result.inspirationPhotos?.length ?? 'missing',
          '| shopItems:', result.shoppableImages?.length ?? 'missing',
        )
        normalizedDescriptorsRef.current = result.normalizedDescriptors ?? null
        setPhotos(result.inspirationPhotos ?? [])
        setShopItems(result.shoppableImages ?? [])
        setLoading(false)
        const d = result.styleDescriptor ?? {}
        if (d.inferredDressCode || d.styleBrief) {
          dispatch({
            type: 'SET_STYLE_INFERENCE',
            payload: {
              inferredDressCode: d.inferredDressCode ?? null,
              inferredTimeOfDay: d.inferredTimeOfDay ?? null,
              inferredSeason:    d.inferredSeason    ?? null,
              styleBrief:        d.styleBrief        ?? null,
              aestheticKeywords: d.aestheticKeywords ?? [],
              colorPalette:      d.colorPalette      ?? [],
              avoidList:         d.avoidList         ?? [],
            },
          })
        }
      })
      .catch(() => setLoading(false))
  }, [occasionKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleHeartLook = useCallback(async (photo) => {
    const key = photo.imageUrl
    if (savedLookMap.has(key)) {
      const dbId = savedLookMap.get(key)
      setSavedLookMap(prev => { const m = new Map(prev); m.delete(key); return m })
      try { await unsaveLook(dbId) }
      catch { setSavedLookMap(prev => new Map(prev).set(key, dbId)) }
      return
    }
    setSavedLookMap(prev => new Map(prev).set(key, 'pending'))
    if (!user) { setPromptPending({ type: 'look', photo }); return }
    try {
      const dbId = await saveLook(user.id, {
        occasion: occasion?.venue ?? null,
        imageUrl: key,
        descriptors: normalizedDescriptorsRef.current,
        sourceBriefId: null,
      })
      setSavedLookMap(prev => new Map(prev).set(key, dbId))
    } catch {
      setSavedLookMap(prev => { const m = new Map(prev); m.delete(key); return m })
    }
  }, [user, savedLookMap, occasion])

  const handleHeartItem = useCallback(async (item) => {
    const key = item.amazonLink
    if (savedItemMap.has(key)) {
      const dbId = savedItemMap.get(key)
      setSavedItemMap(prev => { const m = new Map(prev); m.delete(key); return m })
      try { await unsaveItem(dbId) }
      catch { setSavedItemMap(prev => new Map(prev).set(key, dbId)) }
      return
    }
    setSavedItemMap(prev => new Map(prev).set(key, 'pending'))
    const rawParent = selectedPhoto ? (savedLookMap.get(selectedPhoto.imageUrl) ?? null) : null
    const parentLookId = rawParent === 'pending' ? null : rawParent
    if (!user) { setPromptPending({ type: 'item', item, parentLookId }); return }
    try {
      const dbId = await saveItem(user.id, {
        productName: item.label,
        productUrl:  item.amazonLink,
        retailer:    'amazon',
        imageUrl:    item.imageUrl ?? null,
        descriptors: normalizedDescriptorsRef.current,
        parentLookId,
      })
      setSavedItemMap(prev => new Map(prev).set(key, dbId))
    } catch {
      setSavedItemMap(prev => { const m = new Map(prev); m.delete(key); return m })
    }
  }, [user, savedItemMap, selectedPhoto, savedLookMap])

  const handleSavePromptSuccess = useCallback(async (newUser) => {
    const pending = promptPending
    setPromptPending(null)
    if (!pending) return
    if (pending.type === 'look') {
      const key = pending.photo.imageUrl
      try {
        const dbId = await saveLook(newUser.id, {
          occasion: occasion?.venue ?? null,
          imageUrl: key,
          descriptors: normalizedDescriptorsRef.current,
          sourceBriefId: null,
        })
        setSavedLookMap(prev => new Map(prev).set(key, dbId))
      } catch {
        setSavedLookMap(prev => { const m = new Map(prev); m.delete(key); return m })
      }
    } else if (pending.type === 'item') {
      const key = pending.item.amazonLink
      try {
        const dbId = await saveItem(newUser.id, {
          productName: pending.item.label,
          productUrl:  key,
          retailer:    'amazon',
          imageUrl:    pending.item.imageUrl ?? null,
          descriptors: normalizedDescriptorsRef.current,
          parentLookId: pending.parentLookId,
        })
        setSavedItemMap(prev => new Map(prev).set(key, dbId))
      } catch {
        setSavedItemMap(prev => { const m = new Map(prev); m.delete(key); return m })
      }
    }
  }, [promptPending, occasion])

  const handleSavePromptDismiss = useCallback(() => {
    if (promptPending?.type === 'look') {
      setSavedLookMap(prev => { const m = new Map(prev); m.delete(promptPending.photo.imageUrl); return m })
    } else if (promptPending?.type === 'item') {
      setSavedItemMap(prev => { const m = new Map(prev); m.delete(promptPending.item.amazonLink); return m })
    }
    setPromptPending(null)
  }, [promptPending])

  if (!occasion) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF8F3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <p style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '20px', color: '#999', fontStyle: 'italic' }}>No occasion set</p>
        <button
          onClick={() => navigate('/')}
          style={{ background: '#0A0A0A', color: 'white', border: 'none', padding: '10px 20px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', marginTop: '16px' }}
        >
          Get Started
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0EDE8', paddingBottom: '80px' }}>

      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#FAF8F3', borderBottom: '1px solid #EAE4DA' }}>

        {/* Three-column header: Edit (left) · venue (center) · Home (right) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px 2px' }}>

          {/* Edit — navigates to /refine, keeps all state intact */}
          <button
            onClick={() => navigate('/refine')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase',
              color: '#C9A96E', padding: '4px 0',
            }}
          >
            Edit
          </button>

          {/* Venue name — centered, truncated */}
          <p style={{
            flex: 1, textAlign: 'center', margin: 0,
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: '15px', fontWeight: 500, color: '#111',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {occasion.venue}
          </p>

          {/* Home → navigates to /, start over */}
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase',
              color: '#9B8B72', padding: '4px 0',
            }}
          >
            Home →
          </button>
        </div>

        {/* Budget slider */}
        <div style={{ padding: '6px 24px 14px' }}>
          <p style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase',
            color: '#B8A88A', margin: '0 0 6px', textAlign: 'center',
          }}>
            Budget for this look
          </p>
          <BudgetSlider
            value={budget}
            onChange={setBudget}
            onSettle={val => track('budget_changed', { budgetTier: val })}
          />
        </div>

      </div>

      {/* Content */}
      {loading ? (
        // Skeleton masonry grid
        <div style={{ columnCount: 2, columnGap: '4px', padding: '4px', maxWidth: '512px', margin: '0 auto' }}>
          {[150, 125, 140, 130, 155, 120].map((h, i) => (
            <div key={i} style={{ breakInside: 'avoid', marginBottom: '4px' }}>
              <div
                className="gigi-skeleton"
                style={{ paddingTop: `${h}%`, background: '#EDE9E4' }}
              />
            </div>
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '18px', color: '#999', fontStyle: 'italic' }}>
            No inspiration found
          </p>
          <button
            onClick={() => navigate('/refine')}
            style={{ background: '#0A0A0A', color: 'white', border: 'none', padding: '10px 20px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', marginTop: '16px' }}
          >
            Edit Details →
          </button>
        </div>
      ) : (
        <>
          {/* 2-column masonry grid */}
          <div style={{ columnCount: 2, columnGap: '4px', padding: '4px', maxWidth: '512px', margin: '0 auto' }}>
            {photos.map(photo => (
              <div
                key={photo.id}
                style={{ breakInside: 'avoid', marginBottom: '4px', cursor: 'pointer' }}
                onClick={() => {
                  triggerUnsplashDownload(photo.id)
                  track('look_opened', {
                    venue:        occasion.venue,
                    occasionType: occasion.occasionType || null,
                    photoId:      photo.id,
                  })
                  setSelectedPhoto(photo)
                }}
              >
                <div style={{
                  position: 'relative',
                  paddingTop: `${Math.min(170, Math.max(100, (1 / (photo.aspectRatio || 0.75)) * 100))}%`,
                  background: '#EDE9E4',
                  overflow: 'hidden',
                }}>
                  <img
                    src={photo.thumbnailUrl || photo.imageUrl}
                    alt={photo.title || 'Outfit inspiration'}
                    loading="lazy"
                    style={{
                      position: 'absolute', inset: 0,
                      width: '100%', height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.35s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  />

                  {/* Heart — save this look */}
                  <button
                    onClick={e => { e.stopPropagation(); handleHeartLook(photo) }}
                    aria-label={savedLookMap.has(photo.imageUrl) ? 'Unsave look' : 'Save look'}
                    style={{
                      position: 'absolute', top: '6px', right: '6px', zIndex: 5,
                      width: '26px', height: '26px', borderRadius: '50%',
                      background: 'rgba(0,0,0,0.36)', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <HeartIcon filled={savedLookMap.has(photo.imageUrl)} size={12} />
                  </button>

                  {/* Unsplash attribution — required by Unsplash API guidelines */}
                  {photo.credit && (
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      padding: '18px 6px 5px',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.46), transparent)',
                    }}>
                      <UnsplashCredit photo={photo} color="rgba(255,255,255,0.6)" fontSize="8px" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Saved looks CTA */}
          <div style={{ padding: '32px 20px', textAlign: 'center', background: '#FAF8F3', borderTop: '1px solid #EAE4DA', maxWidth: '512px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1, height: '1px', background: '#EAE4DA' }} />
              <span style={{ color: '#C9A96E' }}>✦</span>
              <div style={{ flex: 1, height: '1px', background: '#EAE4DA' }} />
            </div>
            <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '12px', color: '#9B9B9B', margin: '0 0 16px' }}>
              Heart any look to save it for later.
            </p>
            <button
              onClick={() => navigate('/looks')}
              style={{ border: '1.5px solid #0A0A0A', background: 'none', color: '#0A0A0A', padding: '12px 24px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', width: '100%', maxWidth: '320px' }}
            >
              View Saved Looks →
            </button>
          </div>
        </>
      )}

      {/* Look Modal */}
      {selectedPhoto && (
        <LookModal
          photo={selectedPhoto}
          shopItems={shopItems}
          budget={budget}
          onBudgetChange={setBudget}
          onBudgetSettle={val => track('budget_changed', { budgetTier: val })}
          onClose={() => setSelectedPhoto(null)}
          onNavigateWardrobe={() => navigate('/looks')}
          onShopClick={item => {
            track('shop_click', {
              itemLabel:    item.label,
              query:        item.query,
              venue:        occasion.venue,
              occasionType: occasion.occasionType || null,
              gender:       occasion.gender       || null,
              budgetTier:   budget,
            })
            if (user) insertTasteSignal(user.id, 'shop_click', 5, normalizedDescriptorsRef.current)
          }}
          isLookSaved={savedLookMap.has(selectedPhoto.imageUrl)}
          onHeartLook={() => handleHeartLook(selectedPhoto)}
          savedItemMap={savedItemMap}
          onHeartItem={handleHeartItem}
        />
      )}

      {/* Save prompt — soft gate for anonymous hearts */}
      {promptPending && (
        <SavePrompt
          onSuccess={handleSavePromptSuccess}
          onDismiss={handleSavePromptDismiss}
        />
      )}

      <style>{`
        @keyframes gigi-shimmer { 0%,100% { opacity:0.45 } 50% { opacity:0.85 } }
        .gigi-skeleton { animation: gigi-shimmer 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
