// ─────────────────────────────────────────────────────────────────────────────
// Site chrome the reader leaves in page text: menus, account links, cookie
// banners, share bars, related-content rails. Used ONLY on reader output, and
// only on a line that is also ≤ 12 words with no terminal punctuation and no
// finite verb (src/ingest/chromeLines.js), so a sentence that mentions one of
// these is never touched.
//
//   CHROME_LINES    the whole line (or every |-/•-separated part) is one of these
//   CHROME_PHRASES  the line contains one of these
//
// Collected from the fixtures/corpus.json reader pages. PROVISIONAL — not ratified.
// ─────────────────────────────────────────────────────────────────────────────

export const CHROME_LINES = [
  // navigation
  'skip to main content', 'skip to content', 'menu', 'main menu', 'home', 'back', 'back to top',
  'back to blog', 'next', 'previous', 'close', 'cancel', 'clear', 'sidebar', 'search', 'search…',
  'search products', 'recent searches', 'popular searches', 'no results found', 'relevance',
  'by date', 'by name', 'journal list', 'user guide', 'dashboard',
  // account
  'log in', 'log out', 'logout', 'sign in', 'sign up', 'log in sign up', 'create account',
  'account settings', 'your account', 'your content', 'saved articles', 'customer service',
  'manage your subscription', 'edit your profile', 'view your profile', 'subscribe',
  'already a subscriber? log in', 'try for free', 'or learn more', 'signing you up... sign up',
  // sharing / tools
  'share', 'shares', 'close share', 'copy', 'copy link', 'link', 'email', 'mail', 'print', 'cite',
  'permalink', 'pdf', 'download', 'actions', 'collections', 'resources', 'open in a new tab',
  'view on publisher site', 'x', 'facebook', 'twitter', 'linkedin', 'threads', 'whatsapp',
  'instagram', 'youtube', 'pinterest', 'reddit', 'add us on google',
  // consent banners
  'cookies', 'cookie preferences', 'cookies settings', 'cookie descriptions', 'privacy statement',
  'accept', 'accept all', 'reject all', 'decline', 'got it', 'save and close',
  'accept settings & close', 'delete my data', 'essential', 'functionality', 'analytics',
  // rails and promos
  'related', 'read more', 'show more', 'view more', 'load more content', 'view comments',
  'you may also like', 'you might like', 'similar articles', 'cited by other articles',
  'links to ncbi databases', 'more green building news', 'weekly newsletter', 'newsletters',
  'about the author', 'continue', 'continue shopping', 'checkout', 'update', 'yes', 'no',
  'end chat', 'loading', 'loading …', 'promotions', 'track order', 'reorder products',
  'product details', 'your cart is empty', 'switch to typing', 'stop speaking',
  // PMC / .gov banner
  "here's how you know", 'official websites use .gov', 'secure .gov websites use https',
  'an official website of the united states government', 'search ncbi',
  'search pmc full-text archive', 'search in pmc', 'pmc copyright notice',
  'copyright and license information', 'author information', 'article notes',
]

export const CHROME_PHRASES = [
  'skip to',
  'log in or sign up',
  'sign up for',
  'subscribe today',
  'stay informed with',
  'get the latest news',
  'cookie',
  'privacy policy',
  'terms of use',
  'all rights reserved',
  'follow us',
  'find articles by',
  'shopping cart',
  'powered by',
  'min read',
]
