import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react'
import { validateDiscountCode, calculateDiscountAmount } from '../lib/discounts'

const CartContext = createContext(null)

const STORAGE_KEY = 'aura_blaze_cart'

// Safe localStorage read/write — must never throw or crash the app.
// localStorage can be unavailable (private browsing in some browsers,
// storage disabled by the user) or contain corrupted/outdated JSON from an
// older version of the site. Either case should degrade to "no saved
// cart," not break the page.
function readPersistedCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Basic shape check — if this doesn't look like what we expect (e.g.
    // leftover data from a future/different schema), ignore it rather than
    // risk feeding malformed data into the rest of the app.
    if (!parsed || !Array.isArray(parsed.items)) return null
    return parsed
  } catch {
    return null
  }
}

function writePersistedCart(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage full or unavailable — the cart still works for this session,
    // it just won't survive a refresh. Not worth surfacing to the user.
  }
}

export function CartProvider({ children }) {
  const persisted = readPersistedCart()

  const [items, setItems] = useState(persisted?.items || [])
  const [isOpen, setIsOpen] = useState(false)
  const [currency, setCurrency] = useState(persisted?.currency || 'NGN')
  const [discount, setDiscount] = useState(null) // { code, discountId, discountType, discountValue } — re-validated below, not trusted from storage directly
  const [discountError, setDiscountError] = useState(null)
  const [applyingDiscount, setApplyingDiscount] = useState(false)
  const [discountRestoring, setDiscountRestoring] = useState(!!persisted?.discountCode)

  const addItem = useCallback((product, size, color, qty = 1, image = null) => {
    setItems((prev) => {
      const key = `${product.id}-${size}-${color}`
      const existing = prev.find((i) => i.key === key)
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i))
      }
      return [
        ...prev,
        {
          key,
          id: product.id,
          dbId: product.dbId || null,
          name: product.name,
          image: image || product.images?.[0] || '',
          priceNGN: product.priceNGN,
          priceUSD: product.priceUSD,
          size,
          color,
          qty,
        },
      ]
    })
    setIsOpen(true)
  }, [])

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((i) => i.key !== key))
  }, [])

  const updateQty = useCallback((key, qty) => {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, qty: Math.max(1, qty) } : i))
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setDiscount(null)
    setDiscountError(null)
  }, [])

  const subtotal = useMemo(() => {
    const field = currency === 'NGN' ? 'priceNGN' : 'priceUSD'
    return items.reduce((sum, i) => sum + i[field] * i.qty, 0)
  }, [items, currency])

  const discountAmount = useMemo(() => {
    if (!discount) return 0
    return calculateDiscountAmount(discount, subtotal)
  }, [discount, subtotal])

  const total = subtotal - discountAmount

  const count = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items])

  // Persist items + currency + the applied discount's code (not its full
  // validated details — those get re-checked fresh below) on every change.
  useEffect(() => {
    writePersistedCart({
      items,
      currency,
      discountCode: discount?.code || null,
    })
  }, [items, currency, discount])

  // On first mount, if a discount code was persisted from a previous
  // session, re-validate it for real rather than trusting the old stored
  // details — time has passed, so it could have expired, hit its usage
  // cap, or been deactivated since the last visit.
  useEffect(() => {
    const code = persisted?.discountCode
    if (!code) return

    // Wait until items/subtotal are settled from the persisted state above
    // before validating, since validation needs a real subtotal to check
    // minimum-order-amount rules against.
    if (items.length === 0) {
      setDiscountRestoring(false)
      return
    }

    const currentSubtotal = items.reduce(
      (sum, i) => sum + i[currency === 'NGN' ? 'priceNGN' : 'priceUSD'] * i.qty,
      0
    )

    validateDiscountCode(code, currentSubtotal, currency)
      .then((result) => {
        if (result.valid) {
          setDiscount({
            code,
            discountId: result.discountId,
            discountType: result.discountType,
            discountValue: result.discountValue,
          })
        }
        // If no longer valid, just silently drop it — no need to show an
        // error for a code the person didn't just type in themselves.
      })
      .catch((err) => {
        console.error('Failed to re-validate persisted discount code:', err)
      })
      .finally(() => setDiscountRestoring(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyDiscount = useCallback(async (code) => {
    setApplyingDiscount(true)
    setDiscountError(null)
    try {
      const result = await validateDiscountCode(code, subtotal, currency)
      if (!result.valid) {
        setDiscount(null)
        setDiscountError(result.reason || 'Invalid code.')
        return false
      }
      setDiscount({
        code: code.toUpperCase(),
        discountId: result.discountId,
        discountType: result.discountType,
        discountValue: result.discountValue,
      })
      return true
    } catch (err) {
      console.error('Failed to validate discount code:', err)
      setDiscount(null)
      setDiscountError('Something went wrong checking that code. Please try again.')
      return false
    } finally {
      setApplyingDiscount(false)
    }
  }, [subtotal, currency])

  const removeDiscount = useCallback(() => {
    setDiscount(null)
    setDiscountError(null)
  }, [])

  // Persist the cart on every change. Only the discount CODE is saved, not
  // its type/value/id — those get re-fetched fresh below, since a code
  // sitting unused in storage could have expired, hit its usage cap, or
  // been deactivated by the time the page is reopened.
  useEffect(() => {
    writePersistedCart({ items, currency, discountCode: discount?.code || null })
  }, [items, currency, discount])

  // On first load, if a discount code was saved from a previous session,
  // re-validate it for real rather than trusting whatever was true when it
  // was saved. Runs once, after the cart's real subtotal is known (needs
  // items to be loaded, which they are synchronously from the initial
  // state above).
  useEffect(() => {
    if (!persisted?.discountCode) return
    if (subtotal === 0) {
      setDiscountRestoring(false)
      return
    }
    validateDiscountCode(persisted.discountCode, subtotal, currency)
      .then((result) => {
        if (result.valid) {
          setDiscount({
            code: persisted.discountCode,
            discountId: result.discountId,
            discountType: result.discountType,
            discountValue: result.discountValue,
          })
        }
        // If it's no longer valid, just don't restore it — no need to
        // surface an error for a code the person isn't actively trying to
        // apply right now, they'll find out if they try to use it again.
      })
      .catch((err) => console.error('Failed to re-validate restored discount code:', err))
      .finally(() => setDiscountRestoring(false))
    // Intentionally only on mount — re-running this on every subtotal
    // change would re-fetch the same restored code repeatedly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // If the cart changes enough that a previously-valid code's minimum
  // order amount is no longer met (e.g. an item was removed), silently
  // re-validating on every keystroke would be excessive — but we do at
  // least clear it rather than let a stale "applied" discount keep
  // showing as active when it may no longer actually qualify. Checkout
  // re-validates for real right before charging regardless (see
  // Checkout.jsx), so this is a UX nicety, not the actual security boundary.
  useEffect(() => {
    if (discount && subtotal === 0) {
      setDiscount(null)
    }
  }, [subtotal, discount])

  // On first load, if a discount code was saved from a previous session,
  // re-validate it for real rather than trusting the persisted copy — it
  // may have expired, hit its usage limit, or been deactivated since the
  // last visit. Only runs once, and only if the cart actually has items to
  // check against (an empty restored cart has nothing to validate yet).
  useEffect(() => {
    if (!persisted?.discountCode || items.length === 0) {
      setDiscountRestoring(false)
      return
    }
    validateDiscountCode(persisted.discountCode, subtotal, currency)
      .then((result) => {
        if (result.valid) {
          setDiscount({
            code: persisted.discountCode,
            discountId: result.discountId,
            discountType: result.discountType,
            discountValue: result.discountValue,
          })
        }
        // If no longer valid, just silently drop it — no need to show an
        // error for a code the person didn't just type in themselves.
      })
      .catch((err) => console.error('Failed to re-validate restored discount code:', err))
      .finally(() => setDiscountRestoring(false))
    // Intentionally only runs once on mount, not on every subtotal/currency
    // change — this is a one-time "is my restored code still good" check,
    // not a continuous re-validation loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist items, currency, and the applied discount's code (not the full
  // discount object — that gets re-validated fresh next time, see above)
  // on every change. isOpen and error/loading flags are deliberately not
  // persisted, since carrying "the cart drawer was open" or a stale error
  // message across a refresh would be a confusing, wrong-feeling restore.
  useEffect(() => {
    writePersistedCart({
      items,
      currency,
      discountCode: discount?.code || null,
    })
  }, [items, currency, discount])

  const value = {
    items,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    subtotal,
    discount,
    discountAmount,
    discountError,
    applyingDiscount,
    discountRestoring,
    applyDiscount,
    removeDiscount,
    total,
    count,
    isOpen,
    setIsOpen,
    currency,
    setCurrency,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
