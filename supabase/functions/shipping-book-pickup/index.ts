// Supabase Edge Function: shipping-book-pickup
//
// Actually books the courier pickup with the real carrier via Terminal
// Africa, using a previously-selected rate_id. This should only be called
// AFTER payment is confirmed (see verify-payment) — booking a real courier
// pickup for an unpaid order would be a real, costly mistake.

import { createClient } from 'jsr:@supabase/supabase-js@2.49.4'

const TERMINAL_SECRET_KEY = Deno.env.get('TERMINAL_SECRET_KEY')
// See shipping-rates/index.ts for why this must match the same
// test/live host as wherever the shipment was originally created.
const TERMINAL_API_BASE_URL = Deno.env.get('TERMINAL_API_BASE_URL') || 'https://sandbox.terminal.africa/v1'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, rateId, shipmentId } = await req.json()

    if (!orderId || !rateId) {
      return new Response(JSON.stringify({ error: 'Missing orderId or rateId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Safety check: only book a real pickup for an order that's actually
    // paid. This is the real backstop against accidentally paying to book
    // pickups for unpaid/fake orders, in case this gets called at the
    // wrong time by a bug elsewhere.
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, courier_shipment_id')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (order.status !== 'paid') {
      return new Response(
        JSON.stringify({ error: `Refusing to book a pickup for an order with status "${order.status}".` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Avoid double-booking if this somehow gets called twice for the same order.
    if (order.courier_shipment_id) {
      return new Response(
        JSON.stringify({ success: true, alreadyBooked: true, shipmentId: order.courier_shipment_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const pickupRes = await fetch(`${TERMINAL_API_BASE_URL}/shipments/pickup`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TERMINAL_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rate_id: rateId,
        // shipmentId will be undefined here — shipping-rates now uses
        // Terminal's "Get Quotes for Shipment" endpoint (persist_data:
        // true), which returns a usable rate_id directly without creating
        // a draft shipment first. JSON.stringify drops undefined keys, so
        // this simply omits shipment_id from the request — which is
        // correct per Terminal's docs: "If shipment_id is not provided, a
        // new shipment is generated automatically."
        shipment_id: shipmentId,
      }),
    })

    const pickupData = await pickupRes.json()
    if (!pickupRes.ok || !pickupData.status) {
      console.error('Terminal pickup booking failed:', pickupData)
      return new Response(
        JSON.stringify({ error: pickupData.message || 'Could not book courier pickup.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log the full response the first few times this runs for real — the
    // exact field names here weren't fully confirmable from Terminal's
    // public docs (their pickup-response example was cut off before
    // showing the shipment's own id/carrier/tracking fields). Field access
    // below checks multiple plausible names defensively; if courier_name/
    // courier_tracking_url end up null on a real successful booking, check
    // this log line to see the actual shape and correct the field names.
    console.log('Terminal pickup response (for field-name verification):', JSON.stringify(pickupData.data))

    const shipment = pickupData.data
    const resolvedShipmentId = shipment.shipment_id || shipment.id || shipment.reference || null
    const resolvedTrackingUrl =
      shipment.extras?.tracking_url || shipment.tracking_url || shipment.extras?.carrier_tracking_url || null
    const resolvedCarrierName =
      (typeof shipment.carrier === 'object' ? shipment.carrier?.name : null) || shipment.carrier_name || null

    // Record the real courier shipment ID + tracking info on the order so
    // it can be surfaced to the customer and to Ebuka in the admin dashboard.
    await supabase
      .from('orders')
      .update({
        courier_shipment_id: resolvedShipmentId,
        courier_tracking_url: resolvedTrackingUrl,
        courier_name: resolvedCarrierName,
      })
      .eq('id', orderId)

    return new Response(
      JSON.stringify({
        success: true,
        shipmentId: resolvedShipmentId,
        trackingUrl: resolvedTrackingUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('shipping-book-pickup function error:', err.message)
    return new Response(JSON.stringify({ error: err.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
