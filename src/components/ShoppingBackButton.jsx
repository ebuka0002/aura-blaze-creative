import { ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function ShoppingBackButton() {
  const location = useLocation()
  const navigate = useNavigate()

  const isShoppingPage =
    location.pathname === '/shop' ||
    location.pathname.startsWith('/shop/') ||
    location.pathname.startsWith('/product/') ||
    location.pathname === '/cart' ||
    location.pathname === '/checkout' ||
    location.pathname === '/order-confirmation'

  if (!isShoppingPage) return null

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/shop')
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-5 md:px-8 pt-5 md:pt-7">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm text-grey hover:text-blaze transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft size={15} />
        Back
      </button>
    </div>
  )
}
