import React from 'react'
import ReactDOM from 'react-dom/client'
import posthog from 'posthog-js'
import App from './App'
import './index.css'

const POSTHOG_KEY  = import.meta.env.VITE_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host:         POSTHOG_HOST || 'https://us.i.posthog.com',
    autocapture:      true,
    capture_pageview: true,
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
