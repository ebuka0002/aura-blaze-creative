import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchMyOrders } from '../lib/customerOrders'
import { formatNGN, formatUSD } from '../data/products'
import SEO from '../components/SEO'
import { ExternalLink } from 'lucide-react'
import { getCourier, realWaybill } from '../lib/tracking'

const statusStyles = {
  pending: 'bg-bone-dim text-grey',
  paid: 'bg-blaze/10 text-blaze',
  fulfilled: 'bg-void text-bone',
  cancelled: 'bg-hairline text-grey line-through',
}

export default function AccountOrders() {
  const { isLoggedIn, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isLoggedIn) return
    fetchMyOrders()
      .then(setOrders)
      .catch((err) => {
        console.error('Failed to load order history:', err)
        setError('Could not load your orders. Please try refreshing the page.')
      })
      .finally(() => setLoading(false))
  }, [isLoggedIn])

  if (authLoading) return null
  if (!isLoggedIn) return <Navigate to="/account" replace />

  return (
    <div className="max-w-[800px] mx-auto px-5 md:px-8 py-14 md:py-20">
      <SEO title="Order History" path="/account/orders" noindex />
      <Link to="/account" className="text-xs text-grey hover:text-blaze underline underline-offset-4 mb-6 inline-block">
        ← My Account
      </Link>
      <h1 className="font-display text-4xl md:text-5xl tracking-wide mb-10">Order History</h1>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-bone-dim animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-grey text-sm">{error}</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-grey text-sm mb-6">You haven't placed any orders yet.</p>
          <Link
            to="/shop"
            className="inline-block bg-void text-bone px-7 py-3 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-hairline border-t border-hairline">
          {orders.map((order) => {
            const format = order.currency === 'NGN' ? formatNGN : formatUSD
            const waybill = order.courier_booking_status === 'booked' || order.courier_booking_status === 'cancelled'
              ? realWaybill(order.courier_tracking_number)
              : null
            const courier = getCourier(order)
            return (
              <div key={order.id} className="py-5 hover:bg-bone-dim/50 transition-colors px-2 -mx-2">
                <Link to={`/account/orders/${order.id}`} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">#{order.order_number}</p>
                    <p className="text-xs text-grey mt-1">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] tracking-[0.1em] uppercase px-2.5 py-1 font-medium ${statusStyles[order.status] || 'bg-bone-dim text-grey'}`}>
                      {order.status}
                    </span>
                    <span className="text-sm font-medium">{format(order.total / 100)}</span>
                  </div>
                </Link>
                {waybill && order.courier_booking_status === 'booked' && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-grey">
                    <span>
                      {courier?.name || order.courier_name} · Waybill{' '}
                      <span className="text-void font-medium tracking-wide">{waybill}</span>
                    </span>
                    {courier?.trackUrl && (
                      <a
                        href={courier.trackUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => navigator.clipboard?.writeText(waybill).catch(() => {})}
                        className="inline-flex items-center gap-1.5 border border-void px-3 py-1.5 text-[11px] tracking-[0.1em] uppercase font-medium text-void hover:bg-void hover:text-bone transition-colors"
                      >
                        Track <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
