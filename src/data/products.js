// Static helpers and fallback navigation taxonomy. The live category/collection
// structure is fetched from Supabase through src/lib/taxonomy.js.
import { fallbackCategories } from '../lib/taxonomy'

export const categories = fallbackCategories

export function getProductImages(product, colorName) {
  const color = product.colors?.find((c) => c.name === colorName)
  if (color?.images?.length) return color.images
  return product.images || []
}

export function formatNGN(amount) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)
}

export function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}
