const PROXY_URL    = 'https://gsktyraatycxeowiuhxi.supabase.co/functions/v1/style-proxy'
const CACHE_PREFIX = 'gigi_proxy_v1_'

// In-flight deduplication — concurrent callers for the same occasion share one request
const pendingRequests = new Map()

// ─── Google Places type → aesthetic mappings ──────────────────────────────────
const TYPE_AESTHETICS = {
  fine_dining_restaurant: { descriptors: ['elegant', 'sophisticated', 'formal-leaning'],       mood: ['refined', 'intimate', 'candlelit'],          formality: 3 },
  restaurant:             { descriptors: ['smart casual', 'polished', 'considered'],            mood: ['social', 'convivial'],                        formality: 2 },
  bar:                    { descriptors: ['polished evening', 'statement pieces', 'cocktail'],  mood: ['social', 'vibrant', 'evening'],               formality: 1 },
  night_club:             { descriptors: ['bold', 'fitted', 'statement', 'evening'],            mood: ['dramatic', 'high-energy', 'fashion-forward'], formality: 2 },
  art_gallery:            { descriptors: ['curated', 'minimalist', 'downtown cool'],            mood: ['intellectual', 'understated', 'creative'],    formality: 2 },
  museum:                 { descriptors: ['smart casual', 'intellectual', 'considered'],        mood: ['cultured', 'thoughtful', 'classic'],          formality: 2 },
  cafe:                   { descriptors: ['relaxed daytime', 'comfortable', 'layered'],         mood: ['casual', 'creative', 'easy'],                 formality: 0 },
  lodging:                { descriptors: ['polished', 'elevated', 'versatile'],                 mood: ['refined', 'put-together'],                   formality: 2 },
  spa:                    { descriptors: ['relaxed', 'comfortable', 'soft palette'],            mood: ['serene', 'wellness'],                         formality: 0 },
  park:                   { descriptors: ['outdoor', 'casual', 'comfortable'],                  mood: ['natural', 'relaxed'],                         formality: 0 },
  golf_course:            { descriptors: ['country club', 'preppy', 'smart casual'],            mood: ['classic', 'athletic-chic'],                  formality: 1 },
  country_club:           { descriptors: ['club formal', 'blazer', 'polished'],                 mood: ['classic', 'establishment'],                  formality: 3 },
  stadium:                { descriptors: ['casual', 'comfortable', 'sporty'],                   mood: ['energetic', 'fan-friendly'],                  formality: 0 },
  wedding_venue:          { descriptors: ['formal', 'celebratory', 'dressed up'],               mood: ['romantic', 'festive'],                        formality: 4 },
  banquet_hall:           { descriptors: ['formal', 'celebratory', 'polished'],                 mood: ['festive', 'elegant'],                         formality: 3 },
  event_venue:            { descriptors: ['dressed up', 'celebratory', 'put-together'],         mood: ['festive', 'polished'],                        formality: 3 },
  place_of_worship:       { descriptors: ['conservative', 'modest', 'respectful'],              mood: ['reverent', 'understated'],                   formality: 2 },
}

const NAME_OVERRIDES = [
  { keywords: ['rooftop', 'roof top', 'sky bar', 'sky lounge'],       descriptors: ['elevated casual', 'golden hour', 'breezy'],        mood: ['romantic', 'open-air', 'panoramic'],       formality: 1 },
  { keywords: ['dive bar', 'dive'],                                     descriptors: ['casual', 'vintage', 'indie-cool'],                 mood: ['laid-back', 'eclectic', 'unpretentious'],  formality: 0 },
  { keywords: ['beach', 'beachside', 'oceanside', 'seaside', 'surf'], descriptors: ['linen', 'sun-bleached', 'sandals', 'easy'],        mood: ['breezy', 'coastal', 'sun-kissed'],         formality: 0 },
  { keywords: ['lounge', 'speakeasy', 'jazz club'],                    descriptors: ['polished evening', 'statement pieces', 'moody'],   mood: ['intimate', 'evening', 'sophisticated'],    formality: 2 },
  { keywords: ['yacht', 'marina', 'sailing', 'boat club'],             descriptors: ['nautical chic', 'linen blazer', 'deck shoes'],     mood: ['coastal', 'luxury casual'],                formality: 2 },
]

const DRESS_CODE_BY_FORMALITY = ['Casual', 'Smart Casual', 'Smart Casual', 'Business', 'Formal', 'Black Tie']

const SEASON_BY_MONTH = ['Winter','Winter','Spring','Spring','Spring','Summer','Summer','Summer','Fall','Fall','Fall','Winter']

const AMAZON_TERMS_BY_FORMALITY = [
  ['casual summer dress women', 'white sneakers women', 'canvas tote bag', 'denim jacket women', 'flat sandals women'],
  ['midi dress women', 'block heel sandals', 'chain crossbody bag', 'linen blazer women', 'linen pants women'],
  ['cocktail dress women', 'pointed toe heels', 'structured handbag women', 'blazer suit women', 'statement necklace'],
  ['formal dress women', 'strappy heels women', 'evening clutch bag', 'pearl jewelry set', 'silk blouse women'],
  ['evening gown women formal', 'stiletto heels women', 'metallic evening clutch', 'statement earrings formal', 'faux fur stole'],
  ['black tie gown women', 'crystal heels women', 'beaded evening bag', 'chandelier earrings', 'opera gloves women'],
]

// ─── Public: sync venue → aesthetic (used by buildFallback) ──────────────────
export function inferVenueAesthetic(venue) {
  if (!venue) {
    return { primaryDescriptors: ['stylish', 'put-together'], moodKeywords: ['confident', 'curated'], formality: 2 }
  }
  const name  = (venue.name || '').toLowerCase()
  const types = venue.types || []

  for (const o of NAME_OVERRIDES) {
    if (o.keywords.some(k => name.includes(k))) {
      return { primaryDescriptors: o.descriptors, moodKeywords: o.mood, formality: o.formality }
    }
  }
  for (const type of types) {
    const m = TYPE_AESTHETICS[type]
    if (m) return { primaryDescriptors: m.descriptors, moodKeywords: m.mood, formality: m.formality }
  }
  return { primaryDescriptors: ['stylish', 'put-together', 'social'], moodKeywords: ['confident', 'curated'], formality: 2 }
}

// ─── Public: Foursquare tips — now handled server-side by the Edge Function ───
// Kept as a no-op so any callers that imported it don't break.
export async function fetchVenueTips() { return [] }

// ─── Internal: cache key from user-controlled fields only ────────────────────
// Excludes inferred fields (they're the output, not the input) to prevent
// a re-render loop when SET_STYLE_INFERENCE updates AppContext.
// userId is included so personalized results are never shared across accounts.
function buildCacheKey(occasion, userId) {
  return CACHE_PREFIX + JSON.stringify({
    venue:              occasion?.venue              || '',
    venueLocation:      occasion?.venueLocation      || '',
    venueTypes:         occasion?.venueTypes         || [],
    isPrivateResidence: !!occasion?.isPrivateResidence,
    occasionType:       occasion?.occasionType       || null,
    gender:             occasion?.gender             || null,
    dressCode:          occasion?.dressCode          || null,
    timeOfDay:          occasion?.timeOfDay          || null,
    season:             occasion?.season             || null,
    uid:                userId                       || null,
  })
}

// ─── Public: single POST to style-proxy Edge Function ────────────────────────
// Returns { styleDescriptor, inspirationPhotos, shoppableImages }.
// sessionStorage cache + in-flight dedup means one request per unique occasion.
// userId is forwarded so the Edge Function can inject a taste profile when available.
export async function callStyleProxy(occasion, userId = null) {
  if (!occasion) {
    return { styleDescriptor: buildFallback(occasion), inspirationPhotos: [], shoppableImages: [] }
  }

  const cacheKey = buildCacheKey(occasion, userId)

  try {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      console.log('[styleIntelligenceService] Cache HIT')
      return JSON.parse(cached)
    }
  } catch {}

  if (pendingRequests.has(cacheKey)) return pendingRequests.get(cacheKey)

  console.log('[styleIntelligenceService] Cache MISS — fetching')
  const promise = (async () => {
    try {
      const res = await fetch(PROXY_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ occasion, userId: userId ?? null }),
      })

      if (!res.ok) throw new Error(`style-proxy HTTP ${res.status}`)

      const result = await res.json()
      console.log('[styleIntelligenceService] Proxy response —',
        'photos:', result.inspirationPhotos?.length ?? 'missing',
        '| shopItems:', result.shoppableImages?.length ?? 'missing',
        '| hasDescriptor:', !!result.styleDescriptor,
        '| error:', result.error ?? null,
      )
      if (result.error) throw new Error(result.error)

      try { sessionStorage.setItem(cacheKey, JSON.stringify(result)) } catch {}
      return result
    } catch (err) {
      console.error('[styleIntelligenceService] style-proxy failed:', err.message, '— returning fallback with empty photos')
      return { styleDescriptor: buildFallback(occasion), inspirationPhotos: [], shoppableImages: [] }
    }
  })()

  pendingRequests.set(cacheKey, promise)
  try {
    return await promise
  } finally {
    pendingRequests.delete(cacheKey)
  }
}

// ─── Public: style descriptor only (backward-compat for existing callers) ────
export async function generateStyleDescriptor(occasion) {
  const result = await callStyleProxy(occasion)
  return result.styleDescriptor ?? buildFallback(occasion)
}

// ─── Internal: local fallback when proxy is unreachable ──────────────────────
function buildFallback(occasion) {
  const aesthetic = inferVenueAesthetic({ name: occasion?.venue, types: occasion?.venueTypes || [] })
  const tier  = Math.min(5, Math.max(0, Math.round(aesthetic.formality)))
  const month = new Date().getMonth()

  return {
    inferredDressCode: DRESS_CODE_BY_FORMALITY[tier],
    inferredTimeOfDay: 'Evening',
    inferredSeason:    SEASON_BY_MONTH[month],
    styleBrief:        null,
    venueVibe:         null,
    vibeDescriptors:   [],
    crowdType:         null,
    aestheticKeywords: [...aesthetic.primaryDescriptors, ...aesthetic.moodKeywords],
    colorPalette:      [],
    avoidList:         [],
    unsplashQuery:     null,
    amazonSearchTerms: AMAZON_TERMS_BY_FORMALITY[tier],
    confidence:        'low',
  }
}
