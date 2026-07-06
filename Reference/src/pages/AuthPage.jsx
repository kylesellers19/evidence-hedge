import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { user, loading: authLoading, signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('signin')           // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [confirmationSent, setConfirmationSent] = useState(false)

  // Already authenticated — skip the auth page
  if (!authLoading && user) {
    return <Navigate to="/inspire" replace />
  }

  const switchMode = newMode => {
    setMode(newMode)
    setError(null)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) { setError(error.message); return }
        navigate('/inspire')
      } else {
        const { data, error } = await signUp(email, password)
        if (error) { setError(error.message); return }
        if (!data.session) {
          // Project has email confirmation enabled — show check-your-inbox UI
          setConfirmationSent(true)
          return
        }
        navigate('/inspire')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Confirmation sent state ────────────────────────────────────────────────
  if (confirmationSent) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-5">
        <p className="font-serif text-4xl font-medium tracking-tight text-gray-900 mb-2">Gigi</p>
        <span className="text-gold-500 text-sm mb-10">✦</span>

        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 border border-border flex items-center justify-center mx-auto mb-6">
            <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl font-medium text-gray-900 mb-2">Check your inbox</h2>
          <p className="font-sans text-sm text-muted leading-relaxed mb-8">
            We sent a confirmation link to <span className="text-gray-700 font-medium">{email}</span>.
            Click it to activate your account.
          </p>
          <button
            type="button"
            onClick={() => { setConfirmationSent(false); setMode('signin') }}
            className="font-sans text-xs text-muted underline underline-offset-2 hover:text-gray-700 transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  // ── Main auth form ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-5">

      {/* Wordmark */}
      <p className="font-serif text-4xl font-medium tracking-tight text-gray-900 mb-2">Gigi</p>
      <span className="text-gold-500 text-sm mb-10">✦</span>

      <div className="w-full max-w-sm">

        {/* Heading */}
        <h1 className="font-serif text-2xl font-medium text-gray-900 mb-1">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="font-sans text-xs text-muted mb-8 leading-relaxed">
          {mode === 'signin'
            ? 'Sign in to see your inspiration and wardrobe.'
            : 'Start building your Gigi wardrobe in minutes.'}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="label-tag block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="field-input w-full"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="label-tag block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
              className="field-input w-full"
              disabled={submitting}
            />
          </div>

          {/* Inline error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 px-3 py-2.5">
              <span className="text-red-500 text-xs leading-none mt-0.5 flex-shrink-0">✕</span>
              <p className="font-sans text-xs text-red-700 leading-relaxed">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-3.5 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {submitting
              ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
              : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* Mode toggle */}
        <div className="mt-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-gold-500 text-xs">✦</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <p className="font-sans text-xs text-muted text-center">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-gray-700 underline underline-offset-2 hover:text-gray-900 transition-colors"
            >
              {mode === 'signin' ? 'Create one →' : 'Sign in →'}
            </button>
          </p>
        </div>

      </div>
    </div>
  )
}
