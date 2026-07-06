import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh', background: '#FAF8F3',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', textAlign: 'center',
    }}>
      <p style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
        color: '#C9A96E', margin: '0 0 20px',
      }}>
        404
      </p>

      <h1 style={{
        fontFamily: '"Playfair Display", Georgia, serif',
        fontSize: '28px', fontWeight: 700, color: '#111',
        margin: '0 0 12px',
      }}>
        Page not found
      </h1>

      <p style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px', color: '#777', fontStyle: 'italic',
        margin: '0 0 36px',
      }}>
        This page doesn't exist — but your perfect look does.
      </p>

      <button
        onClick={() => navigate('/')}
        style={{
          background: '#0A0A0A', color: 'white', border: 'none',
          padding: '12px 28px', cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase',
        }}
      >
        Back to Gigi →
      </button>
    </div>
  )
}
