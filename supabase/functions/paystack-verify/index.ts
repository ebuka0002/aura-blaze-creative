// Supabase Edge Function: paystack-verify
// Verifies a Paystack transaction actually succeeded, server-side, before
// marking an order as paid. NEVER trust the browser redirect alone — a
// customer's browser landing back on the confirmation page proves nothing
// by itself; it could be reached by just typing the URL. The only source
// of truth for "did this payment really succeed" is asking Paystack
// directly with the secret key.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')
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
    const { reference } = await req.json()

    if (!reference) {
      return new Response(JSON.stringify({ error: 'Missing reference' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Ask Paystack directly — this is the only step that actually matters.
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      }
    )
    const paystackData = await paystackRes.json()

    if (!paystackRes.ok || !paystackData.status) {
      return new Response(JSON.stringify({ error: 'Could not verify transaction with Paystack' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, total, currency, status')
      .eq('paystack_reference', reference)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'No matching order found for this reference' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const txn = paystackData.data
    const paymentSucceeded = txn.status === 'success'

    // Defense in depth: even if Paystack says success, cross-check the
    // amount actually charged matches what the order expected, in case of
    // tampering or a mismatched reference reused across orders.
    const amountMatches = txn.amount === order.total

    if (paymentSucceeded && amountMatches) {
      if (order.status !== 'paid') {
        await supabase.from('orders').update({ status: 'paid' }).eq('id', order.id)
      }

      // Fetch line items so the confirmation page can show the post-purchase
      // review prompts, same as the non-Paystack confirmation path does.
      // Joins to products to get the slug — reviews are addressed by slug
      // throughout the app, not by the raw product UUID.
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('id, product_id, product_name, color_name, size, image_url, products(slug)')
        .eq('order_id', order.id)

      const items = (orderItems || []).map((item) => ({
        key: item.id,
        id: item.products?.slug || item.product_id,
        orderItemId: item.id,
        name: item.product_name,
        color: item.color_name,
        size: item.size,
        image: item.image_url,
      }))

      return new Response(
        JSON.stringify({
          verified: true,
          success: true,
          status: 'paid',
          orderNumber: order.order_number,
          items,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Payment failed, was abandoned, or amount mismatched — do not mark paid.
    return new Response(
      JSON.stringify({
        verified: false,
        success: false,
        status: order.status,
        reason: !paymentSucceeded ? 'payment_not_successful' : 'amount_mismatch',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
