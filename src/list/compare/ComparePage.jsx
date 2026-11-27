import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../../components/layout/SiteLayout.jsx'
import { loadCompareRows } from '../store.js'
import CompareTool from './CompareTool.jsx'
import '../../styles/compare.css'

/**
 * Compare firms (/list/compare). Shown only when The List's table has the
 * version 3 flag-count columns (docs/the-list.sql); until then the page says
 * so in one sentence and links back to The List, so the live site never shows
 * a half-built tool and the tool appears, without a redeploy, once the SQL runs.
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
      </header>
      <div className="eh-wide">
        {state.status === 'loading' && <p className="cmp-working" role="status">Loading The List…</p>}
        {state.status === 'unavailable' && <p className="eh-dek">Comparing firms isn’t available yet, but every report and its score are on <Link to="/list">The List</Link>.</p>}
        {state.status === 'failed' && <p className="eh-dek" role="alert">The List could not be loaded just now. Reload the page to try again, or go back to <Link to="/list">The List</Link>.</p>}
        {state.status === 'ready' && <CompareTool rows={state.rows} />}
      </div>
    </main>
  )
}
