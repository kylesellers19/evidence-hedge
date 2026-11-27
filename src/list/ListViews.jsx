import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const VIEWS = [
  { to: '/list', name: 'Reports', note: 'Every report and its score' },
  { to: '/list/compare', name: 'Compare firms', note: 'One firm’s reports beside others’' },
]

/**
 * The List's two views, at the top of both pages: its reports (/list) and
 * Compare firms (/list/compare). Each says in a line what it is for, so a
 * first visit sees there is a comparison without hunting for it. The current
 * view is matched by hand: GitHub Pages serves /list as /list/, which a
 * NavLink with `end` doesn't count as /list.
 */
export default function ListViews() {
  const path = useLocation().pathname.replace(/\/+$/, '') || '/'
  return (
    <nav className="eh-listviews" aria-label="Views of The List">
      {VIEWS.map((v) => {
        const current = path === v.to
        return (
          <Link key={v.to} to={v.to} className={`eh-listview${current ? ' active' : ''}`} aria-current={current ? 'page' : undefined}>
            <span className="eh-listview-name">{v.name}</span>
            <span className="eh-listview-note">{v.note}</span>
          </Link>
        )
      })}
    </nav>
  )
}
