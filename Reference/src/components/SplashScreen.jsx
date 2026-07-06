import React, { useState, useEffect } from 'react'

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ─── Silhouette SVGs ──────────────────────────────────────────────────────────
// All solid #0A0A0A fills — no color, no stroke (except bag handle).

function Hanger({ size }) {
  return (
    <svg width={size} height={Math.round(size * 0.86)} viewBox="0 0 100 86" fill="#0A0A0A">
      {/* Hook + triangle body */}
      <path d="M50 4C56 4 62 9 64 15C66 21 62 27 56 29L90 67Q94 71 91 75L9 75Q6 71 10 67L44 29C38 27 34 21 36 15C38 9 44 4 50 4Z"/>
    </svg>
  )
}

function Dress({ size }) {
  return (
    <svg width={Math.round(size * 0.76)} height={size} viewBox="0 0 80 106" fill="#0A0A0A">
      {/* Spaghetti straps + bodice + flared skirt */}
      <path d="M27 0L29 0L29 7Q32 17 40 19Q48 17 51 7L51 0L53 0L65 13L70 13L80 106L0 106L10 13L15 13Z"/>
    </svg>
  )
}

function Heel({ size }) {
  return (
    <svg width={Math.round(size * 1.56)} height={size} viewBox="0 0 100 64" fill="#0A0A0A">
      {/* Stiletto side profile */}
      <path d="M7 58Q7 37 23 26Q40 15 65 9Q82 4 94 1L98 1L98 8Q82 13 66 19Q43 31 33 47L44 58L41 64L4 64Z"/>
    </svg>
  )
}

function Hat({ size }) {
  return (
    <svg width={Math.round(size * 1.6)} height={size} viewBox="0 0 120 64" fill="#0A0A0A">
      {/* Fedora: wide brim + rounded crown */}
      <path d="M5 51Q28 43 40 41L40 21Q40 5 60 5Q80 5 80 21L80 41Q92 43 115 51L115 58L5 58Z"/>
    </svg>
  )
}

function Bag({ size }) {
  return (
    <svg width={Math.round(size * 0.88)} height={size} viewBox="0 0 80 86" fill="#0A0A0A">
      {/* Body */}
      <rect x="5" y="28" width="70" height="54" rx="2"/>
      {/* Handle arch — thick stroke, no fill, open path */}
      <path
        d="M23 28Q23 7 33 5L47 5Q57 7 57 28"
        stroke="#0A0A0A"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Coat({ size }) {
  return (
    <svg width={Math.round(size * 0.67)} height={size} viewBox="0 0 72 110" fill="#0A0A0A">
      {/* Long coat with V-lapels */}
      <path d="M20 0L8 12Q0 22 0 38L0 110L72 110L72 38Q72 22 64 12L52 0L42 14L36 17L30 14Z"/>
    </svg>
  )
}

// ─── Icon layout data ─────────────────────────────────────────────────────────
// startX/Y: off-screen origin (large px offset from center)
// nearX/Y:  scattered near-center landing (phase 1)
// clusterX/Y: tighter cluster (phase 2)

const ICONS = [
  {
    id: 'hanger', Component: Hanger, size: 52,
    startX: -8,   startY: -440, startR: -12,
    nearX:  -22,  nearY:  -54,  nearR:  -5,
    clusterX: -6, clusterY: -17,
  },
  {
    id: 'dress', Component: Dress, size: 52,
    startX: -430, startY: -260, startR: -26,
    nearX:  -50,  nearY:  -32,  nearR:  -9,
    clusterX: -16, clusterY: -10,
  },
  {
    id: 'heel', Component: Heel, size: 34,
    startX:  370, startY: -310, startR:  22,
    nearX:   44,  nearY:  -36,  nearR:   7,
    clusterX: 15, clusterY: -13,
  },
  {
    id: 'hat', Component: Hat, size: 36,
    startX:  410, startY:  190, startR:  20,
    nearX:   48,  nearY:   18,  nearR:   6,
    clusterX: 17, clusterY: 7,
  },
  {
    id: 'bag', Component: Bag, size: 44,
    startX: -390, startY:  360, startR: -22,
    nearX:  -40,  nearY:   44,  nearR:  -7,
    clusterX: -13, clusterY: 18,
  },
  {
    id: 'coat', Component: Coat, size: 56,
    startX:  350, startY:  400, startR:  25,
    nearX:   32,  nearY:   56,  nearR:   8,
    clusterX: 11, clusterY: 24,
  },
]

// ─── Per-phase style calculators ──────────────────────────────────────────────

function getIconStyle(icon, phase) {
  const base = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    willChange: 'transform, opacity',
    pointerEvents: 'none',
  }
  if (phase === 0) return {
    ...base,
    transform: `translate(calc(-50% + ${icon.startX}px), calc(-50% + ${icon.startY}px)) rotate(${icon.startR}deg) scale(0.55)`,
    opacity: 0,
    transition: 'none',
  }
  if (phase === 1) return {
    ...base,
    transform: `translate(calc(-50% + ${icon.nearX}px), calc(-50% + ${icon.nearY}px)) rotate(${icon.nearR}deg) scale(1)`,
    opacity: 1,
    transition: 'transform 0.88s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.44s ease',
  }
  if (phase === 2) return {
    ...base,
    transform: `translate(calc(-50% + ${icon.clusterX}px), calc(-50% + ${icon.clusterY}px)) rotate(${Math.round(icon.nearR * 0.35)}deg) scale(0.78)`,
    opacity: 0.88,
    transition: 'transform 0.38s cubic-bezier(0.34, 1.3, 0.64, 1), opacity 0.28s ease',
  }
  return {
    ...base,
    transform: 'translate(-50%, -50%) scale(0)',
    opacity: 0,
    transition: 'transform 0.24s ease-in, opacity 0.22s ease-in',
  }
}

function getWordmarkStyle(phase) {
  const visible = phase >= 3
  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: `translate(-50%, -50%) scale(${visible ? 1 : 0.86})`,
    opacity: visible ? 1 : 0,
    transition: visible
      ? 'transform 0.58s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.55s ease'
      : 'none',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SplashScreen({ onDone }) {
  const [phase, setPhase]               = useState(0)
  const [containerOpacity, setContainerOpacity] = useState(1)

  useEffect(() => {
    if (prefersReducedMotion) {
      setPhase(3)
      const t1 = setTimeout(() => setContainerOpacity(0), 700)
      const t2 = setTimeout(onDone, 1200)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }

    const t1 = setTimeout(() => setPhase(1),              50)   // fly in
    const t2 = setTimeout(() => setPhase(2),             960)   // converge
    const t3 = setTimeout(() => setPhase(3),            1320)   // icons out, wordmark in
    const t4 = setTimeout(() => setContainerOpacity(0), 2020)   // splash fades
    const t5 = setTimeout(onDone,                       2480)   // unmount
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#FAFAF8',
        opacity: containerOpacity,
        transition: containerOpacity < 1 ? 'opacity 0.45s ease' : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Clothing silhouettes */}
      {ICONS.map(icon => (
        <div key={icon.id} style={getIconStyle(icon, phase)}>
          <icon.Component size={icon.size} />
        </div>
      ))}

      {/* GIGI wordmark */}
      <div style={getWordmarkStyle(phase)}>
        <p style={{
          fontFamily: '"Syne", "Archivo", "Arial Black", sans-serif',
          fontSize: 'clamp(44px, 14vw, 72px)',
          fontWeight: 800,
          letterSpacing: '0.22em',
          color: '#0A0A0A',
          margin: '0 0 0 0.22em', // offset for tracking so it reads visually centered
          lineHeight: 1,
          textTransform: 'uppercase',
        }}>
          GIGI
        </p>
        {/* Gallery-style rule beneath */}
        <div style={{
          height: '1px',
          background: '#0A0A0A',
          opacity: 0.12,
          marginTop: '10px',
          width: '100%',
        }}/>
      </div>
    </div>
  )
}
