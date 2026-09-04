import { supabase } from './supabase'
import { FunctionsHttpError } from '@supabase/supabase-js'

async function extractErrorMessage(error, fallback) {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (body?.error) return body.error
    } catch {
      // Fall through to the SDK error message.
    }
  }
  return error.message || fallback
}

// Creates a Terminal Africa draft shipment and returns live rates tied to it.
// The draft is not booked with a courier until payment is verified server-side.
export async function fetchShippingRates({ deliveryAddress, items, currency }) {
  const { data, error } = await supabase.functions.invoke('shipping-rates', {
    body: { deliveryAddress, items, currency },
  })

  if (error) {
    throw new Error(await extractErrorMessage(error, 'Could not calculate shipping for this address.'))
  }
  if (data?.error) throw new Error(data.error)
  if (!data?.shipmentId || !Array.isArray(data?.rates)) {
    throw new Error('Shipping service returned an incomplete rate response.')
  }

  return data
}

// This is primarily useful for an admin/manual retry. Normal customer
// checkout calls it from verify-payment after Paystack confirms payment.
export async function bookCourierPickup({ orderId }) {
  const { data, error } = await supabase.functions.invoke('shipping-book-pickup', {
    body: { orderId },
  })

  if (error) {
    throw new Error(await extractErrorMessage(error, 'Could not book courier pickup.'))
  }
  if (data?.error) throw new Error(data.error)
  return data
}
