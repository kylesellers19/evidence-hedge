// ─────────────────────────────────────────────────────────────────────────────
// Genre-form cues (profile/genre.js). What a text presents itself as, and whose
// interest stands behind it, read from the text and the link's path only.
// PROVISIONAL — not ratified.
// ─────────────────────────────────────────────────────────────────────────────

// Genre markers, each counted once (moved from rubrics/route.js).
export const GENRE_MARKERS = {
  research: [/\bAbstract\b/, /\bIntroduction\b/, /\b(?:Materials and )?Methods\b/, /\bResults\b/, /\bDiscussion\b/, /\bdoi:?\s*10\.|doi\.org\/10\./i, /\bet al\.?/, /\bp\s*[<=]\s*0?\.\d/],
  press: [/\bfor immediate release\b/i, /\bpress release\b/i, /\bmedia contacts?\b/i, /^\s*###\s*$/m, /\b(?:today )?announced(?: today)?\b/i, /^[A-Z][A-Za-z .]+,\s+[A-Z]{2}\.?\s+[–—-]\s/m],
  journalism: [/\bBy\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/, /\b(?:said|says|told)\b/, /\baccording to\b/i, /[“"][^”"]{20,}[”"]/],
  marketing: [/\b(?:contact us|learn more|get started|sign up|buy now|shop now|request a demo|add to cart)\b/i, /\b(?:our|we)\s+(?:products?|solutions?|platform|services)\b/i],
}
export const GENRE_MIN = 3 // PROVISIONAL — not ratified

// A byline in the first ~600 characters: the reporting form, when the speaker
// is not already a newsroom.
export const BYLINE = /\bBy\s+[A-Z][a-z]+(?:\s+[A-Z]\.)?\s+[A-Z][a-z]+(?:-[A-Z][a-z]+)?\b/
export const BYLINE_CHARS = 600

// Paid placement (FTC 2015 native-advertising policy; Wojdynski & Evans 2016).
export const SPONSORSHIP = /\b(?:sponsored (?:by|content|post|article|feature)|paid (?:post|content|partnership|placement|for by)|partner content|brought to you by|advertorial|promoted content|branded content|this (?:content|article|story|post) (?:was|is) (?:produced|created|paid for|written) (?:by|for|in partnership with))\b/i

// A blog post: the link's path or a "Posted by … on" line.
export const BLOG_PATH = /\/(?:blogs?)\//i
export const BLOG_TEXT = /\bPosted by\s+[A-Z]\w+(?:\s+[A-Z]\w+)?\s+on\b/

// An advocacy mission or an industry membership: an interest in the conclusions
// that the publisher's kind (nonprofit, coalition) does not announce. Two
// distinct cues are needed; a stated non-advocacy policy cancels them.
export const ADVOCACY_CUES = [
  /\bpolicy advocacy\b/i,
  /\badvocacy (?:efforts|campaigns?|agenda|work|initiatives|goals?)\b/i,
  /\b(?:we|the coalition|our members|members)\s+advocate\b/i,
  /\b(?:coalition|alliance|consortium) members include\b|\bmembers include\b/i,
  /\bindustry (?:partners|members|leaders|sponsors)\b/i,
  /\b(?:founding|corporate|sustaining) (?:members|partners|sponsors)\b/i,
  /\braising public awareness\b|\bbuild support for\b/i,
]
export const ADVOCACY_MIN = 2 // PROVISIONAL — not ratified
export const NON_ADVOCACY = /\bnon-?advocacy\b|\bdoes not take (?:policy )?positions\b/i

// Attribution to a named source: who the claims come from. An org or person is
// a capitalized run of up to four words (articles and "of/for/and" inside).
const NAME = "((?:The\\s+)?[A-Z][\\w&’'.-]*(?:\\s+(?:[A-Z][\\w&’'.-]*|of|for|and|&)){0,3})"
const SAYS = '(?:says|said|states|stated|contends|contended|emphasizes|emphasized|notes|noted|observes|observed|finds|found|reports|reported|argues|argued|explains|explained|recommends|highlights|shows|showed|suggests|told)'
export const ATTRIBUTION_PATTERNS = [
  new RegExp(`${NAME}(?:’s|'s)\\s+(?:new\\s+|latest\\s+|recent\\s+|annual\\s+|global\\s+|\\d{4}\\s+)*(?:research|study|report|survey|data|analysis|findings|index|poll|white\\s*paper)\\b`, 'g'),
  new RegExp(`${NAME}\\s+${SAYS}\\b`, 'g'),
  new RegExp(`\\baccording\\s+to\\s+${NAME}`, 'g'),
  new RegExp(`\\b${SAYS}\\s+${NAME}`, 'g'),
  new RegExp(`\\b(?:director|president|CEO|chief\\s+\\w+\\s+officer|principal|founder|head|leader|researcher|scientist|professor|spokesperson|manager|partner|vice\\s+president)\\b[^,.;]{0,50}?\\s(?:at|of)\\s+${NAME}`, 'g'),
]

// Capitalized words that open an attribution without naming anyone.
export const SOURCE_STOPWORDS = new Set([
  'The', 'A', 'An', 'This', 'That', 'These', 'Those', 'It', 'Its', 'They', 'Their', 'He', 'She', 'We', 'Our', 'I', 'You',
  'But', 'And', 'However', 'Yet', 'So', 'Also', 'Still', 'In', 'On', 'At', 'For', 'Of', 'As', 'If', 'When', 'While',
  'Researchers', 'Scientists', 'Experts', 'Authors', 'Study', 'Survey', 'Report', 'Data', 'Results', 'Findings', 'Analysis',
  'Participants', 'Respondents', 'Employees', 'Workers', 'People', 'Analysts', 'Officials', 'Most', 'Many', 'Some', 'Others',
  'Global', 'New', 'Latest', 'Recent', 'Annual', 'One', 'Two', 'Three', 'Each', 'Every', 'All', 'Both', 'Such', 'Here', 'There',
  'Research', 'Institute', 'University', 'School', 'Department', 'Center', 'Centre',
])
export const SOURCE_MIN_COUNT = 3   // PROVISIONAL — not ratified (attributions to the top source)
export const SOURCE_MIN_SHARE = 0.6 // PROVISIONAL — not ratified (its share of all attributions)

// A named source is a firm when the text says so near its name.
export const FIRM_NEAR = (token) => new RegExp(
  `\\b${token}\\b[^.]{0,60}\\b(?:firm|company|Inc\\.?|LLC|Ltd\\.?|Corp\\.?|Corporation|GmbH|consultancy|manufacturer)\\b|` +
  `\\b(?:firm|company|consultancy|vendor|manufacturer|maker)\\s+${token}\\b|` +
  `\\b${token}\\s+Research\\s+Institute\\b`,
)
