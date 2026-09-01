import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import AnnouncementBar from './components/AnnouncementBar'
import Header from './components/Header'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import WhatsAppButton from './components/WhatsAppButton'
import ShoppingBackButton from './components/ShoppingBackButton'
import RequireAdmin from './components/admin/RequireAdmin'
import AdminLayout from './components/admin/AdminLayout'
import Home from './pages/Home'
import Shop from './pages/Shop'
import Product from './pages/Product'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import Account from './pages/Account'
import AccountOrders from './pages/AccountOrders'
import AccountOrderDetail from './pages/AccountOrderDetail'
import ResetPassword from './pages/ResetPassword'
import ConfirmEmail from './pages/ConfirmEmail'
import About from './pages/About'
import Contact from './pages/Contact'
import FAQ from './pages/FAQ'
import Returns from './pages/Returns'
import Shipping from './pages/Shipping'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import NotFound from './pages/NotFound'
import AdminLogin from './pages/admin/AdminLogin'
import AdminProducts from './pages/admin/AdminProducts'
import AdminCategories from './pages/admin/AdminCategories'
import AdminProductDetail from './pages/admin/AdminProductDetail'
import AdminProductNew from './pages/admin/AdminProductNew'
import AdminOrders from './pages/admin/AdminOrders'
import AdminOrderDetail from './pages/admin/AdminOrderDetail'
import AdminDiscounts from './pages/admin/AdminDiscounts'
import AdminDiscountForm from './pages/admin/AdminDiscountForm'
import AdminSubscribers from './pages/admin/AdminSubscribers'
import AdminBroadcast from './pages/admin/AdminBroadcast'
import AdminHomeBanners from './pages/admin/AdminHomeBanners'
import AdminHomepageGallery from './pages/admin/AdminHomepageGallery'
import AdminDailyDrip from './pages/admin/AdminDailyDrip'
import DailyDrip from './pages/DailyDrip'
import Unsubscribe from './pages/Unsubscribe'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function StorefrontLayout({ children }) {
  return (
    <CartProvider>
      <AnnouncementBar />
      <Header />
      <CartDrawer />
      <ShoppingBackButton />
      <main>{children}</main>
      <Footer />
      <WhatsAppButton />
    </CartProvider>
  )
}

export default function App() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <HelmetProvider>
      <AuthProvider>
        <ScrollToTop />
      {isAdminRoute ? (
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<AdminProducts />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="products/new" element={<AdminProductNew />} />
            <Route path="products/:id" element={<AdminProductDetail />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />
            <Route path="discounts" element={<AdminDiscounts />} />
            <Route path="discounts/new" element={<AdminDiscountForm />} />
            <Route path="discounts/:id" element={<AdminDiscountForm />} />
            <Route path="subscribers" element={<AdminSubscribers />} />
            <Route path="broadcast" element={<AdminBroadcast />} />
            <Route path="homepage-banners" element={<AdminHomeBanners />} />
            <Route path="homepage-gallery" element={<AdminHomepageGallery />} />
            <Route path="daily-drip" element={<AdminDailyDrip />} />
          </Route>
        </Routes>
      ) : (
        <StorefrontLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/:category/:collection" element={<Shop />} />
            <Route path="/shop/:category" element={<Shop />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation" element={<OrderConfirmation />} />
            <Route path="/account" element={<Account />} />
            <Route path="/account/reset-password" element={<ResetPassword />} />
            <Route path="/account/confirm" element={<ConfirmEmail />} />
            <Route path="/account/orders" element={<AccountOrders />} />
            <Route path="/account/orders/:id" element={<AccountOrderDetail />} />
            <Route path="/daily-drip" element={<DailyDrip />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/shipping" element={<Shipping />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
          </Routes>
        </StorefrontLayout>
      )}
      </AuthProvider>
    </HelmetProvider>
  )
}
