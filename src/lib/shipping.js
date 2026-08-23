import { supabase } from './supabase'
import { FunctionsHttpError } from '@supabase/supabase-js'

// supabase.functions.invoke() has a real, documented gap: when an Edge
// Function returns a non-2xx status, `error.message` is just the generic
// "Edge Function returned a non-2xx status code" — the function's actual
// error body (what we deliberately return, e.g. Terminal Africa's real
// rejection reason) has to be read separately from error.context, which is
// the raw Response object. This helper does that extraction so real error
// messages actually reach the UI instead of a useless generic string.
async function extractErrorMessage(error, fallback) {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (body?.error) return body.error
    } catch {
      // Response body wasn't JSON or couldn't be read — fall through to fallback.
    }
  }
  return error.message || fallback
}

// Fetches real shipping rates from multiple carriers for the given
// delivery address and cart contents, via the shipping-rates Edge
// Function (which talks to Terminal Africa server-side).
// Returns { rates: [{ rateId, carrierName, amount, currency, pickupEta, deliveryEta, deliveryTime }] }.
// No shipmentId — this uses Terminal's "Get Quotes for Shipment" endpoint,
// which returns rates directly without creating a draft shipment first.
// persist_data:true (set server-side) is what makes each rate_id usable
// later to book the real pickup, without needing a separate shipment id.
export async function fetchShippingRates({ deliveryAddress, items, currency }) {
  const { data, error } = await supabase.functions.invoke('shipping-rates', {
    body: { deliveryAddress, items, currency },
  })

  if (error) {
    throw new Error(await extractErrorMessage(error, 'Could not calculate shipping for this address.'))
  }
  if (data?.error) throw new Error(data.error)

  return data
}

// Books the actual courier pickup after payment is confirmed.
export async function bookCourierPickup({ orderId, rateId, shipmentId }) {
  const { data, error } = await supabase.functions.invoke('shipping-book-pickup', {
    body: { orderId, rateId, shipmentId },
  })

  if (error) {
    throw new Error(await extractErrorMessage(error, 'Could not book courier pickup.'))
  }
  if (data?.error) throw new Error(data.error)

  return data
}
