import { useState, useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { fetchAllOrdersAdmin, fetchOrderItemsAdmin, updateOrderStatus } from '../../lib/adminOrders'

function formatMoney(minorUnits, currency) {
  const amount = minorUnits / 100
  return new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

const statuses = ['pending', 'paid', 'fulfilled', 'cancelled']

export default function AdminOrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchAllOrdersAdmin(), fetchOrderItemsAdmin(id)])
      .then(([allOrders, orderItems]) => {
        const o = allOrders.find((x) => x.id === id)
        if (!o) {
          setNotFound(true)
          return
        }
        setOrder(o)
        setItems(orderItems)
      })
      .catch((err) => {
        console.error('Failed to load order:', err)
        setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleStatusChange = async (newStatus) => {
  setUpdatingStatus(true)

  try {
    const result =
      await updateOrderStatus(
        id,
        newStatus
      )

    setOrder((prev) => ({
      ...prev,
      status: newStatus,
    }))

    if (
      newStatus === 'fulfilled' &&
      result?.emailSent === false &&
      !result?.alreadySent
    ) {
      alert(
        `Order was marked as fulfilled, but the delivery email could not be sent.\n\n${
          result.emailError ||
          'Please try again.'
        }`
      )
    }
  } catch (err) {
    console.error(
      'Failed to update order status:',
      err
    )

    alert(
      'Could not update order status. Please try again.'
    )
  } finally {
    setUpdatingStatus(false)
  }
}

  if (loading) {
    return <div className="p-8"><p className="text-grey text-sm">Loading…</p></div>
  }

  if (notFound) {
    return <Navigate to="/admin/orders" replace />
  }

  const address = order.shipping_address || {}

  return (
    <div className="p-4 md:p-8 max-w-[900px]">
      <Link to="/admin/orders" className="flex items-center gap-1.5 text-sm text-grey hover:text-blaze mb-6 w-fit">
        <ArrowLeft size={15} /> Back to Orders
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="font-display text-2xl sm:text-3xl tracking-wide break-all">Order #{order.order_number}</h1>
        <select
          value={order.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={updatingStatus}
          className="border border-hairline px-3 py-2 text-sm capitalize focus:outline-none focus:border-blaze disabled:opacity-50"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <div className="bg-white border border-hairline p-5">
          <h2 className="text-xs tracking-[0.1em] uppercase text-grey mb-3">Customer</h2>
          <p className="text-sm font-medium">{order.customer_name}</p>
          <p className="text-sm text-grey">{order.customer_email}</p>
          <p className="text-sm text-grey">{order.customer_phone}</p>
        </div>
        <div className="bg-white border border-hairline p-5">
          <h2 className="text-xs tracking-[0.1em] uppercase text-grey mb-3">Shipping</h2>
          <p className="text-sm">{address.address}</p>
          <p className="text-sm">{address.city}, {address.state}</p>
          <p className="text-sm">{address.country}</p>
          <p className="text-xs text-grey mt-2">{order.shipping_method}</p>
        </div>
      </div>

      <div className="bg-white border border-hairline p-5">
        <h2 className="text-xs tracking-[0.1em] uppercase text-grey mb-4">Items</h2>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 border-b border-hairline/50 pb-3 last:border-0 last:pb-0">
              {item.image_url && (
                <img src={item.image_url} alt="" className="w-12 h-14 object-cover shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{item.product_name}</p>
                <p className="text-xs text-grey">{item.color_name} / {item.size} × {item.quantity}</p>
              </div>
              <p className="text-sm">{formatMoney(item.unit_price * item.quantity, order.currency)}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-hairline mt-4 pt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-grey">
            <span>Subtotal</span>
            <span>{formatMoney(order.subtotal, order.currency)}</span>
          </div>
          {order.discount_code && order.discount_amount > 0 && (
            <div className="flex justify-between text-blaze">
              <span>Discount ({order.discount_code})</span>
              <span>−{formatMoney(order.discount_amount, order.currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-grey">
            <span>Shipping</span>
            <span>{formatMoney(order.shipping_cost, order.currency)}</span>
          </div>
          <div className="flex justify-between font-medium text-base pt-1.5">
            <span>Total</span>
            <span>{formatMoney(order.total, order.currency)}</span>
          </div>
        </div>
      </div>

      {order.paystack_reference && (
        <p className="text-xs text-grey mt-4">Paystack reference: {order.paystack_reference}</p>
      )}
    </div>
  )
}
