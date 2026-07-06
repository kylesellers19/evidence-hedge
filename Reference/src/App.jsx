import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/layout/Header'
import BottomNav from './components/layout/BottomNav'
import HomePage from './pages/HomePage'
import RefinePage from './pages/RefinePage'
import InspirationPage from './pages/InspirationPage'
import LooksPage from './pages/LooksPage'
import SharePage from './pages/SharePage'
import AuthPage from './pages/AuthPage'
import PrivacyPage from './pages/PrivacyPage'
import NotFoundPage from './pages/NotFoundPage'

// ─── Protected Route ──────────────────────────────────────────────────────────
// Shows a spinner while auth resolves, then redirects to /auth if no user.

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <svg className="w-7 h-7 animate-spin text-gray-300" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />

  return children
}

// ─── App Layout ───────────────────────────────────────────────────────────────
// Header and BottomNav only show on the three main app pages.
// /, /auth, /refine, /privacy, and the 404 page are all full-screen.

const CHROME_PATHS = ['/inspire', '/looks', '/share']

function AppLayout() {
  const { pathname } = useLocation()
  const showChrome = CHROME_PATHS.includes(pathname)

  return (
    <div className={showChrome ? 'min-h-screen bg-cream' : ''}>
      {showChrome && <Header />}
      <main>
        <Routes>
          {/* Public routes */}
          <Route path="/"        element={<HomePage />} />
          <Route path="/auth"    element={<AuthPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* Protected routes */}
          <Route path="/refine"   element={<ProtectedRoute><RefinePage /></ProtectedRoute>} />
          <Route path="/inspire"  element={<ProtectedRoute><InspirationPage /></ProtectedRoute>} />
          <Route path="/looks"    element={<ProtectedRoute><LooksPage /></ProtectedRoute>} />
          <Route path="/wardrobe" element={<Navigate to="/looks" replace />} />
          <Route path="/share"    element={<ProtectedRoute><SharePage /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {showChrome && <BottomNav />}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
// AuthProvider wraps everything so ProtectedRoute (inside BrowserRouter) can
// call useAuth(). AppProvider is inside so it can eventually read auth state.

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <AppLayout />
          </ErrorBoundary>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  )
}
