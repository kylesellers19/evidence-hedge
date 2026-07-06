import { MockPlugin } from './sources/MockPlugin'
import { UnsplashPlugin } from './sources/UnsplashPlugin'
import { InstagramPlugin } from './sources/InstagramPlugin'
import { TikTokPlugin } from './sources/TikTokPlugin'
import { PinterestPlugin } from './sources/PinterestPlugin'

/**
 * Plugin registry — all registered inspiration sources.
 * Add new plugins here after implementing them.
 */
const ALL_PLUGINS = [
  new MockPlugin(),
  new UnsplashPlugin(),
  new InstagramPlugin(),
  new TikTokPlugin(),
  new PinterestPlugin(),
]

/** Returns only configured/enabled plugins */
export function getEnabledPlugins() {
  return ALL_PLUGINS.filter(p => p.isConfigured())
}

/** Returns all plugins (for display in settings UI) */
export function getAllPlugins() {
  return ALL_PLUGINS
}

/** Returns a plugin by name */
export function getPlugin(name) {
  return ALL_PLUGINS.find(p => p.name === name)
}
