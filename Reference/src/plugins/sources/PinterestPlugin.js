import { BasePlugin } from '../base/BasePlugin'

/**
 * PinterestPlugin — stub for future Pinterest API integration.
 *
 * Setup steps (when ready to implement):
 *   1. Create a Pinterest developer app at developers.pinterest.com
 *   2. Request the boards:read and pins:read scopes
 *   3. Implement OAuth 2.0 flow
 *   4. Use GET /v5/search/pins/?query={query} to search outfit pins
 *   5. Extract media.images from pin objects
 *
 * Pinterest's v5 API supports board and pin search with media image extraction.
 */
export class PinterestPlugin extends BasePlugin {
  constructor() {
    super({ accessToken: import.meta.env.VITE_PINTEREST_ACCESS_TOKEN })
    this.name = 'pinterest'
    this.displayName = 'Pinterest'
    this.icon = '◎'
    this.enabled = false
  }

  isConfigured() {
    return !!this.config.accessToken
  }

  async fetchInspiration(occasion) {
    if (!this.isConfigured()) return []
    // TODO: Implement Pinterest v5 API
    // GET https://api.pinterest.com/v5/search/pins/?query={query}&page_size=24
    throw new Error('PinterestPlugin: not yet implemented — see file comments for setup steps')
  }
}
