import React from 'react'
import { NavLink } from 'react-router-dom'

/**
 * The List's two views, at the top of both pages: its reports (/list) and
 * Compare firms (/list/compare). Each says in a line what it is for, so a
 * first visit sees there is a comparison without hunting for it.
 */
export default function ListViews() {
  return (
    <nav className="eh-listviews" aria-label="Views of The List">
      <NavLink end to="/list" className="eh-listview">
        <span className="eh-listview-name">Reports</span>
        <span className="eh-listview-note">Every report and its score</span>
      </NavLink>
      <NavLink to="/list/compare" className="eh-listview">
        <span className="eh-listview-name">Compare firms</span>
        <span className="eh-listview-note">One firm’s reports beside others’</span>
      </NavLink>
    </nav>
  )
}
