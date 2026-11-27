import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../../components/layout/SiteLayout.jsx'
import { loadCompareRows } from '../store.js'
import CompareTool from './CompareTool.jsx'
import ListViews from '../ListViews.jsx'
import '../../styles/compare.css'

/**
 * Compare firms (/list/compare), one of The List's two views (ListViews). The
 * flag counts come from the table once it has docs/the-list.sql's version 3
 * columns, and until then from the file the site ships (loadCompareRows). If
 * neither has them, the page says so in one sentence and links to The List.
 */
export default function ComparePage() {
  usePageTitle('Compare firms')
  const [state, setState] = useState({ status: 'loading', rows: null })

  useEffect(() => {
    let live = true
    loadCompareRows()
      .then((r) => { if (live) setState(r.unavailable ? { status: 'unavailable', rows: null } : { status: 'ready', rows: r.rows }) })
      .catch(() => { if (live) setState({ status: 'failed', rows: null }) })
    return () => { live = false }
  }, [])

  return (
    <main className="eh-page eh-compare">
      <header className="eh-wide">
        <p className="eh-kicker">The List</p>
        <h1 className="eh-hed">Compare firms</h1>
        <p className="eh-dek cmp-dek">
          Set one firm’s reports beside up to three others’: how they score by report type, which flags their
          claims draw and how both have moved over time.
        </p>
      </header>
      <div className="eh-wide">
        <ListViews />
        {state.status === 'loading' && <p className="cmp-working" role="status">Loading The List…</p>}
        {state.status === 'unavailable' && <p className="eh-dek">Comparing firms isn’t available yet, but every report and its score are on <Link to="/list">The List</Link>.</p>}
        {state.status === 'failed' && <p className="eh-dek" role="alert">The List could not be loaded just now. Reload the page to try again, or go back to <Link to="/list">The List</Link>.</p>}
        {state.status === 'ready' && <CompareTool rows={state.rows} />}
      </div>
    </main>
  )
}
