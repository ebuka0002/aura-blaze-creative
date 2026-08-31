import { Link, useParams } from 'react-router-dom'
import { useState, useMemo, useEffect } from 'react'
import { SlidersHorizontal, X, ArrowRight } from 'lucide-react'
import { categories as fallbackCategories } from '../data/products'
import { fetchTaxonomy } from '../lib/taxonomy'
import { fetchAllProducts } from '../lib/products'
import ProductCard from '../components/ProductCard'
import SEO from '../components/SEO'

const sortOptions = [
  { id: 'newest', label: 'Newest' },
  { id: 'price-low', label: 'Price: Low to High' },
  { id: 'price-high', label: 'Price: High to Low' },
]

export default function Shop() {
  const { category, collection } = useParams()
  const [sort, setSort] = useState('newest')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sizeFilter, setSizeFilter] = useState(null)
  const [maxPrice, setMaxPrice] = useState(100000)
  const [products, setProducts] = useState([])
  const [taxonomy, setTaxonomy] = useState(fallbackCategories)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchAllProducts(), fetchTaxonomy()])
      .then(([all, tax]) => { setProducts(all); setTaxonomy(tax) })
      .catch((err) => { console.error('Failed to load shop:', err); setLoadError(true) })
      .finally(() => setLoading(false))
  }, [])

  const activeCategory = taxonomy.find((c) => c.slug === category || c.id === category)
  const activeCollection = activeCategory?.collections?.find((c) => c.slug === collection || c.id === collection)
  const title = category === 'new-arrivals'
    ? 'New Arrivals'
    : activeCollection?.name || activeCategory?.name || 'All Products'

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (category === 'new-arrivals') return p.isNew
      if (activeCategory) {
        if (p.categoryId && activeCategory.id) {
          if (p.categoryId !== activeCategory.id) return false
        } else if (p.category !== activeCategory.slug) return false
        if (activeCollection) {
          return p.collectionId === activeCollection.id || p.collection === activeCollection.slug
        }
        return true
      }
      return !category
    })
    if (sizeFilter) list = list.filter((p) => p.sizes.includes(sizeFilter))
    list = list.filter((p) => p.priceNGN <= maxPrice)
    if (sort === 'price-low') list = [...list].sort((a, b) => a.priceNGN - b.priceNGN)
    if (sort === 'price-high') list = [...list].sort((a, b) => b.priceNGN - a.priceNGN)
    if (sort === 'newest') list = [...list].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0))
    return list
  }, [products, category, activeCategory, activeCollection, sort, sizeFilter, maxPrice])

  const showCollectionIndex = Boolean(activeCategory && collection === 'collections')

  const allSizes = ['S', 'M', 'L', 'XL', 'XXL', 'One Size']
  const path = collection ? `/shop/${category}/${collection}` : category ? `/shop/${category}` : '/shop'

  return (
    <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-10 md:py-14">
      <SEO title={title === 'All Products' ? 'Shop' : title} description={`Shop ${title} at Aura Blaze Creative — premium, minimalist streetwear.`} path={path} />
      <div className="mb-8 md:mb-10">
        <h1 className="font-display text-4xl md:text-5xl tracking-wide">{title}</h1>
        {activeCategory && <p className="text-grey text-sm mt-2">{activeCollection ? activeCategory.name : activeCategory.tagline}</p>}
      </div>

      <div className="flex items-center justify-between mb-8 pb-4 border-b border-hairline">
        <button onClick={() => setFiltersOpen(!filtersOpen)} className="flex items-center gap-2 text-sm tracking-wide uppercase font-medium"><SlidersHorizontal size={15} strokeWidth={1.5} /> Filter</button>
        <p className="text-sm text-grey hidden sm:block">{filtered.length} products</p>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-sm border-none bg-transparent focus:outline-none uppercase tracking-wide font-medium cursor-pointer">{sortOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}</select>
      </div>

      {filtersOpen && <div className="mb-8 pb-8 border-b border-hairline flex flex-wrap gap-8">
        <div><h3 className="text-xs tracking-[0.1em] uppercase text-grey mb-3">Size</h3><div className="flex flex-wrap gap-2">{allSizes.map((s) => <button key={s} onClick={() => setSizeFilter(sizeFilter === s ? null : s)} className={`px-3 py-1.5 text-xs border transition-colors ${sizeFilter === s ? 'bg-void text-bone border-void' : 'border-hairline hover:border-void'}`}>{s}</button>)}</div></div>
        <div><h3 className="text-xs tracking-[0.1em] uppercase text-grey mb-3">Max Price: ₦{maxPrice.toLocaleString()}</h3><input type="range" min="15000" max="100000" step="1000" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-48 accent-blaze" /></div>
        {(sizeFilter || maxPrice < 100000) && <button onClick={() => { setSizeFilter(null); setMaxPrice(100000) }} className="flex items-center gap-1 text-xs text-grey hover:text-blaze self-end"><X size={13} /> Clear filters</button>}
      </div>}

      {showCollectionIndex ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {(activeCategory.collections || []).map((item) => (
            <Link key={item.id} to={`/shop/${activeCategory.slug}/${item.slug}`} className="group relative aspect-[3/4] overflow-hidden clip-corner bg-bone-dim">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-grey text-xs uppercase tracking-widest px-4 text-center">Collection image coming soon</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 flex items-end justify-between gap-3">
                <h2 className="font-display text-lg md:text-xl tracking-wide text-bone">{item.name}</h2>
                <ArrowRight size={17} className="text-bone shrink-0 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      ) : loading ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">{[...Array(8)].map((_, i) => <div key={i} className="aspect-[4/5] bg-bone-dim animate-pulse" />)}</div>
        : loadError ? <div className="py-24 text-center text-grey"><p>Couldn't load products right now. Please refresh the page.</p></div>
        : filtered.length === 0 ? <div className="py-24 text-center text-grey"><p>No products match these filters.</p></div>
        : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">{filtered.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
    </div>
  )
}
