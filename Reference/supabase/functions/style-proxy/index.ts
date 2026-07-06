const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const AMAZON_TAG = 'betsy2002-20'

// ─── Fashion filter ────────────────────────────────────────────────────────────
// A photo must have at least one strong fashion anchor AND zero non-fashion signals.
// Zero fashion anchors → dropped unconditionally.
const FASHION_ANCHORS = [
  'fashion', 'outfit', 'clothing', 'style', 'model', 'wearing',
  'dress', 'suit', 'apparel', 'streetwear', 'person', 'woman', 'man',
]
const NON_FASHION_SIGNALS = [
  'car', 'vehicle', 'phone', 'headphones', 'laptop', 'coffee', 'book',
  'food', 'landscape', 'mountain', 'building', 'architecture', 'animal',
  'technology', 'computer', 'nature', 'sky', 'ocean', 'sea', 'forest',
  'tree', 'flower', 'plant', 'electronics', 'gadget', 'device', 'audio',
  'speaker', 'camera', 'product', 'still life', 'object',
]

// deno-lint-ignore no-explicit-any
function isFashionPhoto(photo: any): boolean {
  const tags = (photo.tags ?? []).map((t: any) => (t.title ?? '').toLowerCase())
  const text = [
    ...tags,
    (photo.description ?? '').toLowerCase(),
    (photo.alt_description ?? '').toLowerCase(),
  ].join(' ')
  const hasFashion    = FASHION_ANCHORS.some(a => text.includes(a))
  const hasNonFashion = NON_FASHION_SIGNALS.some(s => text.includes(s))
  return hasFashion && !hasNonFashion
}

// deno-lint-ignore no-explicit-any
function shapePhoto(photo: any): Record<string, unknown> {
  return {
    id:              photo.id,
    imageUrl:        photo.urls.regular,
    thumbnailUrl:    photo.urls.small,
    title:           photo.description || photo.alt_description || 'Outfit inspiration',
    credit:          photo.user.name,
    photographerUrl: photo.user.links.html,
    sourceUrl:       photo.links.html,
    tags:            (photo.tags ?? []).map((t: any) => t.title),
    aspectRatio:     photo.width / photo.height,
  }
}

function titleCase(str: string): string {
  return str.replace(/\s+/g, ' ').trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ─── Gender helpers ───────────────────────────────────────────────────────────
function genderLabel(gender: string | null | undefined): string {
  if (gender === 'Women') return 'women'
  if (gender === 'Men') return 'men'
  if (gender === 'Gender Neutral') return 'gender neutral / androgynous'
  return ''
}

function genderPhotoPrefix(gender: string | null | undefined): string {
  if (gender === 'Women') return "women's outfit"
  if (gender === 'Men') return "men's outfit menswear"
  if (gender === 'Gender Neutral') return 'androgynous unisex outfit'
  return 'outfit'
}

function genderBackfillModel(gender: string | null | undefined): string {
  if (gender === 'Men') return 'man'
  if (gender === 'Gender Neutral') return 'person'
  return 'woman'
}

function amazonTermsExample(gender: string | null | undefined, occasionType: string | null | undefined): string {
  if (gender === 'Men') {
    const base = '"men\'s slim suit", "men\'s dress shirt", "leather oxford shoes", "men\'s tie"'
    if (occasionType === 'Wedding') return '"men\'s wedding suit", "men\'s dress shirt", "leather oxfords", "men\'s pocket square"'
    if (occasionType === 'Date Night' || occasionType === 'Dinner or Date') return '"men\'s blazer", "men\'s chino pants", "men\'s chelsea boots", "men\'s dress shirt"'
    return base
  }
  if (gender === 'Gender Neutral') {
    return '"unisex blazer", "wide leg trousers", "chelsea boots", "oversized shirt", "minimalist tote"'
  }
  if (occasionType === 'Wedding') return '"women\'s wedding guest dress", "strappy heels women", "evening clutch", "pearl jewelry"'
  if (occasionType === 'Date Night' || occasionType === 'Dinner or Date') return '"women\'s midi dress", "block heel sandals", "chain crossbody bag", "statement earrings"'
  if (occasionType === 'Night Out') return '"women\'s going out top", "mini skirt", "heeled boots women", "small shoulder bag"'
  return '"women\'s cocktail dress", "strappy heels", "evening clutch", "statement necklace"'
}

// ─── Foursquare ───────────────────────────────────────────────────────────────
async function fetchFoursquareData(
  venue: string,
  venueLocation: string | undefined,
  apiKey: string,
): Promise<{ tips: string[]; categories: string[] }> {
  const FSQ_BASE = 'https://places-api.foursquare.com'
  const headers = {
    'Authorization':        `Bearer ${apiKey}`,
    'X-Places-Api-Version': '2025-06-17',
    'Accept':               'application/json',
  }

  const params = new URLSearchParams({ query: venue, limit: '1' })
  if (venueLocation) params.set('near', venueLocation)

  const searchRes = await fetch(`${FSQ_BASE}/places/search?${params}`, { headers })
  if (!searchRes.ok) {
    console.error(`[style-proxy] Foursquare search ${searchRes.status}:`, await searchRes.text().catch(() => ''))
    return { tips: [], categories: [] }
  }

  // deno-lint-ignore no-explicit-any
  const searchData: any = await searchRes.json()
  const place = searchData.results?.[0]
  if (!place?.fsq_id) return { tips: [], categories: [] }

  // deno-lint-ignore no-explicit-any
  const categories = (place.categories ?? []).map((c: any) => c.name).filter(Boolean) as string[]

  const tipsRes = await fetch(
    `${FSQ_BASE}/places/${place.fsq_id}/tips?limit=10&sort=POPULAR`,
    { headers },
  )
  if (!tipsRes.ok) return { tips: [], categories }

  // deno-lint-ignore no-explicit-any
  const tipsData: any = await tipsRes.json()
  const tips = (Array.isArray(tipsData) ? tipsData : (tipsData.items ?? []))
    // deno-lint-ignore no-explicit-any
    .map((t: any) => t.text)
    .filter(Boolean) as string[]

  return { tips, categories }
}

// ─── Claude style descriptor ──────────────────────────────────────────────────
async function runClaudeStyleDescriptor(
  // deno-lint-ignore no-explicit-any
  occasion: any,
  fsqData: { tips: string[]; categories: string[] },
  apiKey: string,
  tasteProfile: string | null,
): Promise<Record<string, unknown>> {
  const {
    venue, venueLocation, venueTypes, isPrivateResidence,
    dressCode, timeOfDay, season,
    occasionType, gender,
    size,
  } = occasion ?? {}

  const lines: string[] = []

  if (isPrivateResidence) {
    lines.push(`Venue: Private residence${venueLocation ? ` in ${venueLocation}` : ''}`)
    lines.push('Note: Style inspiration should be occasion-focused, not tied to the specific address.')
  } else {
    lines.push(`Venue: ${venue}${venueLocation ? `, ${venueLocation}` : ''}`)
    if (venueTypes?.length) lines.push(`Google Places types: ${venueTypes.join(', ')}`)
    if (fsqData.categories.length > 0) lines.push(`Foursquare categories: ${fsqData.categories.join(', ')}`)
  }

  if (occasionType) lines.push(`Occasion type: ${occasionType}`)
  if (gender)       lines.push(`Styling for: ${genderLabel(gender)}`)
  if (size)         lines.push(`Size/fit preference: ${size}`)

  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' })
  lines.push(`Current month: ${currentMonth}`)

  if (fsqData.tips.length > 0) {
    lines.push('\nReal visitor observations (read these for actual social texture, not just formality):')
    fsqData.tips.slice(0, 8).forEach((tip: string) => lines.push(`• "${tip}"`))
  }

  const constraints = [
    occasionType ? `occasion: ${occasionType} (real event — styleBrief must acknowledge this explicitly)` : null,
    gender       ? `gender: ${genderLabel(gender)} (HARD CONSTRAINT — every recommendation must be for ${genderLabel(gender)})` : null,
    dressCode    ? `dress code: ${dressCode} (user-set — treat as hard constraint)` : null,
    timeOfDay    ? `time of day: ${timeOfDay} (user-set — treat as hard constraint)` : null,
    season && season !== 'All' ? `season: ${season} (user-set — treat as hard constraint)` : null,
    size         ? `size preference: ${size} — incorporate into amazonSearchTerms where helpful (e.g. "plus size cocktail dress", "big and tall men's blazer", "women's size 14 dress")` : null,
  ].filter(Boolean)

  if (constraints.length) lines.push(`\nConstraints: ${constraints.join('; ')}`)

  const genderBlock = gender
    ? `\n\nCRITICAL — GENDER: You are styling for ${genderLabel(gender)}. The styleBrief, aestheticKeywords, avoidList, and amazonSearchTerms must ALL be written specifically for ${genderLabel(gender)}. Do not mix gendered advice.`
    : ''

  const occasionBlock = occasionType
    ? `\n\nCRITICAL — OCCASION: This is specifically for a ${occasionType}. The styleBrief must name the event directly. The venue sets atmosphere, but the ${occasionType} sets the social stakes.`
    : ''

  const targetGender  = gender ? genderLabel(gender) : 'the user'
  const exampleTerms  = amazonTermsExample(gender, occasionType)

  const personalizationBlock = tasteProfile
    ? `\n\nPersonalization: Style this for someone who ${tasteProfile} Weight roughly 80% of the looks toward these preferences, but always include 1–2 looks that thoughtfully stretch beyond them for discovery.`
    : ''

  const prompt =
`You are a sharp personal stylist with deep cultural knowledge of venues, neighborhoods, and social scenes. Based on the signals below, give targeted style guidance.${genderBlock}${occasionBlock}

${lines.join('\n')}

Key instruction: When visitor tips mention specific details — pool tables, craft beer, natural wine, DJs, bottle service, enforced dress codes, "touristy", "neighborhood regulars" — use them to read the REAL social texture.${personalizationBlock}

Return ONLY valid JSON with exactly this shape:
{
  "inferredDressCode": "one of: Casual | Smart Casual | Business | Formal | Black Tie",
  "inferredTimeOfDay": "one of: Morning | Afternoon | Evening | Night",
  "inferredSeason": "one of: Spring | Summer | Fall | Winter",
  "styleBrief": "1-2 punchy sentences for ${targetGender} — no filler. Sentence 1: venue character + occasion in one sharp line (e.g. 'A rooftop wedding at The NoMad — cocktail-meets-black-tie with a creative edge.'). Optional sentence 2: one concrete directive — a silhouette, fabric, or statement piece. No generic advice.",
  "venueVibe": "one punchy phrase, e.g. 'grungy dive bar', 'old-money private club'",
  "vibeDescriptors": ["5-7 nuanced tags from the real signals"],
  "crowdType": "who goes there in 3-6 words",
  "aestheticKeywords": ["5-8 style words appropriate for ${targetGender} at this venue"],
  "colorPalette": ["3-5 specific color names"],
  "avoidList": ["3-4 things that would feel genuinely wrong here for ${targetGender}"],
  "unsplashQuery": "8-12 word search string for ${targetGender} fashion inspiration photos",
  "amazonSearchTerms": ["4-6 specific product search strings for ${targetGender}, each under 6 words — format like: ${exampleTerms}"],
  "relevantOccasionTypes": ["3-5 occasion types from this exact master list that genuinely fit this venue: Wedding, Cocktail Party, Dinner or Date, Business or Work, Casual Hangout, Night Out, Daytime Event, Formal Gala, Interview, Funeral or Memorial, Beach Party, Celebration. Rules: (1) min 2, max 5; (2) only include types that make real sense; (3) if ambiguous default to: ['Dinner or Date','Casual Hangout','Night Out','Celebration']"],
  "confidence": "high | medium | low"
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:       'claude-haiku-4-5-20251001',
      max_tokens:  900,
      temperature: 0.3,
      messages:    [{ role: 'user', content: prompt }],
    }),
  })

  console.log(`[style-proxy] Anthropic status: ${res.status}`)
  if (!res.ok) {
    // deno-lint-ignore no-explicit-any
    const body: any = await res.json().catch(() => ({}))
    throw new Error(`Anthropic ${res.status}: ${body.error?.message ?? 'unknown'}`)
  }

  // deno-lint-ignore no-explicit-any
  const data: any = await res.json()
  const text = (data.content?.[0]?.text ?? '') as string
  console.log(`[style-proxy] Anthropic content length: ${text.length} | stop_reason: ${data.stop_reason ?? 'n/a'}`)
  const jsonStr = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(jsonStr)
}

// ─── Unsplash helpers ─────────────────────────────────────────────────────────
async function unsplashRandom(query: string, count: number, key: string) {
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&count=${count}&orientation=portrait&client_id=${key}`
  try {
    const res = await fetch(url)
    console.log(`[style-proxy] Unsplash status: ${res.status} | query: "${query.substring(0, 70)}"`)
    if (!res.ok) {
      console.error(`[style-proxy] Unsplash error body: ${await res.text().catch(() => '(unreadable)')}`)
      return []
    }
    const data = await res.json()
    const arr = Array.isArray(data) ? data : []
    console.log(`[style-proxy] Unsplash returned ${arr.length} photos`)
    return arr
  } catch (err) {
    console.error(`[style-proxy] Unsplash fetch threw: ${err instanceof Error ? err.message : String(err)}`)
    return []
  }
}

async function fetchInspirationPhotos(
  // deno-lint-ignore no-explicit-any
  descriptor: any,
  unsplashKey: string,
  gender: string | null | undefined,
): Promise<Record<string, unknown>[]> {
  const prefix = genderPhotoPrefix(gender)
  const parts: string[] = [prefix]

  if (descriptor.venueVibe || descriptor.vibeDescriptors?.length) {
    if (descriptor.venueVibe) parts.push(descriptor.venueVibe as string)
    if (descriptor.vibeDescriptors?.length) {
      parts.push((descriptor.vibeDescriptors as string[]).slice(0, 3).join(' '))
    }
    if (descriptor.aestheticKeywords?.length) {
      parts.push((descriptor.aestheticKeywords as string[]).slice(0, 2).join(' '))
    }
  } else if (descriptor.unsplashQuery) {
    parts.push(descriptor.unsplashQuery as string)
  }
  parts.push('fashion style editorial')

  const query = parts.join(' ')
  // deno-lint-ignore no-explicit-any
  let raw: any[] = await unsplashRandom(query, 18, unsplashKey)
  let passed = raw.filter(isFashionPhoto)
  console.log(`[style-proxy] Inspiration filter — raw: ${raw.length} → passed: ${passed.length}`)

  if (passed.length < 6) {
    const aesthetic = ((descriptor.aestheticKeywords ?? []) as string[]).slice(0, 2).join(' ')
    const model     = genderBackfillModel(gender)
    const backfill  = `${aesthetic} ${model} wearing outfit street style fashion editorial portrait`.trim()
    // deno-lint-ignore no-explicit-any
    const extra: any[] = await unsplashRandom(backfill, 12, unsplashKey)
    const seen = new Set(passed.map((p: any) => p.id))
    // deno-lint-ignore no-explicit-any
    passed = [...passed, ...extra.filter((p: any) => isFashionPhoto(p) && !seen.has(p.id))]
    console.log(`[style-proxy] Inspiration after backfill: ${passed.length}`)
  }

  console.log(`[style-proxy] Inspiration final: ${Math.min(passed.length, 12)} photos`)
  return passed.slice(0, 12).map(shapePhoto)
}

async function fetchShoppableImages(
  // deno-lint-ignore no-explicit-any
  descriptor: any,
  unsplashKey: string,
  gender: string | null | undefined,
): Promise<Record<string, unknown>[]> {
  const terms = (descriptor.amazonSearchTerms ?? []) as string[]
  if (!terms.length) return []

  const prefix = genderPhotoPrefix(gender)

  const items = await Promise.all(terms.map(async (term) => {
    const query = `${prefix} ${term} fashion editorial`.trim()
    let imageUrl: string | null = null
    try {
      const url = `https://api.unsplash.com/photos/random?count=1&query=${encodeURIComponent(query)}&orientation=portrait&client_id=${unsplashKey}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        const photo = Array.isArray(data) ? data[0] : data
        imageUrl = photo?.urls?.small ?? null
      }
    } catch { /* non-fatal */ }

    return {
      label:      titleCase(term),
      query:      term,
      amazonLink: `https://www.amazon.com/s?k=${encodeURIComponent(term)}&tag=${AMAZON_TAG}`,
      imageUrl,
    }
  }))

  return items
}

// ─── Descriptor normalization ─────────────────────────────────────────────────
// Maps Claude's free-text output onto a closed-vocabulary descriptor object.
// All matching is case-insensitive. Unknown values snap to the closest enum.
// This step is purely deterministic — no extra API call.

type Aesthetic  = 'tailored' | 'minimal' | 'monochrome' | 'classic' | 'edgy' |
                  'romantic' | 'bohemian' | 'sporty' | 'preppy' | 'avant-garde' |
                  'streetwear' | 'elevated-casual'
type Formality  = 'casual' | 'smart-casual' | 'elevated' | 'formal' | 'black-tie'
type Silhouette = 'structured' | 'relaxed' | 'fitted' | 'flowing' | 'oversized'

interface NormalizedDescriptors {
  aesthetic:     Aesthetic[]
  formality:     Formality
  colors:        string[]
  silhouette:    Silhouette
  vibe_keywords: string[]
}

const AESTHETIC_MAP: [Aesthetic, string[]][] = [
  ['tailored',        ['tailored', 'sharp', 'crisp', 'polished', 'clean-lined', 'structured']],
  ['minimal',         ['minimal', 'minimalist', 'pared', 'spare', 'understated', 'clean', 'pared-back']],
  ['monochrome',      ['monochrome', 'tonal', 'all-black', 'monotone', 'greyscale', 'tonal dressing']],
  ['classic',         ['classic', 'timeless', 'traditional', 'conservative', 'elegant', 'refined', 'old-money']],
  ['edgy',            ['edgy', 'dark', 'gothic', 'punk', 'grunge', 'rebellious', 'moody', 'downtown dark']],
  ['romantic',        ['romantic', 'feminine', 'floral', 'soft', 'delicate', 'ethereal', 'dreamy', 'pretty']],
  ['bohemian',        ['bohemian', 'boho', 'earthy', 'free-spirited', 'artisan', 'eclectic', 'vintage', 'artsy']],
  ['sporty',          ['sporty', 'athletic', 'activewear', 'sport', 'gym', 'performance', 'technical']],
  ['preppy',          ['preppy', 'country club', 'collegiate', 'ivy league', 'nautical', 'clean-cut', 'establishment']],
  ['avant-garde',     ['avant-garde', 'conceptual', 'experimental', 'artistic', 'architectural', 'editorial', 'creative']],
  ['streetwear',      ['streetwear', 'street style', 'urban', 'hypebeast', 'downtown cool', 'casual cool', 'skate']],
  ['elevated-casual', ['elevated casual', 'smart casual', 'polished casual', 'effortless', 'relaxed chic', 'elevated everyday']],
]

const SILHOUETTE_MAP: [Silhouette, string[]][] = [
  ['structured', ['structured', 'tailored', 'sharp', 'blazer', 'architectural', 'sculpted', 'boxy']],
  ['fitted',     ['fitted', 'body-conscious', 'sleek', 'slim', 'form-fitting', 'close-cut', 'bodycon']],
  ['flowing',    ['flowing', 'draped', 'billowing', 'fluid', 'romantic', 'maxi', 'ethereal', 'feminine', 'airy']],
  ['oversized',  ['oversized', 'baggy', 'loose', 'oversize', 'volume', 'relaxed silhouette', 'slouchy']],
  ['relaxed',    ['relaxed', 'easy', 'comfortable', 'casual', 'breezy', 'laid-back', 'effortless', 'unconstrained']],
]

const COLOR_NORM: Record<string, string> = {
  'champagne': 'ivory', 'cream': 'ivory', 'off-white': 'ivory', 'ecru': 'ivory',
  'charcoal': 'grey', 'slate': 'grey', 'silver': 'grey', 'ash': 'grey',
  'cobalt': 'blue', 'sapphire': 'blue', 'cerulean': 'blue', 'powder blue': 'blue',
  'denim': 'blue', 'indigo': 'navy', 'midnight': 'navy',
  'burgundy': 'wine', 'bordeaux': 'wine', 'merlot': 'wine', 'oxblood': 'wine',
  'blush': 'pink', 'rose': 'pink', 'dusty rose': 'pink', 'ballet': 'pink',
  'cognac': 'camel', 'tan': 'camel', 'sand': 'camel', 'khaki': 'camel', 'biscuit': 'camel',
  'olive': 'green', 'forest': 'green', 'emerald': 'green', 'sage': 'green', 'hunter': 'green',
  'rust': 'orange', 'terracotta': 'orange', 'burnt orange': 'orange',
  'lavender': 'purple', 'lilac': 'purple', 'plum': 'purple', 'mauve': 'purple',
  'gold': 'camel', 'mustard': 'yellow', 'lemon': 'yellow',
}

// deno-lint-ignore no-explicit-any
function normalizeDescriptors(descriptor: any): NormalizedDescriptors {
  const tokens: string[] = [
    ...((descriptor.aestheticKeywords ?? []) as string[]),
    ...((descriptor.vibeDescriptors    ?? []) as string[]),
    (descriptor.venueVibe ?? '') as string,
  ].map(s => s.toLowerCase().trim()).filter(Boolean)

  const haystack = tokens.join(' ')

  // Aesthetic — collect all matching enum values; fall back to 'classic'
  const aesthetic: Aesthetic[] = []
  for (const [value, signals] of AESTHETIC_MAP) {
    if (signals.some(s => haystack.includes(s))) aesthetic.push(value)
  }
  if (aesthetic.length === 0) aesthetic.push('classic')

  // Formality — direct map from inferredDressCode
  const dressCode = ((descriptor.inferredDressCode ?? '') as string).toLowerCase()
  const formalityMap: Record<string, Formality> = {
    'casual':        'casual',
    'smart casual':  'smart-casual',
    'business':      'elevated',
    'formal':        'formal',
    'black tie':     'black-tie',
  }
  const formality: Formality = formalityMap[dressCode] ?? 'smart-casual'

  // Colors — normalize palette to simple names, dedupe, cap at 6
  const colors: string[] = ((descriptor.colorPalette ?? []) as string[])
    .map((c: string) => {
      const lower = c.toLowerCase().trim()
      return COLOR_NORM[lower] ?? lower
    })
    .filter((c: string, i: number, arr: string[]) => c && arr.indexOf(c) === i)
    .slice(0, 6)

  // Silhouette — first map entry whose signals appear in haystack wins
  let silhouette: Silhouette = 'relaxed'
  for (const [value, signals] of SILHOUETTE_MAP) {
    if (signals.some(s => haystack.includes(s))) { silhouette = value; break }
  }

  // Vibe keywords — top 4 from vibeDescriptors, lowercased and trimmed
  const vibe_keywords: string[] = ((descriptor.vibeDescriptors ?? []) as string[])
    .map((v: string) => v.toLowerCase().trim())
    .filter(Boolean)
    .slice(0, 4)

  return { aesthetic, formality, colors, silhouette, vibe_keywords }
}

// ─── Taste profile ────────────────────────────────────────────────────────────
// Per-signal-type weights used ONLY for profile scoring (separate from DB-stored weights).
// Threshold = 9 positive-weight points, e.g. 9 hearts or 2 shop-clicks.
const TASTE_TYPE_WEIGHTS: Record<string, number> = {
  heart: 1, tryon: 3, shop_click: 5, skip: -1,
}

async function buildTasteProfile(
  userId: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<string | null> {
  let signals: Array<{ signal_type: string; descriptors: Record<string, unknown> | null }>
  try {
    const url = `${supabaseUrl}/rest/v1/taste_signals?select=signal_type,descriptors&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=200`
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey },
    })
    if (!res.ok) {
      console.error(`[style-proxy] Taste signals fetch ${res.status}:`, await res.text().catch(() => ''))
      return null
    }
    signals = await res.json()
  } catch (err) {
    console.error(`[style-proxy] Taste signals fetch threw: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }

  // Threshold — only positive-weight signals count toward the minimum
  const positiveSum = signals.reduce((acc, s) => {
    const w = TASTE_TYPE_WEIGHTS[s.signal_type] ?? 0
    return acc + Math.max(0, w)
  }, 0)

  if (positiveSum < 9) return null

  // Tally frequencies, split by positive vs skip signals
  const aestheticPos: Record<string, number>  = {}
  const aestheticSkip: Record<string, number> = {}
  const colorPos: Record<string, number>      = {}
  const formalityPos: Record<string, number>  = {}
  const vibeSkip: Record<string, number>      = {}

  for (const signal of signals) {
    const w = TASTE_TYPE_WEIGHTS[signal.signal_type] ?? 0
    if (w === 0 || !signal.descriptors) continue

    const d = signal.descriptors as {
      aesthetic?: string[]; colors?: string[];
      formality?: string;   vibe_keywords?: string[]
    }
    const isSkip = w < 0
    const absW   = Math.abs(w)

    for (const a of (d.aesthetic ?? [])) {
      if (isSkip) aestheticSkip[a] = (aestheticSkip[a] ?? 0) + absW
      else        aestheticPos[a]  = (aestheticPos[a]  ?? 0) + w
    }
    for (const c of (d.colors ?? [])) {
      if (!isSkip) colorPos[c] = (colorPos[c] ?? 0) + w
    }
    if (d.formality && !isSkip) {
      formalityPos[d.formality] = (formalityPos[d.formality] ?? 0) + w
    }
    for (const v of (d.vibe_keywords ?? [])) {
      if (isSkip) vibeSkip[v] = (vibeSkip[v] ?? 0) + absW
    }
  }

  const top = <T extends string>(obj: Record<T, number>, n: number): T[] =>
    (Object.entries(obj) as [T, number][]).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k)

  const topAesthetics = top(aestheticPos, 3)
  const topFormality  = top(formalityPos, 1)[0] ?? null
  const topColors     = top(colorPos, 4)
  const skipParts     = [
    ...top(aestheticSkip, 2),
    ...top(vibeSkip, 2),
  ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 3)

  const towardParts: string[] = [
    ...topAesthetics,
    topFormality ? `${topFormality} formality` : null,
    topColors.length ? `palette (${topColors.join(', ')})` : null,
  ].filter(Boolean) as string[]

  if (towardParts.length === 0) return null

  const parts = [`Tends toward: ${towardParts.join(', ')}.`]
  if (skipParts.length > 0) parts.push(`Tends to skip: ${skipParts.join(', ')}.`)

  return parts.join(' ')
}

// ─── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }

  try {
    const { occasion, userId } = await req.json()

    const anthropicKey  = Deno.env.get('ANTHROPIC_API_KEY')        ?? ''
    const foursquareKey = Deno.env.get('FOURSQUARE_API_KEY')       ?? ''
    const unsplashKey   = Deno.env.get('UNSPLASH_ACCESS_KEY')      ?? ''
    const supabaseUrl   = Deno.env.get('SUPABASE_URL')             ?? ''
    const serviceKey    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    console.log(`[style-proxy] Keys present — Anthropic: ${!!anthropicKey} | Foursquare: ${!!foursquareKey} | Unsplash: ${!!unsplashKey}`)
    console.log(`[style-proxy] Request — venue: "${occasion?.venue ?? '(none)'}" | gender: ${occasion?.gender ?? 'unset'} | occasionType: ${occasion?.occasionType ?? 'unset'} | userId: ${userId ? '[set]' : 'anonymous'}`)

    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY secret is not set on this function')

    const gender       = occasion?.gender       ?? null
    const occasionType = occasion?.occasionType ?? null

    // Step 0: Taste profile — null if anonymous or below threshold
    let tasteProfile: string | null = null
    if (userId && supabaseUrl && serviceKey) {
      tasteProfile = await buildTasteProfile(userId, supabaseUrl, serviceKey)
    }
    console.log(tasteProfile
      ? `[style-proxy] Taste profile applied: ${tasteProfile}`
      : `[style-proxy] Taste profile: none (${userId ? 'below threshold' : 'anonymous user'})`,
    )

    // Step 1: Foursquare venue intelligence
    const fsqData = (!occasion?.isPrivateResidence && occasion?.venue && foursquareKey)
      ? await fetchFoursquareData(occasion.venue, occasion.venueLocation, foursquareKey)
      : { tips: [] as string[], categories: [] as string[] }

    console.log(`[style-proxy] Foursquare — categories: ${fsqData.categories.length} | tips: ${fsqData.tips.length}`)

    // Step 2: Claude style descriptor (taste profile injected when available)
    const styleDescriptor = await runClaudeStyleDescriptor(occasion, fsqData, anthropicKey, tasteProfile)
    console.log(`[style-proxy] Style descriptor OK — confidence: ${(styleDescriptor as Record<string,unknown>).confidence ?? 'n/a'}`)

    // Step 2b: Normalize descriptor onto closed vocabulary (no extra API call)
    const normalizedDescriptors = normalizeDescriptors(styleDescriptor)
    console.log(`[style-proxy] Normalized descriptors: ${JSON.stringify(normalizedDescriptors)}`)

    // Step 3: Unsplash — inspiration + products
    const [inspirationPhotos, shoppableImages] = unsplashKey
      ? await Promise.all([
          fetchInspirationPhotos(styleDescriptor, unsplashKey, gender),
          fetchShoppableImages(styleDescriptor, unsplashKey, gender),
        ])
      : [[], []]

    console.log(`[style-proxy] Complete — inspirationPhotos: ${inspirationPhotos.length} | shoppableImages: ${shoppableImages.length}`)

    return new Response(
      JSON.stringify({ styleDescriptor, normalizedDescriptors, inspirationPhotos, shoppableImages }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[style-proxy] Fatal error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})
