// Supabase Edge Function: paystack-webhook
//
// Paystack calls this server-to-server whenever a payment succeeds, so an
// order is confirmed (customer email, owner alert, Red Star booking) even if
// the customer closes the tab or loses signal before returning to the site.
//
// It does NOT trust the request body: it checks Paystack's HMAC signature,
// then hands the reference to verify-payment, which re-verifies the
// transaction with Paystack directly and is safe to run more than once.
//
// Set the webhook URL in Paystack Dashboard -> Settings -> API Keys & Webhooks:
//   https://<project-ref>.supabase.co/functions/v1/paystack-webhook

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

async function hmacSha512Hex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('paystack-webhook is not fully configured.')
    return new Response('Not configured', { status: 500 })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-paystack-signature') || ''
  const expected = await hmacSha512Hex(PAYSTACK_SECRET_KEY, rawBody)
  if (!signature || !safeEqual(signature.toLowerCase(), expected)) {
    console.warn('paystack-webhook: invalid signature')
    return new Response('Invalid signature', { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  // Only successful charges matter. Acknowledge everything else so Paystack
  // does not keep retrying.
  if (event?.event !== 'charge.success') return new Response('ignored', { status: 200 })

  const reference = event?.data?.reference
  if (!reference) return new Response('no reference', { status: 200 })

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-payment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reference }),
    })
    const body = await res.text()
    console.log('paystack-webhook -> verify-payment:', JSON.stringify({ reference, status: res.status, body: body.slice(0, 500) }))
    // Non-2xx makes Paystack retry later, which is what we want for a
    // temporary failure.
    return new Response(res.ok ? 'ok' : 'verify failed', { status: res.ok ? 200 : 502 })
  } catch (err) {
    console.error('paystack-webhook: verify-payment call failed:', err)
    return new Response('error', { status: 502 })
  }
})
