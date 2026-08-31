import { useEffect, useState } from 'react'
import { ImagePlus, Trash2, Upload } from 'lucide-react'
import { createHomepageGalleryItem, deleteHomepageGalleryItem, fetchHomepageGalleryAdmin, uploadHomepageGalleryImage } from '../../lib/homepageGallery'

export default function AdminHomepageGallery() {
  const [items, setItems] = useState([])
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try { setItems(await fetchHomepageGalleryAdmin()) }
    catch (err) { setError(err.message || 'Could not load homepage carousel.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!file) return setError('Choose a picture first.')
    setSaving(true); setError(''); setMessage('')
    try {
      const imageUrl = await uploadHomepageGalleryImage(file)
      const sortOrder = items.length ? Math.max(...items.map((x) => x.sort_order ?? 0)) + 1 : 0
      await createHomepageGalleryItem({ image_url: imageUrl, title: title.trim(), sort_order: sortOrder, is_active: true })
      setFile(null); setTitle(''); setMessage('Homepage carousel picture added.'); await load()
    } catch (err) { setError(err.message || 'Could not add picture.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (item) => {
    if (!window.confirm('Remove this picture from the homepage carousel?')) return
    try { await deleteHomepageGalleryItem(item.id); await load(); setMessage('Picture removed.') }
    catch (err) { setError(err.message || 'Could not remove picture.') }
  }

  return (
    <div className="p-4 md:p-8 max-w-[1100px]">
      <div className="mb-8">
        <h1 className="font-display text-3xl tracking-wide">Homepage Image Carousel</h1>
        <p className="text-grey text-sm mt-1">Add or remove the pictures shown in the carousel on the homepage.</p>
      </div>
      {message && <div className="border border-green-200 bg-green-50 text-green-800 p-3 text-sm mb-5">{message}</div>}
      {error && <div className="border border-blaze/30 bg-blaze/5 text-blaze p-3 text-sm mb-5">{error}</div>}

      <form onSubmit={handleAdd} className="bg-white border border-hairline p-5 md:p-7 mb-8 space-y-5">
        <h2 className="font-display text-2xl">Add Picture</h2>
        <label className="block">
          <span className="text-xs text-grey block mb-1.5">Picture</span>
          <label className="block border border-dashed border-hairline hover:border-blaze cursor-pointer bg-bone-dim">
            {file ? <div className="p-3 flex items-center gap-4"><img src={URL.createObjectURL(file)} alt="Preview" className="w-20 h-24 object-cover" /><span className="text-sm">{file.name}</span></div> : <div className="py-10 text-center text-grey"><Upload size={24} className="mx-auto mb-2" /><p className="text-sm">Choose image</p><p className="text-xs mt-1">JPG, PNG, WEBP</p></div>}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        </label>
        <label className="block">
          <span className="text-xs text-grey block mb-1.5">Optional caption</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-hairline px-3 py-2.5 text-sm focus:outline-none focus:border-blaze" placeholder="Designed in Lagos" />
        </label>
        <button type="submit" disabled={saving} className="flex items-center gap-2 bg-void text-bone px-6 py-3 text-sm hover:bg-blaze disabled:opacity-50"><ImagePlus size={16} />{saving ? 'Adding…' : 'Add to Carousel'}</button>
      </form>

      {loading ? <p className="text-grey text-sm">Loading…</p> : items.length === 0 ? (
        <div className="bg-white border border-hairline p-8 text-center text-grey">No managed pictures yet. The homepage will keep its current built-in pictures until you add your first managed picture.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item, index) => (
            <div key={item.id} className="bg-white border border-hairline p-3">
              <div className="aspect-[3/4] overflow-hidden bg-bone-dim"><img src={item.image_url} alt={item.title || ''} className="w-full h-full object-cover" /></div>
              <p className="text-xs text-grey mt-3">Slide {index + 1}</p>
              {item.title && <p className="text-sm mt-1">{item.title}</p>}
              <button type="button" onClick={() => handleDelete(item)} className="mt-3 flex items-center gap-1.5 text-xs text-blaze hover:underline"><Trash2 size={14} /> Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
