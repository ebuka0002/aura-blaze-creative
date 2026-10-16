// Supabase Edge Function: shipping-rates
//
// Quotes a Red Star Express (RedSpeed API) delivery fee for the customer's
// address and parcel. Red Star has no draft-shipment step, so nothing is
// created here — the shipment is only requested after Paystack payment has
// been verified (see shipping-book-pickup).

import {
  REDSTAR_CARRIER_NAME,
  estimateParcelWeight,
  extractFee,
  isRedstarConfigured,
  redstarErrorMessage,
  redstarFetch,
  resolvePickupType,
  resolveRoute,
} from '../_shared/redstar.ts'

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

const NIGERIA_ALIASES = ['nigeria', 'ng']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!isRedstarConfigured()) {
      return jsonResponse({ error: 'REDSTAR_API_KEY is not configured in Supabase.' }, 500)
    }

    const { deliveryAddress, items, currency = 'NGN' } = await req.json()

    if (!deliveryAddress) return jsonResponse({ error: 'Missing deliveryAddress' }, 400)
    if (!Array.isArray(items) || items.length === 0) {
      return jsonResponse({ error: 'Missing or invalid items' }, 400)
    }
    if (currency !== 'NGN') {
      return jsonResponse({ error: 'Red Star shipping is only available for NGN checkout.' }, 400)
    }
    if (!NIGERIA_ALIASES.includes(String(deliveryAddress.country || 'nigeria').trim().toLowerCase())) {
      return jsonResponse({ error: 'Red Star Express delivers within Nigeria only.' }, 400)
    }
    if (!deliveryAddress.address || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.phone) {
      return jsonResponse({ error: 'A complete delivery address is required.' }, 400)
    }

    const route = await resolveRoute({
      city: deliveryAddress.city,
      state: deliveryAddress.state,
      line2: deliveryAddress.line2,
    })
    const pickupType = await resolvePickupType()
    const weight = estimateParcelWeight(items)

    // Red Star's spec doesn't say whether the city fields take the city code
    // (abbr) or the city name, so try the code first and fall back to the name.
    const attempts = [
      { sender: route.senderCity.abbr, recipient: route.recipientCity.abbr },
      { sender: route.senderCity.name, recipient: route.recipientCity.name },
    ]

    let fee: number | null = null
    let lastError = 'Red Star could not calculate shipping for this address.'

    for (const attempt of attempts) {
      const body = {
        senderCity: attempt.sender,
        recipientCity: attempt.recipient,
        recipientTownID: route.recipientTown?.id ?? null,
        senderTownID: null,
        pickupType,
        weight,
      }
      const res = await redstarFetch('/api/Operations/DeliveryFee', { method: 'POST', body })
      console.log('Red Star DeliveryFee:', JSON.stringify({ request: body, status: res.status, response: res.data }))

      if (res.ok) {
        fee = extractFee(res.data)
        if (fee != null) break
        lastError = 'Red Star returned a fee we could not read.'
      } else {
        lastError = redstarErrorMessage(res.data, `Red Star rejected the fee request (HTTP ${res.status}).`)
        // A bad key will not be fixed by retrying with a different city format.
        if (res.status === 401 || res.status === 403) break
      }
    }

    if (fee == null) return jsonResponse({ error: lastError }, 502)

    return jsonResponse({
      rates: [
        {
          rateId: `redstar:${pickupType}`,
          carrierName: REDSTAR_CARRIER_NAME,
          amount: fee,
          currency: 'NGN',
          deliveryTime: null,
          deliveryEta: null,
        },
      ],
    })
  } catch (error) {
    console.error('shipping-rates error:', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unexpected shipping error.',
    }, 500)
  }
})
