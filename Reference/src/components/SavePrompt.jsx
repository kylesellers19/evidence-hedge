import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

// ─── SavePrompt ───────────────────────────────────────────────────────────────
// Bottom-sheet soft gate for anonymous users.
// onSuccess(user) — called when the user is fully authenticated.
// onDismiss()     — called when the user closes without authenticating.
//
// NOTE — hard gate alternative: if you want to block the heart animation until
// the user is authenticated, call onDismiss() in InspirationPage BEFORE the
// optimistic setSavedLookMap update, and show this prompt instead. The current
// flow fires the optimistic update first (reward on tap), then shows this prompt.

export default function SavePrompt({ onSuccess, onDismiss }) {
  const { signUp, signIn } = useAuth()
  const [mode, setMode]           = useState('signup')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState(null)
  const [confirmed, setConfirmed] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'signup') {
        const { data, error } = await signUp(email, password)
        if (error) { setError(error.message); return }
        if (data.session) {
          onSuccess(data.user)
        } else {
          // Email confirmation required — save will complete after they confirm
          setConfirmed(true)
        }
      } else {
        const { data, error } = await signIn(email, password)
        if (error) { setError(error.message); return }
        if (data.user) onSuccess(data.user)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.52)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onDismiss() }}
    >
      <div style={{
        background: '#FAF8F3',
        width: '100%', maxWidth: '440px',
        padding: '24px 20px 36px',
      }}>

        {confirmed ? (
          // Post-signup confirmation message
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <p style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '18px', color: '#111', margin: '0 0 8px', fontWeight: 500 }}>
              Check your inbox
            </p>
            <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '13px', color: '#9B9B9B', margin: '0 0 20px', lineHeight: 1.6 }}>
              We sent a link to <strong style={{ color: '#3A3A3A' }}>{email}</strong>. Click it to activate your account — your saved look will be waiting.
            </p>
            <button
              onClick={onDismiss}
              style={{
                background: '#0A0A0A', color: 'white', border: 'none',
                padding: '11px 24px', cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase',
              }}
            >
              Got it
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <p style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontSize: '18px', color: '#111', margin: '0 0 4px', fontWeight: 500,
                }}>
                  Save this look
                </p>
                <p style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '12px', color: '#9B9B9B', margin: 0, lineHeight: 1.55,
                }}>
                  {mode === 'signup'
                    ? 'Create a free account — your saves build your taste profile.'
                    : 'Sign in to save this look to your collection.'}
                </p>
              </div>
              <button
                onClick={onDismiss}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#AAAAAA', fontSize: '16px', lineHeight: 1,
                  padding: '2px 0 0 14px', flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={submitting}
                style={{
                  border: '1.5px solid #E0DDD8', background: '#FFFFFF',
                  color: '#0A0A0A', fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '14px', padding: '11px 14px', outline: 'none',
                  borderRadius: '2px', boxSizing: 'border-box', width: '100%',
                }}
              />
              <input
                type="password"
                placeholder={mode === 'signup' ? 'Password (min. 6 characters)' : 'Password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                disabled={submitting}
                style={{
                  border: '1.5px solid #E0DDD8', background: '#FFFFFF',
                  color: '#0A0A0A', fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '14px', padding: '11px 14px', outline: 'none',
                  borderRadius: '2px', boxSizing: 'border-box', width: '100%',
                }}
              />

              {error && (
                <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '12px', color: '#C0392B', margin: 0 }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: '#0A0A0A', color: 'white', border: 'none',
                  padding: '13px', cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase',
                  marginTop: '2px',
                }}
              >
                {submitting
                  ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
                  : (mode === 'signup' ? 'Create account & save →' : 'Sign in & save →')}
              </button>
            </form>

            <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px', color: '#B8A88A', textAlign: 'center', marginTop: '14px', margin: '14px 0 0' }}>
              {mode === 'signup' ? (
                <>Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setError(null) }}
                    style={{ background: 'none', border: 'none', color: '#C9A96E', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0, textDecoration: 'underline' }}
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>New here?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(null) }}
                    style={{ background: 'none', border: 'none', color: '#C9A96E', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0, textDecoration: 'underline' }}
                  >
                    Create a free account
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
