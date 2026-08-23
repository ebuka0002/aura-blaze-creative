import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  fetchAllDiscountCodesAdmin,
} from '../../lib/adminDiscounts'

const emptyForm = {
  code: '',
  discount_type: 'percent',
  discount_value: '',
  currency: 'NGN',
  min_order_amount: '',
  max_uses: '',
  expires_at: '',
  is_active: true,
}

export default function AdminDiscountForm() {
  const { id } = useParams()
  const isEditing = !!id
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isEditing) return
    // No single-fetch-by-id helper exists yet for this small table — reuse
    // the list fetch and find the one we need, rather than add a new
    // one-off data function for a single lookup.
    fetchAllDiscountCodesAdmin()
      .then((all) => {
        const match = all.find((c) => c.id === id)
        if (!match) {
          setError('Discount code not found.')
          return
        }
        setForm({
          code: match.code,
          discount_type: match.discount_type,
          discount_value: match.discount_type === 'fixed' ? match.discount_value / 100 : match.discount_value,
          currency: match.currency || 'NGN',
          min_order_amount: match.min_order_amount ? match.min_order_amount / 100 : '',
          max_uses: match.max_uses ?? '',
          expires_at: match.expires_at ? match.expires_at.slice(0, 10) : '',
          is_active: match.is_active,
        })
      })
      .catch((err) => {
        console.error('Failed to load discount code:', err)
        setError('Could not load this discount code.')
      })
      .finally(() => setLoading(false))
  }, [id, isEditing])

  const updateField = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!form.code.trim()) {
      setError('Please enter a code.')
      return
    }
    const value = Number(form.discount_value)
    if (!value || value <= 0) {
      setError('Please enter a discount value greater than 0.')
      return
    }
    if (form.discount_type === 'percent' && value > 100) {
      setError('A percentage discount cannot exceed 100.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        code: form.code,
        discount_type: form.discount_type,
        // Percent is stored as-is (e.g. 15 = 15%). Fixed is stored in
        // kobo/cents, matching every other money value in the database.
        discount_value: form.discount_type === 'percent' ? value : Math.round(value * 100),
        currency: form.discount_type === 'fixed' ? form.currency : null,
        min_order_amount: form.min_order_amount ? Math.round(Number(form.min_order_amount) * 100) : 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at ? new Date(form.expires_at + 'T23:59:59').toISOString() : null,
        is_active: form.is_active,
      }

      if (isEditing) {
        await updateDiscountCode(id, payload)
      } else {
        await createDiscountCode(payload)
      }
      navigate('/admin/discounts')
    } catch (err) {
      console.error('Failed to save discount code:', err)
      setError(
        err.message?.includes('duplicate') || err.code === '23505'
          ? 'A code with this name already exists.'
          : 'Could not save this discount code. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = confirm(`Permanently delete "${form.code}"? This cannot be undone.`)
    if (!confirmed) return
    setDeleting(true)
    try {
      await deleteDiscountCode(id)
      navigate('/admin/discounts')
    } catch (err) {
      console.error('Failed to delete discount code:', err)
      alert('Could not delete this code. Please try again.')
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="p-4 md:p-8 text-grey text-sm">Loading…</div>
  }

  return (
    <div className="p-4 md:p-8 max-w-[600px]">
      <Link to="/admin/discounts" className="flex items-center gap-1.5 text-sm text-grey hover:text-blaze mb-6">
        <ArrowLeft size={15} /> Discount Codes
      </Link>

      <h1 className="font-display text-3xl tracking-wide mb-8">
        {isEditing ? 'Edit Discount Code' : 'New Discount Code'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-hairline p-6">
        <div>
          <label className="text-xs text-grey block mb-1.5">Code</label>
          <input
            type="text"
            value={form.code}
            onChange={updateField('code')}
            placeholder="e.g. WELCOME15"
            className="w-full border border-hairline px-3.5 py-2.5 text-sm font-mono uppercase focus:outline-none focus:border-blaze"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-grey block mb-1.5">Discount Type</label>
            <select
              value={form.discount_type}
              onChange={updateField('discount_type')}
              className="w-full border border-hairline px-3.5 py-2.5 text-sm focus:outline-none focus:border-blaze bg-white"
            >
              <option value="percent">Percentage off</option>
              <option value="fixed">Fixed amount off</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-grey block mb-1.5">
              {form.discount_type === 'percent' ? 'Percent (e.g. 15)' : 'Amount'}
            </label>
            <input
              type="number"
              min="0"
              step={form.discount_type === 'percent' ? '1' : '0.01'}
              value={form.discount_value}
              onChange={updateField('discount_value')}
              className="w-full border border-hairline px-3.5 py-2.5 text-sm focus:outline-none focus:border-blaze"
            />
          </div>
        </div>

        {form.discount_type === 'fixed' && (
          <div>
            <label className="text-xs text-grey block mb-1.5">Currency</label>
            <select
              value={form.currency}
              onChange={updateField('currency')}
              className="w-full border border-hairline px-3.5 py-2.5 text-sm focus:outline-none focus:border-blaze bg-white"
            >
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
            </select>
            <p className="text-[11px] text-grey mt-1">
              A fixed-amount code only applies to orders in this currency.
            </p>
          </div>
        )}

        <div>
          <label className="text-xs text-grey block mb-1.5">Minimum Order Amount (optional)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.min_order_amount}
            onChange={updateField('min_order_amount')}
            placeholder="0"
            className="w-full border border-hairline px-3.5 py-2.5 text-sm focus:outline-none focus:border-blaze"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-grey block mb-1.5">Max Uses (optional)</label>
            <input
              type="number"
              min="1"
              value={form.max_uses}
              onChange={updateField('max_uses')}
              placeholder="Unlimited"
              className="w-full border border-hairline px-3.5 py-2.5 text-sm focus:outline-none focus:border-blaze"
            />
          </div>
          <div>
            <label className="text-xs text-grey block mb-1.5">Expires (optional)</label>
            <input
              type="date"
              value={form.expires_at}
              onChange={updateField('expires_at')}
              className="w-full border border-hairline px-3.5 py-2.5 text-sm focus:outline-none focus:border-blaze"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.is_active} onChange={updateField('is_active')} className="accent-blaze" />
          Active
        </label>

        {error && <p className="text-sm text-blaze">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-void text-bone px-6 py-2.5 text-sm font-medium hover:bg-blaze transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Code'}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm text-grey hover:text-blaze underline underline-offset-4 disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
