import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { searchVenues, detectResidenceFromText } from '../services/venueService'
import { track } from '../lib/analytics'

// ─── Session-level intro guard ────────────────────────────────────────────────
let introHasPlayed = false
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ─── Fashion image pool ───────────────────────────────────────────────────────
const DIVERSE_FASHION = [
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
  'https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a',
  'https://images.unsplash.com/photo-1581044777550-4cfa4e0374fd',
  'https://images.unsplash.com/photo-1583394838336-acd977736f90',
  'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd',
  'https://images.unsplash.com/photo-1603217192634-61068e4d4bf9',
  'https://images.unsplash.com/photo-1611042553484-d61f84d22784',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e',
  'https://images.unsplash.com/photo-1562572159-4efd90a0a6c5',
  'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c',
  'https://images.unsplash.com/photo-1565728744382-61accd4aa148',
  'https://images.unsplash.com/photo-1567456668659-4fd47b8c6ae0',
  'https://images.unsplash.com/photo-1564257631407-4deb1f99d992',
  'https://images.unsplash.com/photo-1560364360-773c4e51a8b0',
  'https://images.unsplash.com/photo-1567168544813-cc03465b4fa8',
  'https://images.unsplash.com/photo-1556742393-d75f468bfcb0',
  'https://images.unsplash.com/photo-1614093302611-8efc4dd56082',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
  'https://images.unsplash.com/photo-1566206091558-7f218b696731',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
  'https://images.unsplash.com/photo-1487222099582-18f1e0afd1c5',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae',
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b',
  'https://images.unsplash.com/photo-1532453288672-3a17f2e6ad51',
  'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b',
  'https://images.unsplash.com/photo-1572635196184-84e35138cf62',
  'https://images.unsplash.com/photo-1485968579580-b6d095142e6e',
  'https://images.unsplash.com/photo-1550614000-4895a10e1bfd',
  'https://images.unsplash.com/photo-1434389677669-e08b4cac3105',
  'https://images.unsplash.com/photo-1462804993656-fac4ff489837',
  'https://images.unsplash.com/photo-1548175601-8eb5f7f0ab94',
  'https://images.unsplash.com/photo-1571513722275-4b41940f54b8',
  'https://images.unsplash.com/photo-1504198453119-5047050c6b9a',
  'https://images.unsplash.com/photo-1544441893-675973e31985',
]
const FASHION_FALLBACKS = [
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7',
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b',
]
const CROPS = ['top', 'center', 'entropy', 'bottom']

// ─── Map grid config ──────────────────────────────────────────────────────────
// ~44% of tiles are blank (white), creating the "incomplete map" look.
// This set is deterministic — consistent across renders.
const BLANK_SET = new Set([
  1, 3, 6, 8, 11, 13, 15, 18, 20, 23, 25, 28, 30, 33, 35, 37,
  40, 42, 45, 47, 50, 52, 54, 57, 59, 62, 64, 67, 69, 71, 74,
  76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 4, 41, 17, 60, 83,
])
const TOTAL_TILES = 108

const MAP_TILES = Array.from({ length: TOTAL_TILES }, (_, i) => {
  const blank = BLANK_SET.has(i)
  if (blank) return { id: i, blank: true, url: null, fallback: null }
  const fi = (i * 7 + 3) % DIVERSE_FASHION.length
  return {
    id: i,
    blank: false,
    url:  `${DIVERSE_FASHION[fi]}?w=180&h=252&fit=crop&crop=${CROPS[(i * 3) % 4]}&q=40&auto=format`,
    fallback: `${FASHION_FALLBACKS[i % FASHION_FALLBACKS.length]}?w=180&h=252&fit=crop&crop=center&q=35&auto=format`,
  }
})

// ─── Map path + waypoints ─────────────────────────────────────────────────────
// Path winds from lower-left → upper-center → upper-right in 0-100 SVG coords.
// pathLength="1000" normalises the path so dashoffset animation is always 1000→0.
const MAP_PATH = 'M 4,72 C 12,55 22,18 28,24 S 42,10 58,26 S 72,14 97,30'
const LINE_DURATION = 0.82 // seconds

// t: fractional position along the path where this × appears (0–1)
const WAYPOINTS = [
  { cx: 4,  cy: 72, t: 0.02 },
  { cx: 14, cy: 50, t: 0.16 },
  { cx: 28, cy: 24, t: 0.30 },
  { cx: 58, cy: 26, t: 0.57 },
  { cx: 72, cy: 18, t: 0.76 },
  { cx: 97, cy: 30, t: 0.93 },
]

// ─── Grid tile ────────────────────────────────────────────────────────────────
const GridTile = React.memo(function GridTile({ tile }) {
  const [src, setSrc] = useState(tile.url)
  if (tile.blank) return <div />
  return (
    <div style={{ overflow: 'hidden' }}>
      <img
        src={src}
        alt=""
        onError={() => setSrc(tile.fallback)}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  )
})

// ─── Letter + location icon data ──────────────────────────────────────────────
const LETTERS = [
  {
    char: 'G',
    icon: ( // bow tie — gala / black tie
      <svg width="32" height="24" viewBox="0 0 32 24" fill="#0A0A0A" aria-hidden="true">
        <path d="M 0,0 L 14,12 L 0,24 Z M 32,0 L 18,12 L 32,24 Z"/>
        <circle cx="16" cy="12" r="3"/>
      </svg>
    ),
  },
  {
    char: 'I',
    icon: ( // fork & knife — dining
      <svg width="24" height="40" viewBox="0 0 24 40" fill="#0A0A0A" aria-hidden="true">
        <path d="M4 0L4 12Q4 17 7 19L7 40L11 40L11 19Q14 17 14 12L14 0L12 0L12 11L10 11L10 0L8 0L8 11L6 11L6 0Z"/>
        <rect x="18" y="0" width="3" height="40" rx="1.5"/>
      </svg>
    ),
  },
  {
    char: 'G',
    icon: ( // flower — garden party
      <svg width="32" height="38" viewBox="0 0 32 38" fill="#0A0A0A" aria-hidden="true">
        <ellipse cx="16" cy="8" rx="5" ry="7"/>
        <ellipse cx="16" cy="26" rx="5" ry="7"/>
        <ellipse cx="5" cy="17" rx="7" ry="5"/>
        <ellipse cx="27" cy="17" rx="7" ry="5"/>
        <circle cx="16" cy="17" r="5"/>
        <rect x="14" y="31" width="4" height="7" rx="2"/>
      </svg>
    ),
  },
  {
    char: 'I',
    icon: ( // office tower — work
      <svg width="28" height="40" viewBox="0 0 28 40" fill="#0A0A0A" fillRule="evenodd" aria-hidden="true">
        <path d="M2 40L2 4Q2 0 6 0L22 0Q26 0 26 4L26 40ZM6 5L6 11L12 11L12 5ZM16 5L16 11L22 11L22 5ZM6 15L6 21L12 21L12 15ZM16 15L16 21L22 21L22 15ZM10 27L10 40L18 40L18 27Z"/>
      </svg>
    ),
  },
]

// ─── Letter flip card ─────────────────────────────────────────────────────────
function LetterFlipCard({ char, icon, delay, started, skip }) {
  const inner = (started && !skip)
    ? {
        transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d',
        position: 'relative',
        animation: `gigi-letter-flip 0.56s cubic-bezier(0.34, 1.14, 0.64, 1) ${delay}ms both`,
      }
    : {
        transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d',
        position: 'relative',
        transform: skip ? 'rotateX(0deg)' : 'rotateX(180deg)',
      }

  return (
    <div style={{ perspective: '700px', WebkitPerspective: '700px' }}>
      <div style={inner}>
        <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{
            fontFamily: '"Space Grotesk", "Inter", sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(56px, 16vw, 130px)',
            color: '#0A0A0A',
            lineHeight: 0.88,
            display: 'block',
            filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.09))',
            userSelect: 'none',
          }}>
            {char}
          </span>
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateX(180deg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// ─── Dropdown row styles ──────────────────────────────────────────────────────
const rowBase = {
  display: 'flex', alignItems: 'flex-start', width: '100%',
  textAlign: 'left', background: 'none', border: 'none',
  cursor: 'pointer', padding: '12px 16px', boxSizing: 'border-box',
  borderLeft: '3px solid transparent',
}
const rowHighlight = {
  ...rowBase,
  background: 'rgba(201,169,110,0.10)',
  borderLeft: '3px solid #C9A96E',
}

// ─── HomePage ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate()
  const { state, dispatch } = useApp()

  const skip = introHasPlayed || prefersReducedMotion

  const [lettersStarted, setLettersStarted] = useState(skip)
  const [lineDrawn,      setLineDrawn]      = useState(skip)
  const [showPlus,       setShowPlus]       = useState(skip)
  const [showContent,    setShowContent]    = useState(skip)

  const [textValue,    setTextValue]    = useState('')
  const [suggestions,  setSuggestions]  = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex,  setActiveIndex]  = useState(-1)

  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const savedOccasion = state.occasion

  // ── Auto-focus ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const delay = skip ? 400 : 2000
    const t = setTimeout(() => inputRef.current?.focus(), delay)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Intro sequence ──────────────────────────────────────────────────────────
  // Letters: B starts at 80ms, stagger 180ms each → Y starts at 800ms, done ≈1360ms
  // Line: starts at 1200ms, draws for 0.82s → done ≈2020ms
  // Plus: 1250ms. Content: 1600ms. Mark played: 2450ms.
  useEffect(() => {
    if (skip) return
    const t1 = setTimeout(() => setLettersStarted(true),       80)
    const t2 = setTimeout(() => setLineDrawn(true),          1200)
    const t3 = setTimeout(() => setShowPlus(true),           1250)
    const t4 = setTimeout(() => setShowContent(true),        1600)
    const t5 = setTimeout(() => { introHasPlayed = true },   2450)
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Venue search ────────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(timerRef.current)
    if (textValue.trim().length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      const results = await searchVenues(textValue.trim())
      setSuggestions(results.slice(0, 5))
      setActiveIndex(-1)
      setShowDropdown(true)
    }, 300)
    return () => clearTimeout(timerRef.current)
  }, [textValue])

  const commitVenue = (venue) => {
    setTextValue(venue.name)
    setShowDropdown(false)
    setActiveIndex(-1)
    track('venue_searched', {
      venue:              venue.name,
      venueLocation:      venue.location || '',
      isPrivateResidence: venue.isResidence || false,
    })
    dispatch({
      type: 'SET_OCCASION',
      payload: {
        venue:              venue.name,
        venueLocation:      venue.location || '',
        venueTypes:         venue.types || [],
        isPrivateResidence: venue.isResidence || false,
        dressCode: null, timeOfDay: null, season: null,
      },
    })
    navigate('/refine')
  }

  const commitFreeText = () => {
    const text = textValue.trim()
    if (!text) return
    commitVenue({ name: text, location: '', types: [], isResidence: detectResidenceFromText(text) })
  }

  const handleKeyDown = (e) => {
    if (!showDropdown) {
      if (e.key === 'Enter' && textValue.trim()) commitFreeText()
      return
    }
    const total = suggestions.length + 1
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, total - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < suggestions.length) commitVenue(suggestions[activeIndex])
      else commitFreeText()
    } else if (e.key === 'Escape') { setShowDropdown(false); setActiveIndex(-1) }
  }

  const looksLikeResidence = detectResidenceFromText(textValue)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#FDFDFB', overflowY: 'auto' }}>

      {/* ── Background: map grid + travel-route line + vignette ────────────── */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>

        {/* Image grid — faint, desaturated */}
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
          gridAutoRows: '100px',
          gap: '2px', padding: '2px',
          opacity: 0.40,
          filter: 'saturate(0.42)',
        }}>
          {MAP_TILES.map(tile => <GridTile key={tile.id} tile={tile} />)}
        </div>

        {/* SVG travel-route line — winds across the grid */}
        {/* viewBox 0-100 treated as percentage coordinates.          */}
        {/* pathLength="1000" normalises dashoffset animation.        */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d={MAP_PATH}
            fill="none"
            stroke="#C9A96E"
            strokeWidth="0.45"
            strokeLinecap="round"
            pathLength="1000"
            strokeDasharray="18 10"
            vectorEffect="non-scaling-stroke"
            style={{
              strokeDashoffset: (lineDrawn || skip) ? 0 : 1000,
              transition: (lineDrawn && !skip) ? `stroke-dashoffset ${LINE_DURATION}s linear` : 'none',
              opacity: 0.75,
            }}
          />
        </svg>

        {/* × waypoint markers — percentage-positioned to match SVG path */}
        {WAYPOINTS.map((wp, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${wp.cx}%`,
              top:  `${wp.cy}%`,
              transform: 'translate(-50%, -50%)',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '13px',
              fontWeight: 600,
              color: '#C9A96E',
              lineHeight: 1,
              opacity: (lineDrawn || skip) ? 0.82 : 0,
              transition: (lineDrawn && !skip)
                ? `opacity 0.28s ease ${(wp.t * LINE_DURATION).toFixed(2)}s`
                : 'none',
            }}
          >
            ×
          </div>
        ))}

        {/* Center vignette — keeps the logo + search area clean white */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 58% 62% at 50% 46%, #FDFDFB 24%, rgba(253,253,251,0.92) 48%, rgba(253,253,251,0.55) 68%, transparent 100%)',
        }} />
      </div>

      {/* ── Foreground content ─────────────────────────────────────────────── */}
      <div style={{
        minHeight: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(20px, 5vh, 48px) 20px 72px',
        position: 'relative',
      }}>

        {/* GIGI letters + plus */}
        <div style={{ marginBottom: 'clamp(28px, 5.5vh, 52px)', textAlign: 'center' }}>

          <div style={{
            display: 'flex', alignItems: 'flex-end',
            justifyContent: 'center',
            gap: 'clamp(1px, 0.18vw, 3px)',
          }}>
            {LETTERS.map((item, i) => (
              <LetterFlipCard
                key={item.char}
                char={item.char}
                icon={item.icon}
                delay={i * 180}
                started={lettersStarted}
                skip={skip}
              />
            ))}
          </div>

          {/* Pulsing + */}
          <div style={{
            marginTop: '6px',
            opacity: (showPlus || skip) ? 1 : 0,
            transition: 'opacity 0.38s ease',
          }}>
            <span
              aria-hidden="true"
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 'clamp(18px, 3.5vw, 28px)',
                fontWeight: 300,
                color: '#0A0A0A',
                display: 'inline-block',
                lineHeight: 1,
                filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.08))',
                animation: 'gigi-plus-pulse 1.6s ease-in-out infinite',
              }}
            >
              +
            </span>
          </div>
        </div>

        {/* Headline + subhead + search bar */}
        <div style={{
          width: '100%', maxWidth: '440px', textAlign: 'center',
          opacity: (showContent || skip) ? 1 : 0,
          transition: (showContent && !skip) ? 'opacity 0.62s ease' : 'none',
          pointerEvents: (showContent || skip) ? 'auto' : 'none',
        }}>

          <h1 style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            color: '#0A0A0A',
            fontWeight: 500,
            lineHeight: 1.18,
            letterSpacing: '-0.02em',
            marginBottom: '10px',
            fontSize: 'clamp(26px, 5.5vw, 42px)',
          }}>
            Dress for anywhere
          </h1>

          <p style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '15px',
            color: '#6B6B6B',
            letterSpacing: '0.01em',
            lineHeight: 1.55,
            marginBottom: '28px',
          }}>
            Tell us where you're headed — we'll style the look.
          </p>

          {/* Search input */}
          <div style={{ position: 'relative', textAlign: 'left' }}>
            <input
              ref={inputRef}
              type="text"
              value={textValue}
              onChange={e => setTextValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (suggestions.length > 0 || textValue.trim().length >= 2) setShowDropdown(true) }}
              onBlur={() => setTimeout(() => setShowDropdown(false), 160)}
              placeholder="Start typing a venue name…"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              tabIndex={(showContent || skip) ? 0 : -1}
              className="gigi-home-input"
              style={{
                width: '100%',
                background: '#FFFFFF',
                border: '1.5px solid',
                borderColor: textValue ? '#0A0A0A' : '#D2CCC4',
                borderRadius: '2px',
                color: '#0A0A0A',
                fontSize: '16px',
                fontFamily: 'Inter, system-ui, sans-serif',
                padding: textValue.trim() ? '13px 78px 13px 16px' : '13px 16px',
                outline: 'none',
                caretColor: '#0A0A0A',
                boxSizing: 'border-box',
                boxShadow: '0 2px 16px rgba(0,0,0,0.055)',
                transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
              }}
            />

            {textValue.trim() && (
              <button
                onClick={commitFreeText}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: '#0A0A0A', border: 'none', cursor: 'pointer',
                  color: 'white', fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase',
                  padding: '6px 10px', whiteSpace: 'nowrap', borderRadius: '1px',
                }}
              >
                Go →
              </button>
            )}

            {showDropdown && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0,
                background: '#FFFFFF',
                border: '1.5px solid #E4DED6', borderTop: 'none',
                borderRadius: '0 0 2px 2px',
                zIndex: 50,
                boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onMouseDown={e => { e.preventDefault(); commitVenue(s) }}
                    onMouseEnter={() => setActiveIndex(i)}
                    style={{
                      ...(activeIndex === i ? rowHighlight : rowBase),
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #F0EDE8',
                      gap: '8px', alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px', fontWeight: 600, color: '#0A0A0A', margin: 0, lineHeight: 1.3 }}>
                        {s.name}
                      </p>
                      {s.location && (
                        <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px', color: '#8A8A8A', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.location}
                        </p>
                      )}
                    </div>
                    {s.isResidence && (
                      <span style={{ flexShrink: 0, background: '#F5F2EE', border: '1px solid #E0DAD3', color: '#8A8A8A', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 6px', whiteSpace: 'nowrap', marginTop: '2px' }}>
                        Private
                      </span>
                    )}
                  </button>
                ))}
                <button
                  onMouseDown={e => { e.preventDefault(); commitFreeText() }}
                  onMouseEnter={() => setActiveIndex(suggestions.length)}
                  style={{
                    ...(activeIndex === suggestions.length ? rowHighlight : rowBase),
                    alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                    borderTop: suggestions.length > 0 ? '1px solid #EDE8E2' : 'none',
                    background: activeIndex === suggestions.length ? 'rgba(201,169,110,0.10)' : '#FAFAF8',
                  }}
                >
                  <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '13px', color: '#6B6B6B', fontStyle: 'italic' }}>
                    Use "{textValue.trim()}" as your occasion
                  </span>
                  <span style={{ color: '#C9A96E', fontSize: '14px', flexShrink: 0 }}>→</span>
                </button>
              </div>
            )}
          </div>

          {looksLikeResidence && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left', background: '#FBF8F4', border: '1px solid #EAE4DA', padding: '10px 14px', marginTop: '8px', borderRadius: '2px' }}>
              <span style={{ color: '#C9A96E', fontSize: '12px', flexShrink: 0 }}>✦</span>
              <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px', color: '#6B6B6B', margin: 0, lineHeight: 1.5 }}>
                Looks like a home address — we'll tailor inspiration to your event, not the location.
              </p>
            </div>
          )}

          <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '10px', color: '#BBBBBB', textAlign: 'center', marginTop: '12px', letterSpacing: '0.04em' }}>
            {textValue.trim() ? 'Press Enter to continue' : 'Type your answer above'}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '10px', padding: '10px 20px 14px',
        opacity: (showContent || skip) ? 1 : 0,
        transition: 'opacity 0.5s ease 0.4s',
      }}>
        <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '9px', color: '#C4BDB5', letterSpacing: '0.04em' }}>© 2026 Gigi</span>
        <span style={{ color: '#DEDAD4', fontSize: '9px' }}>·</span>
        <a href="/privacy" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '9px', color: '#C4BDB5', textDecoration: 'none', letterSpacing: '0.04em' }}>Privacy Policy</a>
      </div>

      {/* Resume last occasion */}
      {savedOccasion?.venue && (
        <button
          onClick={() => navigate('/inspire')}
          style={{
            position: 'absolute', bottom: '20px', right: '20px',
            background: '#FFFFFF', border: '1.5px solid #E8E4DE',
            padding: '10px 16px', cursor: 'pointer', textAlign: 'right',
            boxShadow: '0 2px 14px rgba(0,0,0,0.06)', borderRadius: '2px',
            opacity: (showContent || skip) ? 1 : 0,
            transition: 'opacity 0.5s ease 0.5s',
          }}
        >
          <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#AAAAAA', margin: 0 }}>Last occasion</p>
          <p style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '12px', color: '#0A0A0A', margin: '2px 0 0', fontStyle: 'italic' }}>{savedOccasion.venue}</p>
        </button>
      )}

      <style>{`
        @keyframes gigi-letter-flip {
          0%   { transform: rotateX(180deg); }
          72%  { transform: rotateX(-9deg);  }
          100% { transform: rotateX(0deg);   }
        }
        @keyframes gigi-plus-pulse {
          0%, 100% { transform: scale(1);    opacity: 0.40; }
          50%       { transform: scale(1.12); opacity: 0.86; }
        }
        .gigi-home-input::placeholder { color: #B8B0A8; font-family: Inter, system-ui, sans-serif; }
        .gigi-home-input:focus {
          border-color: #0A0A0A !important;
          box-shadow: 0 0 0 2.5px rgba(10,10,10,0.07), 0 2px 16px rgba(0,0,0,0.055) !important;
        }
      `}</style>
    </div>
  )
}
