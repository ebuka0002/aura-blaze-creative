import { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Search, ShoppingBag, Menu, X, User } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import logoMark from '../assets/logo-transparent.png'
import SearchOverlay from './SearchOverlay'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/shop/jackets', label: 'Jackets' },
  { to: '/shop/tshirts', label: 'Shirts' },
  { to: '/shop/headwear', label: 'Headwear' },
  { to: '/shop/accessories', label: 'Accessories' },
  { to: '/shop/tank-tops', label: 'Tank Tops' },
  { to: '/shop/denim-trousers', label: 'Denim Trousers' },
  { to: '/about', label: 'About' },
]

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { count, setIsOpen } = useCart()
  const { isLoggedIn } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-40 bg-bone transition-shadow ${
        scrolled ? 'shadow-[0_1px_0_0_rgba(11,11,12,0.1)]' : ''
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 h-[76px] flex items-center justify-between">
        <button
          className="lg:hidden p-2 -ml-2"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={22} strokeWidth={1.5} />
        </button>

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.slice(0, 5).map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-[11px] tracking-[0.08em] uppercase font-medium transition-colors hover:text-blaze ${
                  isActive ? 'text-blaze' : 'text-void'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <Link
          to="/"
          className="flex items-center gap-2 md:gap-2.5 absolute left-1/2 -translate-x-1/2"
        >
          <img src={logoMark} alt="" className="h-7 md:h-8 w-auto object-contain" />
          <span className="font-display text-[22px] md:text-[28px] tracking-[0.08em] leading-none whitespace-nowrap">
            AURA BLAZE
          </span>
        </Link>

        <div className="flex items-center gap-1 md:gap-2">
          <nav className="hidden lg:flex items-center gap-8 mr-4">
            {navLinks.slice(5).map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-[11px] tracking-[0.08em] uppercase font-medium transition-colors hover:text-blaze ${
                    isActive ? 'text-blaze' : 'text-void'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <button
            className="p-2 hidden sm:block hover:text-blaze transition-colors"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={19} strokeWidth={1.5} />
          </button>
          <Link
            to="/account"
            className="p-2 hidden sm:block hover:text-blaze transition-colors relative"
            aria-label={isLoggedIn ? 'My Account' : 'Log In'}
          >
            <User size={19} strokeWidth={1.5} className={isLoggedIn ? 'fill-void/10' : ''} />
            {isLoggedIn && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blaze" />
            )}
          </Link>
          <button
            className="p-2 relative hover:text-blaze transition-colors"
            aria-label="Cart"
            onClick={() => setIsOpen(true)}
          >
            <ShoppingBag size={19} strokeWidth={1.5} />
            {count > 0 && (
              <span className="absolute top-0 right-0 bg-blaze text-bone text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-void text-bone flex flex-col">
          <div className="flex items-center justify-between px-5 h-[76px]">
            <span className="flex items-center gap-2">
              <img src={logoMark} alt="" className="h-7 w-auto object-contain invert" />
              <span className="font-display text-2xl tracking-[0.08em]">AURA BLAZE</span>
            </span>
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-2">
              <X size={24} strokeWidth={1.5} />
            </button>
          </div>
          <nav className="flex flex-col px-5 mt-8 gap-1">
            <button
              onClick={() => { setSearchOpen(true); setMobileOpen(false) }}
              className="flex items-center gap-3 font-display text-4xl tracking-wide py-3 border-b border-white/10 text-left"
            >
              <Search size={26} strokeWidth={1.5} /> Search
            </button>
            {[{ to: '/shop', label: 'Shop All' }, ...navLinks, { to: '/account', label: isLoggedIn ? 'My Account' : 'Log In' }].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="font-display text-2xl md:text-3xl tracking-wide py-3 border-b border-white/10"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
