import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Eye, EyeOff, Trash2 } from 'lucide-react'
import { fetchAllDiscountCodesAdmin, updateDiscountCode, deleteDiscountCode } from '../../lib/adminDiscounts'

function formatDiscountValue(code) {
  if (code.discount_type === 'percent') return `${code.discount_value}% off`
  const amount = code.discount_value / 100
  const symbol = code.currency === 'USD' ? '$' : '₦'
  return `${symbol}${amount.toLocaleString()} off`
}

function isExpired(code) {
  return code.expires_at && new Date(code.expires_at) < new Date()
}

export default function AdminDiscounts() {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const load = () => {
    setLoading(true)
    fetchAllDiscountCodesAdmin()
      .then(setCodes)
      .catch((err) => {
        console.error('Failed to load discount codes:', err)
        setError('Could not load discount codes. Make sure this account has admin access.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const toggleActive = async (code) => {
    setTogglingId(code.id)
    try {
      await updateDiscountCode(code.id, { is_active: !code.is_active })
      setCodes((prev) =>
        prev.map((c) => (c.id === code.id ? { ...c, is_active: !c.is_active } : c))
      )
    } catch (err) {
      console.error('Failed to toggle discount code:', err)
      alert('Could not update this code. Please try again.')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (code) => {
    const confirmed = confirm(
      `Permanently delete "${code.code}"? This cannot be undone. Orders that already used it keep their record of the discount — only the code itself is removed.`
    )
    if (!confirmed) return

    setDeletingId(code.id)
    try {
      await deleteDiscountCode(code.id)
      setCodes((prev) => prev.filter((c) => c.id !== code.id))
    } catch (err) {
      console.error('Failed to delete discount code:', err)
      alert('Could not delete this code. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-[1200px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Discount Codes</h1>
          <p className="text-grey text-sm mt-1">{codes.length} total</p>
        </div>
        <Link
          to="/admin/discounts/new"
          className="flex items-center gap-2 bg-void text-bone px-5 py-2.5 text-sm font-medium hover:bg-blaze transition-colors"
        >
          <Plus size={16} /> New Code
        </Link>
      </div>

      {error && <p className="text-blaze text-sm mb-6">{error}</p>}

      {loading ? (
        <p className="text-grey text-sm">Loading…</p>
      ) : codes.length === 0 ? (
        <p className="text-grey text-sm">No discount codes yet.</p>
      ) : (
        <div className="bg-white border border-hairline rounded overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-hairline bg-bone-dim text-left">
                <th className="px-5 py-3 font-medium text-grey">Code</th>
                <th className="px-5 py-3 font-medium text-grey">Discount</th>
                <th className="px-5 py-3 font-medium text-grey">Usage</th>
                <th className="px-5 py-3 font-medium text-grey">Expires</th>
                <th className="px-5 py-3 font-medium text-grey">Status</th>
                <th className="px-5 py-3 font-medium text-grey text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const expired = isExpired(c)
                return (
                  <tr key={c.id} className="border-b border-hairline last:border-0">
                    <td className="px-5 py-4 font-medium">
                      <Link to={`/admin/discounts/${c.id}`} className="hover:text-blaze font-mono">
                        {c.code}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-grey">{formatDiscountValue(c)}</td>
                    <td className="px-5 py-4 text-grey">
                      {c.times_used}{c.max_uses ? ` / ${c.max_uses}` : ''}
                    </td>
                    <td className="px-5 py-4 text-grey">
                      {c.expires_at
                        ? new Date(c.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        : 'Never'}
                    </td>
                    <td className="px-5 py-4">
                      {expired ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-hairline text-grey">Expired</span>
                      ) : (
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            c.is_active ? 'bg-green-100 text-green-800' : 'bg-hairline text-grey'
                          }`}
                        >
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => toggleActive(c)}
                          disabled={togglingId === c.id}
                          className="text-grey hover:text-blaze transition-colors disabled:opacity-50"
                          title={c.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {c.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          disabled={deletingId === c.id}
                          className="text-grey hover:text-blaze transition-colors disabled:opacity-50"
                          title="Delete permanently"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
