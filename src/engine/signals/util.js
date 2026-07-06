// Small shared text utilities for the document-signal modules.

export const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Whole-word matcher for a single term.
export const wordRe = (t) => new RegExp(`\\b${escapeRe(t)}\\b`, 'i')

// Phrase matcher — spaces in the term match any run of whitespace.
export const phraseRe = (t) => new RegExp(`\\b${escapeRe(t).replace(/\\?\s+/g, '\\s+')}\\b`, 'i')

// All matched spans for a regex (auditable evidence).
export function spansFor(text, re) {
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
  const out = []
  let m
  while ((m = rx.exec(text)) !== null) {
    out.push(m[0].trim())
    if (m.index === rx.lastIndex) rx.lastIndex++
  }
  return out
}
