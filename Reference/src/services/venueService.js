// Venue autocomplete — Google Maps Places API (v1) primary, curated fallback.
//
// Setup: add VITE_GOOGLE_MAPS_API_KEY to your .env
//   1. Go to console.cloud.google.com → APIs & Services → Credentials
//   2. Create an API key, enable "Places API (New)"
//   3. Restrict the key to your domain under "HTTP referrers"

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// ─── Private Residence Detection ──────────────────────────────────────────────

const RESIDENCE_TEXT_PATTERNS = [
  /^\d+\s+[a-zA-Z]/,                                // "123 Oak Street"
  /\b(apt|apartment|unit|suite|ste|#\d)\b/i,        // has unit/apt
  /\bmy\s+(home|house|place|apartment|condo|flat)\b/i,
  /\b(private\s+residence|private\s+home)\b/i,
]

/** Detects if typed text looks like a home address (no API needed) */
export function detectResidenceFromText(input) {
  if (!input) return false
  return RESIDENCE_TEXT_PATTERNS.some(p => p.test(input.trim()))
}

/** Detects if a Google Places prediction is a residential address */
function isResidenceFromPrediction(prediction) {
  const types = prediction.types || []
  // Definite venue types → not a residence
  if (types.some(t => ['establishment', 'point_of_interest', 'lodging', 'food'].includes(t))) {
    return false
  }
  // Street-level address types without a venue type → residence
  if (types.some(t => ['street_address', 'subpremise', 'premise'].includes(t))) {
    return true
  }
  // Fallback: detect from displayed text
  const text = prediction.text?.text || ''
  return detectResidenceFromText(text)
}

// ─── Google Maps Places API (v1) ──────────────────────────────────────────────

async function searchGooglePlaces(query) {
  const endpoint = 'https://places.googleapis.com/v1/places:autocomplete'
  console.log(
    '[venueService] Attempting Google Places call.',
    '\nURL:', endpoint,
    '\nKey present:', !!GOOGLE_KEY,
    '\nQuery:', query,
  )

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY,
    },
    body: JSON.stringify({
      input: query,
      languageCode: 'en',
    }),
  })

  // Always parse the body — Google often returns HTTP 200 with an error object
  // (e.g. REQUEST_DENIED, API_KEY_INVALID) instead of a non-2xx status.
  const data = await res.json()

  if (!res.ok || data.error) {
    const status  = res.status
    const code    = data.error?.status  || 'UNKNOWN'
    const message = data.error?.message || `HTTP ${status}`
    console.error(
      `[venueService] Google Places API error — HTTP ${status} | ${code}: ${message}`,
      '\nFull response body:', data,
    )
    throw new Error(`Google Places ${code}: ${message}`)
  }

  return (data.suggestions || []).slice(0, 5).map(s => {
    const pred = s.placePrediction
    const name = pred.structuredFormat?.mainText?.text
      || pred.text?.text
      || ''
    const location = pred.structuredFormat?.secondaryText?.text || ''
    const types = pred.types || []
    const isResidence = isResidenceFromPrediction(pred)
    return { name, location, types, isResidence }
  })
}

// ─── Curated fallback venue list ───────────────────────────────────────────────
const POPULAR_VENUES = [
  { name: 'The Pierre Hotel', location: 'New York, NY' },
  { name: 'The Plaza Hotel', location: 'New York, NY' },
  { name: 'Cipriani Downtown', location: 'New York, NY' },
  { name: 'The Rainbow Room', location: 'New York, NY' },
  { name: 'Tavern on the Green', location: 'New York, NY' },
  { name: 'Gotham Hall', location: 'New York, NY' },
  { name: 'The Metropolitan Museum of Art', location: 'New York, NY' },
  { name: 'The Bowery Hotel', location: 'New York, NY' },
  { name: 'The Standard, High Line', location: 'New York, NY' },
  { name: 'Casa Cipriani', location: 'New York, NY' },
  { name: 'Aman New York', location: 'New York, NY' },
  { name: 'Zero Bond', location: 'New York, NY' },
  { name: 'Le Bernardin', location: 'New York, NY' },
  { name: 'Per Se', location: 'New York, NY' },
  { name: 'Daniel', location: 'New York, NY' },
  { name: 'Chateau Marmont', location: 'Los Angeles, CA' },
  { name: 'The Beverly Hills Hotel', location: 'Beverly Hills, CA' },
  { name: 'Nobu Malibu', location: 'Malibu, CA' },
  { name: 'Hotel Bel-Air', location: 'Los Angeles, CA' },
  { name: 'Soho House West Hollywood', location: 'West Hollywood, CA' },
  { name: 'Sunset Tower Hotel', location: 'West Hollywood, CA' },
  { name: 'Fontainebleau Miami Beach', location: 'Miami, FL' },
  { name: 'The Surf Club Restaurant', location: 'Miami, FL' },
  { name: 'The Setai Miami Beach', location: 'Miami, FL' },
  { name: 'Four Seasons Hotel', location: 'Multiple locations' },
  { name: 'The Ritz-Carlton', location: 'Multiple locations' },
  { name: 'Mandarin Oriental', location: 'Multiple locations' },
  { name: 'Soho House', location: 'Multiple locations' },
  { name: 'Rosewood Hotels', location: 'Multiple locations' },
  { name: 'Claridge\'s', location: 'London, UK' },
  { name: 'The Savoy', location: 'London, UK' },
  { name: 'Annabel\'s', location: 'London, UK' },
  { name: 'Sketch', location: 'London, UK' },
  { name: 'The Connaught', location: 'London, UK' },
  { name: 'Le George V', location: 'Paris, France' },
  { name: 'Hôtel de Crillon', location: 'Paris, France' },
  { name: 'Hotel du Cap-Eden-Roc', location: 'Antibes, France' },
  { name: 'Villa d\'Este', location: 'Lake Como, Italy' },
  { name: 'Venice Cipriani', location: 'Venice, Italy' },
  { name: 'Baur au Lac', location: 'Zurich, Switzerland' },
]

// ─── Venue Formality Inference ─────────────────────────────────────────────────

const LUXURY_NAMES = [
  'ritz', 'four seasons', 'mandarin oriental', 'claridge', 'savoy', 'connaught',
  'dorchester', 'bvlgari', 'aman ', 'belmond', 'rosewood', 'peninsula', 'bel-air',
  'cipriani', 'zero bond', 'annabel', 'soho house', 'castle',
]
const FINE_DINING_NAMES = [
  'per se', 'le bernardin', 'daniel', 'nobu', 'balthazar', 'zuma', 'coya',
  'sexy fish', 'eleven madison', 'the french laundry', 'alinea', 'masa',
]

/**
 * Infers a dress code suggestion from a venue object { name, types }.
 * Returns one of: 'Black Tie' | 'Cocktail' | 'Business' | 'Smart Casual' | 'Casual' | null
 */
export function inferVenueFormality(venue) {
  if (!venue) return null
  const types = venue.types || []
  const name = (venue.name || '').toLowerCase()

  if (LUXURY_NAMES.some(k => name.includes(k))) return 'Cocktail'
  if (FINE_DINING_NAMES.some(k => name.includes(k))) return 'Business'

  if (types.some(t => ['wedding_venue', 'banquet_hall', 'event_venue'].includes(t))) return 'Cocktail'
  if (types.includes('night_club') || name.includes('lounge') || name.includes('speakeasy')) return 'Cocktail'
  if (types.some(t => ['lodging'].includes(t)) || name.includes('hotel') || name.includes('resort')) return 'Smart Casual'
  if (types.includes('restaurant')) return 'Smart Casual'
  if (types.includes('bar')) return 'Casual'
  if (types.some(t => ['museum', 'art_gallery'].includes(t))) return 'Smart Casual'
  if (types.some(t => ['park', 'golf_course', 'stadium'].includes(t))) return 'Casual'
  if (types.includes('place_of_worship')) return 'Smart Casual'

  return null
}

// ─── Main Export ───────────────────────────────────────────────────────────────

/**
 * Search venues. Returns { name, location, types, isResidence }[].
 * isResidence=true → inspiration should be occasion-focused, not venue-specific.
 */
export async function searchVenues(query) {
  if (!query || query.length < 2) return []

  // Always log key presence — this fires even when the key is missing,
  // so a silent fallback is immediately visible in the console.
  console.log(
    '[venueService] searchVenues called.',
    'GOOGLE_KEY present:', !!GOOGLE_KEY,
    GOOGLE_KEY ? `| prefix: ${GOOGLE_KEY.slice(0, 8)}…` : '| key is empty/undefined — skipping Google call',
  )

  if (GOOGLE_KEY) {
    try {
      const results = await searchGooglePlaces(query)
      console.log('[venueService] Google Places results:', results)
      return results
    } catch (err) {
      console.error(
        '[venueService] Google Places call threw — falling back to curated list.',
        '\nError:', err.message,
        '\nKey prefix:', GOOGLE_KEY?.slice(0, 8),
      )
    }
  }

  // Fallback: filter the curated list
  const q = query.toLowerCase()
  const fallbackResults = POPULAR_VENUES
    .filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.location.toLowerCase().includes(q)
    )
    .slice(0, 5)
    .map(v => ({ ...v, types: [], isResidence: false }))

  // Detect residence even without API
  if (fallbackResults.length === 0 && detectResidenceFromText(query)) {
    return [{ name: query, location: 'Private residence', types: [], isResidence: true }]
  }

  console.log('[venueService] Curated fallback results:', fallbackResults)
  return fallbackResults
}
