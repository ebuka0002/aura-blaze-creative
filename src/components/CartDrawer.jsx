import { AnimatePresence, motion } from 'framer-motion'
import { X, Minus, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatNGN, formatUSD } from '../data/products'

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQty, subtotal, currency } = useCart()
  const format = currency === 'NGN' ? formatNGN : formatUSD

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-void/60 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
          <motion.aside
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-bone z-50 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.35, ease: [0.65, 0, 0.35, 1] }}
          >
            <div className="flex items-center justify-between px-6 h-[76px] border-b border-hairline shrink-0">
              <h2 className="font-display text-2xl tracking-wide">
                Your Bag {items.length > 0 && `(${items.length})`}
              </h2>
              <button onClick={() => setIsOpen(false)} aria-label="Close cart" className="p-2 -mr-2">
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
                <p className="text-grey mb-6">Your bag is empty.</p>
                <Link
                  to="/shop"
                  onClick={() => setIsOpen(false)}
                  className="bg-void text-bone px-6 py-3 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                  {items.map((item) => (
                    <div key={item.key} className="flex gap-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-24 object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <h3 className="text-sm font-medium leading-snug">{item.name}</h3>
                          <button
                            onClick={() => removeItem(item.key)}
                            className="text-grey hover:text-blaze shrink-0"
                            aria-label={`Remove ${item.name}`}
                          >
                            <X size={16} strokeWidth={1.5} />
                          </button>
                        </div>
                        <p className="text-xs text-grey mt-1">
                          {item.color} / {item.size}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center border border-hairline">
                            <button
                              onClick={() => updateQty(item.key, item.qty - 1)}
                              className="w-7 h-7 flex items-center justify-center hover:text-blaze"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="w-7 text-center text-sm">{item.qty}</span>
                            <button
                              onClick={() => updateQty(item.key, item.qty + 1)}
                              className="w-7 h-7 flex items-center justify-center hover:text-blaze"
                              aria-label="Increase quantity"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                          <span className="text-sm font-medium">
                            {format(currency === 'NGN' ? item.priceNGN * item.qty : item.priceUSD * item.qty)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-hairline px-6 py-5 shrink-0">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-grey">Subtotal</span>
                    <span className="font-medium">{format(subtotal)}</span>
                  </div>
                  <p className="text-xs text-grey mb-4">Shipping calculated at checkout.</p>
                  <Link
                    to="/checkout"
                    onClick={() => setIsOpen(false)}
                    className="block text-center bg-void text-bone py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors"
                  >
                    Proceed to Checkout
                  </Link>
                  <Link
                    to="/cart"
                    onClick={() => setIsOpen(false)}
                    className="block text-center py-3 text-sm tracking-[0.05em] underline underline-offset-4 text-grey hover:text-void mt-1"
                  >
                    View Full Cart
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
