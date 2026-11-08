import React, { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ENGINE_VERSION } from '../../engine/version.js'
import '../../styles/site.css'

// The site frame, after Delgam's masthead: the name at left in bold serif, the
// pages at top right in sans, grey at rest and underlined when current. On the
// landing page the masthead floats over the white room (no rule, no space
// taken), so the mark and the question stay where they were; on every other
// page it sits in the flow above a hairline.
export const CONTACT_EMAIL = 'kyle@evidencehedge.org'

export const NAV = [
  { to: '/list', label: 'The List' },
  { to: '/method', label: 'Method' },
  { to: '/contact', label: 'Contact' },
]

export default function SiteLayout() {
  const { pathname } = useLocation()
  const home = pathname === '/'

  // A new page starts at its top, as a page load would.
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <>
      <a className="eh-skip" href="#main">Skip to content</a>
      <header className={home ? 'eh-masthead is-over' : 'eh-masthead'}>
        <div className="eh-bar">
          <Link className="eh-brand" to="/">Evidence Hedge</Link>
          <nav className="eh-nav" aria-label="Site">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
            ))}
          </nav>
        </div>
      </header>
      <div id="main">
        <Outlet />
      </div>
      <footer className="eh-foot">
        <div className="eh-foot-in">
          <nav className="eh-foot-nav" aria-label="Site, footer">
            <Link className="eh-brand" to="/">Evidence Hedge</Link>
            {NAV.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
          </nav>
          <p>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <span aria-hidden="true"> · </span>
            Engine <span className="eh-code">{ENGINE_VERSION}</span>
          </p>
        </div>
      </footer>
    </>
  )
}

// Each page names itself in the browser tab, as Delgam's do: "Page · Evidence Hedge".
// Leaving the page gives the tab back the plain name.
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Evidence Hedge` : 'Evidence Hedge'
    return () => { document.title = 'Evidence Hedge' }
  }, [title])
}
