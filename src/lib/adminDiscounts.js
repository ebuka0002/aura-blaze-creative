import { supabase } from './supabase'

// Fetches ALL discount codes for the admin view (active and inactive) —
// relies on the "Admins can view all discount codes" RLS policy.
export async function fetchAllDiscountCodesAdmin() {
  const { data, error } = await supabase
    .from('discount_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createDiscountCode(fields) {
  const { data, error } = await supabase
    .from('discount_codes')
    .insert(normalizeFields(fields))
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateDiscountCode(id, fields) {
  const { data, error } = await supabase
    .from('discount_codes')
    .update(normalizeFields(fields))
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteDiscountCode(id) {
  const { error } = await supabase.from('discount_codes').delete().eq('id', id)
  if (error) throw error
}

// Shared cleanup so the form component doesn't need to know about storage
// conventions (uppercase codes, kobo/cents conversion for fixed amounts,
// nulling out fields that don't apply to the current discount_type).
function normalizeFields(fields) {
  const out = { ...fields }
  if (out.code) out.code = out.code.trim().toUpperCase()

  if (out.discount_type === 'percent') {
    out.currency = null // percent-off applies regardless of currency
  }

  return out
}
