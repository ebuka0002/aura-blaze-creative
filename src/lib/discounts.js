import { supabase } from './supabase'

// Validates a discount code against the current cart subtotal and currency,
// using the validate_discount_code() database function — see the SQL
// migration for why this logic lives server-side rather than just in JS.
// Returns { valid, reason?, discountId?, discountType?, discountValue? }.
export async function validateDiscountCode(code, subtotal, currency) {
  const { data, error } = await supabase.rpc('validate_discount_code', {
    p_code: code,
    p_subtotal: Math.round(subtotal * 100), // convert to kobo/cents to match stored amounts
    p_currency: currency,
  })

  if (error) throw error

  // RPC returning a table comes back as an array of rows — this function
  // always returns exactly one.
  const result = data?.[0]
  if (!result) throw new Error('Unexpected response validating discount code.')

  return {
    valid: result.valid,
    reason: result.reason,
    discountId: result.discount_id,
    discountType: result.discount_type,
    discountValue: result.discount_value,
  }
}

// Computes the actual discount amount (in plain decimal, matching how the
// rest of the cart/checkout tracks money) given a validated discount and
// the current subtotal.
export function calculateDiscountAmount({ discountType, discountValue }, subtotal) {
  if (discountType === 'percent') {
    return (subtotal * discountValue) / 100
  }
  // 'fixed' — discountValue is stored in kobo/cents, convert to plain decimal.
  // Never let a fixed discount exceed the subtotal itself.
  return Math.min(discountValue / 100, subtotal)
}

export async function markDiscountUsed(discountId) {
  const { error } = await supabase.rpc('increment_discount_usage', {
    p_discount_id: discountId,
  })
  if (error) console.error('Failed to increment discount usage:', error)
}
