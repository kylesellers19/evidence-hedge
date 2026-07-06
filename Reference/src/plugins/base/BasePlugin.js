/**
 * BasePlugin — abstract base class for all inspiration source plugins.
 *
 * To add a new source (e.g. Instagram, TikTok, Pinterest):
 *   1. Create a file in src/plugins/sources/YourPlugin.js
 *   2. Extend BasePlugin and implement fetchInspiration()
 *   3. Register your plugin in src/plugins/index.js
 */
export class BasePlugin {
  constructor(config = {}) {
    this.name = 'base'
    this.displayName = 'Base'
    this.icon = null
    this.enabled = false
    this.config = config
  }

  /**
   * Fetch outfit inspiration for a given occasion.
   * @param {Object} occasion - The occasion object from AppContext
   * @returns {Promise<InspirationItem[]>}
   */
  async fetchInspiration(occasion) {
    throw new Error(`${this.name} plugin must implement fetchInspiration()`)
  }

  /**
   * Normalize raw data into a standard InspirationItem shape.
   * @returns {InspirationItem}
   */
  formatItem(raw) {
    return {
      id: raw.id || crypto.randomUUID(),
      imageUrl: raw.imageUrl || raw.image_url || raw.url,
      thumbnailUrl: raw.thumbnailUrl || raw.imageUrl,
      title: raw.title || raw.description || '',
      caption: raw.caption || '',
      source: this.name,
      sourceDisplayName: this.displayName,
      sourceUrl: raw.sourceUrl || raw.link || '',
      credit: raw.credit || raw.author || raw.photographer || '',
      tags: raw.tags || [],
      saved: false,
      aspectRatio: raw.aspectRatio || raw.aspect_ratio || 0.75,
    }
  }

  isConfigured() {
    return this.enabled
  }
}
