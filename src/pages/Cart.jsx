import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Minus, Plus, X, Tag, Check } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { formatNGN, formatUSD } from '../data/products'
import SEO from '../components/SEO'

export default function Cart() {
  const {
    items, removeItem, updateQty, subtotal, currency,
    discount, discountAmount, discountError, applyingDiscount, discountRestoring, applyDiscount, removeDiscount,
  } = useCart()
  const [promoInput, setPromoInput] = useState('')
  const format = currency === 'NGN' ? formatNGN : formatUSD

  const shipping = items.length === 0 ? 0 : subtotal > (currency === 'NGN' ? 50000 : 65) ? 0 : (currency === 'NGN' ? 3500 : 12)

  const handleApplyPromo = async (e) => {
    e.preventDefault()
    if (!promoInput.trim()) return
    const ok = await applyDiscount(promoInput.trim())
    if (ok) setPromoInput('')
  }

  if (items.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-24 md:py-32 text-center">
        <SEO title="Your Bag" path="/cart" noindex />
        <h1 className="font-display text-4xl tracking-wide mb-4">Your Bag is Empty</h1>
        <p className="text-grey mb-8">Looks like you haven't added anything yet.</p>
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
    <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-10 md:py-14">
      <SEO title="Your Bag" path="/cart" noindex />
      <h1 className="font-display text-4xl md:text-5xl tracking-wide mb-10">Your Bag</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">
        <div className="divide-y divide-hairline">
          {items.map((item) => (
            <div key={item.key} className="flex gap-5 py-6 first:pt-0">
              <img src={item.image} alt={item.name} className="w-24 h-28 md:w-28 md:h-32 object-cover shrink-0" />
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div className="flex justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-grey mt-1">{item.color} / {item.size}</p>
                  </div>
                  <button onClick={() => removeItem(item.key)} className="text-grey hover:text-blaze shrink-0" aria-label={`Remove ${item.name}`}>
                    <X size={18} strokeWidth={1.5} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center border border-hairline">
                    <button onClick={() => updateQty(item.key, item.qty - 1)} className="w-9 h-9 flex items-center justify-center hover:text-blaze" aria-label="Decrease quantity">
                      <Minus size={14} />
                    </button>
                    <span className="w-9 text-center text-sm">{item.qty}</span>
                    <button onClick={() => updateQty(item.key, item.qty + 1)} className="w-9 h-9 flex items-center justify-center hover:text-blaze" aria-label="Increase quantity">
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-medium">
                    {format(currency === 'NGN' ? item.priceNGN * item.qty : item.priceUSD * item.qty)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-bone-dim p-6 md:p-7 h-fit">
          <h2 className="font-display text-2xl tracking-wide mb-5">Order Summary</h2>

          {discountRestoring ? (
            <div className="border border-hairline bg-bone-dim px-4 py-3 mb-5 text-sm text-grey">
              Checking your saved promo code…
            </div>
          ) : discount ? (
            <div className="flex items-center justify-between border border-blaze/30 bg-blaze/5 px-4 py-3 mb-5">
              <span className="flex items-center gap-2 text-sm">
                <Check size={14} className="text-blaze shrink-0" />
                <span>
                  Code <span className="font-medium">{discount.code}</span> applied
                </span>
              </span>
              <button
                type="button"
                onClick={removeDiscount}
                className="text-xs text-grey hover:text-blaze underline underline-offset-4"
              >
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyPromo} className="flex gap-2 mb-5">
              <div className="relative flex-1">
                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey" />
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Promo code"
                  className="w-full border border-hairline bg-bone pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blaze uppercase placeholder:normal-case"
                />
              </div>
              <button
                type="submit"
                disabled={applyingDiscount}
                className="border border-void px-4 text-sm font-medium hover:bg-void hover:text-bone transition-colors disabled:opacity-60"
              >
                {applyingDiscount ? 'Checking…' : 'Apply'}
              </button>
            </form>
          )}
          {discountError && <p className="text-xs text-blaze -mt-3 mb-4">{discountError}</p>}

          <div className="space-y-2.5 text-sm border-t border-hairline pt-4">
            <div className="flex justify-between text-grey">
              <span>Subtotal</span>
              <span className="text-void font-medium">{format(subtotal)}</span>
            </div>
            {discount && (
              <div className="flex justify-between text-blaze">
                <span>Discount ({discount.code})</span>
                <span className="font-medium">−{format(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-grey">
              <span>Shipping</span>
              <span className="text-void font-medium">{shipping === 0 ? 'Free' : format(shipping)}</span>
            </div>
          </div>
          <div className="flex justify-between border-t border-hairline mt-4 pt-4 font-medium text-base">
            <span>Total</span>
            <span>{format(subtotal - discountAmount + shipping)}</span>
          </div>

          <Link
            to="/checkout"
            className="block text-center bg-void text-bone py-4 text-sm tracking-[0.12em] uppercase font-medium hover:bg-blaze transition-colors mt-6"
          >
            Proceed to Checkout
          </Link>
          <Link to="/shop" className="block text-center py-3 text-sm text-grey underline underline-offset-4 hover:text-void mt-1">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
