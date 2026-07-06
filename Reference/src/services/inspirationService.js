import { getEnabledPlugins } from '../plugins/index'

/**
 * Fetches inspiration from all enabled plugins and merges results.
 * Results are interleaved by source for variety.
 */
export async function fetchInspiration(occasion) {
  const plugins = getEnabledPlugins()
  if (plugins.length === 0) return []

  const results = await Promise.allSettled(
    plugins.map(plugin => plugin.fetchInspiration(occasion))
  )

  // Interleave results from each plugin
  const byPlugin = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)

  const merged = []
  const maxLen = Math.max(...byPlugin.map(arr => arr.length))
  for (let i = 0; i < maxLen; i++) {
    byPlugin.forEach(arr => {
      if (arr[i]) merged.push(arr[i])
    })
  }

  return merged
}
