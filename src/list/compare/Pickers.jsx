import React, { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { matchesFirm } from './data.js'
import { count } from './format.js'

// A search field over a list of firms, as a combobox: typing narrows the list
// word by word, arrow keys move through it, Enter picks. The list stays open,
// so a reader sees every firm on offer and its report count.
export function FirmCombo({ label, placeholder, firms, onPick, full = false, inputRef, footer = null, hideLabel = false }) {
  const id = useId()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef(null)
  const shown = firms.filter((f) => matchesFirm(f.name, q))
  const at = Math.min(active, Math.max(0, shown.length - 1))
  const optionId = (i) => `${id}-opt-${i}`

  const pick = (f) => {
    if (!f || full) return
    onPick(f.name)
    setQ('')
    setActive(0)
  }
  const move = (to) => {
    const i = Math.max(0, Math.min(shown.length - 1, to))
    setActive(i)
    listRef.current?.querySelector(`#${CSS.escape(optionId(i))}`)?.scrollIntoView({ block: 'nearest' })
  }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(at + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(at - 1) }
    else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); move(0) }
    else if (e.key === 'End' && e.ctrlKey) { e.preventDefault(); move(shown.length - 1) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(shown[at]) }
    else if (e.key === 'Escape') { setQ(''); setActive(0) }
  }

  return (
    <div className="cmp-combo">
      <label className={hideLabel ? 'eh-sr-only' : 'cmp-label'} htmlFor={`${id}-input`}>{label}</label>
      <input
        id={`${id}-input`}
        ref={inputRef}
        className="eh-input"
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={shown.length ? optionId(at) : undefined}
        value={q}
        onChange={(e) => { setQ(e.target.value); setActive(0) }}
        onKeyDown={onKey}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        maxLength={120}
      />
      <ul className="cmp-options" role="listbox" id={`${id}-list`} ref={listRef} aria-label={label}>
        {shown.map((f, i) => (
          <li
            key={f.name}
            id={optionId(i)}
            role="option"
            aria-selected={i === at}
            aria-disabled={full || undefined}
            className={`cmp-option${i === at ? ' is-active' : ''}${full ? ' is-off' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(f)}
          >
            <span className="cmp-option-name">{f.name}</span>
            <span className="cmp-option-n">{count(f.count)}</span>
          </li>
        ))}
        {!shown.length && <li className="cmp-option is-none" role="option" aria-disabled="true" aria-selected="false">No firm matches.</li>}
      </ul>
      {footer}
    </div>
  )
}

// The firms picked to compare with, in the order picked. Each chip removes its
// firm on a click, Enter, Space, Delete or Backspace; focus then moves to the
// next chip, or back to the search.
export function Chips({ names, onRemove, inputRef }) {
  const refs = useRef([])
  if (!names.length) return null
  const remove = (i) => {
    onRemove(names[i])
    requestAnimationFrame(() => {
      const next = refs.current[i] && i < names.length - 1 ? refs.current[i] : refs.current[i - 1]
      ;(next || inputRef?.current)?.focus()
    })
  }
  return (
    <ul className="cmp-chips" aria-label="Firms to compare with">
      {names.map((n, i) => (
        <li key={n}>
          <button
            type="button"
            className="cmp-chip"
            ref={(el) => { refs.current[i] = el }}
            aria-label={`Remove ${n}`}
            onClick={() => remove(i)}
            onKeyDown={(e) => { if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(i) } }}
          >
            {n}<span className="cmp-chip-x" aria-hidden="true">×</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function NotListed() {
  return <p className="cmp-notlisted">Not listed? <Link to="/">Weigh one of its reports</Link> and add it from its evidence brief.</p>
}
