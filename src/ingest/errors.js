// Typed extraction error. `kind` maps to a designed user-facing message
// (see extractFile.js FAILURE_MESSAGES) — these are designed states, not crashes.
export class ExtractionError extends Error {
  constructor(kind) {
    super(kind)
    this.name = 'ExtractionError'
    this.kind = kind
  }
}
