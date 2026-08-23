import { supabase } from './supabase'

// Fetches the logged-in customer's own orders. Relies entirely on the
// "Users can view their own orders" RLS policy (auth.uid() = user_id) — no
// need to filter by user_id here explicitly, since a customer physically
// cannot receive rows belonging to someone else regardless of what this
// query asks for.
export async function fetchMyOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, currency, total, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function fetchMyOrderDetail(orderId) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (orderError) throw orderError

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)

  if (itemsError) throw itemsError

  return { order, items }
}
