import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Edit3, Image as ImageIcon, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import { createHeroSlide, deleteHeroSlide, fetchAllHeroSlidesAdmin, moveHeroSlide, updateHeroSlide, uploadHeroSlideImage } from '../../lib/heroSlides'

const emptyEditorial = {
  template: '',
  magazineTitle: 'AURA BLAZE',
  issueLabel: 'AUGUST 2026 / ISSUE 09',
  topTagline: 'TIMELESS. DISTINCT. ICONIC.',
  leftHeadline: 'URBAN LUXURY REDEFINED',
  leftSubtext: 'Elevated essentials for the modern visionary.',
  rightHeadline: 'THE STREETWEAR REVOLUTION',
  rightSubtext: 'Culture. Confidence. Creativity.',
  storyHeading: 'AURA BLAZE CREATIVE: BEHIND THE BRAND',
  storySubtext: 'The story. The people. The purpose.',
  issueNumber: '09',
  website: 'AURABLAZE.COM',
  textColor: '#111111',
  issueNumberColor: '#ffffff',
  websiteColor: '#ffffff',
  showBarcode: true,
}

const emptyForm = {
  type: 'dark', image_url: '', mobile_image_url: '', image_alt: '',
  eyebrow: '', heading: '', subtext: '',
  primary_cta_label: 'Shop Now', primary_cta_to: '/shop',
  secondary_cta_label: 'Explore New In', secondary_cta_to: '/shop',
  corner_label: '', is_active: true,
  template_data: emptyEditorial,
}

export default function AdminHomeBanners() {
  const [slides, setSlides] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [imageFile, setImageFile] = useState(null)
  const [mobileImageFile, setMobileImageFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const isMagazine = form.template_data?.template === 'magazine'

  const load = async () => {
    setLoading(true)
    try { setSlides(await fetchAllHeroSlidesAdmin()) }
    catch (err) { setError(err.message || 'Could not load homepage banners.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const startNew = () => { setEditingId('new'); setForm({ ...emptyForm, template_data: { ...emptyEditorial } }); setImageFile(null); setMobileImageFile(null); setError(''); setMessage('') }
  const startEdit = (s) => {
    const templateData = s.template_data || {}
    setEditingId(s.id)
    setForm({
      type: s.type || 'dark', image_url: s.image_url || '', mobile_image_url: s.mobile_image_url || '',
      image_alt: s.image_alt || '', eyebrow: s.eyebrow || '', heading: s.heading || '', subtext: s.subtext || '',
      primary_cta_label: s.primary_cta_label || '', primary_cta_to: s.primary_cta_to || '/shop',
      secondary_cta_label: s.secondary_cta_label || '', secondary_cta_to: s.secondary_cta_to || '/shop',
      corner_label: s.corner_label || '', is_active: s.is_active !== false,
      template_data: { ...emptyEditorial, ...templateData },
    })
    setImageFile(null); setMobileImageFile(null); setError(''); setMessage('')
  }
  const closeEditor = () => { setEditingId(null); setImageFile(null); setMobileImageFile(null) }

  const updateEditorial = (key, value) => setForm((p) => ({ ...p, template_data: { ...p.template_data, [key]: value } }))

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      let imageUrl = form.image_url
      let mobileUrl = form.mobile_image_url
      if (imageFile) imageUrl = await uploadHeroSlideImage(imageFile)
      if (mobileImageFile) mobileUrl = await uploadHeroSlideImage(mobileImageFile)
      if (!imageUrl) throw new Error('A hero image is required.')
      if (isMagazine && !form.template_data.magazineTitle.trim()) throw new Error('Magazine title is required.')
      if (!isMagazine && !form.heading.trim()) throw new Error('A heading is required.')

      const payload = {
        ...form,
        // Keep the existing DB type values for compatibility; magazine is driven by template_data.
        type: isMagazine ? 'light' : form.type,
        image_url: imageUrl, mobile_image_url: mobileUrl || null,
        image_alt: form.image_alt.trim() || 'Aura Blaze Creative',
        eyebrow: form.eyebrow.trim(), heading: (isMagazine ? form.template_data.magazineTitle : form.heading).trim(), subtext: form.subtext.trim(),
        primary_cta_label: form.primary_cta_label.trim(), primary_cta_to: form.primary_cta_to.trim(),
        secondary_cta_label: form.secondary_cta_label.trim(), secondary_cta_to: form.secondary_cta_to.trim(),
        corner_label: form.corner_label.trim(),
        template_data: isMagazine ? { ...form.template_data, template: 'magazine' } : { template: '' },
      }
      if (editingId === 'new') {
        const sort_order = slides.length ? Math.max(...slides.map((s) => s.sort_order ?? 0)) + 1 : 0
        await createHeroSlide({ ...payload, sort_order })
        setMessage('Homepage banner added.')
      } else {
        await updateHeroSlide(editingId, payload)
        setMessage('Homepage banner updated.')
      }
      await load(); closeEditor()
    } catch (err) { console.error(err); setError(err.message || 'Could not save homepage banner.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (s) => {
    if (!window.confirm('Delete this homepage banner?')) return
    try { await deleteHeroSlide(s.id); await load(); setMessage('Homepage banner deleted.') }
    catch (err) { setError(err.message || 'Could not delete homepage banner.') }
  }

  const handleMove = async (s, direction) => {
    try { setSlides(await moveHeroSlide(s.id, direction)) }
    catch (err) { setError(err.message || 'Could not change banner order.') }
  }

  const field = (key, label, props = {}) => (
    <label className="block">
      <span className="text-xs text-grey block mb-1.5">{label}</span>
      <input value={form[key] ?? ''} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className="w-full border border-hairline px-3 py-2.5 text-sm focus:outline-none focus:border-blaze" {...props} />
    </label>
  )
  const editorialField = (key, label, props = {}) => (
    <label className="block">
      <span className="text-xs text-grey block mb-1.5">{label}</span>
      <input value={form.template_data?.[key] ?? ''} onChange={(e) => updateEditorial(key, e.target.value)} className="w-full border border-hairline px-3 py-2.5 text-sm focus:outline-none focus:border-blaze" {...props} />
    </label>
  )
  const editorialColorField = (key, label) => {
    const value = form.template_data?.[key] || '#111111'
    return (
      <label className="block">
        <span className="text-xs text-grey block mb-1.5">{label}</span>
        <div className="flex items-center gap-2">
          <input type="color" value={isValidHex(value) ? value : '#111111'} onChange={(e) => updateEditorial(key, e.target.value)} className="h-11 w-14 shrink-0 cursor-pointer border border-hairline bg-white p-1" aria-label={label} />
          <input type="text" value={value} onChange={(e) => updateEditorial(key, e.target.value)} className="w-full border border-hairline px-3 py-2.5 text-sm uppercase focus:outline-none focus:border-blaze" placeholder="#111111" maxLength={7} />
        </div>
      </label>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-[1200px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div><h1 className="font-display text-3xl tracking-wide">Homepage Banners</h1><p className="text-grey text-sm mt-1">Manage the hero slides shown on the homepage.</p></div>
        <button type="button" onClick={startNew} className="flex items-center justify-center gap-2 bg-void text-bone px-5 py-3 text-sm hover:bg-blaze transition-colors"><Plus size={16} /> Add Hero Slide</button>
      </div>
      {message && <div className="border border-green-200 bg-green-50 text-green-800 p-3 text-sm mb-5">{message}</div>}
      {error && <div className="border border-blaze/30 bg-blaze/5 text-blaze p-3 text-sm mb-5">{error}</div>}

      {editingId && (
        <form onSubmit={handleSave} className="bg-white border border-hairline p-5 md:p-7 mb-8 space-y-6">
          <div className="flex items-center justify-between"><h2 className="font-display text-2xl">{editingId === 'new' ? 'New Hero Slide' : 'Edit Hero Slide'}</h2><button type="button" onClick={closeEditor} className="p-2 hover:bg-bone-dim"><X size={18} /></button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="block"><span className="text-xs text-grey block mb-1.5">Slide style</span><select value={isMagazine ? 'magazine' : form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value === 'magazine' ? 'light' : e.target.value, template_data: { ...p.template_data, template: e.target.value === 'magazine' ? 'magazine' : '' } }))} className="w-full border border-hairline px-3 py-2.5 text-sm focus:outline-none focus:border-blaze"><option value="dark">Dark</option><option value="light">Light / Editorial</option><option value="magazine">Magazine Cover</option></select></label>
            {field('image_alt', 'Image alt text', { placeholder: 'Aura Blaze Creative collection' })}
          </div>

          <ImagePicker label="Hero image" file={imageFile} url={form.image_url} onChange={setImageFile} />
          <ImagePicker label="Mobile image (optional)" file={mobileImageFile} url={form.mobile_image_url} onChange={setMobileImageFile} />

          {isMagazine ? (
            <>
              <div className="border border-hairline bg-bone-dim p-4 md:p-5">
                <h3 className="font-display text-xl mb-1">Magazine Cover Template</h3>
                <p className="text-xs text-grey">Upload a photo and fill in the cover copy below. Portrait photos work well on mobile; landscape photos are recommended when the banner is shown on desktop. The cover is built in HTML/CSS, so you can change the text and colors from the admin dashboard without editing the image.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {editorialField('magazineTitle', 'Masthead / magazine title', { placeholder: 'AURA BLAZE', required: true })}
                {editorialField('issueLabel', 'Issue / date label', { placeholder: 'AUGUST 2026 / ISSUE 09' })}
                {editorialField('topTagline', 'Top-right tagline', { placeholder: 'TIMELESS. DISTINCT. ICONIC.' })}
                {editorialField('issueNumber', 'Large issue number', { placeholder: '09' })}
                {editorialField('website', 'Website label', { placeholder: 'AURABLAZE.COM' })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {editorialColorField('textColor', 'Main text color')}
                {editorialColorField('issueNumberColor', 'Issue number color')}
                {editorialColorField('websiteColor', 'Website color')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {editorialField('leftHeadline', 'Left headline', { placeholder: 'URBAN LUXURY REDEFINED' })}
                {editorialField('leftSubtext', 'Left supporting text', { placeholder: 'Elevated essentials for the modern visionary.' })}
                {editorialField('rightHeadline', 'Right headline', { placeholder: 'THE STREETWEAR REVOLUTION' })}
                {editorialField('rightSubtext', 'Right supporting text', { placeholder: 'Culture. Confidence. Creativity.' })}
                {editorialField('storyHeading', 'Lower-left story headline', { placeholder: 'AURA BLAZE CREATIVE: BEHIND THE BRAND' })}
                {editorialField('storySubtext', 'Lower-left story text', { placeholder: 'The story. The people. The purpose.' })}
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.template_data?.showBarcode !== false} onChange={(e) => updateEditorial('showBarcode', e.target.checked)} /> Show magazine barcode</label>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{field('eyebrow','Eyebrow',{placeholder:'Timeless. Distinct. Iconic.'})}{field('heading','Heading',{placeholder:'AURA BLAZE',required:true})}</div>
              {field('subtext','Subtext',{placeholder:'The new collection is here.'})}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {field('primary_cta_label','Primary button text',{placeholder:'Shop Now'})}{field('primary_cta_to','Primary button link',{placeholder:'/shop'})}
                {field('secondary_cta_label','Secondary button text',{placeholder:'New In'})}{field('secondary_cta_to','Secondary button link',{placeholder:'/shop/new-arrivals'})}
                {field('corner_label','Corner label',{placeholder:'NEW COLLECTION 2026'})}
              </div>
            </>
          )}

          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} /> Show this slide on the homepage</label>
          <button type="submit" disabled={saving} className="flex items-center gap-2 bg-void text-bone px-6 py-3 text-sm hover:bg-blaze transition-colors disabled:opacity-50"><Save size={16} />{saving ? 'Saving…' : 'Save Hero Slide'}</button>
        </form>
      )}

      {loading ? <p className="text-grey text-sm">Loading…</p> : slides.length === 0 ? (
        <div className="bg-white border border-hairline p-8 text-center"><ImageIcon size={28} className="mx-auto text-grey mb-3" /><p className="font-medium">No homepage banners yet.</p><p className="text-sm text-grey mt-1">Add your first hero slide above.</p></div>
      ) : (
        <div className="space-y-4">
          {slides.map((s, i) => {
            const magazine = s.template_data?.template === 'magazine'
            return (
              <div key={s.id} className="bg-white border border-hairline p-4 md:p-5 flex flex-col md:flex-row gap-5">
                <div className="w-full md:w-72 aspect-[4/5] overflow-hidden bg-bone-dim"><BannerPreview slide={s} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2"><span className="text-[10px] uppercase tracking-wider px-2 py-1 bg-void text-bone">{magazine ? 'magazine' : s.type}</span><span className={`text-[10px] uppercase tracking-wider px-2 py-1 ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-bone-dim text-grey'}`}>{s.is_active ? 'Active' : 'Hidden'}</span></div>
                  <p className="text-xs text-grey mb-1">Slide {i + 1}</p><h3 className="font-display text-2xl">{magazine ? (s.template_data?.magazineTitle || s.heading) : s.heading}</h3><p className="text-sm text-grey mt-1">{magazine ? s.template_data?.issueLabel : s.eyebrow}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button type="button" onClick={() => handleMove(s,'up')} disabled={i===0} className="border border-hairline px-3 py-2 disabled:opacity-30"><ArrowUp size={14}/></button>
                    <button type="button" onClick={() => handleMove(s,'down')} disabled={i===slides.length-1} className="border border-hairline px-3 py-2 disabled:opacity-30"><ArrowDown size={14}/></button>
                    <button type="button" onClick={() => startEdit(s)} className="flex items-center gap-1.5 border border-hairline px-3 py-2 text-xs hover:border-void"><Edit3 size={14}/> Edit</button>
                    <button type="button" onClick={() => handleDelete(s)} className="flex items-center gap-1.5 border border-hairline px-3 py-2 text-xs text-blaze hover:border-blaze"><Trash2 size={14}/> Delete</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function isValidHex(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value || '')
}

function ImagePicker({ label, file, url, onChange }) {
  return <div><span className="text-xs text-grey block mb-1.5">{label}</span><label className="block border border-dashed border-hairline hover:border-blaze cursor-pointer bg-bone-dim">
    {file || url ? <div className="relative"><img src={file ? URL.createObjectURL(file) : url} alt="" className="w-full max-h-[350px] object-contain" /><div className="absolute bottom-3 right-3 bg-void text-bone px-3 py-2 text-xs flex items-center gap-1.5"><Upload size={13}/> Change</div></div> : <div className="py-12 text-center text-grey"><Upload size={24} className="mx-auto mb-2"/><p className="text-sm">Choose image</p><p className="text-xs mt-1">JPG, PNG, WEBP</p></div>}
    <input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0] || null)} className="hidden" />
  </label></div>
}

function BannerPreview({ slide }) {
  if (slide.template_data?.template === 'magazine') {
    const d = slide.template_data || {}
    const textColor = d.textColor || '#111111'
    const issueNumberColor = d.issueNumberColor || '#ffffff'
    const websiteColor = d.websiteColor || '#ffffff'
    return (
      <div className="relative w-full h-full overflow-hidden bg-[#e9e6de]" style={{ color: textColor }}>
        <img src={slide.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-black/15" />
        <div className="absolute inset-0 p-2" style={{ color: textColor }}>
          <div className="absolute top-2 left-2 text-[5px] uppercase">{d.issueLabel || 'AUGUST 2026 / ISSUE 09'}</div>
          <div className="absolute top-2 right-2 text-[5px] uppercase tracking-wider text-right">{d.topTagline || 'TIMELESS. DISTINCT. ICONIC.'}</div>
          <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[96%] text-center font-display text-[17vw] leading-[.78] whitespace-nowrap" style={{ color: textColor }}>{d.magazineTitle || slide.heading || 'AURA BLAZE'}</div>
          <div className="absolute top-[35%] left-2 w-[25%] font-display text-[1.7vw] leading-[.9] uppercase">{d.leftHeadline}</div>
          <div className="absolute top-[35%] right-2 w-[25%] text-right font-display text-[1.7vw] leading-[.9] uppercase">{d.rightHeadline}</div>
          <div className="absolute bottom-[17%] left-2 w-[28%] font-display text-[1.3vw] leading-[.9] uppercase">{d.storyHeading}</div>
          <div className="absolute bottom-2 left-2 font-display text-[7vw] leading-none drop-shadow" style={{ color: issueNumberColor }}>{d.issueNumber || '09'}</div>
          <div className="absolute bottom-2 right-2 text-[5px] uppercase drop-shadow" style={{ color: websiteColor }}>{d.website || 'AURABLAZE.COM'}</div>
        </div>
      </div>
    )
  }
  return <img src={slide.image_url} alt={slide.image_alt || ''} className="w-full h-full object-cover" />
}
