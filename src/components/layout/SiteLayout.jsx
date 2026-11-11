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

// The legal page is reached from the footer alone, not the masthead.
export const LEGAL = { to: '/legal', label: 'Terms and privacy' }
// The copyright line, in the footer's fine print and on the legal page.
export const COPYRIGHT = `© ${new Date().getFullYear()} Evidence Hedge`

export default function SiteLayout() {
  const { pathname, hash } = useLocation()
  const home = pathname === '/'

  // A new page starts at its top, as a page load would. A link to an anchor
  // (/method#score-3, from a score on a brief or The List) lands on that
  // heading instead, on a click as on a direct load: the page renders after
  // the browser's own jump, so wait for the element.
  useEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return }
    const id = decodeURIComponent(hash.slice(1))
    let frame = 0
    let tries = 0
    const go = () => {
      const el = document.getElementById(id)
      // Instant: the page's smooth scrolling would still be travelling a long
      // page when the reader starts reading.
      if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' })
      else if (tries++ < 60) frame = requestAnimationFrame(go)
    }
    go()
    return () => cancelAnimationFrame(frame)
  }, [pathname, hash])

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
            <Link to={LEGAL.to}>{LEGAL.label}</Link>
          </nav>
          <p className="eh-foot-contact">
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <span aria-hidden="true"> · </span>
            Engine <span className="eh-code">{ENGINE_VERSION}</span>
          </p>
          {/* The fine print, on every page and on a printed one. The full
              text is the legal page (src/pages/LegalPage.jsx); keep the two
              saying the same thing. */}
          <p className="eh-fine">
            {COPYRIGHT}. A score is an automated measure of how well a document’s claims are supported
            by the evidence it shows, reached by the rules on the <Link to="/method">Method</Link> page.
            It is not a finding that any claim is true or false, and it is not medical, financial or
            legal advice. Company names, report titles and trademarks belong to their owners, and
            listing a report implies no affiliation or endorsement. The site is offered as it is,
            without warranty.
            See <Link to={LEGAL.to}>{LEGAL.label.toLowerCase()}</Link>.
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
