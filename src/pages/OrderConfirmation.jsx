import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Check, Star, X, Loader2 } from 'lucide-react'
import { addReview } from '../data/reviews'
import { verifyPayment } from '../lib/payments'
import SEO from '../components/SEO'

function ItemReviewRow({ item }) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (rating === 0 || !name.trim()) return
    setError('')
    setSubmitting(true)
    try {
      await addReview(item.id, {
        name: name.trim(),
        rating,
        text: text.trim() || 'Great purchase!',
        orderItemId: item.orderItemId || null,
      })
      setDone(true)
    } catch (err) {
      console.error('Failed to submit post-purchase review:', err)
      setError('Something went wrong submitting this review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border border-hairline p-5 flex gap-4">
      <img src={item.image} alt={item.name} className="w-16 h-20 object-cover shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm mb-2">{item.name}</p>
        {done ? (
          <p className="text-sm text-blaze">Thanks for rating this item!</p>
        ) : (
          <div className="space-y-2.5">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                >
                  <Star size={18} className={(hoverRating || rating) >= n ? 'fill-blaze text-blaze' : 'text-hairline'} />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-hairline px-3 py-2 text-sm focus:outline-none focus:border-blaze"
                />
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="A quick word about it (optional)"
                  className="w-full border border-hairline px-3 py-2 text-sm focus:outline-none focus:border-blaze"
                />
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="bg-void text-bone px-4 py-2 text-xs tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
                {error && <p className="text-xs text-blaze">{error}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// This page has two distinct arrival paths:
// 1. From our own Checkout page (React state) — used only for the
//    currently-unsupported USD/non-Paystack case.
// 2. From Paystack's redirect after payment — a fresh browser navigation
//    with NO React state, only a `?reference=` (or `?trxref=`) query param.
//    This is the real, normal path for a paying customer and must be
//    handled as a first-class case, not treated as "no order found."
export default function OrderConfirmation() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const routeState = location.state

  const reference = searchParams.get('reference') || searchParams.get('trxref')

  const [verifying, setVerifying] = useState(!!reference)
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifyError, setVerifyError] = useState(null)

  useEffect(() => {
    if (!reference) return
    // Guards against React StrictMode's intentional double-invoke of
    // effects in development (and any other scenario, like a fast re-render,
    // that could otherwise fire this twice for the same reference). The
    // database-level fix in confirm_order_paid() is what actually prevents
    // a duplicate email even if this ever did fire twice — this is just to
    // avoid a wasted second network round trip.
    let cancelled = false
    verifyPayment(reference)
      .then((result) => {
        if (!cancelled) setVerifyResult(result)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Payment verification failed:', err)
        setVerifyError(
          "We couldn't confirm your payment automatically. If you were charged, please contact us with your reference so we can confirm it manually."
        )
      })
      .finally(() => {
        if (!cancelled) setVerifying(false)
      })
    return () => {
      cancelled = true
    }
  }, [reference])

  // Verifying a Paystack redirect
  if (reference) {
    if (verifying) {
      return (
        <div className="max-w-[700px] mx-auto px-5 md:px-8 py-24 text-center">
          <SEO title="Confirming Payment" path="/order-confirmation" noindex />
          <Loader2 size={32} className="animate-spin mx-auto mb-4 text-blaze" />
          <h1 className="font-display text-3xl tracking-wide mb-2">Confirming your payment…</h1>
          <p className="text-grey text-sm">This will just take a moment.</p>
        </div>
      )
    }

    if (verifyError || !verifyResult?.success) {
      return (
        <div className="max-w-[700px] mx-auto px-5 md:px-8 py-24 text-center">
          <SEO title={verifyError ? 'Payment Unconfirmed' : 'Payment Not Successful'} path="/order-confirmation" noindex />
          <div className="w-14 h-14 rounded-full bg-blaze/10 flex items-center justify-center mx-auto mb-5">
            <X size={26} className="text-blaze" strokeWidth={2} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl tracking-wide mb-3">
            {verifyError ? 'Payment Unconfirmed' : 'Payment Not Successful'}
          </h1>
          <p className="text-grey text-sm max-w-md mx-auto mb-8">
            {verifyError ||
              "It looks like this payment didn't go through. No charge should have been made — please try again."}
          </p>
          <Link
            to="/checkout"
            className="inline-block bg-void text-bone px-8 py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors"
          >
            Back to Checkout
          </Link>
        </div>
      )
    }

    // Payment verified successfully — show a simpler confirmation, since we
    // don't have the cart's item list on this fresh navigation (no route
    // state survives an external redirect) to offer the review prompts.
    return (
      <div className="max-w-[700px] mx-auto px-5 md:px-8 py-16 md:py-24">
        <SEO title="Payment Confirmed" path="/order-confirmation" noindex />
        <div className="text-center mb-12">
          <div className="w-14 h-14 rounded-full bg-blaze/10 flex items-center justify-center mx-auto mb-5">
            <Check size={26} className="text-blaze" strokeWidth={2} />
          </div>
          <h1 className="font-display text-4xl md:text-5xl tracking-wide mb-3">Payment Confirmed</h1>
          <p className="text-grey text-sm">
            Order <span className="text-void font-medium">#{verifyResult.orderNumber}</span> has been paid and received. A confirmation has been sent to your email.
          </p>
        </div>

        {verifyResult.items?.length > 0 && (
          <div className="border-t border-hairline pt-10">
            <h2 className="font-display text-2xl tracking-wide mb-2">How was it?</h2>
            <p className="text-grey text-sm mb-6">
              Rate what you just ordered — it helps other customers shop with confidence.
            </p>
            <div className="space-y-4">
              {verifyResult.items.map((item) => (
                <ItemReviewRow key={item.key} item={item} />
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-12">
          <Link
            to="/shop"
            className="inline-block bg-void text-bone px-8 py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  // No reference in the URL — this must be arriving from our own Checkout
  // page's React state (currently only used for the USD/unsupported-payment
  // path). If neither is present, there's genuinely nothing to show.
  if (!routeState) {
    return (
      <div className="max-w-[700px] mx-auto px-5 md:px-8 py-24 text-center">
        <SEO title="Order Confirmation" path="/order-confirmation" noindex />
        <h1 className="font-display text-3xl tracking-wide mb-4">No order found</h1>
        <Link to="/shop" className="text-blaze underline underline-offset-4">Continue shopping</Link>
      </div>
    )
  }

  const orderNumber = routeState.orderNumber
  const items = routeState.items || []

  if (routeState.paymentUnavailable) {
    return (
      <div className="max-w-[700px] mx-auto px-5 md:px-8 py-16 md:py-24 text-center">
        <SEO title="Order Received" path="/order-confirmation" noindex />
        <div className="w-14 h-14 rounded-full bg-bone-dim flex items-center justify-center mx-auto mb-5">
          <Check size={26} className="text-void" strokeWidth={2} />
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-wide mb-3">Order Received</h1>
        <p className="text-grey text-sm max-w-md mx-auto mb-10">
          Order <span className="text-void font-medium">#{orderNumber}</span> has been saved, but online payment
          isn't available for USD orders yet. We'll be in touch to arrange payment — or contact us directly via
          WhatsApp to complete this order sooner.
        </p>
        <Link
          to="/shop"
          className="inline-block bg-void text-bone px-8 py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-[700px] mx-auto px-5 md:px-8 py-16 md:py-24">
      <SEO title="Order Confirmed" path="/order-confirmation" noindex />
      <div className="text-center mb-12">
        <div className="w-14 h-14 rounded-full bg-blaze/10 flex items-center justify-center mx-auto mb-5">
          <Check size={26} className="text-blaze" strokeWidth={2} />
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-wide mb-3">Order Confirmed</h1>
        <p className="text-grey text-sm">
          Order <span className="text-void font-medium">#{orderNumber}</span> has been received.
        </p>
      </div>

      <div className="border-t border-hairline pt-10">
        <h2 className="font-display text-2xl tracking-wide mb-2">How was it?</h2>
        <p className="text-grey text-sm mb-6">
          Rate what you just ordered — it helps other customers shop with confidence.
        </p>
        <div className="space-y-4">
          {items.map((item) => (
            <ItemReviewRow key={item.key} item={item} />
          ))}
        </div>
      </div>

      <div className="text-center mt-12">
        <Link
          to="/shop"
          className="inline-block bg-void text-bone px-8 py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}
