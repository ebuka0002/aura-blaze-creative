import { supabase } from './supabase'

const STORAGE_BUCKET = 'products-images'

export async function fetchActiveHomepageGallery() {
  const { data, error } = await supabase
    .from('homepage_gallery')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function fetchHomepageGalleryAdmin() {
  const { data, error } = await supabase
    .from('homepage_gallery')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function uploadHomepageGalleryImage(file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `homepage-gallery/gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (error) throw error

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path)

  if (!data?.publicUrl) throw new Error('Could not create a public image URL.')
  return data.publicUrl
}

export async function createHomepageGalleryItem(item) {
  const { data, error } = await supabase
    .from('homepage_gallery')
    .insert(item)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateHomepageGalleryItem(id, updates) {
  const { data, error } = await supabase
    .from('homepage_gallery')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteHomepageGalleryItem(id) {
  const { error } = await supabase
    .from('homepage_gallery')
    .delete()
    .eq('id', id)

  if (error) throw error
}
