import { callStyleProxy } from './styleIntelligenceService'

const AMAZON_TAG = 'betsy2002-20'

export function buildAmazonLink(query) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_TAG}`
}

// Shoppable items (label + Amazon link + product image) are built server-side
// by the style-proxy Edge Function. This function retrieves them from the
// cached proxy response — no separate Unsplash or Claude call needed.
export async function getShoppableItems(occasion) {
  if (!occasion) return []
  try {
    const { shoppableImages } = await callStyleProxy(occasion)
    return shoppableImages ?? []
  } catch {
    return []
  }
}
