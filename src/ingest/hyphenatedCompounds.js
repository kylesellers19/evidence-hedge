// ─────────────────────────────────────────────────────────────────────────────
// Hyphenated-compound guard. When the normalizer rejoins an end-of-line
// hyphenation ("word-\nword" → "wordword"), these compounds KEEP their hyphen
// (they are genuinely hyphenated, not a split word): "evidence-\nbased" →
// "evidence-based", not "evidencebased". Grows over time. Lowercase "a-b" keys.
// (A second-fragment-starts-uppercase heuristic also keeps the hyphen, for
// proper compounds like "Anglo-Saxon".)
// ─────────────────────────────────────────────────────────────────────────────

export const HYPHENATED_COMPOUNDS = new Set([
  'evidence-based',
  'well-known',
  'well-being',
  'long-term',
  'short-term',
  'decision-making',
  'cost-effective',
  'self-report',
  'self-reported',
  'self-esteem',
  'peer-reviewed',
  'third-party',
  'real-world',
  'high-quality',
  'low-cost',
  'data-driven',
  'state-of-the-art',
  'so-called',
  'up-to-date',
  'full-time',
  'part-time',
  'in-depth',
  'follow-up',
  'trade-off',
  'cross-sectional',
  'double-blind',
  'non-profit',
  'open-source',
  'end-to-end',
  'day-to-day',
  'face-to-face',
  'twenty-first',
  'co-author',
  'meta-analysis',
  'first-hand',
  'second-hand',
])
