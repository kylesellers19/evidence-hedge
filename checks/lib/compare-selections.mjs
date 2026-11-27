// The four selections the predictions, the reference implementation and the
// narration targets use (docs/compare/predictions.md), plus one small enough
// to count every arrangement. Each uses every report type its firms have.
export const SELECTIONS = [
  { slug: 'largest-four', firm: 'Arup US', vs: ['Mortenson', 'WSP', 'JE Dunn Construction'], types: 'all', readers: false },
  { slug: 'suggested-peers', firm: 'Arcadis North America', vs: ['NV5 Global', 'SSOE', 'HOK'], types: 'all', readers: false },
  { slug: 'small-against-largest', firm: 'Suffolk', vs: ['Arup US'], types: 'all', readers: false },
  { slug: 'most-different-mix', firm: 'Mortenson', vs: ['SmithGroup'], types: 'all', readers: false },
]
// Two firms with 5 reports each on one build: 252 arrangements.
export const SMALL = { slug: 'small-exact', firm: 'Autodesk', vs: ['Trimble'], types: 'all', readers: false }
