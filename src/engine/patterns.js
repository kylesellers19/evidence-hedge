// ─────────────────────────────────────────────────────────────────────────────
// Pattern metadata — the human-readable name + "how this manufactures false
// confidence" copy for each flag. Keyed by FlagType so the brief renders a
// named pattern section per flag that actually fired, with verbatim examples
// pulled from the user's own text.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {import('./types.js').FlagType} FlagType */

/** @type {Record<FlagType, { name:string, description:string }>} */
export const PATTERN_META = {
  'unsupported-assertion': {
    name: 'Unsupported assertion',
    description:
      'A polished, quotable sentence that reads like a settled conclusion but ' +
      'cites little or nothing. The confidence is rhetorical, not evidential — ' +
      'the line carries no backing a reader could check.',
  },
  overconfident: {
    name: 'Overconfident relative to source',
    description:
      'The claim does cite a source, but asserts more certainty than that grade ' +
      'of evidence can carry — the language outruns what the citation actually ' +
      'establishes.',
  },
}

export const FLAG_ORDER = /** @type {FlagType[]} */ ([
  'unsupported-assertion',
  'overconfident',
])
