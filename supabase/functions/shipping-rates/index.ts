// Supabase Edge Function: shipping-rates
//
// Quotes delivery fees for the customer's address and parcel from every
// configured courier (Red Star Express and, when enabled, GIG Logistics).
// The couriers are quoted in parallel and one failing does not hide the other.
// Nothing is booked here: shipments are only requested after Paystack payment
// has been verified (see shipping-book-pickup).

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
import {
  GIGL_CARRIER_NAME,
  giglQuote,
  isGiglEnabled,
  resolveGiglParties,
} from '../_shared/gigl.ts'

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

type Rate = {
  rateId: string
  carrierName: string
  amount: number
  currency: 'NGN'
  deliveryTime: null
  deliveryEta: null
}

async function quoteRedStar(deliveryAddress: any, items: any[]): Promise<Rate> {
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

  if (fee == null) throw new Error(lastError)

  return {
    rateId: `redstar:${pickupType}`,
    carrierName: REDSTAR_CARRIER_NAME,
    amount: fee,
    currency: 'NGN',
    deliveryTime: null,
    deliveryEta: null,
  }
}

async function quoteGigl(deliveryAddress: any, items: any[]): Promise<Rate> {
  const parties = await resolveGiglParties({
    address: deliveryAddress.address,
    line2: deliveryAddress.line2,
    city: deliveryAddress.city,
    state: deliveryAddress.state,
  })
  const quote = await giglQuote(
    parties,
    items.map((i: any) => ({
      name: i.name,
      category: i.category,
      quantity: Number(i.qty ?? i.quantity ?? 1),
      valueNGN: Number(i.priceNGN ?? 0),
    })),
  )
  return {
    rateId: quote.rateId,
    carrierName: GIGL_CARRIER_NAME,
    amount: quote.amount,
    currency: 'NGN',
    deliveryTime: null,
    deliveryEta: null,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const redstarOn = isRedstarConfigured()
    const giglOn = isGiglEnabled()
    if (!redstarOn && !giglOn) {
      return jsonResponse({ error: 'No courier is configured in Supabase.' }, 500)
    }

    const { deliveryAddress, items, currency = 'NGN' } = await req.json()

    if (!deliveryAddress) return jsonResponse({ error: 'Missing deliveryAddress' }, 400)
    if (!Array.isArray(items) || items.length === 0) {
      return jsonResponse({ error: 'Missing or invalid items' }, 400)
    }
    if (currency !== 'NGN') {
      return jsonResponse({ error: 'Shipping is only available for NGN checkout.' }, 400)
    }
    if (!NIGERIA_ALIASES.includes(String(deliveryAddress.country || 'nigeria').trim().toLowerCase())) {
      return jsonResponse({ error: 'Delivery is within Nigeria only.' }, 400)
    }
    if (!deliveryAddress.address || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.phone) {
      return jsonResponse({ error: 'A complete delivery address is required.' }, 400)
    }

    const jobs: Array<{ name: string; run: Promise<Rate> }> = []
    if (redstarOn) jobs.push({ name: 'Red Star', run: quoteRedStar(deliveryAddress, items) })
    if (giglOn) jobs.push({ name: 'GIG Logistics', run: quoteGigl(deliveryAddress, items) })

    const settled = await Promise.allSettled(jobs.map((j) => j.run))
    const rates: Rate[] = []
    const errors: string[] = []
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') rates.push(r.value)
      else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason)
        console.error(`${jobs[i].name} quote failed:`, msg)
        errors.push(msg)
      }
    })

    if (!rates.length) {
      return jsonResponse({ error: errors[0] || 'Could not calculate shipping for this address.' }, 502)
    }

    rates.sort((a, b) => a.amount - b.amount)
    return jsonResponse({ rates })
  } catch (error) {
    console.error('shipping-rates error:', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unexpected shipping error.',
    }, 500)
  }
})
