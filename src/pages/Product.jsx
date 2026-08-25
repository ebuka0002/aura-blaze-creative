import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Star, Ruler, X, Check, ArrowLeft } from 'lucide-react'
import { formatNGN, formatUSD, getProductImages } from '../data/products'
import { fetchProductBySlug, fetchAllProducts } from '../lib/products'
import { useCart } from '../context/CartContext'
import ProductCard from '../components/ProductCard'
import ReviewForm from '../components/ReviewForm'
import SEO from '../components/SEO'
import { getReviews, addReview } from '../data/reviews'

export default function Product() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem, currency } = useCart()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [related, setRelated] = useState([])

  const [activeImage, setActiveImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const [sizeError, setSizeError] = useState(false)
  const [reviews, setReviews] = useState([])
  const [showReviewForm, setShowReviewForm] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    setProduct(null)
    setSelectedColor(null)
    setSelectedSize(null)
    setActiveImage(0)

    fetchProductBySlug(id)
      .then(async (p) => {
        if (cancelled) return
        if (!p) {
          setNotFound(true)
          return
        }
        setProduct(p)
        setSelectedColor(p.colors[0]?.name || null)
        const productReviews = await getReviews(p.id)
        if (cancelled) return
        setReviews(productReviews)
        return fetchAllProducts().then((all) => {
          if (cancelled) return
          setRelated(all.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4))
        })
      })
      .catch((err) => {
        console.error('Failed to load product:', err)
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const handleAddReview = async (data) => {
    await addReview(product.id, data)
    const updated = await getReviews(product.id)
    setReviews(updated)
  }

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          <div className="aspect-[4/5] bg-bone-dim animate-pulse" />
          <div className="space-y-4">
            <div className="h-10 bg-bone-dim animate-pulse w-2/3" />
            <div className="h-5 bg-bone-dim animate-pulse w-1/3" />
            <div className="h-24 bg-bone-dim animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="max-w-[1400px] mx-auto px-5 py-24 text-center">
        <SEO title="Product Not Found" noindex />
        <p className="text-grey">Product not found.</p>
        <Link to="/shop" className="text-blaze underline underline-offset-4 mt-3 inline-block">
          Back to shop
        </Link>
      </div>
    )
  }

  const price = currency === 'NGN' ? formatNGN(product.priceNGN) : formatUSD(product.priceUSD)
  const secondaryPrice = currency === 'NGN' ? formatUSD(product.priceUSD) : formatNGN(product.priceNGN)
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null

  const galleryImages = getProductImages(product, selectedColor)

  const handleAddToCart = () => {
    if (!selectedSize) {
      setSizeError(true)
      return
    }
    addItem(product, selectedSize, selectedColor, 1, galleryImages[0])
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleColorChange = (colorName) => {
    setSelectedColor(colorName)
    setActiveImage(0)
  }

  return (
    <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-8 md:py-12">
      <SEO
        title={product.name}
        description={
          product.description
            ? product.description.slice(0, 155)
            : `Shop ${product.name} from Aura Blaze Creative — ${price}. ${product.material || ''}`.trim()
        }
        image={galleryImages[0]}
        path={`/product/${product.id}`}
        type="product"
      />
      <button type="button" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/shop') }} className="flex items-center gap-1.5 text-sm text-grey hover:text-blaze transition-colors mb-5 w-fit">
        <ArrowLeft size={15} /> Back
      </button>

      {/* breadcrumb */}
      <div className="text-xs text-grey mb-6 flex gap-1.5">
        <Link to="/shop" className="hover:text-blaze">Shop</Link>
        <span>/</span>
        <Link to={`/shop/${product.category}`} className="hover:text-blaze capitalize">{product.category}</Link>
        <span>/</span>
        <span className="text-void">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        {/* GALLERY */}
        <div>
          <div className="aspect-[4/5] overflow-hidden bg-bone-dim clip-corner mb-3 relative">
            <img
              src={galleryImages[activeImage]}
              alt={`${product.name} — ${selectedColor}`}
              className="w-full h-full object-cover"
            />
            {galleryImages.length > 1 && (
              <span className="absolute bottom-3 left-3 bg-void/80 text-bone text-[10px] tracking-[0.1em] uppercase px-2.5 py-1">
                {activeImage === 0 ? 'Front' : 'Back'}
              </span>
            )}
          </div>
          {galleryImages.length > 1 && (
            <div className="flex gap-3">
              {galleryImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-20 aspect-[4/5] overflow-hidden border ${
                    activeImage === i ? 'border-blaze' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DETAILS */}
        <div className="lg:pt-2">
          <h1 className="font-display text-4xl md:text-5xl tracking-wide leading-tight">
            {product.name}
          </h1>

          {reviews.length > 0 ? (
            <div className="flex items-center gap-1.5 mt-3">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < Math.round(avgRating) ? 'fill-blaze text-blaze' : 'text-hairline'}
                />
              ))}
              <span className="text-xs text-grey ml-1">{avgRating} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
            </div>
          ) : (
            <p className="text-xs text-grey mt-3">No reviews yet — be the first.</p>
          )}

          <div className="flex items-baseline gap-3 mt-5">
            <span className="text-2xl font-medium">{price}</span>
            <span className="text-sm text-grey">{secondaryPrice}</span>
          </div>

          <div className="mt-2">
            {product.stock === 'in-stock' && (
              <span className="text-xs text-green-700 flex items-center gap-1"><Check size={13} /> In Stock</span>
            )}
            {product.stock === 'low-stock' && (
              <span className="text-xs text-blaze font-medium">Low Stock — order soon</span>
            )}
            {product.stock === 'sold-out' && (
              <span className="text-xs text-grey font-medium">Sold Out</span>
            )}
          </div>

          <p className="text-grey text-[15px] leading-relaxed mt-6">{product.description}</p>

          {/* Color */}
          <div className="mt-8">
            <h3 className="text-xs tracking-[0.1em] uppercase mb-3">
              Color: <span className="text-grey">{selectedColor}</span>
            </h3>
            <div className="flex gap-2.5">
              {product.colors.map((c) => (
                <button
                  key={c.name}
                  onClick={() => handleColorChange(c.name)}
                  className={`w-9 h-9 rounded-full border-2 transition-all ring-1 ring-inset ring-hairline ${
                    selectedColor === c.name ? 'border-blaze scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                  aria-label={c.name}
                />
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="mt-7">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs tracking-[0.1em] uppercase">
                Size {sizeError && <span className="text-blaze normal-case">— please select a size</span>}
              </h3>
              <button
                onClick={() => setSizeGuideOpen(true)}
                className="flex items-center gap-1 text-xs text-grey hover:text-blaze underline underline-offset-4"
              >
                <Ruler size={13} /> Size Guide
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => {
                const variant = product.variants?.find(
                  (v) => v.color_name === selectedColor && v.size === s
                )
                const outOfStock = variant && variant.stock_quantity === 0
                return (
                  <button
                    key={s}
                    onClick={() => {
                      if (outOfStock) return
                      setSelectedSize(s)
                      setSizeError(false)
                    }}
                    disabled={outOfStock}
                    className={`min-w-11 h-11 px-3 border text-sm transition-colors relative ${
                      outOfStock
                        ? 'border-hairline text-grey/40 cursor-not-allowed line-through'
                        : selectedSize === s
                        ? 'bg-void text-bone border-void'
                        : sizeError
                        ? 'border-blaze'
                        : 'border-hairline hover:border-void'
                    }`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 'sold-out'}
            className="w-full mt-8 bg-void text-bone py-4 text-sm tracking-[0.12em] uppercase font-medium hover:bg-blaze transition-colors disabled:bg-hairline disabled:text-grey disabled:cursor-not-allowed"
          >
            {product.stock === 'sold-out' ? 'Sold Out' : added ? 'Added to Bag ✓' : 'Add to Bag'}
          </button>

          {/* Material */}
          <div className="mt-8 pt-6 border-t border-hairline text-sm text-grey space-y-1.5">
            <p><span className="text-void font-medium">Material:</span> {product.material}</p>
            <p><span className="text-void font-medium">Shipping:</span> Nigeria 2–5 days · International 7–14 days</p>
          </div>
        </div>
      </div>

      {/* REVIEWS */}
      <div className="mt-20 md:mt-28 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-3xl tracking-wide">
            Reviews {reviews.length > 0 && `(${reviews.length})`}
          </h2>
          {!showReviewForm && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="text-sm underline underline-offset-4 hover:text-blaze"
            >
              Write a Review
            </button>
          )}
        </div>

        {showReviewForm && (
          <div className="mb-8">
            <ReviewForm onSubmit={handleAddReview} />
          </div>
        )}

        {reviews.length === 0 ? (
          <p className="text-grey text-sm">No reviews yet for this product — you could be the first.</p>
        ) : (
          <div className="space-y-6">
            {reviews.map((r) => (
              <div key={r.id} className="border-b border-hairline pb-6">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} size={12} className={j < r.rating ? 'fill-blaze text-blaze' : 'text-hairline'} />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{r.name}</span>
                  {r.verified && <span className="text-[10px] tracking-wide uppercase text-grey">Verified Buyer</span>}
                </div>
                <p className="text-sm text-grey leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RELATED */}
      {related.length > 0 && (
        <div className="mt-20 md:mt-28">
          <h2 className="font-display text-3xl tracking-wide mb-8">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* SIZE GUIDE MODAL */}
      {sizeGuideOpen && (
        <div className="fixed inset-0 z-50 bg-void/60 flex items-center justify-center p-5" onClick={() => setSizeGuideOpen(false)}>
          <div className="bg-bone max-w-md w-full p-7 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-2xl tracking-wide">Size Guide</h3>
              <button onClick={() => setSizeGuideOpen(false)} aria-label="Close"><X size={20} /></button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-grey">
                  <th className="pb-2 font-medium">Size</th>
                  <th className="pb-2 font-medium">Chest (in)</th>
                  <th className="pb-2 font-medium">Length (in)</th>
                </tr>
              </thead>
              <tbody>
                {[['S', '38–40', '27'], ['M', '41–43', '28'], ['L', '44–46', '29'], ['XL', '47–49', '30'], ['XXL', '50–52', '31']].map((row) => (
                  <tr key={row[0]} className="border-b border-hairline/50">
                    <td className="py-2.5 font-medium">{row[0]}</td>
                    <td className="py-2.5 text-grey">{row[1]}</td>
                    <td className="py-2.5 text-grey">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-grey mt-4">All pieces are cut for an oversized fit — size down for a closer fit.</p>
          </div>
        </div>
      )}
    </div>
  )
}
