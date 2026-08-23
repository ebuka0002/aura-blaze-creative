import { supabase } from '../lib/supabase'

// Reviews are keyed by product SLUG everywhere in the app (matching how
// products are identified via useParams/:id in routes), but the database
// stores reviews against the product's UUID. Every function here accepts
// and works with the slug, resolving to the UUID internally, so callers
// never have to think about the distinction.

async function getProductIdBySlug(slug) {
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data.id
}

// Fetches all reviews for a product (by slug), newest first.
export async function getReviews(productSlug) {
  const productId = await getProductIdBySlug(productSlug)
  if (!productId) return []

  const { data, error } = await supabase
    .from('reviews')
    .select('id, customer_name, rating, review_text, is_verified, created_at')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch reviews:', error)
    return []
  }

  return data.map((r) => ({
    id: r.id,
    name: r.customer_name,
    rating: r.rating,
    text: r.review_text,
    date: r.created_at?.slice(0, 10),
    verified: r.is_verified,
  }))
}

// Adds a review for a product (by slug). `orderItemId`, when provided, links
// the review to a real purchase and marks it as a verified buyer review —
// this is how reviews submitted from the post-purchase confirmation flow
// get their "Verified Buyer" badge; reviews submitted from a product page
// by a browsing (non-purchase-linked) visitor are not verified.
export async function addReview(productSlug, { name, rating, text, orderItemId = null }) {
  const productId = await getProductIdBySlug(productSlug)
  if (!productId) {
    throw new Error(`Could not find a product matching "${productSlug}" to attach this review to.`)
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      product_id: productId,
      order_item_id: orderItemId,
      customer_name: name,
      rating,
      review_text: text,
      is_verified: !!orderItemId,
    })
    .select('id, customer_name, rating, review_text, is_verified, created_at')
    .single()

  if (error) throw error

  return {
    id: data.id,
    name: data.customer_name,
    rating: data.rating,
    text: data.review_text,
    date: data.created_at?.slice(0, 10),
    verified: data.is_verified,
  }
}

export async function getAverageRating(productSlug) {
  const list = await getReviews(productSlug)
  if (list.length === 0) return null
  return (list.reduce((sum, r) => sum + r.rating, 0) / list.length).toFixed(1)
}
