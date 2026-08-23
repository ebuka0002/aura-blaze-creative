// Static reference data that doesn't come from the database — navigation
// categories and currency formatting helpers. Real product data now lives
// in Supabase and is fetched via src/lib/products.js.

export const categories = [
  { id: 'jackets', name: 'Jackets & Outerwear', tagline: 'Weight that means something' },
  { id: 'tshirts', name: 'Shirts', tagline: 'Oversized. Everyday.' },
  { id: 'headwear', name: 'Headwear', tagline: 'Panel caps, bucket hats' },
  { id: 'accessories', name: 'Accessories', tagline: 'Finish the fit' },
]

// Returns the gallery images to display for a product given a selected color name.
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
