// Supabase Edge Function: verify-payment
//
// Called by the frontend after Paystack redirects the customer back to our
// site. We NEVER trust the redirect alone (that's spoofable — someone could
// craft a fake "success" URL by hand). Instead, this function asks Paystack
// directly, server-to-server, "did this transaction actually succeed?" and
// only then marks the order as paid.

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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { reference } = await req.json()

    if (!reference) {
      return new Response(JSON.stringify({ error: 'reference is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      }
    )

    const paystackData = await paystackRes.json()

    if (!paystackRes.ok || !paystackData.status) {
      console.error('Paystack verify failed:', paystackData)
      return new Response(JSON.stringify({ error: 'Could not verify transaction' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const transaction = paystackData.data
    const isSuccessful = transaction.status === 'success'

    // Find the order this reference belongs to.
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, total, subtotal, shipping_cost, currency, status, customer_name, customer_email, shipping_address, shipping_rate_id, shipping_shipment_id')
      .eq('paystack_reference', reference)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found for this reference' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Defense in depth: confirm the amount actually paid matches what the
    // order expects, not just that *a* payment succeeded. Prevents a
    // scenario where a manipulated reference somehow points to a real but
    // mismatched successful transaction.
    const amountMatches = transaction.amount === order.total
    const paid = isSuccessful && amountMatches

    // Atomically mark the order paid AND find out whether THIS call was the
    // one that actually made the change, in a single database operation.
    // This matters because verify-payment can legitimately be called more
    // than once for the same order (React StrictMode double-invokes effects
    // in dev; in production a slow network or re-render can trigger the
    // same race) — doing "read status, then later write status" as two
    // separate steps left a window where two near-simultaneous calls could
    // both see 'pending' and both think they were first, sending two
    // emails. A single atomic UPDATE closes that window.
    let isFirstConfirmation = false
    if (paid) {
      const { data: wasFirst, error: confirmError } = await supabase.rpc('confirm_order_paid', {
        p_order_id: order.id,
      })
      if (confirmError) {
        console.error('confirm_order_paid failed:', confirmError)
      } else {
        isFirstConfirmation = !!wasFirst
      }
    }

    // Include the order's line items in the response. This page is reached
    // via a fresh browser navigation from Paystack's site — no React state
    // survives that trip — so the frontend has no other way to know what
    // was purchased in order to show post-purchase review prompts.
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
        rawOrderItems = orderItems
        // Reviews everywhere else on the site are keyed by product SLUG
        // (e.g. "signature-tee"), not the database UUID — order_items only
        // stores the UUID, so we need to look up each product's slug to
        // keep review keys consistent with how the product page reads them.
        const productIds = [...new Set(orderItems.map((i) => i.product_id).filter(Boolean))]
        const { data: products } = await supabase
          .from('products')
          .select('id, slug')
          .in('id', productIds)
        const slugById = Object.fromEntries((products || []).map((p) => [p.id, p.slug]))

        items = orderItems.map((item) => ({
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

    // Send the confirmation email — only on the FIRST time this order is
    // confirmed paid, never on repeat calls (e.g. if the customer refreshes
    // the confirmation page). This is best-effort: if sending fails, we log
    // it but don't fail the whole request — the payment already succeeded
    // and the order is correctly marked paid regardless of email delivery.
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
        if (!emailRes.ok) {
          const errBody = await emailRes.text()
          console.error('Resend email send failed:', emailRes.status, errBody)
        }
      } catch (emailErr) {
        console.error('Failed to send order confirmation email:', emailErr)
      }
    }

    // Book the real courier pickup — only on first confirmation, same
    // reasoning as the email above (never double-book a pickup if this
    // function gets called more than once for the same order). Best-effort:
    // if this fails, the order is still correctly marked paid; Ebuka can
    // manually arrange pickup as a fallback, and the failure is logged for
    // follow-up rather than silently lost.
    if (isFirstConfirmation && order.shipping_rate_id && order.shipping_shipment_id) {
      try {
        const pickupRes = await fetch(`${SUPABASE_URL}/functions/v1/shipping-book-pickup`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: order.id,
            rateId: order.shipping_rate_id,
            shipmentId: order.shipping_shipment_id,
          }),
        })
        if (!pickupRes.ok) {
          const errBody = await pickupRes.text()
          console.error('Courier pickup booking failed:', pickupRes.status, errBody)
        }
      } catch (pickupErr) {
        console.error('Failed to book courier pickup:', pickupErr)
      }
    }

    return new Response(
      JSON.stringify({
        success: paid,
        orderNumber: order.order_number,
        status: paid ? 'paid' : order.status,
        items,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('verify-payment error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
