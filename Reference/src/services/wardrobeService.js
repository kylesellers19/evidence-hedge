import supabase from '../lib/supabase'

const BUCKET = 'wardrobe'
const TABLE  = 'wardrobe_items'

// ─── Shape normalization ──────────────────────────────────────────────────────
// Maps DB snake_case columns → app camelCase fields.
// The DB stores seasons as a comma-delimited text string so a single `season`
// column covers multi-season items without needing a text[] column.

function normalizeRow(row) {
  return {
    id:          row.id,
    imageUrl:    row.image_url,
    storagePath: row.storage_path,
    name:        row.name,
    category:    row.category,
    formality:   row.formality,
    seasons:     row.season ? row.season.split(',') : [],
    tags:        row.tags ?? [],
    addedAt:     row.created_at,
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────
// RLS automatically filters rows to the authenticated user — no explicit
// user_id filter needed here.

export async function loadWardrobe() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load wardrobe: ${error.message}`)
  return data.map(normalizeRow)
}

// ─── Create ──────────────────────────────────────────────────────────────────
// file:     File object from <input> or drag-and-drop
// metadata: { name, category, formality, seasons: string[], tags: string[] }
// Returns:  normalized WardrobeItem matching the inserted row

export async function addWardrobeItem(file, metadata) {
  // Resolve the current user — needed for the storage path prefix and the
  // user_id column. Using getUser() validates the JWT server-side.
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('You must be signed in to add items.')

  // Prefix with user id so each user's files are isolated in storage
  const filename = `${user.id}/${Date.now()}-${file.name}`

  // 1. Upload image to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file, { cacheControl: '3600', upsert: false })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filename)

  // 2. Insert metadata row with user_id for RLS
  const { data, error: insertError } = await supabase
    .from(TABLE)
    .insert({
      user_id:      user.id,
      name:         metadata.name || metadata.category,
      category:     metadata.category,
      formality:    metadata.formality,
      season:       metadata.seasons.join(','),
      tags:         metadata.tags,
      image_url:    publicUrl,
      storage_path: filename,
    })
    .select()
    .single()

  if (insertError) {
    // Roll back the uploaded file so storage doesn't accumulate orphans
    await supabase.storage.from(BUCKET).remove([filename])
    throw new Error(`Database insert failed: ${insertError.message}`)
  }

  return normalizeRow(data)
}

// ─── Delete ──────────────────────────────────────────────────────────────────
// Deletes the DB row first (returning storage_path), then deletes the file.
// Storage errors are non-fatal so a network blip never leaves orphaned rows.

export async function removeWardrobeItem(id) {
  const { data, error: dbError } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)
    .select('storage_path')
    .single()

  if (dbError) throw new Error(`Delete failed: ${dbError.message}`)

  if (data?.storage_path) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([data.storage_path])

    if (storageError) {
      console.warn('[wardrobeService] Storage file delete failed (row already removed):', storageError.message)
    }
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────
// updates: any subset of app-side fields. Only whitelisted columns are sent.

export async function updateWardrobeItem(id, updates) {
  const dbUpdates = {}
  if (updates.name      !== undefined) dbUpdates.name      = updates.name
  if (updates.category  !== undefined) dbUpdates.category  = updates.category
  if (updates.formality !== undefined) dbUpdates.formality = updates.formality
  if (updates.seasons   !== undefined) dbUpdates.season    = updates.seasons.join(',')
  if (updates.tags      !== undefined) dbUpdates.tags      = updates.tags

  const { data, error } = await supabase
    .from(TABLE)
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Update failed: ${error.message}`)
  return normalizeRow(data)
}
