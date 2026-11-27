import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../../components/layout/SiteLayout.jsx'
import { hasFlagCounts } from '../store.js'

/**
 * Compare firms (/list/compare). Shown only when The List's table has the
 * version 3 flag-count columns (docs/the-list.sql); until then the page says
 * so in one sentence and links back to The List, so the live site never shows
 * a half-built tool and the tool appears, without a redeploy, once the SQL runs.
 */
export default function ComparePage() {
  usePageTitle('Compare firms')
  const [available, setAvailable] = useState(null) // null while asking the table

  useEffect(() => {
    let live = true
    hasFlagCounts().then((yes) => { if (live) setAvailable(yes) }, () => { if (live) setAvailable(false) })
    return () => { live = false }
  }, [])

  return (
    <main className="eh-page eh-compare">
      <header className="eh-col">
        <p className="eh-kicker">The List</p>
        <h1 className="eh-hed">Compare firms</h1>
        {available === null
          ? <p className="eh-dek" role="status">Loading The List…</p>
          : <p className="eh-dek">Comparing firms isn’t available yet, but every report and its score are on <Link to="/list">The List</Link>.</p>}
      </header>
    </main>
  )
}
