import { BasePlugin } from '../base/BasePlugin'

/**
 * TikTokPlugin — stub for future TikTok Display API integration.
 *
 * Setup steps (when ready to implement):
 *   1. Apply for TikTok for Developers at developers.tiktok.com
 *   2. Create an app and request the Video List scope
 *   3. Implement OAuth 2.0 flow in your backend
 *   4. Use POST /v2/video/list/ to fetch video metadata
 *   5. Extract thumbnail URLs from video objects
 *
 * Note: TikTok's API requires server-side OAuth; do not expose secrets client-side.
 */
export class TikTokPlugin extends BasePlugin {
  constructor() {
    super({ clientKey: import.meta.env.VITE_TIKTOK_CLIENT_KEY })
    this.name = 'tiktok'
    this.displayName = 'TikTok'
    this.icon = '◈'
    this.enabled = false
  }

  isConfigured() {
    return !!this.config.clientKey
  }

  async fetchInspiration(occasion) {
    if (!this.isConfigured()) return []
    // TODO: Implement TikTok Display API integration
    throw new Error('TikTokPlugin: not yet implemented — see file comments for setup steps')
  }
}
