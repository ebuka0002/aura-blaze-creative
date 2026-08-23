import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, X, Upload } from 'lucide-react'
import {
  createProduct,
  createVariants,
  createProductImages,
  uploadProductImage,
} from '../../lib/adminProducts'
import { categories } from '../../data/products'

const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'One Size']

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function emptyColor() {
  return { id: crypto.randomUUID(), name: '', hex: '#0B0B0C', frontFile: null, backFile: null }
}

function ColorImageInput({ label, file, onChange }) {
  return (
    <label className="block">
      <span className="text-[11px] text-grey block mb-1">{label}</span>
      <div className="border border-dashed border-hairline hover:border-blaze transition-colors aspect-[4/5] flex items-center justify-center cursor-pointer overflow-hidden bg-bone-dim">
        {file ? (
          <img src={URL.createObjectURL(file)} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-grey">
            <Upload size={18} className="mx-auto mb-1" />
            <span className="text-[11px]">Upload</span>
          </div>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </label>
  )
}

export default function AdminProductNew() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    category: categories[0]?.id || 'tshirts',
    description: '',
    material: '',
    priceNGN: '',
  })
  const [colors, setColors] = useState([emptyColor()])
  const [sizes, setSizes] = useState(['S', 'M', 'L', 'XL', 'XXL'])
  const [startingStock, setStartingStock] = useState(10)

  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const updateColor = (id, patch) => {
    setColors((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const addColor = () => setColors((prev) => [...prev, emptyColor()])
  const removeColor = (id) => setColors((prev) => prev.filter((c) => c.id !== id))

  const toggleSize = (size) => {
    setSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]))
  }

  const validate = () => {
    if (!form.name.trim()) return 'Product name is required.'
    if (!form.priceNGN || Number(form.priceNGN) <= 0) return 'A valid price is required.'
    if (sizes.length === 0) return 'Select at least one size.'
    if (colors.length === 0) return 'Add at least one color.'
    for (const c of colors) {
      if (!c.name.trim()) return 'Every color needs a name.'
      if (!c.frontFile) return `"${c.name || 'Untitled color'}" needs at least a front photo.`
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    const slug = slugify(form.name)

    try {
      setProgress('Creating product…')
      const productId = await createProduct({
        name: form.name.trim(),
        slug,
        category: form.category,
        description: form.description.trim(),
        material: form.material.trim(),
        priceNGN: Number(form.priceNGN),
      })

      setProgress('Uploading photos…')
      const colorImages = []
      for (const color of colors) {
        const urls = []
        const front = await uploadProductImage(slug, color.frontFile)
        urls.push(front)
        if (color.backFile) {
          const back = await uploadProductImage(slug, color.backFile)
          urls.push(back)
        }
        colorImages.push({ colorName: color.name.trim(), urls })
      }

      setProgress('Saving image records…')
      await createProductImages(productId, colorImages)

      setProgress('Setting up sizes and stock…')
      await createVariants(
        productId,
        colors.map((c) => ({ name: c.name.trim(), hex: c.hex })),
        sizes,
        Number(startingStock)
      )

      navigate(`/admin/products/${productId}`)
    } catch (err) {
      console.error('Failed to create product:', err)
      if (err.code === '23505') {
        setError('A product with a similar name already exists (duplicate URL slug). Try a slightly different name.')
      } else {
        setError(`Something went wrong: ${err.message || 'please try again.'}`)
      }
      setSaving(false)
      setProgress('')
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-[800px]">
      <Link to="/admin/products" className="flex items-center gap-1.5 text-sm text-grey hover:text-blaze mb-6 w-fit">
        <ArrowLeft size={15} /> Back to Products
      </Link>

      <h1 className="font-display text-3xl tracking-wide mb-2">New Product</h1>
      <p className="text-grey text-sm mb-8">
        Add everything at once — colors, sizes, stock, and photos. Nothing else needs SQL afterward.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="bg-white border border-hairline p-6 space-y-5">
          <h2 className="text-xs tracking-[0.1em] uppercase text-grey">Product Details</h2>

          <div>
            <label className="text-xs text-grey block mb-1.5">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Overshirt — Ember"
              className="w-full border border-hairline px-3 py-2.5 text-sm focus:outline-none focus:border-blaze"
            />
          </div>

          <div>
            <label className="text-xs text-grey block mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-hairline px-3 py-2.5 text-sm focus:outline-none focus:border-blaze"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
              placeholder="e.g. 100% cotton twill, oversized fit"
              className="w-full border border-hairline px-3 py-2.5 text-sm focus:outline-none focus:border-blaze"
            />
          </div>

          <div>
            <label className="text-xs text-grey block mb-1.5">Price (₦)</label>
            <input
              required
              type="number"
              min="0"
              step="1"
              value={form.priceNGN}
              onChange={(e) => setForm({ ...form, priceNGN: e.target.value })}
              className="w-full border border-hairline px-3 py-2.5 text-sm focus:outline-none focus:border-blaze"
            />
            <p className="text-[11px] text-grey mt-1">USD price is calculated live from this.</p>
          </div>
        </div>

        {/* Sizes */}
        <div className="bg-white border border-hairline p-6">
          <h2 className="text-xs tracking-[0.1em] uppercase text-grey mb-4">Sizes Available</h2>
          <div className="flex flex-wrap gap-2 mb-5">
            {ALL_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSize(s)}
                className={`px-3 py-1.5 text-sm border transition-colors ${
                  sizes.includes(s) ? 'bg-void text-bone border-void' : 'border-hairline hover:border-void'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <label className="text-xs text-grey block mb-1.5">Starting stock (per size, per color)</label>
          <input
            type="number"
            min="0"
            value={startingStock}
            onChange={(e) => setStartingStock(e.target.value)}
            className="w-32 border border-hairline px-3 py-2 text-sm focus:outline-none focus:border-blaze"
          />
          <p className="text-[11px] text-grey mt-1.5">
            You can adjust individual size/color stock counts after creating the product.
          </p>
        </div>

        {/* Colors */}
        <div className="bg-white border border-hairline p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs tracking-[0.1em] uppercase text-grey">Colors & Photos</h2>
            <button
              type="button"
              onClick={addColor}
              className="flex items-center gap-1.5 text-xs text-blaze hover:underline underline-offset-4"
            >
              <Plus size={13} /> Add Color
            </button>
          </div>

          <div className="space-y-6">
            {colors.map((color, i) => (
              <div key={color.id} className="border border-hairline p-4">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="color"
                    value={color.hex}
                    onChange={(e) => updateColor(color.id, { hex: e.target.value })}
                    className="w-9 h-9 border border-hairline cursor-pointer shrink-0"
                  />
                  <input
                    value={color.name}
                    onChange={(e) => updateColor(color.id, { name: e.target.value })}
                    placeholder="Color name, e.g. Black"
                    className="flex-1 border border-hairline px-3 py-2 text-sm focus:outline-none focus:border-blaze"
                  />
                  {colors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeColor(color.id)}
                      className="text-grey hover:text-blaze shrink-0"
                      aria-label="Remove color"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 max-w-xs">
                  <ColorImageInput
                    label="Front (required)"
                    file={color.frontFile}
                    onChange={(file) => updateColor(color.id, { frontFile: file })}
                  />
                  <ColorImageInput
                    label="Back (optional)"
                    file={color.backFile}
                    onChange={(file) => updateColor(color.id, { backFile: file })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-blaze">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-void text-bone px-6 py-3 text-sm font-medium hover:bg-blaze transition-colors disabled:opacity-60"
        >
          {saving ? progress || 'Creating…' : 'Create Product'}
        </button>
      </form>
    </div>
  )
}
