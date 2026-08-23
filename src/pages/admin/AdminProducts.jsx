import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Eye, EyeOff, Trash2 } from 'lucide-react'
import { fetchAllProductsAdmin, updateProduct, deleteProduct } from '../../lib/adminProducts'

function formatKobo(kobo) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(kobo / 100)
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const load = () => {
    setLoading(true)
    fetchAllProductsAdmin()
      .then(setProducts)
      .catch((err) => {
        console.error('Failed to load products:', err)
        setError('Could not load products. Make sure this account has admin access.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const toggleActive = async (product) => {
    setTogglingId(product.id)
    try {
      await updateProduct(product.id, { is_active: !product.is_active })
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: !p.is_active } : p))
      )
    } catch (err) {
      console.error('Failed to toggle product visibility:', err)
      alert('Could not update this product. Please try again.')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (product) => {
    const confirmed = confirm(
      `Permanently delete "${product.name}"? This removes the product, its colors, sizes, stock, and photos. Past orders that included it are not affected. This cannot be undone.`
    )
    if (!confirmed) return

    setDeletingId(product.id)
    try {
      await deleteProduct(product.id, product.slug)
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
    } catch (err) {
      console.error('Failed to delete product:', err)
      alert('Could not delete this product. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-[1200px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Products</h1>
          <p className="text-grey text-sm mt-1">{products.length} total</p>
        </div>
        <Link
          to="/admin/products/new"
          className="flex items-center gap-2 bg-void text-bone px-5 py-2.5 text-sm font-medium hover:bg-blaze transition-colors"
        >
          <Plus size={16} /> New Product
        </Link>
      </div>

      {error && <p className="text-blaze text-sm mb-6">{error}</p>}

      {loading ? (
        <p className="text-grey text-sm">Loading…</p>
      ) : products.length === 0 ? (
        <p className="text-grey text-sm">No products yet.</p>
      ) : (
        <div className="bg-white border border-hairline rounded overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-hairline bg-bone-dim text-left">
                <th className="px-5 py-3 font-medium text-grey">Name</th>
                <th className="px-5 py-3 font-medium text-grey">Category</th>
                <th className="px-5 py-3 font-medium text-grey">Price</th>
                <th className="px-5 py-3 font-medium text-grey">Status</th>
                <th className="px-5 py-3 font-medium text-grey text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-hairline last:border-0">
                  <td className="px-5 py-4 font-medium">
                    <Link to={`/admin/products/${p.id}`} className="hover:text-blaze">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-grey capitalize">{p.category}</td>
                  <td className="px-5 py-4">{formatKobo(p.price_ngn_kobo)}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        p.is_active ? 'bg-green-100 text-green-800' : 'bg-hairline text-grey'
                      }`}
                    >
                      {p.is_active ? 'Live' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => toggleActive(p)}
                        disabled={togglingId === p.id}
                        className="text-grey hover:text-blaze transition-colors disabled:opacity-50"
                        title={p.is_active ? 'Hide from storefront' : 'Show on storefront'}
                      >
                        {p.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={deletingId === p.id}
                        className="text-grey hover:text-blaze transition-colors disabled:opacity-50"
                        title="Delete permanently"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
