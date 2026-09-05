import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Lock, ShieldCheck } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { formatNGN, formatUSD } from '../data/products'
import SEO from '../components/SEO'
import { createOrder } from '../lib/orders'
import { initializePayment } from '../lib/payments'
import { updateProfile } from '../lib/auth'
import { validateDiscountCode, calculateDiscountAmount, markDiscountUsed } from '../lib/discounts'
import { fetchShippingRates } from '../lib/shipping'
import { COUNTRIES, getCallingCode } from '../data/countries'
import { NIGERIA_STATES, getCitiesForState } from '../data/nigeriaLocations'


const NIGERIA_STATE_SET = new Set(NIGERIA_STATES.map((s) => s.toLowerCase()))
const NIGERIA_CITY_ALIASES = {
  'portharcourt': 'Port Harcourt',
  'port harcourt': 'Port Harcourt',
  'p.h': 'Port Harcourt',
  'benin': 'Benin City',
  'benin city': 'Benin City',
  'uyo': 'Uyo',
  'aba': 'Aba',
  'onitsha': 'Onitsha',
  'owerri': 'Owerri',
  'ibadan': 'Ibadan',
  'abuja': 'Abuja',
}
function normalizeNigeriaAddress(form) {
  if ((form.country || '').trim().toLowerCase() !== 'nigeria') return form
  const state = NIGERIA_STATES.find((s) => s.toLowerCase() === form.state.trim().toLowerCase()) || form.state.trim()
  const cities = getCitiesForState(state)
  const cityKey = form.city.trim().toLowerCase().replace(/\s+/g, ' ')
  const alias = NIGERIA_CITY_ALIASES[cityKey] || NIGERIA_CITY_ALIASES[cityKey.replace(/\s/g, '')]
  const city = cities.find((x) => x.toLowerCase() === cityKey) || cities.find((x) => x.toLowerCase() === (alias || '').toLowerCase()) || form.city.trim()
  return { ...form, state, city }
}

const initialForm = {
  email: '',
  firstName: '',
  lastName: '',
  address: '',
  line2: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  phone: '',
}
export default function Checkout() {
  const { items, subtotal, currency, clearCart, discount, discountAmount } = useCart()
  const { isLoggedIn, user, profile, login } = useAuth()
  const navigate = useNavigate()
  const format = currency === 'NGN' ? formatNGN : formatUSD
  // 'guest' | 'login' — irrelevant once isLoggedIn is true, since a logged-in
  // customer skips this choice entirely and checks out as themselves.
  const [checkoutMode, setCheckoutMode] = useState('guest')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [form, setForm] = useState(initialForm)

  // Real login form state, used only when checkoutMode === 'login'.
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  // Real shipping rates, fetched live from Terminal Africa once the
  // address is filled in — replaces the old hardcoded flat-rate list.
  const [shippingRates, setShippingRates] = useState([])
  const [shippingShipmentId, setShippingShipmentId] = useState(null)
  const [selectedRateId, setSelectedRateId] = useState(null)
  const [ratesLoading, setRatesLoading] = useState(false)
  const [ratesError, setRatesError] = useState(null)

  const selectedRate = shippingRates.find((r) => r.rateId === selectedRateId) || null
  const shippingCost = selectedRate ? selectedRate.amount : 0
  const total = subtotal - discountAmount + shippingCost

  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleCountryChange = (e) => {
    const countryName = e.target.value
    const callingCode = getCallingCode(countryName)
    setForm((prev) => ({
      ...prev,
      country: countryName,
      ...(countryName.trim().toLowerCase() === 'nigeria'
        ? { state: '', city: '', postalCode: '' }
        : { state: prev.state, city: prev.city }),
      // Only prefill the phone field if it's genuinely empty — never
      // overwrite a number the customer already started typing. If they
      // switch countries after typing a number, that's on them to adjust.
      phone: prev.phone.trim() === '' && callingCode ? callingCode + ' ' : prev.phone,
    }))
  }

  // Pre-fill known details for a logged-in customer — this is the actual
  // "faster checkout" payoff of having an account. Only runs once their
  // name/email/saved address are available, and only fills fields the
  // customer hasn't already started typing into.
  useEffect(() => {
    if (!isLoggedIn || !user) return
    setForm((prev) => {
      const addr = profile?.default_address || {}
      const [firstName, ...rest] = (profile?.full_name || '').split(' ')
      return {
        ...prev,
        email: prev.email || user.email || '',
        firstName: prev.firstName || firstName || '',
        lastName: prev.lastName || rest.join(' ') || '',
        address: prev.address || addr.address || '',
        city: prev.city || addr.city || '',
        state: prev.state || addr.state || '',
        country: prev.country || addr.country || '',
        phone: prev.phone || addr.phone || '',
        line2: prev.line2 || addr.line2 || '',
postalCode: prev.postalCode || addr.postalCode || '',
      }
    })
  }, [isLoggedIn, user, profile])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    setLoggingIn(true)
    try {
      await login(loginEmail, loginPassword)
      // Prefill effect above will pick up the new session automatically.
    } catch {
      setLoginError('Incorrect email or password.')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleGetRates = async () => {
    const missingFields = []
    if (!form.address.trim()) missingFields.push('Address')
    if (!form.city.trim()) missingFields.push('City')
    if (!form.state.trim()) missingFields.push('State / Region')
    if (!form.country.trim()) missingFields.push('Country')
    if (!form.phone.trim()) missingFields.push('Phone number')

    if (missingFields.length > 0) {
      setRatesError(`Please fill in: ${missingFields.join(', ')}.`)
      return
    }

    setRatesLoading(true)
    setRatesError(null)
    setShippingRates([])
    setSelectedRateId(null)

    try {
      const shippingForm = normalizeNigeriaAddress(form)
      const { shipmentId, rates } = await fetchShippingRates({
        deliveryAddress: {
  address: form.address,
  line2: form.line2,
  city: form.city,
  state: form.state,
  postalCode: form.postalCode,
  country: form.country,
  firstName: form.firstName,
  lastName: form.lastName,
  email: form.email,
  phone: form.phone,
},
        items,
        currency,
      })

      if (!rates.length) {
        setRatesError('No shipping rates available for this address. Please contact us for help.')
        return
      }

      setShippingShipmentId(shipmentId)
      setShippingRates(rates)
      // Pre-select the cheapest option as a sensible default — the
      // customer can still change it before paying.
      const cheapest = [...rates].sort((a, b) => a.amount - b.amount)[0]
      setSelectedRateId(cheapest.rateId)
    } catch (err) {
      console.error('Failed to fetch shipping rates:', err)
      setRatesError(
        err.message && err.message !== 'Failed to fetch'
          ? err.message
          : 'Could not calculate shipping for this address. Please try again.'
      )
    } finally {
      setRatesLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto px-5 py-24 text-center">
        <SEO title="Checkout" path="/checkout" noindex />
        <h1 className="font-display text-3xl tracking-wide mb-4">Your bag is empty</h1>
        <Link to="/shop" className="text-blaze underline underline-offset-4">Go shop something first</Link>
      </div>
    )
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    setSubmitError(null)

    // Required-field check — applies whether checking out as a guest or a
    // logged-in customer, since both use the same shipping form.
    const required = ['email', 'firstName', 'lastName', 'address', 'city', 'state', 'country', 'phone']
    const missing = required.filter((f) => !form[f].trim())
    if (missing.length > 0) {
      setSubmitError('Please fill in all required fields before placing your order.')
      return
    }

    if (!selectedRate) {
      setSubmitError('Please calculate and select a shipping method before placing your order.')
      return
    }

    setSubmitting(true)

    // Re-validate the discount code right before charging, rather than
    // trusting whatever's sitting in context — it could have expired,
    // hit its usage limit, or been deactivated since it was applied
    // earlier in the session. This is the actual security/correctness
    // boundary; the Cart page's version is just a UX preview.
    let confirmedDiscount = null
    if (discount) {
      try {
        const revalidated = await validateDiscountCode(discount.code, subtotal, currency)
        if (revalidated.valid) {
          confirmedDiscount = {
            code: discount.code,
            discountId: revalidated.discountId,
            amount: calculateDiscountAmount(
              { discountType: revalidated.discountType, discountValue: revalidated.discountValue },
              subtotal
            ),
          }
        } else {
          setSubmitError(
            `The code "${discount.code}" is no longer valid (${revalidated.reason || 'unknown reason'}). Please remove it and try again.`
          )
          setSubmitting(false)
          return
        }
      } catch (err) {
        console.error('Failed to re-validate discount at checkout:', err)
        setSubmitError('Could not confirm your discount code. Please try again.')
        setSubmitting(false)
        return
      }
    }

    const finalTotal = subtotal - (confirmedDiscount?.amount || 0) + shippingCost

    // Real flow: create the order (status 'pending') → ask Paystack to open
    // a transaction for it → redirect the customer to Paystack's hosted
    // checkout page → they pay → Paystack redirects back to
    // /order-confirmation with a reference → that page verifies the payment
    // server-to-server and only then marks the order 'paid'.
    try {
      const { orderNumber, orderId } = await createOrder({
        items,
        currency,
        subtotal,
        shippingCost,
        shippingMethod: `${selectedRate.carrierName} (${selectedRate.deliveryTime || selectedRate.deliveryEta || 'estimated delivery varies'})`,
        shippingRateId: selectedRate.rateId,
        shippingShipmentId,
        customerName: `${form.firstName} ${form.lastName}`.trim(),
        customerEmail: form.email,
        customerPhone: form.phone,
        shippingAddress: {
          address: form.address,
          line2: form.line2,
          city: form.city,
          state: form.state,
          country: form.country,
          postalCode: form.postalCode,
        },
        userId: isLoggedIn ? user.id : null,
        discountCode: confirmedDiscount?.code || null,
        discountAmount: confirmedDiscount?.amount || 0,
      })

      // Only count the code as "used" once an order actually exists for it —
      // best-effort, shouldn't block an order that already succeeded.
      if (confirmedDiscount) {
        markDiscountUsed(confirmedDiscount.discountId)
      }

      // Save the shipping details to their profile so next time's checkout
      // is genuinely pre-filled — this is best-effort; a failure here
      // shouldn't block an order that already succeeded.
      if (isLoggedIn) {
        updateProfile(user.id, {
          fullName: `${form.firstName} ${form.lastName}`.trim(),
          defaultAddress: {
            address: form.address,
            city: form.city,
            state: form.state,
            country: form.country,
            phone: form.phone,
            line2: form.line2,
postalCode: form.postalCode,
          },
        }).catch((err) => console.error('Failed to save address to profile:', err))
      }

      if (currency !== 'NGN') {
        // Paystack payment currently only supports NGN settlement in this
        // integration (see notes in the initialize-payment function). The
        // order is still saved for record-keeping, but we can't route this
        // one through Paystack yet — send the customer to confirmation with
        // a clear note rather than a broken payment attempt.
        clearCart()
        navigate('/order-confirmation', {
          state: { orderNumber, items, paymentUnavailable: true },
        })
        return
      }

      const { authorization_url } = await initializePayment(orderId)
      clearCart()
      window.location.href = authorization_url
    } catch (err) {
      console.error('Failed to place order — full error:', err)
      console.error('Error message:', err?.message)
      console.error('Error details:', err?.details)
      console.error('Error hint:', err?.hint)
      console.error('Error code:', err?.code)
      setSubmitError(
        "Something went wrong placing your order. Please try again, or contact us if this keeps happening."
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-10 md:py-14">
      <SEO title="Checkout" path="/checkout" noindex />
      <h1 className="font-display text-4xl md:text-5xl tracking-wide mb-3">Checkout</h1>
      <p className="text-xs text-grey flex items-center gap-1.5 mb-10">
        <Lock size={12} /> Secure checkout — your information is encrypted
      </p>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">
        <div className="space-y-10">
          {isLoggedIn ? (
            <div className="border border-hairline bg-bone-dim px-4 py-3.5 text-sm flex items-center justify-between">
              <span>
                Checking out as <span className="font-medium">{user.email}</span>
              </span>
              <Link to="/account" className="text-xs underline underline-offset-4 text-grey hover:text-blaze">
                Not you?
              </Link>
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCheckoutMode('guest')}
                  className={`flex-1 py-3 text-sm font-medium border transition-colors ${checkoutMode === 'guest' ? 'bg-void text-bone border-void' : 'border-hairline'}`}
                >
                  Guest Checkout
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutMode('login')}
                  className={`flex-1 py-3 text-sm font-medium border transition-colors ${checkoutMode === 'login' ? 'bg-void text-bone border-void' : 'border-hairline'}`}
                >
                  Log In
                </button>
              </div>

              {checkoutMode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-3">
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
                  />
                  {loginError && <p className="text-xs text-blaze">{loginError}</p>}
                  <button
                    type="submit"
                    disabled={loggingIn}
                    className="w-full border border-void py-3 text-sm font-medium hover:bg-void hover:text-bone transition-colors disabled:opacity-60"
                  >
                    {loggingIn ? 'Logging in…' : 'Log In & Continue'}
                  </button>
                  <p className="text-xs text-grey text-center">
                    No account? <Link to="/account" className="underline underline-offset-4 hover:text-blaze">Sign up</Link> — or just continue as a guest above.
                  </p>
                </form>
              )}
            </>
          )}

          {(isLoggedIn || checkoutMode === 'guest') && (
            <>
              {/* Contact */}
              <div>
                <h2 className="text-xs tracking-[0.1em] uppercase text-grey mb-4">Contact</h2>
                <input
                  required
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={updateField('email')}
                  className="w-full border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
                />
              </div>

              {/* Shipping info */}
              <div>
                <h2 className="text-xs tracking-[0.1em] uppercase text-grey mb-4">Shipping Address</h2>
                <div className="grid grid-cols-2 gap-3">
                  <input required placeholder="First name" value={form.firstName} onChange={updateField('firstName')} className="border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze" />
                  <input required placeholder="Last name" value={form.lastName} onChange={updateField('lastName')} className="border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze" />
                  <input
  required
  placeholder="Address"
  value={form.address}
  onChange={updateField('address')}
  className="col-span-2 border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
/>

<input
  placeholder="Apartment, suite, unit, etc. (optional)"
  value={form.line2}
  onChange={updateField('line2')}
  className="col-span-2 border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
/>

{form.country.trim().toLowerCase() === 'nigeria' ? (
  <>
    <select
      required
      value={form.state}
      onChange={(e) => {
        const state = e.target.value
        setForm((prev) => ({ ...prev, state, city: '' }))
        setShippingRates([])
        setSelectedRateId(null)
        setShippingShipmentId(null)
        setRatesErr(null)
      }}
      className="border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze bg-bone"
    >
      <option value="" disabled>Select state</option>
      {NIGERIA_STATES.map((state) => (
        <option key={state} value={state}>{state}</option>
      ))}
    </select>

    <select
      required
      value={form.city}
      onChange={updateField('city')}
      disabled={!form.state}
      className="border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze bg-bone disabled:opacity-50"
    >
      <option value="" disabled>{form.state ? 'Select city' : 'Select state first'}</option>
      {getCitiesForState(form.state).map((city) => (
        <option key={city} value={city}>{city}</option>
      ))}
    </select>
  </>
) : (
  <>
    <input
      required
      placeholder="City"
      value={form.city}
      onChange={updateField('city')}
      className="border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
    />
    <input
      required
      placeholder="State / Region"
      value={form.state}
      onChange={updateField('state')}
      className="border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
    />
  </>
)}

<div className="col-span-2 sm:col-span-1">
  <input
    placeholder="Postal / ZIP code (optional)"
    value={form.postalCode}
    onChange={updateField('postalCode')}
    className="w-full border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
  />
  
</div>

<select
  required
  value={form.country}
  onChange={handleCountryChange}
  className="border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze bg-bone"
>
  <option value="" disabled>Select a country</option>
  {COUNTRIES.map((c) => (
    <option key={c.code} value={c.name}>{c.name}</option>
  ))}
</select>

<input
  required
  placeholder="Phone number"
  value={form.phone}
  onChange={updateField('phone')}
  className="col-span-2 border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
/>
                </div>
              </div>
            </>
          )}

          {/* Shipping method */}
          <div>
            <h2 className="text-xs tracking-[0.1em] uppercase text-grey mb-4">Shipping Method</h2>

            {shippingRates.length === 0 ? (
              <div>
                <button
                  type="button"
                  onClick={handleGetRates}
                  disabled={ratesLoading}
                  className="w-full border border-void py-3.5 text-sm font-medium hover:bg-void hover:text-bone transition-colors disabled:opacity-60"
                >
                  {ratesLoading ? 'Calculating shipping…' : 'Calculate Shipping'}
                </button>
                <p className="text-xs text-grey mt-2">
                  Fill in your address above, then calculate real shipping rates from our courier partners.
                </p>
                {ratesError && <p className="text-xs text-blaze mt-2">{ratesError}</p>}
              </div>
            ) : (
              <div className="space-y-2.5">
                {shippingRates.map((rate) => (
                  <label
                    key={rate.rateId}
                    className={`flex items-center justify-between border px-4 py-3.5 text-sm cursor-pointer transition-colors ${
                      selectedRateId === rate.rateId ? 'border-blaze bg-bone-dim' : 'border-hairline'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        checked={selectedRateId === rate.rateId}
                        onChange={() => setSelectedRateId(rate.rateId)}
                        className="accent-blaze"
                      />
                      <span>
                        <span className="block font-medium">{rate.carrierName}</span>
                        {(rate.deliveryTime || rate.deliveryEta) && (
                          <span className="block text-xs text-grey">{rate.deliveryTime || rate.deliveryEta}</span>
                        )}
                      </span>
                    </span>
                    <span className="font-medium">{format(rate.amount)}</span>
                  </label>
                ))}
                <button
                  type="button"
                  onClick={handleGetRates}
                  disabled={ratesLoading}
                  className="text-xs text-grey hover:text-blaze underline underline-offset-4"
                >
                  {ratesLoading ? 'Recalculating…' : 'Recalculate for a different address'}
                </button>
              </div>
            )}
          </div>

          {/* Payment */}
          <div>
            <h2 className="text-xs tracking-[0.1em] uppercase text-grey mb-4">Payment</h2>
            <div className="border border-hairline p-5 flex items-center gap-3 bg-bone-dim">
              <ShieldCheck size={20} className="text-blaze shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Secured by Paystack</p>
                <p className="text-grey text-xs mt-0.5">Card, bank transfer, USSD, or mobile money. You'll be redirected to complete payment.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div className="bg-bone-dim p-6 md:p-7 h-fit">
          <h2 className="font-display text-2xl tracking-wide mb-5">Order Summary</h2>
          <div className="space-y-4 max-h-64 overflow-y-auto mb-5">
            {items.map((item) => (
              <div key={item.key} className="flex gap-3">
                <div className="relative shrink-0">
                  <img src={item.image} alt={item.name} className="w-14 h-16 object-cover" />
                  <span className="absolute -top-2 -right-2 bg-void text-bone text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                    {item.qty}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-grey">{item.color} / {item.size}</p>
                </div>
                <span className="text-sm shrink-0">
                  {format(currency === 'NGN' ? item.priceNGN * item.qty : item.priceUSD * item.qty)}
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-2.5 text-sm border-t border-hairline pt-4">
            <div className="flex justify-between text-grey">
              <span>Subtotal</span>
              <span className="text-void font-medium">{format(subtotal)}</span>
            </div>
            <div className="flex justify-between text-grey">
              <span>Shipping</span>
              <span className="text-void font-medium">{format(shippingCost)}</span>
            </div>
          </div>
          <div className="flex justify-between border-t border-hairline mt-4 pt-4 font-medium text-base">
            <span>Total</span>
            <span>{format(total)}</span>
          </div>

          {submitError && (
            <p className="text-xs text-blaze mt-4">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-void text-bone py-4 text-sm tracking-[0.12em] uppercase font-medium hover:bg-blaze transition-colors mt-6 disabled:opacity-60"
          >
            {submitting ? 'Redirecting to Paystack…' : 'Place Order'}
          </button>
          <p className="text-[11px] text-grey text-center mt-3">
            You'll be redirected to Paystack to complete payment securely. 
          </p>
        </div>
      </form>
    </div>
  )
}
