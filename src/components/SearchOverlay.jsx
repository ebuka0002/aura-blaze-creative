import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { X, Search as SearchIcon } from 'lucide-react'
import { formatNGN, getProductImages } from '../data/products'
import { fetchAllProducts } from '../lib/products'

export default function SearchOverlay({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState([])
  const [loaded, setLoaded] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
      document.body.style.overflow = 'hidden'
      if (!loaded) {
        fetchAllProducts()
          .then((data) => {
            setProducts(data)
            setLoaded(true)
          })
          .catch((err) => console.error('Failed to load products for search:', err))
      }
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open, loaded])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!open) return null

  const q = query.trim().toLowerCase()
  const results = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      )
    : []

  return (
    <div className="fixed inset-0 z-[60] bg-bone flex flex-col">
      <div className="max-w-[1400px] w-full mx-auto px-5 md:px-8 pt-6">
        <div className="flex items-center gap-4 border-b border-hairline pb-4">
          <SearchIcon size={20} strokeWidth={1.5} className="text-grey shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="flex-1 bg-transparent text-xl md:text-2xl font-display tracking-wide focus:outline-none placeholder:text-grey/50"
          />
          <button onClick={onClose} aria-label="Close search" className="p-2 -mr-2 shrink-0">
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-8">
          {q === '' && (
            <p className="text-grey text-sm">Start typing to search jackets, shirts, tank tops, denim trousers, headwear, and accessories.</p>
          )}
          {q !== '' && results.length === 0 && (
            <p className="text-grey text-sm">No results for "{query}".</p>
          )}
          {results.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">
              {results.map((p) => {
                const thumb = getProductImages(p, p.colors?.[0]?.name)[0]
                return (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    onClick={onClose}
                    className="group block"
                  >
                    <div className="aspect-[4/5] overflow-hidden bg-bone-dim mb-3">
                      <img
                        src={thumb}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <h3 className="text-sm font-medium">{p.name}</h3>
                    <p className="text-sm text-grey mt-1">{formatNGN(p.priceNGN)}</p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
