import { supabase } from './supabase'
import { getUsdToNgnRate } from './currency'
import { fetchTaxonomy } from './taxonomy'

// This layer fetches real products from Supabase and reshapes them to match
// the exact structure the old mock data used (colors[].images, sizes, etc.)
// so existing components don't need to be rewritten from scratch.

function kobo_to_naira(kobo) {
  return kobo / 100
}

// Reshapes raw Supabase rows (product + variants + images) into the same
// object shape components already expect from the old mock data.
// `usdRate` is the live USD→NGN rate (Naira per $1); priceUSD is always
// derived from the real NGN price at read time, never read from a stored
// column, so it never goes stale as exchange rates move.
function assembleProduct(product, variants, images, usdRate, taxonomy = []) {
  const colorNames = [...new Set(variants.map((v) => v.color_name))]

  const colors = colorNames.map((name) => {
    const variant = variants.find((v) => v.color_name === name)

    const colorImages = images
      .filter((img) => img.color_name === name)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => img.image_url)

    return {
      name,
      hex: variant?.color_hex || '#000000',
      images: colorImages,
    }
  })

  const sizes = [...new Set(variants.map((v) => v.size))]

  // Stock status: if every variant is 0, sold out.
  // If any variant is low (<=3), low-stock.
  const totalStock = variants.reduce(
    (sum, v) => sum + v.stock_quantity,
    0
  )

  const anyLow = variants.some(
    (v) =>
      v.stock_quantity > 0 &&
      v.stock_quantity <= 3
  )

  const stock =
    totalStock === 0
      ? 'sold-out'
      : anyLow
      ? 'low-stock'
      : 'in-stock'

  const priceNGN = kobo_to_naira(
    product.price_ngn_kobo
  )

  const category = taxonomy.find((c) => c.id === product.category_id || c.slug === product.category)
  const collection = category?.collections?.find((c) => c.id === product.collection_id)

  return {
    id: product.slug,
    dbId: product.id,
    name: product.name,
    category: category?.slug || product.category,
    categoryName: category?.name || product.category,
    categoryId: product.category_id || null,
    collection: collection?.slug || null,
    collectionName: collection?.name || null,
    collectionId: product.collection_id || null,
    priceNGN,
    priceUSD: priceNGN / usdRate,

    // Existing NEW badge
    isNew: product.is_new,

    // NEW: Limited Edition badge
    isLimitedEdition:
      product.is_limited_edition || false,

    stock,
    colors,
    sizes,
    description: product.description,
    material: product.material,

    // Exposes raw variants so size-specific/color-specific
    // stock checks are possible.
    variants,
  }
}

// Fetches all active products with their variants and images in one round trip.
export async function fetchAllProducts() {
  const {
    data: products,
    error: productsError,
  } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)

  if (productsError) throw productsError
  if (!products?.length) return []

  const productIds = products.map(
    (p) => p.id
  )

  const taxonomy = await fetchTaxonomy()

  const [
    {
      data: variants,
      error: variantsError,
    },
    {
      data: images,
      error: imagesError,
    },
    usdRate,
  ] = await Promise.all([
    supabase
      .from('product_variants')
      .select('*')
      .in('product_id', productIds),

    supabase
      .from('product_images')
      .select('*')
      .in('product_id', productIds),

    getUsdToNgnRate(),
  ])

  if (variantsError) throw variantsError
  if (imagesError) throw imagesError

  return products.map((product) =>
    assembleProduct(
      product,
      variants.filter(
        (v) => v.product_id === product.id
      ),
      images.filter(
        (img) => img.product_id === product.id
      ),
      usdRate,
      taxonomy
    )
  )
}

// Fetches a single product by its slug
// (used on the product detail page).
export async function fetchProductBySlug(
  slug
) {
  const {
    data: product,
    error: productError,
  } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (productError) {
    if (productError.code === 'PGRST116') {
      return null
    }

    throw productError
  }

  const taxonomy = await fetchTaxonomy()

  const [
    {
      data: variants,
      error: variantsError,
    },
    {
      data: images,
      error: imagesError,
    },
    usdRate,
  ] = await Promise.all([
    supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', product.id),

    supabase
      .from('product_images')
      .select('*')
      .eq('product_id', product.id),

    getUsdToNgnRate(),
  ])

  if (variantsError) throw variantsError
  if (imagesError) throw imagesError

  return assembleProduct(
    product,
    variants,
    images,
    usdRate,
    taxonomy
  )
}