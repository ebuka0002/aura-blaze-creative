import { useState, useEffect } from 'react'
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus, X, Upload, Trash2 } from 'lucide-react'
import {
  fetchAllProductsAdmin,
  fetchProductVariantsAdmin,
  fetchProductImagesAdmin,
  updateProduct,
  updateVariantStock,
  uploadProductImage,
  createProductImages,
  createVariants,
  deleteProductImage,
  deleteProduct,
} from '../../lib/adminProducts'

export default function AdminProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [variants, setVariants] = useState([])
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const [stockEdits, setStockEdits] = useState({})
  const [savingStock, setSavingStock] = useState(null)

  const [deletingImageId, setDeletingImageId] = useState(null)

  const [showAddColor, setShowAddColor] = useState(false)
  const [newColor, setNewColor] = useState({ name: '', hex: '#0B0B0C', frontFile: null, backFile: null })
  const [addingColor, setAddingColor] = useState(false)
  const [addColorError, setAddColorError] = useState('')

  const [deletingProduct, setDeletingProduct] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchAllProductsAdmin(),
      fetchProductVariantsAdmin(id),
      fetchProductImagesAdmin(id),
    ])
      .then(([allProducts, variantData, imageData]) => {
        const p = allProducts.find((x) => x.id === id)
        if (!p) {
          setNotFound(true)
          return
        }
        setProduct(p)
        setForm({
          name: p.name,
          description: p.description || '',
          material: p.material || '',
          priceNGN: p.price_ngn_kobo / 100,
          is_new: p.is_new,
          is_limited_edition: p.is_limited_edition || false,
          is_active: p.is_active,
        })
        setVariants(variantData)
        setImages(imageData)
      })
      .catch((err) => {
        console.error('Failed to load product:', err)
        setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveMsg('')
    try {
      await updateProduct(id, {
        name: form.name,
        description: form.description,
        material: form.material,
        price_ngn_kobo: Math.round(form.priceNGN * 100),
        is_new: form.is_new,
        is_limited_edition: form.is_limited_edition,
        is_active: form.is_active,
      })
      setSaveMsg('Saved.')
      setTimeout(() => setSaveMsg(''), 2500)
    } catch (err) {
      console.error('Failed to save product:', err)
      setSaveMsg('Something went wrong saving. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const saveStock = async (variantId) => {
    const newValue = stockEdits[variantId]
    if (newValue === undefined) return
    setSavingStock(variantId)
    try {
      await updateVariantStock(variantId, Number(newValue))
      setVariants((prev) =>
        prev.map((v) => (v.id === variantId ? { ...v, stock_quantity: Number(newValue) } : v))
      )
      setStockEdits((prev) => {
        const next = { ...prev }
        delete next[variantId]
        return next
      })
    } catch (err) {
      console.error('Failed to update stock:', err)
      alert('Could not update stock for this variant. Please try again.')
    } finally {
      setSavingStock(null)
    }
  }

  const handleDeleteImage = async (imageId) => {
    if (!confirm('Remove this photo? This only removes the image record, not the product.')) return
    setDeletingImageId(imageId)
    try {
      await deleteProductImage(imageId)
      setImages((prev) => prev.filter((img) => img.id !== imageId))
    } catch (err) {
      console.error('Failed to delete image:', err)
      alert('Could not remove this photo. Please try again.')
    } finally {
      setDeletingImageId(null)
    }
  }

  const handleAddColor = async (e) => {
    e.preventDefault()
    setAddColorError('')

    if (!newColor.name.trim()) {
      setAddColorError('Color name is required.')
      return
    }
    if (!newColor.frontFile) {
      setAddColorError('At least a front photo is required.')
      return
    }
    const existingColorNames = [...new Set(variants.map((v) => v.color_name))]
    if (existingColorNames.includes(newColor.name.trim())) {
      setAddColorError(`"${newColor.name}" already exists on this product.`)
      return
    }

    setAddingColor(true)
    try {
      const urls = [await uploadProductImage(product.slug, newColor.frontFile)]
      if (newColor.backFile) urls.push(await uploadProductImage(product.slug, newColor.backFile))

      await createProductImages(id, [{ colorName: newColor.name.trim(), urls }])

      // New color inherits the same size range already used by this product.
      const existingSizes = [...new Set(variants.map((v) => v.size))]
      await createVariants(id, [{ name: newColor.name.trim(), hex: newColor.hex }], existingSizes, 0)

      const [newVariants, newImages] = await Promise.all([
        fetchProductVariantsAdmin(id),
        fetchProductImagesAdmin(id),
      ])
      setVariants(newVariants)
      setImages(newImages)
      setNewColor({ name: '', hex: '#0B0B0C', frontFile: null, backFile: null })
      setShowAddColor(false)
    } catch (err) {
      console.error('Failed to add color:', err)
      setAddColorError(`Something went wrong: ${err.message || 'please try again.'}`)
    } finally {
      setAddingColor(false)
    }
  }

  const handleDeleteProduct = async () => {
    const confirmed = confirm(
      `Permanently delete "${product.name}"? This removes it, all its colors, sizes, stock, and photos. Past orders that included it keep their record but lose the link to this product. This cannot be undone.`
    )
    if (!confirmed) return

    setDeletingProduct(true)
    try {
      await deleteProduct(id, product.slug)
      navigate('/admin/products')
    } catch (err) {
      console.error('Failed to delete product:', err)
      alert('Could not delete this product. Please try again.')
      setDeletingProduct(false)
    }
  }

  if (loading) {
    return <div className="p-8"><p className="text-grey text-sm">Loading…</p></div>
  }

  if (notFound) {
    return <Navigate to="/admin/products" replace />
  }

  return (
    <div className="p-4 md:p-8 max-w-[900px]">
      <Link to="/admin/products" className="flex items-center gap-1.5 text-sm text-grey hover:text-blaze mb-6 w-fit">
        <ArrowLeft size={15} /> Back to Products
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl tracking-wide">{product.name}</h1>
        <button
          onClick={handleDeleteProduct}
          disabled={deletingProduct}
          className="flex items-center gap-1.5 text-sm text-grey hover:text-blaze transition-colors disabled:opacity-50"
        >
          <Trash2 size={15} /> {deletingProduct ? 'Deleting…' : 'Delete Product'}
        </button>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-hairline p-6 space-y-5 mb-8">
        <h2 className="text-xs tracking-[0.1em] uppercase text-grey">Product Details</h2>

        <div>
          <label className="text-xs text-grey block mb-1.5">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-hairline px-3 py-2.5 text-sm focus:outline-none focus:border-blaze"
          />
        </div>

        <div>
          <label className="text-xs text-grey block mb-1.5">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-hairline px-3 py-2.5 text-sm focus:outline-none focus:border-blaze resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-grey block mb-1.5">Material</label>
          <input
            value={form.material}
            onChange={(e) => setForm({ ...form, material: e.target.value })}
            className="w-full border border-hairline px-3 py-2.5 text-sm focus:outline-none focus:border-blaze"
          />
        </div>

        <div>
          <label className="text-xs text-grey block mb-1.5">Price (₦)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.priceNGN}
            onChange={(e) => setForm({ ...form, priceNGN: e.target.value })}
            className="w-full border border-hairline px-3 py-2.5 text-sm focus:outline-none focus:border-blaze"
          />
          <p className="text-[11px] text-grey mt-1">
            USD price is calculated live from this — no need to set it separately.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_new}
            onChange={(e) =>
              setForm({
                ...form,
                is_new: e.target.checked,
              })
            }
            className="accent-blaze"
          />

          "New" badge
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_limited_edition}
            onChange={(e) =>
              setForm({
                ...form,
                is_limited_edition: e.target.checked,
              })
            }
            className="accent-blaze"
          />

          "Limited Edition" badge
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm({
                ...form,
                is_active: e.target.checked,
              })
            }
            className="accent-blaze"
          />

          Visible on storefront
        </label>

      </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-void text-bone px-6 py-2.5 text-sm font-medium hover:bg-blaze transition-colors disabled:opacity-60"
          >
            <Save size={15} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {saveMsg && <span className="text-sm text-grey">{saveMsg}</span>}
        </div>
      </form>

      <div className="bg-white border border-hairline p-6">
        <h2 className="text-xs tracking-[0.1em] uppercase text-grey mb-4">
          Stock by Color / Size
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-grey">
              <th className="pb-2 font-medium">Color</th>
              <th className="pb-2 font-medium">Size</th>
              <th className="pb-2 font-medium">Stock</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className="border-b border-hairline/50 last:border-0">
                <td className="py-2.5">
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-void/10 inline-block"
                      style={{ backgroundColor: v.color_hex }}
                    />
                    {v.color_name}
                  </span>
                </td>
                <td className="py-2.5">{v.size}</td>
                <td className="py-2.5">
                  <input
                    type="number"
                    min="0"
                    value={stockEdits[v.id] ?? v.stock_quantity}
                    onChange={(e) =>
                      setStockEdits((prev) => ({ ...prev, [v.id]: e.target.value }))
                    }
                    className="w-20 border border-hairline px-2 py-1 text-sm focus:outline-none focus:border-blaze"
                  />
                </td>
                <td className="py-2.5">
                  {stockEdits[v.id] !== undefined && (
                    <button
                      onClick={() => saveStock(v.id)}
                      disabled={savingStock === v.id}
                      className="text-xs text-blaze underline underline-offset-4 disabled:opacity-50"
                    >
                      {savingStock === v.id ? 'Saving…' : 'Save'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-hairline p-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs tracking-[0.1em] uppercase text-grey">Images</h2>
          {!showAddColor && (
            <button
              type="button"
              onClick={() => setShowAddColor(true)}
              className="flex items-center gap-1.5 text-xs text-blaze hover:underline underline-offset-4"
            >
              <Plus size={13} /> Add Color
            </button>
          )}
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
            {images.map((img) => (
              <div key={img.id} className="relative group">
                <div className="aspect-[4/5] bg-bone-dim overflow-hidden">
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </div>
                <p className="text-[10px] text-grey mt-1 truncate">{img.color_name}</p>
                <button
                  type="button"
                  onClick={() => handleDeleteImage(img.id)}
                  disabled={deletingImageId === img.id}
                  className="absolute top-1.5 right-1.5 bg-void/80 text-bone p-1.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-60"
                  aria-label="Remove photo"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {showAddColor && (
          <form onSubmit={handleAddColor} className="border border-hairline p-4 mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs tracking-[0.1em] uppercase text-grey">New Color</h3>
              <button
                type="button"
                onClick={() => { setShowAddColor(false); setAddColorError('') }}
                className="text-grey hover:text-blaze"
                aria-label="Cancel"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newColor.hex}
                onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                className="w-9 h-9 border border-hairline cursor-pointer shrink-0"
              />
              <input
                value={newColor.name}
                onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                placeholder="Color name, e.g. Olive"
                className="flex-1 border border-hairline px-3 py-2 text-sm focus:outline-none focus:border-blaze"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-xs">
              {['front', 'back'].map((side) => (
                <label key={side} className="block">
                  <span className="text-[11px] text-grey block mb-1 capitalize">
                    {side} {side === 'front' ? '(required)' : '(optional)'}
                  </span>
                  <div className="border border-dashed border-hairline hover:border-blaze transition-colors aspect-[4/5] flex items-center justify-center cursor-pointer overflow-hidden bg-bone-dim">
                    {newColor[`${side}File`] ? (
                      <img
                        src={URL.createObjectURL(newColor[`${side}File`])}
                        alt={side}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-grey">
                        <Upload size={16} className="mx-auto mb-1" />
                        <span className="text-[10px]">Upload</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setNewColor({ ...newColor, [`${side}File`]: e.target.files?.[0] || null })
                    }
                  />
                </label>
              ))}
            </div>

            {addColorError && <p className="text-xs text-blaze">{addColorError}</p>}

            <button
              type="submit"
              disabled={addingColor}
              className="bg-void text-bone px-5 py-2 text-xs font-medium hover:bg-blaze transition-colors disabled:opacity-60"
            >
              {addingColor ? 'Adding…' : 'Add Color'}
            </button>
            <p className="text-[11px] text-grey">
              New color starts with 0 stock across all sizes — update counts in the table above after adding.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
