import { supabase } from './supabase'

const STORAGE_BUCKET = 'products-images'

export async function fetchActiveDailyDrips() {
  const { data, error } = await supabase
    .from('daily_drips')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function fetchDailyDripsAdmin() {
  const { data, error } = await supabase
    .from('daily_drips')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function uploadDailyDripImage(file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `daily-drips/drip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

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

export async function createDailyDrip(item) {
  const { data, error } = await supabase
    .from('daily_drips')
    .insert(item)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteDailyDrip(id) {
  const { error } = await supabase
    .from('daily_drips')
    .delete()
    .eq('id', id)

  if (error) throw error
}
