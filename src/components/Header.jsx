import { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Search, ShoppingBag, Menu, X, User, ChevronDown } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { fetchTaxonomy } from '../lib/taxonomy'
import logoMark from '../assets/logo-transparent.png'
import SearchOverlay from './SearchOverlay'

function CategoryNavItem({ category }) {
  return (
    <div className="relative group">
      <NavLink to={`/shop/${category.slug}`} className={({ isActive }) => `flex items-center gap-0.5 text-[10px] xl:text-[11px] tracking-[0.07em] uppercase font-medium transition-colors hover:text-blaze whitespace-nowrap ${isActive ? 'text-blaze' : 'text-void'}`}>
        {category.name}{category.collections?.length > 0 && <ChevronDown size={11} />}
      </NavLink>
      {category.collections?.length > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="bg-bone border border-hairline shadow-xl p-4 min-w-[230px]">
            <Link to={`/shop/${category.slug}`} className="block text-[10px] uppercase tracking-[0.12em] text-grey hover:text-blaze pb-3 mb-3 border-b border-hairline">All {category.name}</Link>
            <div className="space-y-2.5">
              {category.collections.map((collection) => (
                <Link key={collection.id} to={`/shop/${category.slug}/${collection.slug}`} className="block text-xs hover:text-blaze transition-colors">{collection.name}</Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [taxonomy, setTaxonomy] = useState([])
  const { count, setIsOpen } = useCart()
  const { isLoggedIn } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    fetchTaxonomy().then(setTaxonomy).catch((err) => console.error('Failed to load navigation categories:', err))
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navCategories = taxonomy.length ? taxonomy : []
  const left = navCategories.slice(0, 4)
  const right = navCategories.slice(4, 7)
  const more = navCategories.slice(7)

  return (
    <header className={`sticky top-0 z-40 bg-bone transition-shadow ${scrolled ? 'shadow-[0_1px_0_0_rgba(11,11,12,0.1)]' : ''}`}>
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 h-[76px] flex items-center justify-between">
        <button className="lg:hidden p-2 -ml-2" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={22} strokeWidth={1.5} /></button>

        <nav className="hidden lg:flex items-center gap-4 xl:gap-5 flex-1 min-w-0">
          <NavLink to="/" className={({ isActive }) => `text-[10px] xl:text-[11px] tracking-[0.07em] uppercase font-medium transition-colors hover:text-blaze whitespace-nowrap ${isActive ? 'text-blaze' : 'text-void'}`}>Home</NavLink>
          {left.slice(0, 3).map((category) => <CategoryNavItem key={category.id} category={category} />)}
        </nav>

        <Link to="/" className="flex items-center gap-2 md:gap-2.5 absolute left-1/2 -translate-x-1/2 shrink-0">
          <img src={logoMark} alt="" className="h-7 md:h-8 w-auto object-contain" />
          <span className="font-display text-[22px] md:text-[28px] tracking-[0.08em] leading-none whitespace-nowrap">AURA BLAZE</span>
        </Link>

        <div className="flex items-center gap-1 md:gap-2 flex-1 justify-end min-w-0">
          <nav className="hidden lg:flex items-center gap-4 xl:gap-5 mr-2">
            {right.slice(0, 3).map((category) => <CategoryNavItem key={category.id} category={category} />)}
            {more.length > 0 && <div className="relative group"><button className="flex items-center gap-0.5 text-[10px] xl:text-[11px] tracking-[0.07em] uppercase font-medium whitespace-nowrap">More <ChevronDown size={11}/></button><div className="absolute right-0 top-full pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"><div className="bg-bone border border-hairline shadow-xl p-4 min-w-[210px] space-y-3">{more.map(c => <Link key={c.id} to={`/shop/${c.slug}`} className="block text-xs hover:text-blaze">{c.name}</Link>)}<Link to="/about" className="block text-xs hover:text-blaze pt-2 border-t border-hairline">About</Link></div></div></div>}
          </nav>
          <button className="p-2 hidden sm:block hover:text-blaze transition-colors" aria-label="Search" onClick={() => setSearchOpen(true)}><Search size={19} strokeWidth={1.5} /></button>
          <Link to="/account" className="p-2 hidden sm:block hover:text-blaze transition-colors relative" aria-label={isLoggedIn ? 'My Account' : 'Log In'}><User size={19} strokeWidth={1.5} className={isLoggedIn ? 'fill-void/10' : ''} />{isLoggedIn && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blaze" />}</Link>
          <button className="p-2 relative hover:text-blaze transition-colors" aria-label="Cart" onClick={() => setIsOpen(true)}><ShoppingBag size={19} strokeWidth={1.5} />{count > 0 && <span className="absolute top-0 right-0 bg-blaze text-bone text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">{count}</span>}</button>
        </div>
      </div>

      {mobileOpen && <div className="fixed inset-0 z-50 bg-void text-bone flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-5 h-[76px] shrink-0"><span className="flex items-center gap-2"><img src={logoMark} alt="" className="h-7 w-auto object-contain invert"/><span className="font-display text-2xl tracking-[0.08em]">AURA BLAZE</span></span><button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-2"><X size={24} strokeWidth={1.5}/></button></div>
        <nav className="flex flex-col px-5 mt-4 pb-10 gap-1">
          <button onClick={() => { setSearchOpen(true); setMobileOpen(false) }} className="flex items-center gap-3 font-display text-3xl tracking-wide py-3 border-b border-white/10 text-left"><Search size={24} strokeWidth={1.5}/> Search</button>
          <Link to="/shop" onClick={() => setMobileOpen(false)} className="font-display text-2xl tracking-wide py-3 border-b border-white/10">Shop All</Link>
          {navCategories.map((category) => <div key={category.id} className="border-b border-white/10 py-2"><Link to={`/shop/${category.slug}`} onClick={() => setMobileOpen(false)} className="font-display text-2xl tracking-wide block py-2">{category.name}</Link>{category.collections?.length > 0 && <div className="pl-3 pb-2 space-y-1">{category.collections.map(c => <Link key={c.id} to={`/shop/${category.slug}/${c.slug}`} onClick={() => setMobileOpen(false)} className="block text-sm text-bone/60 py-1.5 hover:text-bone">{c.name}</Link>)}</div>}</div>)}
          <Link to="/about" onClick={() => setMobileOpen(false)} className="font-display text-2xl tracking-wide py-3 border-b border-white/10">About</Link>
          <Link to="/account" onClick={() => setMobileOpen(false)} className="font-display text-2xl tracking-wide py-3 border-b border-white/10">{isLoggedIn ? 'My Account' : 'Log In'}</Link>
        </nav>
      </div>}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
