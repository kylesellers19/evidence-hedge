const DRESS_CODE_FORMALITY = {
  'White Tie': 5,
  'Black Tie': 5,
  'Black Tie Optional': 4,
  'Formal': 4,
  'Cocktail Attire': 4,
  'Semi-Formal': 3,
  'Business Professional': 3,
  'Business Casual': 3,
  'Smart Casual': 2,
  'Casual': 1,
  'Beach / Resort': 1,
}

const OCCASION_TAGS = {
  'Wedding': ['wedding', 'formal', 'elegant', 'floral', 'feminine', 'dressy'],
  'Work / Business': ['business', 'professional', 'office', 'blazer', 'tailored'],
  'Cocktail Party': ['cocktail', 'party', 'evening', 'chic', 'night out'],
  'Black Tie Gala': ['gown', 'formal', 'black tie', 'gala', 'evening', 'elegant'],
  'Date Night': ['date', 'romantic', 'evening', 'chic', 'dinner'],
  'Brunch': ['brunch', 'casual', 'daytime', 'relaxed', 'spring'],
  'Beach / Vacation': ['beach', 'resort', 'vacation', 'summer', 'casual'],
  'Concert / Festival': ['concert', 'festival', 'casual', 'edgy', 'night out'],
  'Garden Party': ['garden party', 'floral', 'feminine', 'spring', 'summer'],
  'Casual Gathering': ['casual', 'relaxed', 'comfortable', 'weekend'],
}

const API_URL = import.meta.env.VITE_MATCHING_API_URL

if (API_URL) {
  console.warn(
    '[matchingService] API mode active — VITE_MATCHING_API_URL is set to:',
    API_URL,
    '\nCall rankWardrobeItemsAsync() to use the remote scorer.',
    '\nrankWardrobeItems() still returns local scores synchronously for backward compatibility.'
  )
}

// ─── Local scoring (unchanged) ────────────────────────────────────────────────

export function calculateMatchScore(item, occasion) {
  if (!occasion?.type) return null

  let score = 0

  // Formality match (0–40 pts)
  const requiredFormality = DRESS_CODE_FORMALITY[occasion.dressCode] ?? 3
  const itemFormality = item.formality ?? 3
  const diff = Math.abs(requiredFormality - itemFormality)
  score += Math.max(0, 40 - diff * 12)

  // Season match (0–25 pts)
  const itemSeasons = item.seasons ?? []
  if (itemSeasons.includes(occasion.season)) {
    score += 25
  } else if (itemSeasons.includes('All Seasons') || itemSeasons.length === 0) {
    score += 15
  }

  // Tag match (0–35 pts)
  const occasionTags = OCCASION_TAGS[occasion.type] ?? []
  const allKeywords = [...occasionTags, ...(occasion.dressCode?.toLowerCase().split(' ') ?? [])]
  const itemTags = (item.tags ?? []).map(t => t.toLowerCase())
  const matches = itemTags.filter(t => allKeywords.some(k => t.includes(k) || k.includes(t)))
  score += Math.min(35, matches.length * 12)

  return Math.min(100, Math.round(score))
}

// Synchronous — always uses local scoring. Signature is unchanged so existing
// callers in WardrobePage continue to work without modification.
export function rankWardrobeItems(items, occasion) {
  return items
    .map(item => ({ ...item, matchScore: calculateMatchScore(item, occasion) }))
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
}

// ─── API mode ─────────────────────────────────────────────────────────────────
// Async version that posts to VITE_MATCHING_API_URL when configured.
// Expected request body:  { occasion, items: WardrobeItem[] }
// Expected response body: [{ id: string, score: number }]
// Falls back to local scoring on any network or parse error.

export async function rankWardrobeItemsAsync(items, occasion) {
  if (!API_URL) {
    return rankWardrobeItems(items, occasion)
  }

  console.warn('[matchingService] Posting to matching API:', API_URL)

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occasion, items }),
    })

    if (!res.ok) throw new Error(`Matching API responded with ${res.status}`)

    const scores = await res.json()
    const scoreMap = Object.fromEntries(scores.map(s => [s.id, s.score]))

    return items
      .map(item => ({ ...item, matchScore: scoreMap[item.id] ?? null }))
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
  } catch (err) {
    console.warn('[matchingService] API call failed, falling back to local scoring:', err.message)
    return rankWardrobeItems(items, occasion)
  }
}
