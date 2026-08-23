import { supabase } from './supabase'

const STORAGE_BUCKET = 'products-images'

export async function fetchActiveHeroSlides() {
  const { data, error } = await supabase.from('hero_slides').select('*').eq('is_active', true).order('sort_order', { ascending: true })
  if (error) throw error
  return (data || []).map(mapHeroSlide)
}

export async function fetchAllHeroSlidesAdmin() {
  const { data, error } = await supabase.from('hero_slides').select('*').order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createHeroSlide(slide) {
  const { data, error } = await supabase.from('hero_slides').insert(slide).select().single()
  if (error) throw error
  return data
}

export async function updateHeroSlide(id, updates) {
  const { data, error } = await supabase.from('hero_slides').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteHeroSlide(id) {
  const { error } = await supabase.from('hero_slides').delete().eq('id', id)
  if (error) throw error
}

export async function uploadHeroSlideImage(file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `hero-slides/hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('Could not create a public image URL.')
  return data.publicUrl
}

export async function moveHeroSlide(id, direction) {
  const slides = await fetchAllHeroSlidesAdmin()
  const index = slides.findIndex((s) => s.id === id)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= slides.length) return slides
  const a = slides[index], b = slides[target]
  await Promise.all([
    updateHeroSlide(a.id, { sort_order: b.sort_order }),
    updateHeroSlide(b.id, { sort_order: a.sort_order }),
  ])
  return fetchAllHeroSlidesAdmin()
}

function mapHeroSlide(s) {
  return {
    id: s.id,
    type: s.type || 'dark',
    image: s.image_url,
    mobileImage: s.mobile_image_url || null,
    imageAlt: s.image_alt || 'Aura Blaze Creative',
    eyebrow: s.eyebrow || '',
    heading: s.heading || '',
    subtext: s.subtext || '',
    primaryCta: { to: s.primary_cta_to || '/shop', label: s.primary_cta_label || 'Shop Now' },
    secondaryCta: { to: s.secondary_cta_to || '/shop', label: s.secondary_cta_label || 'Explore' },
    cornerLabel: s.corner_label || '',
  }
}
