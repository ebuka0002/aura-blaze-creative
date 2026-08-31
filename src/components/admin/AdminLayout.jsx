import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Package, ShoppingBag, Send, Tag, Mail, Image, Images, FolderTree, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-2.5 px-3 py-2.5 text-sm rounded transition-colors ${
    isActive ? 'bg-bone text-void' : 'text-bone/70 hover:bg-white/5'
  }`

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const NavLinks = ({ onNavigate }) => (
    <>
      <NavLink to="/admin/homepage-banners" className={navLinkClass} onClick={onNavigate}>
        <Image size={16} /> Homepage Banners
      </NavLink>
      <NavLink to="/admin/homepage-gallery" className={navLinkClass} onClick={onNavigate}>
        <Images size={16} /> Homepage Carousel
      </NavLink>
      <NavLink to="/admin/daily-drip" className={navLinkClass} onClick={onNavigate}>
        <Image size={16} /> Daily Drip
      </NavLink>
      <NavLink to="/admin/categories" className={navLinkClass} onClick={onNavigate}>
        <FolderTree size={16} /> Categories
      </NavLink>
      <NavLink to="/admin/products" className={navLinkClass} onClick={onNavigate}>
        <Package size={16} /> Products
      </NavLink>
      <NavLink to="/admin/orders" className={navLinkClass} onClick={onNavigate}>
        <ShoppingBag size={16} /> Orders
      </NavLink>
      <NavLink to="/admin/discounts" className={navLinkClass} onClick={onNavigate}>
        <Tag size={16} /> Discount Codes
      </NavLink>
      <NavLink to="/admin/subscribers" className={navLinkClass} onClick={onNavigate}>
        <Mail size={16} /> Subscribers
      </NavLink>
      <NavLink to="/admin/broadcast" className={navLinkClass} onClick={onNavigate}>
        <Send size={16} /> Broadcast
      </NavLink>
      
    </>
  )

  return (
    <div className="min-h-screen bg-bone-dim md:flex">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-void text-bone px-5 h-16 sticky top-0 z-30">
        <button onClick={() => setMobileNavOpen(true)} aria-label="Open menu" className="p-1 -ml-1">
          <Menu size={22} />
        </button>
        <Link to="/admin" className="font-display text-lg tracking-wide">
          AURA BLAZE <span className="text-bone/40 text-xs align-middle">Admin</span>
        </Link>
        <div className="w-6" /> {/* spacer to balance the hamburger for true centering */}
      </div>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-void text-bone flex flex-col">
          <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
            <span className="font-display text-lg tracking-wide">Menu</span>
            <button onClick={() => setMobileNavOpen(false)} aria-label="Close menu" className="p-1">
              <X size={22} />
            </button>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            <NavLinks onNavigate={() => setMobileNavOpen(false)} />
          </nav>
          <div className="px-6 py-4 border-t border-white/10">
            <p className="text-xs text-bone/50 truncate mb-2">{user?.email}</p>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-xs text-bone/70 hover:text-blaze-bright transition-colors"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Desktop/tablet sidebar */}
      <aside className="hidden md:flex w-56 lg:w-60 bg-void text-bone shrink-0 flex-col">
        <div className="px-6 py-6 border-b border-white/10">
          <Link to="/admin" className="font-display text-xl tracking-wide">
            AURA BLAZE
          </Link>
          <p className="text-[10px] tracking-[0.15em] uppercase text-bone/40 mt-0.5">Admin</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLinks />
        </nav>

        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-xs text-bone/50 truncate mb-2">{user?.email}</p>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs text-bone/70 hover:text-blaze-bright transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
