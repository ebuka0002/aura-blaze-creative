// Supabase Edge Function: shipping-cancel  (ADMIN ONLY)
//
// Cancels an order's Red Star shipment through the RedSpeed API
// (GET /api/Operations/CancelShipment?WaybillNumber=...). It does not refund
// the customer (do that in Paystack) and does not change the order status.

import { createClient } from 'jsr:@supabase/supabase-js@2.49.4'
import { isRedstarConfigured, redstarErrorMessage, redstarFetch } from '../_shared/redstar.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const isPlaceholder = (v: unknown) => /^(n\/?a|null|none|-+|0)?$/i.test(String(v ?? '').trim())

// Red Star can answer failures with HTTP 200, so also look at the body.
function cancelFailureMessage(data: any): string | null {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const d = Object.fromEntries(Object.entries(data).map(([k, v]) => [k.toLowerCase(), v]))
    const status = String(d.transstatus ?? d.status ?? '')
    if (/un-?success|fail|error|reject|not/i.test(status)) {
      return String(d.transstatusdetails ?? d.message ?? status)
    }
  }
  if (typeof data === 'string' && /un-?success|fail|cannot|can't|not (found|allowed|possible)|error|invalid/i.test(data)) {
    return data.slice(0, 300)
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!isRedstarConfigured() || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: 'Shipping is not fully configured on the server.' }, 500)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // --- Admin check, enforced on the server ---
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    const { data: userData, error: userError } = token
      ? await supabase.auth.getUser(token)
      : { data: null, error: new Error('No token') }
    if (userError || !userData?.user) return jsonResponse({ error: 'Please sign in.' }, 401)

    const { data: profile } = await supabase
      .from('customer_profiles')
      .select('is_admin')
      .eq('id', userData.user.id)
      .single()
    if (!profile?.is_admin) return jsonResponse({ error: 'Admin access required.' }, 403)

    const { orderId } = await req.json()
    if (!orderId) return jsonResponse({ error: 'Missing orderId' }, 400)

    const { data: order, error: readError } = await supabase
      .from('orders')
      .select('id, order_number, courier_shipment_id, courier_tracking_number, courier_booking_status')
      .eq('id', orderId)
      .single()
    if (readError || !order) return jsonResponse({ error: 'Order not found' }, 404)

    const waybill = order.courier_tracking_number || order.courier_shipment_id
    if (!waybill || isPlaceholder(waybill)) {
      return jsonResponse({ error: 'This order has no real Red Star shipment to cancel.' }, 400)
    }
    if (order.courier_booking_status === 'cancelled') {
      return jsonResponse({ success: true, alreadyCancelled: true, waybill })
    }
    if (order.courier_booking_status !== 'booked') {
      return jsonResponse({ error: `Shipment is not in a cancellable state (${order.courier_booking_status}).` }, 409)
    }

    const res = await redstarFetch(`/api/Operations/CancelShipment?WaybillNumber=${encodeURIComponent(waybill)}`)
    console.log('Red Star CancelShipment:', JSON.stringify({ orderId, waybill, status: res.status, response: res.data }))

    const failure = !res.ok
      ? redstarErrorMessage(res.data, `Red Star could not cancel the shipment (HTTP ${res.status}).`)
      : cancelFailureMessage(res.data)
    if (failure) return jsonResponse({ error: failure, redstarResponse: res.data }, 502)

    const { error: saveError } = await supabase
      .from('orders')
      .update({
        courier_booking_status: 'cancelled',
        courier_booking_error: null,
        courier_booking_debug: { cancelledAt: new Date().toISOString(), waybill, response: res.data },
      })
      .eq('id', orderId)
    if (saveError) {
      console.error('Cancelled at Red Star but saving failed:', saveError)
      return jsonResponse({
        success: true,
        warning: 'Cancelled at Red Star, but the order record could not be updated. Did you run docs/022_courier_cancelled_status.sql?',
        waybill,
        redstarResponse: res.data,
      })
    }

    return jsonResponse({ success: true, waybill, redstarResponse: res.data })
  } catch (err) {
    console.error('shipping-cancel error:', err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unexpected error.' }, 500)
  }
})
