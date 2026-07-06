import React, { createContext, useContext, useEffect, useState } from 'react'
import supabase from '../lib/supabase'
import { track, identify } from '../lib/analytics'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Resolve the existing session immediately on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Keep state in sync for all subsequent auth events (sign-in, sign-out,
    // token refresh, tab focus re-check, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        // After clicking the confirmation email, Supabase redirects here.
        // window.location.origin resolves to localhost in dev and the live
        // Vercel URL in production — no env vars needed.
        emailRedirectTo: `${window.location.origin}/inspire`,
      },
    })
    if (result.data?.user && !result.error) {
      track('signed_up')
      identify(result.data.user.id, { email })
    }
    return result
  }

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.data?.user && !result.error) {
      identify(result.data.user.id, { email })
    }
    return result
  }

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
