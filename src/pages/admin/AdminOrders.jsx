import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllOrdersAdmin } from '../../lib/adminOrders'

function formatMoney(minorUnits, currency) {
  const amount = minorUnits / 100
  return new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  fulfilled: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-hairline text-grey',
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchAllOrdersAdmin()
      .then(setOrders)
      .catch((err) => {
        console.error('Failed to load orders:', err)
        setError('Could not load orders. Make sure this account has admin access.')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter)

  return (
    <div className="p-4 md:p-8 max-w-[1200px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Orders</h1>
          <p className="text-grey text-sm mt-1">{orders.length} total</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-hairline px-3 py-2 text-sm focus:outline-none focus:border-blaze"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && <p className="text-blaze text-sm mb-6">{error}</p>}

      {loading ? (
        <p className="text-grey text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-grey text-sm">No orders match this filter.</p>
      ) : (
        <div className="bg-white border border-hairline rounded overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-hairline bg-bone-dim text-left">
                <th className="px-5 py-3 font-medium text-grey">Order #</th>
                <th className="px-5 py-3 font-medium text-grey">Customer</th>
                <th className="px-5 py-3 font-medium text-grey">Total</th>
                <th className="px-5 py-3 font-medium text-grey">Status</th>
                <th className="px-5 py-3 font-medium text-grey">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-hairline last:border-0">
                  <td className="px-5 py-4 font-medium">
                    <Link to={`/admin/orders/${o.id}`} className="hover:text-blaze">
                      #{o.order_number}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <div>{o.customer_name}</div>
                    <div className="text-grey text-xs">{o.customer_email}</div>
                  </td>
                  <td className="px-5 py-4">{formatMoney(o.total, o.currency)}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColors[o.status] || ''}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-grey text-xs">
                    {new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
