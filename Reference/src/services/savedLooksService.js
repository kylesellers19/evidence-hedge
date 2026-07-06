import supabase from '../lib/supabase'

// ─── Taste signals ────────────────────────────────────────────────────────────
// signal_type must be one of: heart | tryon | shop_click | skip
// Fires fire-and-forget — failures are logged but never thrown.

export async function insertTasteSignal(userId, signalType, weight, descriptors) {
  const { error } = await supabase
    .from('taste_signals')
    .insert({ user_id: userId, signal_type: signalType, weight, descriptors: descriptors ?? null })
  if (error) console.error('[taste_signals] insert failed:', error.message)
}

// ─── Saved looks ──────────────────────────────────────────────────────────────

export async function saveLook(userId, { occasion, imageUrl, descriptors, sourceBriefId }) {
  const { data, error } = await supabase
    .from('saved_looks')
    .insert({ user_id: userId, occasion, image_url: imageUrl, descriptors, source_brief_id: sourceBriefId })
    .select('id')
    .single()
  if (error) throw error
  insertTasteSignal(userId, 'heart', 3, descriptors)
  return data.id
}

export async function unsaveLook(lookId) {
  const { error } = await supabase.from('saved_looks').delete().eq('id', lookId)
  if (error) throw error
}

export async function fetchSavedLooks(userId) {
  const { data } = await supabase
    .from('saved_looks')
    .select('id, image_url, occasion, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data ?? []
}

// ─── Saved items ──────────────────────────────────────────────────────────────

export async function saveItem(userId, { productName, productUrl, retailer, imageUrl, descriptors, parentLookId }) {
  const { data, error } = await supabase
    .from('saved_items')
    .insert({
      user_id:        userId,
      product_name:   productName,
      product_url:    productUrl,
      retailer,
      image_url:      imageUrl,
      descriptors,
      parent_look_id: parentLookId ?? null,
    })
    .select('id')
    .single()
  if (error) throw error
  insertTasteSignal(userId, 'heart', 3, descriptors)
  return data.id
}

export async function unsaveItem(itemId) {
  const { error } = await supabase.from('saved_items').delete().eq('id', itemId)
  if (error) throw error
}

export async function fetchSavedItems(userId) {
  const { data } = await supabase
    .from('saved_items')
    .select('id, product_name, product_url, retailer, image_url, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data ?? []
}
