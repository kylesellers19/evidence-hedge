import { BasePlugin } from '../base/BasePlugin'

/**
 * InstagramPlugin — stub for future Instagram Basic Display API integration.
 *
 * Setup steps (when ready to implement):
 *   1. Register a Facebook Developer App at developers.facebook.com
 *   2. Add the Instagram Basic Display product
 *   3. Set VITE_INSTAGRAM_CLIENT_ID and handle OAuth in your backend
 *   4. Use the /me/media endpoint to fetch user media
 *   5. For hashtag search use Instagram Graph API (requires Business account)
 *
 * Note: Instagram's public hashtag API requires a Facebook Business account
 * and is subject to rate limits and approval requirements.
 */
export class InstagramPlugin extends BasePlugin {
  constructor() {
    super({ clientId: import.meta.env.VITE_INSTAGRAM_CLIENT_ID })
    this.name = 'instagram'
    this.displayName = 'Instagram'
    this.icon = '◉'
    this.enabled = false // Enable once API access is configured
  }

  isConfigured() {
    return !!this.config.clientId
  }

  async fetchInspiration(occasion) {
    if (!this.isConfigured()) return []
    // TODO: Implement Instagram Graph API hashtag search
    // Endpoint: GET /ig-hashtag-search?q={hashtag}&user_id={userId}
    // Then: GET /{hashtag-id}/top_media?fields=id,media_url,permalink,caption
    throw new Error('InstagramPlugin: not yet implemented — see file comments for setup steps')
  }
}
