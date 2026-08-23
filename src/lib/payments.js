import { supabase } from './supabase'
import { FunctionsHttpError } from '@supabase/supabase-js'

// supabase.functions.invoke() has a real, documented gap: when an Edge
// Function returns a non-2xx status, `error.message` is just the generic
// "Edge Function returned a non-2xx status code" — the function's actual
// error body has to be read separately from error.context, the raw
// Response object. This helper does that extraction so real error
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

// Calls the initialize-payment Edge Function to start a Paystack transaction
// for an existing (pending) order. Returns the URL to redirect the customer
// to for completing payment.
export async function initializePayment(orderId) {
  const { data, error } = await supabase.functions.invoke('initialize-payment', {
    body: { orderId },
  })

  if (error) {
    throw new Error(await extractErrorMessage(error, 'Could not start payment. Please try again.'))
  }
  if (data?.error) throw new Error(data.error)

  return data // { authorization_url, reference }
}

// Calls the verify-payment Edge Function to confirm (server-to-server, with
// Paystack directly) whether a transaction actually succeeded, and updates
// the order status accordingly. Never trust a redirect URL alone as proof
// of payment — this is the real check.
export async function verifyPayment(reference) {
  const { data, error } = await supabase.functions.invoke('verify-payment', {
    body: { reference },
  })

  if (error) {
    throw new Error(await extractErrorMessage(error, 'Could not verify payment.'))
  }
  if (data?.error) throw new Error(data.error)

  return data // { success, orderNumber, status }
}
