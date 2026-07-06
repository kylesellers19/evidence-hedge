import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { callStyleProxy } from '../services/styleIntelligenceService'
import { track } from '../lib/analytics'

// ─── Constants ─────────────────────────────────────────────────────────────────
const FALLBACK_OCCASION_TYPES = [
  'Wedding', 'Cocktail Party', 'Dinner or Date', 'Business or Work',
  'Casual Hangout', 'Night Out', 'Daytime Event', 'Formal Gala',
  'Interview', 'Funeral or Memorial', 'Beach Party', 'Celebration',
]
const GENDER_OPTIONS    = ['Women', 'Men', 'Gender Neutral']
const DRESS_CODE_CHIPS  = ['Casual', 'Smart Casual', 'Business', 'Cocktail', 'Formal', 'Black Tie']
const TIMES_OF_DAY      = ['Morning', 'Afternoon', 'Evening', 'Night']
const SEASONS           = ['Spring', 'Summer', 'Fall', 'Winter']
const SIZE_CHIPS        = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Plus']
const THINKING_PHRASES  = ['Reading the room…', 'Checking the vibe…', 'Styling your look…']

// ─── Thinking indicator ────────────────────────────────────────────────────────
function ThinkingIndicator() {
  const [idx, setIdx]   = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % THINKING_PHRASES.length)
        setFade(true)
      }, 220)
    }, 1900)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
        <div className="gigi-dot gigi-dot-0" />
        <div className="gigi-dot gigi-dot-1" />
        <div className="gigi-dot gigi-dot-2" />
      </div>
      <p style={{
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px',
        color: '#B8A88A', margin: 0, fontStyle: 'italic',
        opacity: fade ? 1 : 0,
        transition: 'opacity 0.22s ease',
      }}>
        {THINKING_PHRASES[idx]}
      </p>
    </div>
  )
}

// ─── Free-text input + tap-to-fill chips ──────────────────────────────────────
function FreeTextWithChips({ label, value, onChange, chips, placeholder, isAISuggested }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <span style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase',
          color: '#9B9B9B',
        }}>
          {label}
        </span>
        {isAISuggested && (
          <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '8px', letterSpacing: '0.1em', color: '#C9A96E' }}>
            ✦ suggested
          </span>
        )}
      </div>

      {/* Underline input */}
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value || null)}
        placeholder={placeholder}
        style={{
          width: '100%', background: 'none', border: 'none',
          borderBottom: `1.5px solid ${value ? '#C9A96E' : '#DDD8CE'}`,
          padding: '6px 0 9px',
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '17px', fontWeight: 500,
          color: value
            ? (isAISuggested ? '#9B7D2C' : '#1C1209')
            : '#C4B89A',
          fontStyle: isAISuggested && value ? 'italic' : 'normal',
          outline: 'none', boxSizing: 'border-box',
          caretColor: '#C9A96E', borderRadius: 0,
          transition: 'border-color 0.15s ease',
        }}
      />

      {/* Suggestion chips */}
      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
          {chips.map(chip => {
            const isActive = chip === value
            return (
              <button
                key={chip}
                onClick={() => onChange(isActive ? null : chip)}
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '10px', letterSpacing: '0.05em',
                  color: isActive ? '#7A5C14' : '#7A6A52',
                  background: isActive ? 'rgba(201,169,110,0.20)' : 'rgba(201,169,110,0.07)',
                  border: `1px solid ${isActive ? 'rgba(201,169,110,0.55)' : 'rgba(201,169,110,0.22)'}`,
                  padding: '5px 12px', cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
              >
                {chip}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Custom dropdown (used for gender, time of day, season) ───────────────────
function DropdownOption({ opt, isSelected, onSelect }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onSelect(opt) }}
      onTouchEnd={e => { e.preventDefault(); onSelect(opt) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        background: hovered
          ? 'rgba(201,169,110,0.14)'
          : isSelected ? 'rgba(201,169,110,0.08)' : 'transparent',
        border: 'none',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        padding: '13px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.1s ease',
      }}
    >
      <span style={{
        fontFamily: '"Playfair Display", Georgia, serif',
        fontSize: '15px',
        color: isSelected ? '#8B6914' : '#1C1209',
        fontWeight: isSelected ? 500 : 400,
        lineHeight: 1.3,
      }}>
        {opt}
      </span>
      {isSelected && (
        <span style={{ color: '#C9A96E', fontSize: '13px', lineHeight: 1, flexShrink: 0, marginLeft: '8px' }}>
          ✓
        </span>
      )}
    </button>
  )
}

function CustomDropdown({ label, options, value, isAISuggested, placeholder, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const close = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [isOpen])

  const handleSelect = (opt) => {
    onChange(opt === value && !isAISuggested ? null : opt)
    setIsOpen(false)
  }

  const borderColor = isOpen
    ? '#C9A96E'
    : value && !isAISuggested
      ? '#C9A96E'
      : value && isAISuggested
        ? '#D4BA8A'
        : '#DDD8CE'

  return (
    <div ref={containerRef} style={{ marginBottom: '28px', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <span style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase',
          color: '#9B9B9B',
        }}>
          {label}
        </span>
        {isAISuggested && (
          <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '8px', letterSpacing: '0.1em', color: '#C9A96E' }}>
            ✦ suggested
          </span>
        )}
      </div>

      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none',
          borderBottom: `1.5px solid ${borderColor}`,
          padding: '6px 28px 9px 0',
          cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center',
          position: 'relative',
          transition: 'border-color 0.15s ease',
        }}
      >
        <span style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '17px', fontWeight: 500,
          color: value
            ? (isAISuggested ? '#9B7D2C' : '#1C1209')
            : '#C4B89A',
          lineHeight: 1.3,
          fontStyle: isAISuggested && value ? 'italic' : 'normal',
        }}>
          {value || placeholder}
        </span>
        <span style={{
          position: 'absolute', right: 0, top: '50%',
          transform: `translateY(-50%) rotate(${isOpen ? 180 : 0}deg)`,
          color: '#9B8B72', fontSize: '12px', lineHeight: 1,
          transition: 'transform 0.2s ease',
          pointerEvents: 'none',
        }}>
          ▾
        </span>
      </button>

      {isOpen && (
        <div
          className="gigi-dropdown-panel"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
            background: '#FDFBF7',
            borderRadius: '3px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid rgba(201,169,110,0.22)',
            zIndex: 50, overflow: 'hidden',
          }}
        >
          {options.map(opt => (
            <DropdownOption
              key={opt}
              opt={opt}
              isSelected={opt === value}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function RefinePage() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const { occasion } = state

  const [loading, setLoading] = useState(false)

  const occasionKey = occasion ? JSON.stringify({
    venue:              occasion.venue              || '',
    venueLocation:      occasion.venueLocation      || '',
    venueTypes:         occasion.venueTypes         || [],
    isPrivateResidence: !!occasion.isPrivateResidence,
    dressCode:          occasion.dressCode          || null,
    timeOfDay:          occasion.timeOfDay          || null,
    season:             occasion.season             || null,
  }) : null

  useEffect(() => {
    if (!occasion) return
    setLoading(true)
    callStyleProxy(occasion)
      .then(result => {
        const d = result.styleDescriptor ?? {}
        dispatch({
          type: 'SET_STYLE_INFERENCE',
          payload: {
            inferredDressCode:     d.inferredDressCode     ?? null,
            inferredTimeOfDay:     d.inferredTimeOfDay     ?? null,
            inferredSeason:        d.inferredSeason        ?? null,
            styleBrief:            d.styleBrief            ?? null,
            aestheticKeywords:     d.aestheticKeywords     ?? [],
            colorPalette:          d.colorPalette          ?? [],
            avoidList:             d.avoidList             ?? [],
            relevantOccasionTypes: d.relevantOccasionTypes ?? [],
          },
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [occasionKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear occasion type if it's no longer in Claude's filtered list
  useEffect(() => {
    if (
      occasion?.occasionType &&
      occasion?.relevantOccasionTypes?.length > 0 &&
      !occasion.relevantOccasionTypes.includes(occasion.occasionType)
    ) {
      dispatch({ type: 'SET_OCCASION_TYPE', payload: null })
    }
  }, [occasion?.relevantOccasionTypes]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!occasion) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF8F3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <p style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '20px', color: '#999', fontStyle: 'italic', marginBottom: '8px' }}>
          No occasion set
        </p>
        <button
          onClick={() => navigate('/')}
          style={{ background: '#0A0A0A', color: 'white', border: 'none', padding: '10px 20px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', marginTop: '16px' }}
        >
          Get Started
        </button>
      </div>
    )
  }

  const handleOccasionType = (value) => {
    if (value) track('occasion_type_selected', { occasionType: value })
    dispatch({ type: 'SET_OCCASION_TYPE', payload: value || null })
  }

  const handleGender = (value) => {
    if (value) track('gender_selected', { gender: value })
    dispatch({ type: 'SET_GENDER', payload: value || null })
  }

  const handleSize = (value) => {
    dispatch({ type: 'SET_SIZE', payload: value || null })
  }

  const handleSelectChange = (key, value) => {
    dispatch({ type: 'SET_OCCASION_OVERRIDE', payload: { [key]: value || null } })
  }

  const effectiveDressCode = occasion.dressCode || occasion.inferredDressCode || null
  const effectiveTimeOfDay = occasion.timeOfDay || occasion.inferredTimeOfDay || null
  const effectiveSeason    = occasion.season    || occasion.inferredSeason    || null

  // Chips for occasion type: Claude's contextual list when available, full fallback otherwise
  const occasionTypeChips = occasion.relevantOccasionTypes?.length > 0
    ? occasion.relevantOccasionTypes
    : FALLBACK_OCCASION_TYPES

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F3', display: 'flex', flexDirection: 'column' }}>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#FAF8F3', borderBottom: '1px solid #EAE4DA',
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 20px',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9B8B72', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '18px', lineHeight: 1, flexShrink: 0 }}
          aria-label="Back"
        >
          ←
        </button>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B8A88A', margin: '0 0 2px' }}>
            Dressing for
          </p>
          <p style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '17px', fontWeight: 500, color: '#111', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {occasion.venue}
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, padding: '24px 20px 140px', maxWidth: '512px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Style brief / thinking state */}
        {loading && !occasion.styleBrief ? (
          <ThinkingIndicator />
        ) : occasion.styleBrief ? (
          <p style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '15px', fontWeight: 400,
            color: '#1C1209', lineHeight: 1.68, letterSpacing: '-0.01em',
            margin: '0 0 16px',
          }}>
            {occasion.styleBrief}
          </p>
        ) : null}

        {/* Aesthetic keywords */}
        {occasion.aestheticKeywords?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '24px' }}>
            {occasion.aestheticKeywords.map((kw, i) => (
              <span key={i} style={{
                fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px',
                color: '#7A6A52', background: 'rgba(201,169,110,0.12)',
                border: '1px solid rgba(201,169,110,0.28)',
                padding: '4px 10px', letterSpacing: '0.04em',
              }}>
                {kw}
              </span>
            ))}
          </div>
        )}

        <div style={{ borderTop: '1px solid #EAE4DA', margin: '0 0 28px' }} />

        {/* Occasion type — free text + chips */}
        <FreeTextWithChips
          label="What's the occasion?"
          value={occasion.occasionType || null}
          onChange={handleOccasionType}
          chips={occasionTypeChips}
          placeholder="Dinner, wedding, rooftop party…"
        />

        {/* Gender */}
        <CustomDropdown
          label="Styling for"
          options={GENDER_OPTIONS}
          value={occasion.gender || null}
          isAISuggested={false}
          placeholder="Select gender"
          onChange={handleGender}
        />

        <div style={{ borderTop: '1px solid #EAE4DA', margin: '0 0 28px' }} />

        {/* Dress code — free text + chips */}
        <FreeTextWithChips
          label="Dress Code"
          value={effectiveDressCode}
          onChange={val => handleSelectChange('dressCode', val)}
          chips={DRESS_CODE_CHIPS}
          placeholder="Casual, cocktail, black tie…"
          isAISuggested={!occasion.dressCode && !!occasion.inferredDressCode}
        />

        {/* Time of day */}
        <CustomDropdown
          label="Time of Day"
          options={TIMES_OF_DAY}
          value={effectiveTimeOfDay}
          isAISuggested={!occasion.timeOfDay && !!occasion.inferredTimeOfDay}
          placeholder="Select time of day"
          onChange={val => handleSelectChange('timeOfDay', val)}
        />

        {/* Season */}
        <CustomDropdown
          label="Season"
          options={SEASONS}
          value={effectiveSeason}
          isAISuggested={!occasion.season && !!occasion.inferredSeason}
          placeholder="Select season"
          onChange={val => handleSelectChange('season', val)}
        />

        <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '9px', color: '#CCCCCC', margin: '4px 0 32px', letterSpacing: '0.04em' }}>
          ✦ marks Gigi's suggestions — type or pick another to override
        </p>

        <div style={{ borderTop: '1px solid #EAE4DA', margin: '0 0 28px' }} />

        {/* Size — optional, quiet */}
        <FreeTextWithChips
          label="Size (optional)"
          value={occasion.size || null}
          onChange={handleSize}
          chips={SIZE_CHIPS}
          placeholder="XS, M, 14, 32W, Plus…"
        />

      </div>

      {/* Sticky bottom CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        background: '#FAF8F3', borderTop: '1px solid #EAE4DA',
        padding: '16px 20px',
      }}>
        <button
          onClick={() => {
            track('looks_requested', {
              venue:        occasion.venue,
              occasionType: occasion.occasionType  || null,
              gender:       occasion.gender        || null,
              dressCode:    effectiveDressCode,
              timeOfDay:    effectiveTimeOfDay,
              season:       effectiveSeason,
              size:         occasion.size          || null,
            })
            navigate('/inspire')
          }}
          style={{
            display: 'block', width: '100%', maxWidth: '472px', margin: '0 auto',
            background: '#0A0A0A', color: 'white', border: 'none',
            padding: '16px', cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase',
          }}
        >
          Show me the looks →
        </button>
      </div>

      <style>{`
        @keyframes gigi-shimmer { 0%,100% { opacity:0.45 } 50% { opacity:0.85 } }
        .gigi-skeleton { animation: gigi-shimmer 1.8s ease-in-out infinite; }

        @keyframes gigi-dot-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.7); }
          40%            { opacity: 1;   transform: scale(1); }
        }
        .gigi-dot {
          width: 5px; height: 5px; border-radius: 50%; background: #C9A96E;
        }
        .gigi-dot-0 { animation: gigi-dot-pulse 1.2s ease-in-out infinite 0s; }
        .gigi-dot-1 { animation: gigi-dot-pulse 1.2s ease-in-out infinite 0.15s; }
        .gigi-dot-2 { animation: gigi-dot-pulse 1.2s ease-in-out infinite 0.3s; }

        @keyframes gigi-dropdown-open {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gigi-dropdown-panel { animation: gigi-dropdown-open 0.15s ease forwards; }
      `}</style>
    </div>
  )
}
