import { supabase } from './supabase'

const STORAGE_BUCKET = 'products-images'

// Uploads a single image file to Supabase Storage under a folder named
// after the product's slug, and returns its public URL.
export async function uploadProductImage(productSlug, file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const path = `${productSlug}/${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// Fetches ALL products for the admin view, including inactive ones —
// relies on the "Admins can view all products" RLS policy, which only
// works when the logged-in user's customer_profiles.is_admin is true.
export async function fetchAllProductsAdmin() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function fetchProductVariantsAdmin(productId) {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .order('color_name')
    .order('size')

  if (error) throw error
  return data
}

export async function fetchProductImagesAdmin(productId) {
  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order')

  if (error) throw error
  return data
}

export async function deleteProductImage(imageId) {
  const { error } = await supabase.from('product_images').delete().eq('id', imageId)
  if (error) throw error
}

// Updates a product's core fields (name, description, price, active status, etc).
// Permanently deletes a product and everything tied to it: its database
// rows (variants, images — via cascade) AND the actual image files in
// Storage (deleting only the database rows would leave orphaned files
// silently taking up storage space). Past orders are unaffected —
// order_items snapshots product name/price/image at purchase time and has
// product_id set to null on delete (see schema), so order history stays
// intact even after the product itself is gone.
export async function deleteProduct(productId, productSlug) {
  // Remove image files from Storage first. Best-effort: if this fails
  // (e.g. bucket permission hiccup), we still proceed to delete the
  // database record rather than leave a product stuck undeletable because
  // of a storage-side issue.
  try {
    const { data: files } = await supabase.storage.from(STORAGE_BUCKET).list(productSlug)
    if (files?.length) {
      const paths = files.map((f) => `${productSlug}/${f.name}`)
      await supabase.storage.from(STORAGE_BUCKET).remove(paths)
    }
  } catch (err) {
    console.warn('Could not remove product image files from Storage (continuing with deletion):', err)
  }

  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) throw error
}

export async function updateProduct(productId, updates) {
  const { error } = await supabase.from('products').update(updates).eq('id', productId)
  if (error) throw error
}

// Updates a single variant's stock quantity.
export async function updateVariantStock(variantId, stockQuantity) {
  const { error } = await supabase
    .from('product_variants')
    .update({ stock_quantity: stockQuantity })
    .eq('id', variantId)
  if (error) throw error
}

// Creates a brand new product with a single starter variant and no images —
// intended as a starting point the admin fleshes out afterward (images
// still need to go through Supabase Storage manually for now; see the
// product_template.sql workflow docs for the full manual process this is
// gradually replacing).
// Creates one product_variants row per color × size combination, all with
// the same starting stock quantity.
export async function createVariants(productId, colors, sizes, startingStock) {
  const rows = []
  for (const color of colors) {
    for (const size of sizes) {
      rows.push({
        product_id: productId,
        color_name: color.name,
        color_hex: color.hex,
        size,
        stock_quantity: startingStock,
      })
    }
  }
  const { error } = await supabase.from('product_variants').insert(rows)
  if (error) throw error
}

// Creates product_images rows for already-uploaded image URLs.
// `colorImages` shape: [{ colorName, urls: [frontUrl, backUrl, ...] }]
export async function createProductImages(productId, colorImages) {
  const rows = []
  for (const { colorName, urls } of colorImages) {
    urls.forEach((url, i) => {
      rows.push({
        product_id: productId,
        color_name: colorName,
        image_url: url,
        sort_order: i,
      })
    })
  }
  if (rows.length === 0) return
  const { error } = await supabase.from('product_images').insert(rows)
  if (error) throw error
}

export async function createProduct({ name, slug, category, categoryId, collectionId, description, material, priceNGN }) {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name,
      slug,
      category,
      category_id: categoryId || null,
      collection_id: collectionId || null,
      description,
      material,
      price_ngn_kobo: Math.round(priceNGN * 100),
      price_usd_cents: 0, // unused for display — see currency.js live conversion
      is_new: true,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}
