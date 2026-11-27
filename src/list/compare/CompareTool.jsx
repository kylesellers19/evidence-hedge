import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { COMPARE_CONSTANTS as K } from './constants.js'
import {
  poolOf, buildOf, firmIndex, firmsAt, suggestionsFor, typesOffered, precheck,
  readSelection, writeSelection, selectionData, MEASURES,
} from './data.js'
import { joinAnd, shortNames, typePlural, count } from './format.js'
import { narrate } from './narrate.js'
import { useStats } from './useStats.js'
import { FirmCombo, Chips, NotListed } from './Pickers.jsx'
import Results from './Results.jsx'

/**
 * Compare firms: choose a firm, up to three others and the report types, then
 * Compare. The address holds every choice (data.js readSelection), so Back
 * undoes a change and a shared link opens on the same results; the report
 * types reach the address when Compare is pressed, and an address with them
 * opens straight on the results.
 */
export default function CompareTool({ rows }) {
  const [params, setParams] = useSearchParams()
  const sel = useMemo(() => readSelection(params), [params])
  const pool = useMemo(() => poolOf(rows, { readers: sel.readers }), [rows, sel.readers])
  const index = useMemo(() => firmIndex(pool), [pool])
  const known = new Set(index.map((f) => f.name))
  const firm = known.has(sel.firm) ? sel.firm : ''
  const build = firm ? buildOf(pool, firm) : null
  const atBuild = useMemo(() => (build ? firmsAt(pool, build) : []), [pool, build])
  const atNames = new Set(atBuild.map((f) => f.name))
  const vs = firm ? sel.vs.filter((v) => atNames.has(v)) : []
  const chosen = firm ? [firm, ...vs] : []
  const offered = useMemo(() => (build && vs.length ? typesOffered(pool, build, chosen) : []), [pool, build, chosen.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  const offeredTypes = offered.map((t) => t.type)
  const urlTypes = sel.types ? sel.types.filter((t) => offeredTypes.includes(t)) : null
  const showing = Boolean(firm && vs.length && urlTypes && urlTypes.length)

  // The types ticked while the panels are open: the address's, or the rule's
  // for these firms.
  const [draft, setDraft] = useState(null)
  const firmsKey = `${firm}|${vs.join('|')}|${sel.readers}`
  useEffect(() => { setDraft(urlTypes && urlTypes.length ? urlTypes : precheck(offered)) }, [firmsKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const types = (draft || []).filter((t) => offeredTypes.includes(t))

  const go = (next, { replace = false } = {}) => setParams(writeSelection({ firm, vs, readers: sel.readers, types: null, ...next }), { replace })
  const pickFirm = (name) => {
    const b = buildOf(pool, name)
    const keep = vs.filter((v) => v !== name && pool.some((r) => r.company === v && r.engine === b))
    focusNext.current = 'others'
    go({ firm: name, vs: keep })
  }
  const addOther = (name) => { if (vs.length < K.MAX_OTHERS && !vs.includes(name)) go({ vs: [...vs, name] }) }
  const removeOther = (name) => go({ vs: vs.filter((v) => v !== name) })
  const toggle = (t) => setDraft(types.includes(t) ? types.filter((x) => x !== t) : [...types, t])
  const compare = () => { go({ types }); setFocusResults(true) }
  const change = () => { setDraft(urlTypes); go({ types: null }) }

  // Focus: into the second panel when an address names only the firm; on the
  // results heading after Compare.
  const otherInput = useRef(null)
  const firmInput = useRef(null)
  const heading = useRef(null)
  const [focusResults, setFocusResults] = useState(false)
  // Arriving with ?firm= alone, or picking a firm, puts focus in panel 2.
  const focusNext = useRef(sel.firm && !sel.vs.length ? 'others' : null)
  useEffect(() => {
    if (focusNext.current === 'others' && firm) { focusNext.current = null; otherInput.current?.focus() }
  }, [firm])

  // The comparison itself, when the address has every part.
  const data = useMemo(() => (showing ? selectionData(rows, { firm, vs, types: urlTypes, readers: sel.readers }) : null),
    [rows, showing, firm, vs.join('|'), (urlTypes || []).join('|'), sel.readers]) // eslint-disable-line react-hooks/exhaustive-deps
  const input = useMemo(() => (data ? { seedKey: data.seedKey, firms: data.firms, measures: MEASURES, context: data.context } : null), [data])
  const stats = useStats(input)
  const sentences = useMemo(() => (stats.status === 'done' && data
    ? narrate(stats.result.rows, { firm, vs, types: data.types, measures: MEASURES, allTypes: data.types.length === offeredTypes.length && data.types.length > 1 })
    : null), [stats, data]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (focusResults && sentences) { heading.current?.focus(); setFocusResults(false) }
  }, [focusResults, sentences])

  // The scope line counts what this selection compares.
  const scopeData = useMemo(() => (firm ? selectionData(rows, { firm, vs, types: showing ? urlTypes : (vs.length ? types : offeredTypesFor(pool, build, firm)), readers: sel.readers }) : null),
    [rows, firm, vs.join('|'), showing, (urlTypes || []).join('|'), types.join('|'), sel.readers]) // eslint-disable-line react-hooks/exhaustive-deps
  const short = shortNames(chosen)
  const reason = !firm ? 'Choose a firm.' : !vs.length ? 'Choose at least one firm to compare with.' : !types.length ? 'Choose at least one report type.' : ''
  const suggestions = firm ? suggestionsFor(pool, build, firm, { exclude: vs }) : []
  const others = atBuild.filter((f) => f.name !== firm)

  return (
    <>
      <Scope data={scopeData} readers={sel.readers} onReaders={(on) => setParams(writeSelection({ firm, vs, readers: on, types: urlTypes }))} />

      {showing ? (
        <p className="cmp-summary">
          {summary(firm, vs, data?.types || urlTypes, offeredTypes)}{' '}
          <button type="button" className="eh-inlinebutton cmp-change" onClick={change}>Change</button>
        </p>
      ) : (
        <div className="cmp-panels">
          <fieldset className="cmp-panel">
            <legend><h2 className="cmp-panel-h">Choose a firm</h2></legend>
            {firm ? (
              <p className="cmp-picked"><strong>{firm}</strong>{' '}
                <button type="button" className="eh-inlinebutton" onClick={() => { go({ firm: '', vs: [] }); requestAnimationFrame(() => firmInput.current?.focus()) }}>Change</button></p>
            ) : (
              <FirmCombo label="Search firms" placeholder="Your firm, or any firm on The List" firms={index} onPick={pickFirm} inputRef={firmInput} footer={<NotListed />} />
            )}
          </fieldset>

          <fieldset className={`cmp-panel${firm ? '' : ' is-inactive'}`} disabled={!firm}>
            <legend><h2 className="cmp-panel-h">Compare with up to three</h2></legend>
            <Chips names={vs} onRemove={removeOther} inputRef={otherInput} />
            {firm && suggestions.length > 0 && vs.length < K.MAX_OTHERS && (
              <div className="cmp-suggest">
                <p className="cmp-label" id="cmp-suggest-h">Publish the same kinds of reports</p>
                <ul aria-labelledby="cmp-suggest-h">
                  {suggestions.map((f) => (
                    <li key={f.name}><button type="button" className="cmp-suggestion" onClick={() => addOther(f.name)} aria-label={`Add ${f.name}, ${f.count} reports`}>
                      {f.name} <span className="cmp-option-n">{count(f.count)}</span></button></li>
                  ))}
                </ul>
              </div>
            )}
            <FirmCombo label="Search firms to compare with" placeholder="Any firm on The List" firms={firm ? others.filter((f) => !vs.includes(f.name)) : index}
              onPick={addOther} full={vs.length >= K.MAX_OTHERS} inputRef={otherInput}
              footer={vs.length >= K.MAX_OTHERS ? <p className="cmp-notlisted" role="status">Remove one to add another.</p> : null} />
          </fieldset>

          <fieldset className={`cmp-panel${vs.length ? '' : ' is-inactive'}`} disabled={!vs.length}>
            <legend><h2 className="cmp-panel-h">Report types</h2></legend>
            {vs.length > 0 ? (
              <>
                <table className="cmp-types">
                  <thead>
                    <tr><th scope="col"><span className="eh-sr-only">Report type</span></th>{short.map((s, i) => <th scope="col" key={chosen[i]} className={`n${i === 0 ? ' is-chosen' : ''}`} title={chosen[i]}>{s}</th>)}</tr>
                  </thead>
                  <tbody>
                    {offered.map((t) => (
                      <tr key={t.type}>
                        <th scope="row"><label className="cmp-check"><input type="checkbox" checked={types.includes(t.type)} onChange={() => toggle(t.type)} />{t.type}</label></th>
                        {t.counts.map((n, i) => <td className="n" key={chosen[i]}>{n ? count(n) : <span className="cmp-zero-n">0</span>}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="cmp-allnone">
                  <button type="button" className="eh-button is-quiet cmp-small" onClick={() => setDraft(offeredTypes)}>All</button>{' '}
                  <button type="button" className="eh-button is-quiet cmp-small" onClick={() => setDraft([])}>None</button>
                </p>
              </>
            ) : (
              <p className="cmp-allnone">
                <button type="button" className="eh-button is-quiet cmp-small" disabled>All</button>{' '}
                <button type="button" className="eh-button is-quiet cmp-small" disabled>None</button>
              </p>
            )}
          </fieldset>
        </div>
      )}

      {!showing && (
        <p className="cmp-go">
          <button type="button" className="eh-button" onClick={compare} disabled={Boolean(reason)} aria-describedby={reason ? 'cmp-reason' : undefined}>Compare</button>
          {reason && <span className="cmp-reason" id="cmp-reason">{reason}</span>}
        </p>
      )}

      {showing && (
        <div className="cmp-out" aria-live="polite" aria-busy={stats.status === 'working'}>
          {stats.status === 'working' && <p className="cmp-working" role="status">Working it out…</p>}
          {stats.status === 'failed' && <p className="cmp-working" role="alert">The comparison could not be worked out. Reload the page to try again.</p>}
          {stats.status === 'done' && sentences && data && (
            <Results data={data} result={stats.result} sentences={sentences} short={short} headingRef={heading} />
          )}
        </div>
      )}
    </>
  )
}

const offeredTypesFor = (pool, build, firm) => (build ? typesOffered(pool, build, [firm]).map((t) => t.type) : [])

function summary(firm, vs, types, offered) {
  const all = types.length === offered.length && types.length > 1
  const on = all ? 'on all their report types' : types.length <= 3 ? `on ${joinAnd(types.map(typePlural))}` : `on ${types.length} report types`
  return `${firm} compared with ${joinAnd(vs)} ${on}.`
}

// "Comparing N reports from our corpus audit, weighed by engine {build}",
// with what was left out, and the readers' checkbox.
function Scope({ data, readers, onReaders }) {
  let line = 'Comparing reports from our corpus audit, each comparison on one engine build.'
  if (data) {
    const n = data.firms.reduce((s, f) => s + f.reports.length, 0)
    const parts = [`Comparing ${count(n)} ${n === 1 ? 'report' : 'reports'} from our corpus audit${readers && data.readerCount ? ' and readers' : ''}, weighed by engine ${data.build}.`]
    if (data.left.auditOtherBuild) parts.push(`${count(data.left.auditOtherBuild)} more from these firms, weighed by another build, ${data.left.auditOtherBuild === 1 ? 'is' : 'are'} left out.`)
    if (readers) {
      const off = data.left.readersOtherBuild + data.left.readersNoCounts
      parts.push(off
        ? `${count(off)} ${off === 1 ? 'report' : 'reports'} added by readers ${off === 1 ? 'was' : 'were'} left out: ${data.left.readersNoCounts ? 'a different engine build scored them, or they were added before flag counts were kept' : `a different engine build scored ${off === 1 ? 'it' : 'them'}`}.`
        : data.readerCount ? `${count(data.readerCount)} added by readers ${data.readerCount === 1 ? 'is' : 'are'} included.` : 'No reports added by readers match.')
    }
    line = parts.join(' ')
  }
  return (
    <div className="cmp-scope">
      <p className="cmp-scopeline">{line}</p>
      <label className="cmp-check cmp-readers"><input type="checkbox" checked={readers} onChange={(e) => onReaders(e.target.checked)} />Include reports added by readers</label>
    </div>
  )
}
