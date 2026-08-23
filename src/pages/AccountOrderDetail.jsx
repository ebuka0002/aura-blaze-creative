import { useEffect, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchMyOrderDetail } from '../lib/customerOrders'
import { formatNGN, formatUSD } from '../data/products'
import SEO from '../components/SEO'

export default function AccountOrderDetail() {
  const { id } = useParams()
  const { isLoggedIn, loading: authLoading } = useAuth()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isLoggedIn) return
    fetchMyOrderDetail(id)
      .then((result) => {
        setOrder(result.order)
        setItems(result.items)
      })
      .catch((err) => {
        console.error('Failed to load order:', err)
        // RLS will make this look like "not found" for someone else's order
        // ID typed manually — that's the correct, safe behavior, not a bug.
        setError("This order couldn't be found.")
      })
      .finally(() => setLoading(false))
  }, [id, isLoggedIn])

  if (authLoading) return null
  if (!isLoggedIn) return <Navigate to="/account" replace />

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto px-5 md:px-8 py-14 md:py-20">
        <div className="h-40 bg-bone-dim animate-pulse" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-[800px] mx-auto px-5 md:px-8 py-24 text-center">
        <p className="text-grey text-sm mb-4">{error}</p>
        <Link to="/account/orders" className="text-blaze underline underline-offset-4 text-sm">
          Back to Order History
        </Link>
      </div>
    )
  }

  const format = order.currency === 'NGN' ? formatNGN : formatUSD
  const addr = order.shipping_address || {}

  return (
    <div className="max-w-[800px] mx-auto px-5 md:px-8 py-14 md:py-20">
      <SEO title={`Order #${order.order_number}`} path={`/account/orders/${id}`} noindex />
      <Link to="/account/orders" className="text-xs text-grey hover:text-blaze underline underline-offset-4 mb-6 inline-block">
        ← Order History
      </Link>

      <div className="flex items-start justify-between mb-2">
        <h1 className="font-display text-3xl md:text-4xl tracking-wide">Order #{order.order_number}</h1>
        <span className="text-[10px] tracking-[0.1em] uppercase px-2.5 py-1 font-medium bg-bone-dim text-void shrink-0 mt-1">
          {order.status}
        </span>
      </div>
      <p className="text-grey text-sm mb-10">
        Placed {new Date(order.created_at).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        })}
      </p>

      <div className="space-y-4 border-t border-hairline pt-6 mb-10">
        {items.map((item) => (
          <div key={item.id} className="flex gap-4">
            <img src={item.image_url} alt={item.product_name} className="w-16 h-20 object-cover shrink-0 bg-bone-dim" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{item.product_name}</p>
              <p className="text-xs text-grey mt-0.5">{item.color_name} / {item.size} · Qty {item.quantity}</p>
            </div>
            <span className="text-sm shrink-0">{format((item.unit_price * item.quantity) / 100)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-hairline pt-4 space-y-2 text-sm max-w-xs ml-auto mb-10">
        <div className="flex justify-between text-grey">
          <span>Subtotal</span>
          <span className="text-void font-medium">{format(order.subtotal / 100)}</span>
        </div>
        {order.discount_code && order.discount_amount > 0 && (
          <div className="flex justify-between text-blaze">
            <span>Discount ({order.discount_code})</span>
            <span className="font-medium">−{format(order.discount_amount / 100)}</span>
          </div>
        )}
        <div className="flex justify-between text-grey">
          <span>Shipping</span>
          <span className="text-void font-medium">{format(order.shipping_cost / 100)}</span>
        </div>
        <div className="flex justify-between font-medium text-base border-t border-hairline pt-2 mt-2">
          <span>Total</span>
          <span>{format(order.total / 100)}</span>
        </div>
      </div>

      <div className="border-t border-hairline pt-6">
        <h2 className="text-xs tracking-[0.1em] uppercase text-grey mb-3">Shipping To</h2>
        <p className="text-sm">{order.customer_name}</p>
        <p className="text-sm text-grey">
          {addr.address}{addr.address && ', '}{addr.city}{addr.city && ', '}{addr.state}
        </p>
        <p className="text-sm text-grey">{addr.country}</p>
        <p className="text-sm text-grey mt-1">{order.customer_phone}</p>
      </div>
    </div>
  )
}
