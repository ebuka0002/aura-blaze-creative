// Supabase Edge Function: shipping-book-pickup
//
// Books the real Terminal Africa shipment only after Paystack has confirmed
// payment. The function claims the order atomically before calling Terminal,
// so repeated verify-payment requests cannot double-book the same order.

import { createClient } from 'jsr:@supabase/supabase-js@2.49.4'

const TERMINAL_SECRET_KEY = Deno.env.get('TERMINAL_SECRET_KEY')
const TERMINAL_API_BASE_URL = Deno.env.get('TERMINAL_API_BASE_URL') || 'https://api.terminal.africa/v1'
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

async function readJson(response: Response) {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!TERMINAL_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: 'Shipping booking is not fully configured on the server.' }, 500)
    }

    const { orderId } = await req.json()
    if (!orderId) return jsonResponse({ error: 'Missing orderId' }, 400)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: currentOrder, error: readError } = await supabase
      .from('orders')
      .select('id, status, shipping_rate_id, shipping_shipment_id, courier_shipment_id, courier_booking_status, courier_tracking_url, courier_name')
      .eq('id', orderId)
      .single()

    if (readError || !currentOrder) return jsonResponse({ error: 'Order not found' }, 404)
    if (currentOrder.status !== 'paid') {
      return jsonResponse({ error: `Refusing to book shipment for order with status "${currentOrder.status}".` }, 400)
    }
    if (currentOrder.courier_shipment_id) {
      return jsonResponse({
        success: true,
        alreadyBooked: true,
        shipmentId: currentOrder.courier_shipment_id,
        trackingUrl: currentOrder.courier_tracking_url,
        courierName: currentOrder.courier_name,
      })
    }
    if (!currentOrder.shipping_rate_id || !currentOrder.shipping_shipment_id) {
      return jsonResponse({
        error: 'Order is paid but is missing the Terminal rate or draft shipment ID.',
      }, 409)
    }

    // Claim this order before calling the external API. Only one concurrent
    // request can change pending/failed -> booking.
    const { data: claimRows, error: claimError } = await supabase
      .from('orders')
      .update({
        courier_booking_status: 'booking',
        courier_booking_error: null,
      })
      .eq('id', orderId)
      .eq('status', 'paid')
      .is('courier_shipment_id', null)
      .in('courier_booking_status', ['pending', 'failed'])
      .select('id')

    if (claimError) {
      console.error('Failed to claim courier booking:', claimError)
      return jsonResponse({ error: 'Could not reserve shipment booking.' }, 500)
    }

    if (!claimRows?.length) {
      const { data: latest } = await supabase
        .from('orders')
        .select('courier_shipment_id, courier_booking_status, courier_tracking_url, courier_name')
        .eq('id', orderId)
        .single()

      if (latest?.courier_shipment_id) {
        return jsonResponse({
          success: true,
          alreadyBooked: true,
          shipmentId: latest.courier_shipment_id,
          trackingUrl: latest.courier_tracking_url,
          courierName: latest.courier_name,
        })
      }

      return jsonResponse({
        success: false,
        bookingInProgress: latest?.courier_booking_status === 'booking',
        error: latest?.courier_booking_status === 'booking'
          ? 'Shipment booking is already in progress.'
          : 'Shipment booking could not be claimed. Please retry.',
      }, 409)
    }

    try {
      const pickupRes = await fetch(`${TERMINAL_API_BASE_URL}/shipments/pickup`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TERMINAL_SECRET_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          rate_id: currentOrder.shipping_rate_id,
          shipment_id: currentOrder.shipping_shipment_id,
        }),
      })

      const pickupData = await readJson(pickupRes)
      if (!pickupRes.ok || !pickupData.status) {
        const message = pickupData.message || 'Terminal could not arrange the shipment.'
        console.error('Terminal pickup booking failed:', pickupData)
        await supabase
          .from('orders')
          .update({
            courier_booking_status: 'failed',
            courier_booking_error: message,
          })
          .eq('id', orderId)
          .is('courier_shipment_id', null)
        return jsonResponse({ error: message }, 502)
      }

      const shipment = pickupData.data || {}
      const resolvedShipmentId = shipment.shipment_id || shipment.id || null
      const trackingUrl = shipment.extras?.tracking_url || shipment.tracking_url || null
      const trackingNumber = shipment.extras?.tracking_number || shipment.tracking_number || null
      const courierName =
        (typeof shipment.carrier === 'object' ? shipment.carrier?.name : null) ||
        shipment.carrier_name ||
        null
      const labelUrl =
        shipment.extras?.label_url ||
        shipment.extras?.label ||
        shipment.label_url ||
        null

      if (!resolvedShipmentId) {
        const message = 'Terminal confirmed the booking but did not return a shipment ID.'
        await supabase
          .from('orders')
          .update({ courier_booking_status: 'failed', courier_booking_error: message })
          .eq('id', orderId)
        return jsonResponse({ error: message }, 502)
      }

      const { error: saveError } = await supabase
        .from('orders')
        .update({
          courier_shipment_id: resolvedShipmentId,
          courier_tracking_url: trackingUrl,
          courier_tracking_number: trackingNumber,
          courier_name: courierName,
          courier_label_url: labelUrl,
          courier_booking_status: 'booked',
          courier_booking_error: null,
          courier_booked_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .is('courier_shipment_id', null)

      if (saveError) {
        console.error('Terminal booking succeeded but saving shipment failed:', saveError)
        return jsonResponse({
          success: true,
          warning: 'Shipment was booked at Terminal, but the local order record could not be updated.',
          shipmentId: resolvedShipmentId,
          trackingUrl,
        }, 200)
      }

      console.log('Terminal shipment booked:', JSON.stringify({
        orderId,
        shipmentId: resolvedShipmentId,
        trackingNumber,
        trackingUrl,
        courierName,
      }))

      return jsonResponse({
        success: true,
        shipmentId: resolvedShipmentId,
        trackingNumber,
        trackingUrl,
        courierName,
        labelUrl,
      })
    } catch (bookingError) {
      const message = bookingError instanceof Error ? bookingError.message : 'Unexpected Terminal booking error.'
      await supabase
        .from('orders')
        .update({
          courier_booking_status: 'failed',
          courier_booking_error: message,
        })
        .eq('id', orderId)
        .is('courier_shipment_id', null)
      throw bookingError
    }
  } catch (err) {
    console.error('shipping-book-pickup function error:', err)
    return jsonResponse({
      error: err instanceof Error ? err.message : 'Unexpected shipping booking error.',
    }, 500)
  }
})
