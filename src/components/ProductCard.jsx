import { Link } from 'react-router-dom'
import { useState } from 'react'
import { formatNGN, formatUSD, getProductImages } from '../data/products'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product }) {
  const { currency } = useCart()
  const [hovered, setHovered] = useState(false)
  const price = currency === 'NGN' ? formatNGN(product.priceNGN) : formatUSD(product.priceUSD)
  const images = getProductImages(product, product.colors?.[0]?.name)

  return (
    <Link
      to={`/product/${product.id}`}
      className="group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative overflow-hidden aspect-[4/5] bg-bone-dim clip-corner">
        <img
          src={images[0]}
          alt={product.name}
          className={`w-full h-full object-cover transition-all duration-700 ${
            hovered ? 'scale-105 opacity-0' : 'scale-100 opacity-100'
          }`}
          loading="lazy"
        />
        {images[1] && (
          <img
            src={images[1]}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
              hovered ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
            }`}
            loading="lazy"
          />
        )}

       {product.isNew && (
  <span className="absolute top-3 left-3 bg-void text-bone text-[10px] tracking-[0.12em] uppercase px-2.5 py-1 font-medium">
    New
  </span>
)}

{product.isLimitedEdition && (
  <span
    className={`absolute ${
      product.isNew ? 'top-10' : 'top-3'
    } left-3 bg-blaze text-bone text-[10px] tracking-[0.12em] uppercase px-2.5 py-1 font-medium`}
  >
    Limited Edition
  </span>
)}
        {product.stock === 'sold-out' && (
          <span className="absolute top-3 left-3 bg-bone/95 text-void text-[10px] tracking-[0.12em] uppercase px-2.5 py-1 font-medium">
            Sold Out
          </span>
        )}
        {product.stock === 'low-stock' && (
          <span className="absolute top-3 left-3 bg-blaze text-bone text-[10px] tracking-[0.12em] uppercase px-2.5 py-1 font-medium">
            Low Stock
          </span>
        )}
      </div>

      <div className="mt-3.5 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium leading-snug">{product.name}</h3>
          <div className="flex gap-1.5 mt-1.5">
            {product.colors.map((c) => (
              <span
                key={c.name}
                className="w-3 h-3 rounded-full border border-void/10"
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        </div>
        <span className="text-sm font-medium whitespace-nowrap">{price}</span>
      </div>
    </Link>
  )
}
