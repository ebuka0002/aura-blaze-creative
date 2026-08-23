// Supabase Edge Function: initialize-payment
//
// Runs server-side on Supabase's infrastructure, never in the browser.
// This is the ONLY safe place to use the Paystack secret key — it never
// touches frontend code or gets shipped to the browser.
//
// Called by the frontend after an order has already been created (status
// 'pending'). This function asks Paystack to open a transaction for that
// order's total, and returns the checkout URL to redirect the customer to.

import { createClient } from 'jsr:@supabase/supabase-js@2.49.4'

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
    const { orderId } = await req.json()

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use the service role key here (server-side only, never exposed to the
    // browser) so we can reliably read the order regardless of RLS —
    // this function IS the trusted server-side boundary.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, customer_email, total, currency, status')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (order.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Order is not pending (status: ${order.status})` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Paystack's core transaction currency is NGN; USD orders are still
    // charged in the equivalent NGN amount since that's what actually
    // settles to a Nigerian business account. `order.total` is already
    // stored in minor units (kobo/cents) matching `order.currency`.
    // For USD orders we don't attempt currency math here — Paystack test
    // mode only supports NGN by default for most accounts, so USD orders
    // are flagged for the frontend to handle appropriately (see note below).
    if (order.currency !== 'NGN') {
      return new Response(
        JSON.stringify({
          error:
            'Only NGN payments are currently supported by this Paystack integration. USD-priced orders need a separate settlement path (see project notes).',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const reference = `${order.order_number}-${Date.now()}`

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: order.customer_email,
        amount: order.total, // already in kobo
        reference,
        callback_url: `${req.headers.get('origin') || ''}/order-confirmation`,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
        },
      }),
    })

    const paystackData = await paystackRes.json()

    if (!paystackRes.ok || !paystackData.status) {
      console.error('Paystack initialize failed:', paystackData)
      return new Response(
        JSON.stringify({ error: paystackData.message || 'Failed to initialize payment' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store the reference on the order so verify-payment can find it later.
    await supabase
      .from('orders')
      .update({ paystack_reference: reference })
      .eq('id', order.id)

    return new Response(
      JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        reference,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('initialize-payment error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
