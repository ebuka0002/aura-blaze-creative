import { useEffect, useState } from 'react'
import { ImagePlus, Trash2, Upload } from 'lucide-react'
import { createDailyDrip, deleteDailyDrip, fetchDailyDripsAdmin, uploadDailyDripImage } from '../../lib/dailyDrips'

export default function AdminDailyDrip() {
  const [drips, setDrips] = useState([])
  const [file, setFile] = useState(null)
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try { setDrips(await fetchDailyDripsAdmin()) }
    catch (err) { setError(err.message || 'Could not load daily drips.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!file) return setError('Choose a drip picture first.')
    setSaving(true); setError(''); setMessage('')
    try {
      const imageUrl = await uploadDailyDripImage(file)
      const sortOrder = drips.length ? Math.max(...drips.map((x) => x.sort_order ?? 0)) + 1 : 0
      await createDailyDrip({ image_url: imageUrl, caption: caption.trim(), sort_order: sortOrder, is_active: true })
      setFile(null); setCaption(''); setMessage('Daily drip posted.'); await load()
    } catch (err) { setError(err.message || 'Could not post daily drip.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (drip) => {
    if (!window.confirm('Delete this daily drip?')) return
    try { await deleteDailyDrip(drip.id); await load(); setMessage('Daily drip deleted.') }
    catch (err) { setError(err.message || 'Could not delete daily drip.') }
  }

  return (
    <div className="p-4 md:p-8 max-w-[1100px]">
      <div className="mb-8">
        <h1 className="font-display text-3xl tracking-wide">Daily Drip</h1>
        <p className="text-grey text-sm mt-1">Post the latest drip pictures shown on the homepage and Daily Drip page.</p>
      </div>
      {message && <div className="border border-green-200 bg-green-50 text-green-800 p-3 text-sm mb-5">{message}</div>}
      {error && <div className="border border-blaze/30 bg-blaze/5 text-blaze p-3 text-sm mb-5">{error}</div>}

      <form onSubmit={handleAdd} className="bg-white border border-hairline p-5 md:p-7 mb-8 space-y-5">
        <h2 className="font-display text-2xl">Post New Drip</h2>
        <label className="block">
          <span className="text-xs text-grey block mb-1.5">Drip picture</span>
          <label className="block border border-dashed border-hairline hover:border-blaze cursor-pointer bg-bone-dim">
            {file ? <div className="p-3 flex items-center gap-4"><img src={URL.createObjectURL(file)} alt="Preview" className="w-20 h-24 object-cover" /><span className="text-sm">{file.name}</span></div> : <div className="py-10 text-center text-grey"><Upload size={24} className="mx-auto mb-2" /><p className="text-sm">Choose image</p><p className="text-xs mt-1">JPG, PNG, WEBP</p></div>}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        </label>
        <label className="block">
          <span className="text-xs text-grey block mb-1.5">Caption (optional)</span>
          <input value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full border border-hairline px-3 py-2.5 text-sm focus:outline-none focus:border-blaze" placeholder="Today's fit" />
        </label>
        <button type="submit" disabled={saving} className="flex items-center gap-2 bg-void text-bone px-6 py-3 text-sm hover:bg-blaze disabled:opacity-50"><ImagePlus size={16} />{saving ? 'Posting…' : 'Post Drip'}</button>
      </form>

      {loading ? <p className="text-grey text-sm">Loading…</p> : drips.length === 0 ? <div className="bg-white border border-hairline p-8 text-center text-grey">No daily drips posted yet.</div> : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {drips.map((drip, index) => (
            <div key={drip.id} className="bg-white border border-hairline p-3">
              <div className="aspect-[3/4] overflow-hidden bg-bone-dim"><img src={drip.image_url} alt={drip.caption || ''} className="w-full h-full object-cover" /></div>
              <p className="text-xs text-grey mt-3">Post {index + 1}</p>
              {drip.caption && <p className="text-sm mt-1">{drip.caption}</p>}
              <button type="button" onClick={() => handleDelete(drip)} className="mt-3 flex items-center gap-1.5 text-xs text-blaze hover:underline"><Trash2 size={14} /> Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
