import { BasePlugin } from '../base/BasePlugin'
import { callStyleProxy } from '../../services/styleIntelligenceService'

// Photos are fetched server-side by the style-proxy Edge Function.
// This plugin retrieves the pre-filtered, pre-shaped results and wraps
// them with BasePlugin.formatItem to add source/saved metadata.
export class UnsplashPlugin extends BasePlugin {
  constructor() {
    super({})
    this.name        = 'unsplash'
    this.displayName = 'Unsplash'
    this.icon        = '◈'
    this.enabled     = true  // key lives server-side; always enabled
  }

  isConfigured() {
    return true
  }

  async fetchInspiration(occasion) {
    try {
      const { inspirationPhotos } = await callStyleProxy(occasion)
      return (inspirationPhotos ?? []).map(p => this.formatItem(p))
    } catch {
      return []
    }
  }
}
