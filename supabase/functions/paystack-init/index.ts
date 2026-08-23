// Supabase Edge Function: paystack-init
// Initializes a Paystack transaction for an existing 'pending' order.
// Runs server-side — this is the only safe place to use the Paystack
// secret key, since Edge Functions never expose their code or env vars
// to the browser.

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
    const { orderId, email, amount, currency } = await req.json()

    if (!orderId || !email || !amount || !currency) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: orderId, email, amount, currency' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Confirm the order actually exists and is still pending, and that the
    // amount matches what's on record — never trust an amount passed
    // directly from the browser without checking it against the real order.
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total, status, currency')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (order.status !== 'pending') {
      return new Response(JSON.stringify({ error: `Order is already ${order.status}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (order.total !== amount || order.currency !== currency) {
      return new Response(
        JSON.stringify({ error: 'Amount or currency does not match order record' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Paystack only settles in NGN for Nigerian-registered businesses on
    // most account tiers. USD orders still get charged in NGN equivalent
    // at Paystack's own rate — that's a Paystack account-level setting,
    // not something this function controls.
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: order.total, // already in kobo/cents (smallest unit), matching Paystack's expected format
        currency: order.currency === 'NGN' ? 'NGN' : 'USD',
        metadata: { order_id: orderId },
        callback_url: req.headers.get('origin')
          ? `${req.headers.get('origin')}/order-confirmation`
          : undefined,
      }),
    })

    const paystackData = await paystackRes.json()

    if (!paystackRes.ok || !paystackData.status) {
      return new Response(
        JSON.stringify({ error: paystackData.message || 'Paystack initialization failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store the reference on the order so verification can look it up later.
    await supabase
      .from('orders')
      .update({ paystack_reference: paystackData.data.reference })
      .eq('id', orderId)

    return new Response(
      JSON.stringify({
        authorizationUrl: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
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
