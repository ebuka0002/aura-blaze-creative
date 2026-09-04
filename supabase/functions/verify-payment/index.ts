// Supabase Edge Function: verify-payment
//
// Verifies the Paystack transaction server-to-server, confirms the order is
// paid, and then ensures a Terminal Africa shipment is booked. Shipment
// booking is independently idempotent/retryable: a temporary Terminal error
// does not leave a paid order permanently unshippable.

import { createClient } from 'jsr:@supabase/supabase-js@2.49.4'
import { buildOrderConfirmationEmail } from '../_shared/emailTemplate.ts'

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ORDER_EMAIL_FROM = Deno.env.get('ORDER_EMAIL_FROM') || 'Aura Blaze Creative <orders@aurablazecreative.com>'

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
    if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: 'Payment verification is not fully configured on the server.' }, 500)
    }

    const { reference } = await req.json()
    if (!reference) return jsonResponse({ error: 'reference is required' }, 400)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
    )
    const paystackData = await paystackRes.json()

    if (!paystackRes.ok || !paystackData.status) {
      console.error('Paystack verify failed:', paystackData)
      return jsonResponse({ error: 'Could not verify transaction' }, 502)
    }

    const transaction = paystackData.data
    const isSuccessful = transaction.status === 'success'

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, order_number, total, subtotal, shipping_cost, currency, status,
        customer_name, customer_email, shipping_address,
        shipping_rate_id, shipping_shipment_id,
        courier_shipment_id, courier_tracking_number, courier_tracking_url,
        courier_name, courier_label_url, courier_booking_status
      `)
      .eq('paystack_reference', reference)
      .single()

    if (orderError || !order) return jsonResponse({ error: 'Order not found for this reference' }, 404)

    const amountMatches = transaction.amount === order.total
    const paid = isSuccessful && amountMatches

    if (isSuccessful && !amountMatches) {
      console.error('Paystack amount mismatch:', {
        reference,
        transactionAmount: transaction.amount,
        orderTotal: order.total,
      })
      return jsonResponse({ error: 'Payment amount does not match the order total.' }, 400)
    }

    let isFirstConfirmation = false
    if (paid) {
      const { data: wasFirst, error: confirmError } = await supabase.rpc('confirm_order_paid', {
        p_order_id: order.id,
      })
      if (confirmError) {
        console.error('confirm_order_paid failed:', confirmError)
        return jsonResponse({ error: 'Payment was verified, but the order could not be confirmed. Please retry.' }, 500)
      }
      isFirstConfirmation = !!wasFirst
    }

    let items = []
    let rawOrderItems = []
    if (paid) {
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('id, product_id, product_name, color_name, size, unit_price, quantity, image_url')
        .eq('order_id', order.id)

      if (itemsError) {
        console.error('Failed to fetch order items for confirmation page:', itemsError)
      } else {
        rawOrderItems = orderItems || []
        const productIds = [...new Set(rawOrderItems.map((i) => i.product_id).filter(Boolean))]
        const { data: products } = productIds.length
          ? await supabase.from('products').select('id, slug').in('id', productIds)
          : { data: [] }
        const slugById = Object.fromEntries((products || []).map((p) => [p.id, p.slug]))

        items = rawOrderItems.map((item) => ({
          key: item.id,
          id: slugById[item.product_id] || item.product_id,
          orderItemId: item.id,
          name: item.product_name,
          color: item.color_name,
          size: item.size,
          image: item.image_url,
          qty: item.quantity,
        }))
      }
    }

    if (isFirstConfirmation && RESEND_API_KEY && order.customer_email) {
      try {
        const html = buildOrderConfirmationEmail({ order, items: rawOrderItems })
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: ORDER_EMAIL_FROM,
            to: order.customer_email,
            subject: `Order Confirmed — #${order.order_number}`,
            html,
          }),
        })
        if (!emailRes.ok) console.error('Resend email send failed:', emailRes.status, await emailRes.text())
      } catch (emailErr) {
        console.error('Failed to send order confirmation email:', emailErr)
      }
    }

    // IMPORTANT: Do not gate this on isFirstConfirmation. If Terminal is
    // temporarily unavailable on the first verification, a later verification
    // must be able to retry the booking. shipping-book-pickup itself provides
    // the atomic claim that prevents duplicate external bookings.
    let shippingBooking = {
      attempted: false,
      success: !!order.courier_shipment_id,
      bookingInProgress: false,
      error: null,
      shipmentId: order.courier_shipment_id,
      trackingNumber: order.courier_tracking_number,
      trackingUrl: order.courier_tracking_url,
      courierName: order.courier_name,
      labelUrl: order.courier_label_url,
    }

    if (paid && !order.courier_shipment_id && order.shipping_rate_id && order.shipping_shipment_id) {
      shippingBooking.attempted = true
      try {
        const pickupRes = await fetch(`${SUPABASE_URL}/functions/v1/shipping-book-pickup`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderId: order.id }),
        })
        const pickupData = await pickupRes.json()
        if (!pickupRes.ok || !pickupData.success) {
          shippingBooking.error = pickupData.error || 'Shipment booking is pending and will need a retry.'
          shippingBooking.bookingInProgress = !!pickupData.bookingInProgress
        } else {
          shippingBooking.success = true
          shippingBooking.shipmentId = pickupData.shipmentId || null
          shippingBooking.trackingNumber = pickupData.trackingNumber || null
          shippingBooking.trackingUrl = pickupData.trackingUrl || null
          shippingBooking.courierName = pickupData.courierName || null
          shippingBooking.labelUrl = pickupData.labelUrl || null
        }
      } catch (pickupErr) {
        console.error('Failed to invoke shipping-book-pickup:', pickupErr)
        shippingBooking.error = pickupErr instanceof Error ? pickupErr.message : 'Shipment booking failed.'
      }
    }

    // A paid order remains paid even if the external courier API is briefly
    // unavailable. The failed booking is stored by shipping-book-pickup and
    // can be retried safely without charging the customer again.
    return jsonResponse({
      success: paid,
      orderNumber: order.order_number,
      status: paid ? 'paid' : order.status,
      items,
      shippingBooking,
    })
  } catch (err) {
    console.error('verify-payment error:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
