// Supabase Edge Function: shipping-book-pickup
//
// Submits the Red Star Express (RedSpeed API) pickup request only after
// Paystack has confirmed payment. The function claims the order atomically
// before calling Red Star, so repeated verify-payment requests cannot
// double-book the same order.

import { createClient } from 'jsr:@supabase/supabase-js@2.49.4'
import {
  CATEGORY_WEIGHTS_KG,
  DEFAULT_WEIGHT_KG,
  PICKUP_ADDRESS,
  REDSTAR_CARRIER_NAME,
  estimateParcelWeight,
  normalizePhone,
  pickupOutcome,
  isRedstarConfigured,
  redstarErrorMessage,
  redstarFetch,
  resolvePaymentType,
  resolvePickupType,
  resolveRoute,
} from '../_shared/redstar.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const REDSTAR_DELIVERY_TYPE = Deno.env.get('REDSTAR_DELIVERY_TYPE')

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!isRedstarConfigured() || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: 'Shipping booking is not fully configured on the server.' }, 500)
    }

    const { orderId } = await req.json()
    if (!orderId) return jsonResponse({ error: 'Missing orderId' }, 400)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: currentOrder, error: readError } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, customer_name, customer_email, customer_phone, shipping_address,
        shipping_rate_id, courier_shipment_id, courier_booking_status,
        courier_tracking_url, courier_tracking_number, courier_name
      `)
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
        trackingNumber: currentOrder.courier_tracking_number,
        trackingUrl: currentOrder.courier_tracking_url,
        courierName: currentOrder.courier_name,
      })
    }
    if (!currentOrder.shipping_rate_id) {
      return jsonResponse({ error: 'Order is paid but has no selected shipping method.' }, 409)
    }

    // Claim this order before calling the external API. Only one concurrent
    // request can change pending/failed -> booking.
    const { data: claimRows, error: claimError } = await supabase
      .from('orders')
      .update({ courier_booking_status: 'booking', courier_booking_error: null })
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
        .select('courier_shipment_id, courier_booking_status, courier_tracking_url, courier_tracking_number, courier_name')
        .eq('id', orderId)
        .single()

      if (latest?.courier_shipment_id) {
        return jsonResponse({
          success: true,
          alreadyBooked: true,
          shipmentId: latest.courier_shipment_id,
          trackingNumber: latest.courier_tracking_number,
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

    const markFailed = async (message: string, debug: unknown) => {
      await supabase
        .from('orders')
        .update({
          courier_booking_status: 'failed',
          courier_booking_error: message,
          courier_booking_debug: debug,
        })
        .eq('id', orderId)
        .is('courier_shipment_id', null)
    }

    try {
      const address = currentOrder.shipping_address || {}

      // Items + product categories, for weight and the commercial detail lines.
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, product_name, quantity, unit_price')
        .eq('order_id', orderId)
      const productIds = [...new Set((orderItems || []).map((i: any) => i.product_id).filter(Boolean))]
      const { data: products } = productIds.length
        ? await supabase.from('products').select('id, category').in('id', productIds)
        : { data: [] }
      const categoryById = Object.fromEntries((products || []).map((p: any) => [p.id, p.category]))

      const weightItems = (orderItems || []).map((i: any) => ({
        category: categoryById[i.product_id],
        quantity: i.quantity,
      }))
      const weight = estimateParcelWeight(weightItems)
      const pieces = Math.max(1, (orderItems || []).reduce((n: number, i: any) => n + Number(i.quantity || 1), 0))

      const route = await resolveRoute({ city: address.city, state: address.state, line2: address.line2 })
      const pickupType = await resolvePickupType()
      const paymentType = await resolvePaymentType()

      const shipmentItems = (orderItems || []).map((i: any) => ({
        id: 0,
        status: 0,
        shipmentId: 0,
        commodity: i.product_name || 'Clothing',
        description: i.product_name || 'Clothing item',
        countryOfManufacturing: 'Nigeria',
        quantity: Number(i.quantity || 1),
        weight: CATEGORY_WEIGHTS_KG[categoryById[i.product_id]] ?? DEFAULT_WEIGHT_KG,
        unitOfMeasure: 1,
        unitOfPrice: Number(i.unit_price || 0) / 100, // stored in kobo
      }))

      const buildRequest = (senderCity: string, recipientCity: string) => ({
        senderCity,
        recipientCity,
        recipientTownID: route.recipientTown?.id ?? null,
        senderTownID: route.senderTown?.id ?? null,
        recipientName: String(currentOrder.customer_name || '').replace(/\s+/g, ' ').trim(),
        recipientPhoneNo: normalizePhone(currentOrder.customer_phone),
        recipientEmail: currentOrder.customer_email,
        recipientAddress: [address.address, address.line2].map((x) => String(x || '').trim()).filter(Boolean).join(', '),
        recipientState: address.state,
        senderName: PICKUP_ADDRESS.name,
        senderAddress: PICKUP_ADDRESS.address,
        senderPhone: normalizePhone(PICKUP_ADDRESS.phone),
        orderNo: currentOrder.order_number,
        description: 'Aura Blaze Creative clothing order',
        // Empty strings rather than nulls: a null here is a likely trigger of
        // Red Star's "Object reference not set" crash.
        packaging: Deno.env.get('REDSTAR_PACKAGING') || '',
        boxandCrating: '',
        onforwardingLocation: route.recipientTown?.name ?? null,
        paymentType,
        pickupType,
        weight,
        pieces,
        cashOnDelivery: 0,
        deliveryType: REDSTAR_DELIVERY_TYPE || '',
        shipmentItems,
      })

      // Confirmed from live logs: PickupRequest wants the city NAME for the
      // recipient (e.g. "ABAKALIKI"); the city code ("AKK") makes Red Star crash
      // with "Object reference not set". Names first, codes only as a fallback.
      const attempts = [
        buildRequest(route.senderCity.name, route.recipientCity.name),
        buildRequest(route.senderCity.abbr, route.recipientCity.abbr),
      ]

      let lastRes: { ok: boolean; status: number; data: any } | null = null
      let waybill: string | null = null
      let failureMessage: string | null = null

      for (const body of attempts) {
        console.log('Red Star PickupRequest:', JSON.stringify({ orderId, body }))
        const res = await redstarFetch('/api/Operations/PickupRequest', { method: 'POST', body })
        console.log('Red Star PickupRequest response:', JSON.stringify({ orderId, status: res.status, response: res.data }))
        lastRes = res
        if (res.ok) {
          // HTTP 200 does NOT mean success with Red Star: check TransStatus
          // and that a real waybill came back.
          const outcome = pickupOutcome(res.data)
          if (outcome.ok) {
            waybill = outcome.waybill
            failureMessage = null
            break
          }
          failureMessage = outcome.message
          continue // nothing was created, so trying the next variant is safe
        }
        failureMessage = redstarErrorMessage(res.data, `Red Star rejected the booking (HTTP ${res.status}).`)
        if (res.status === 401 || res.status === 403) break
      }

      const debug = { httpStatus: lastRes?.status ?? null, httpOk: lastRes?.ok ?? false, body: lastRes?.data ?? null }

      if (!waybill) {
        const message = failureMessage || 'Red Star did not return a waybill number.'
        console.error('Red Star booking failed:', JSON.stringify(debug))
        await markFailed(message, debug)
        return jsonResponse({ error: message, bookingFailed: true, redstarHttpStatus: lastRes?.status }, 502)
      }

      const { error: saveError } = await supabase
        .from('orders')
        .update({
          courier_shipment_id: waybill,
          courier_tracking_number: waybill,
          courier_tracking_url: null,
          courier_name: REDSTAR_CARRIER_NAME,
          courier_label_url: null,
          courier_booking_status: 'booked',
          courier_booking_error: null,
          courier_booking_debug: debug,
          courier_booked_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .is('courier_shipment_id', null)

      if (saveError) {
        console.error('Red Star booking succeeded but saving shipment failed:', saveError)
        return jsonResponse({
          success: true,
          warning: 'Shipment was booked at Red Star, but the local order record could not be updated.',
          shipmentId: waybill,
          trackingNumber: waybill,
        }, 200)
      }

      console.log('Red Star shipment booked:', JSON.stringify({ orderId, waybill }))

      return jsonResponse({
        success: true,
        shipmentId: waybill,
        trackingNumber: waybill,
        trackingUrl: null,
        courierName: REDSTAR_CARRIER_NAME,
        labelUrl: null,
      })
    } catch (bookingError) {
      const message = bookingError instanceof Error ? bookingError.message : 'Unexpected Red Star booking error.'
      await markFailed(message, { httpStatus: null, httpOk: false, error: message })
      throw bookingError
    }
  } catch (err) {
    console.error('shipping-book-pickup function error:', err)
    return jsonResponse({
      error: err instanceof Error ? err.message : 'Unexpected shipping booking error.',
    }, 500)
  }
})
