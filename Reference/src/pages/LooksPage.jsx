import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchSavedLooks, fetchSavedItems, unsaveLook, unsaveItem } from '../services/savedLooksService'
import { track } from '../lib/analytics'

// ─── Filled heart ──────────────────────────────────────────────────────────────
function HeartFilled({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#C9A96E" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  )
}

// ─── Heart unsave button ───────────────────────────────────────────────────────
function UnsaveButton({ onUnsave, size = 26 }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onUnsave() }}
      aria-label="Remove from saved"
      style={{
        width: `${size}px`, height: `${size}px`, borderRadius: '50%',
        background: 'rgba(0,0,0,0.38)', border: 'none',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <HeartFilled size={size * 0.5} />
    </button>
  )
}

// ─── Look card ─────────────────────────────────────────────────────────────────
function LookCard({ look, onUnsave }) {
  return (
    <div style={{ breakInside: 'avoid', marginBottom: '4px' }}>
      <div style={{ background: '#FAFAF8', border: '1px solid #E8E8E4' }}>

        {/* Photo — 3:4 */}
        <div style={{ position: 'relative', paddingTop: '133.33%', background: '#EDE9E4', overflow: 'hidden' }}>
          {look.image_url ? (
            <img
              src={look.image_url}
              alt={look.occasion || 'Saved look'}
              loading="lazy"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#C9A96E', fontSize: '24px', opacity: 0.35 }}>✦</span>
            </div>
          )}

          {/* Unsave heart */}
          <div style={{ position: 'absolute', top: '6px', right: '6px', zIndex: 2 }}>
            <UnsaveButton onUnsave={() => onUnsave(look)} />
          </div>

          {/* ─── Phase 2: Try-on ─────────────────────────────────────────────
            A "Try it on" action will appear here when the virtual try-on
            feature ships. It will open a camera/AR overlay flow keyed to
            this saved look's descriptors and image_url.
            Do not build this yet — placeholder only.
            ─────────────────────────────────────────────────────────────── */}
        </div>

        {/* Occasion label */}
        {look.occasion && (
          <div style={{ padding: '7px 8px 8px' }}>
            <p style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: '11px', color: '#3A3A3A', margin: 0,
              lineHeight: 1.3, fontStyle: 'italic',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {look.occasion}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Item card ─────────────────────────────────────────────────────────────────
function ItemCard({ item, onUnsave }) {
  return (
    <div style={{ background: '#FAFAF8', border: '1px solid #E8E8E4', display: 'flex', flexDirection: 'column' }}>

      {/* Image — 3:4 */}
      <div style={{ position: 'relative', paddingTop: '133.33%', background: '#EDE9E4', overflow: 'hidden' }}>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.product_name || 'Saved item'}
            loading="lazy"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#C9A96E', fontSize: '20px', opacity: 0.35 }}>✦</span>
          </div>
        )}

        {/* Unsave heart */}
        <div style={{ position: 'absolute', top: '6px', right: '6px', zIndex: 2 }}>
          <UnsaveButton onUnsave={() => onUnsave(item)} />
        </div>
      </div>

      {/* Info + shop link */}
      <div style={{ padding: '10px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {item.product_name && (
          <p style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: '12px', fontWeight: 500, color: '#111',
            lineHeight: 1.3, flex: 1, margin: 0,
          }}>
            {item.product_name}
          </p>
        )}
        {item.retailer && (
          <p style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#B8A88A', margin: 0,
          }}>
            {item.retailer}
          </p>
        )}
        {item.product_url && (
          <a
            href={item.product_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => track('shop_click_from_looks', { itemId: item.id, retailer: item.retailer })}
            style={{
              display: 'block', textAlign: 'center',
              background: '#0A0A0A', color: 'white',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase',
              padding: '7px 8px', textDecoration: 'none', marginTop: 'auto',
            }}
          >
            Shop →
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ tab, onCTA }) {
  return (
    <div style={{ padding: '64px 24px', textAlign: 'center' }}>
      <p style={{
        fontFamily: '"Playfair Display", Georgia, serif',
        fontSize: '18px', color: '#BBBBBB', fontStyle: 'italic',
        lineHeight: 1.5, margin: '0 0 8px',
      }}>
        {tab === 'looks'
          ? 'Nothing saved yet —'
          : 'No items saved yet —'}
      </p>
      <p style={{
        fontFamily: '"Playfair Display", Georgia, serif',
        fontSize: '18px', color: '#BBBBBB', fontStyle: 'italic',
        lineHeight: 1.5, margin: '0 0 28px',
      }}>
        {tab === 'looks'
          ? 'heart the looks you love.'
          : 'heart items from any look.'}
      </p>
      <button
        onClick={onCTA}
        style={{
          background: '#0A0A0A', color: 'white', border: 'none',
          padding: '12px 28px', cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase',
        }}
      >
        Find inspiration →
      </button>
    </div>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ columnCount: 2, columnGap: '4px', padding: '4px', maxWidth: '512px', margin: '0 auto' }}>
      {[133, 133, 133, 133].map((h, i) => (
        <div key={i} style={{ breakInside: 'avoid', marginBottom: '4px' }}>
          <div
            className="gigi-skeleton"
            style={{ paddingTop: `${h}%`, background: '#EDE9E4' }}
          />
        </div>
      ))}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function LooksPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab]     = useState('looks')
  const [looks, setLooks] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([fetchSavedLooks(user.id), fetchSavedItems(user.id)])
      .then(([l, i]) => { setLooks(l); setItems(i) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUnsaveLook = useCallback(async (look) => {
    setLooks(prev => prev.filter(l => l.id !== look.id))
    try {
      await unsaveLook(look.id)
      track('look_unsaved', { lookId: look.id })
    } catch {
      setLooks(prev => [look, ...prev])
    }
  }, [])

  const handleUnsaveItem = useCallback(async (item) => {
    setItems(prev => prev.filter(i => i.id !== item.id))
    try {
      await unsaveItem(item.id)
      track('item_unsaved', { itemId: item.id })
    } catch {
      setItems(prev => [item, ...prev])
    }
  }, [])

  const TAB_STYLE = (active) => ({
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
    color: active ? '#0A0A0A' : '#AAAAAA',
    padding: '0 0 8px',
    borderBottom: active ? '1.5px solid #0A0A0A' : '1.5px solid transparent',
    transition: 'color 0.15s ease, border-color 0.15s ease',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#F0EDE8', paddingBottom: '80px' }}>

      {/* Section toggle */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#FAF8F3', borderBottom: '1px solid #EAE4DA',
        padding: '14px 24px 0',
        display: 'flex', gap: '28px',
        maxWidth: '512px', margin: '0 auto',
        // sticky needs to span full width
        width: '100%', boxSizing: 'border-box',
      }}>
        <button style={TAB_STYLE(tab === 'looks')} onClick={() => setTab('looks')}>
          Saved looks {!loading && looks.length > 0 ? `(${looks.length})` : ''}
        </button>
        <button style={TAB_STYLE(tab === 'items')} onClick={() => setTab('items')}>
          Saved items {!loading && items.length > 0 ? `(${items.length})` : ''}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : tab === 'looks' ? (
        looks.length === 0 ? (
          <EmptyState tab="looks" onCTA={() => navigate('/')} />
        ) : (
          <div style={{ columnCount: 2, columnGap: '4px', padding: '4px', maxWidth: '512px', margin: '0 auto' }}>
            {looks.map(look => (
              <LookCard key={look.id} look={look} onUnsave={handleUnsaveLook} />
            ))}
          </div>
        )
      ) : (
        items.length === 0 ? (
          <EmptyState tab="items" onCTA={() => navigate('/')} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', padding: '4px', maxWidth: '512px', margin: '0 auto' }}>
            {items.map(item => (
              <ItemCard key={item.id} item={item} onUnsave={handleUnsaveItem} />
            ))}
          </div>
        )
      )}

      <style>{`
        @keyframes gigi-shimmer { 0%,100% { opacity:0.45 } 50% { opacity:0.85 } }
        .gigi-skeleton { animation: gigi-shimmer 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
