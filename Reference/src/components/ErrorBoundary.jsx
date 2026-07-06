import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh', background: '#FAF8F3',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', textAlign: 'center',
      }}>
        <span style={{ fontSize: '28px', marginBottom: '20px', opacity: 0.5 }}>✦</span>

        <h1 style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '26px', fontWeight: 700, color: '#111',
          margin: '0 0 12px',
        }}>
          Something went wrong
        </h1>

        <p style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '14px', color: '#777', lineHeight: 1.65,
          margin: '0 0 36px', maxWidth: '320px',
        }}>
          We hit an unexpected snag. Try refreshing the page or starting a new search.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#0A0A0A', color: 'white', border: 'none',
              padding: '12px 24px', cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase',
            }}
          >
            Refresh page
          </button>
          <button
            onClick={() => { window.location.href = '/' }}
            style={{
              background: 'none', color: '#0A0A0A',
              border: '1.5px solid #0A0A0A',
              padding: '12px 24px', cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase',
            }}
          >
            Start over
          </button>
        </div>
      </div>
    )
  }
}
