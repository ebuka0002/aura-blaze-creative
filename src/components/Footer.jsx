import { Link } from 'react-router-dom'
import { useState } from 'react'
import { subscribeToNewsletter } from '../lib/newsletter'

const IconInstagram = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
  </svg>
)
const IconTwitter = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
    <path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.5 22H1.4l8.1-9.3L1 2h7.2l5 6.6L18.9 2zm-1.2 18h1.7L7.4 3.9H5.6L17.7 20z" />
  </svg>
)
const IconFacebook = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
    <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.25-1.5 1.55-1.5H16.7V3.7c-.28-.04-1.25-.12-2.37-.12-2.35 0-3.96 1.43-3.96 4.06V9.9H7.6V13h2.77v8h3.13z" />
  </svg>
)

export default function Footer() {
  // const [email, setEmail] = useState('')
 const [submitted, setSubmitted] = useState(false)
const [email, setEmail] = useState('')
const [submitting, setSubmitting] = useState(false)
const [message, setMessage] = useState('')
const [success, setSuccess] = useState(false)

const handleSubmit = async (e) => {
  e.preventDefault()

  setMessage('')
  setSuccess(false)

  if (!email.trim()) {
    setMessage('Please enter your email address.')
    return
  }

  setSubmitting(true)

  try {
    const result = await subscribeToNewsletter(email)

    setSuccess(true)

    if (result.alreadySubscribed) {
      setMessage("You're already subscribed.")
    } else {
      setMessage("You're on the list.")
      setEmail('')
    }
  } catch (err) {
    setMessage(
      err.message || 'Something went wrong. Please try again.'
    )
  } finally {
    setSubmitting(false)
  }
}

  return (
    <footer className="bg-void text-bone">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_1fr_1.2fr] gap-12 md:gap-8">
          <div>
            <span className="font-display text-3xl tracking-[0.08em]">AURA BLAZE</span>
            <p className="text-white/50 text-sm mt-4 leading-relaxed max-w-xs">
              …embrace luxury with ease. Premium, minimalist streetwear for Lagos and beyond.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" aria-label="Instagram" className="text-white/60 hover:text-blaze-bright transition-colors">
                <IconInstagram />
              </a>
              <a href="#" aria-label="Twitter" className="text-white/60 hover:text-blaze-bright transition-colors">
                <IconTwitter />
              </a>
              <a href="#" aria-label="Facebook" className="text-white/60 hover:text-blaze-bright transition-colors">
                <IconFacebook />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] tracking-[0.15em] uppercase text-white/40 mb-4">Shop</h4>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li><Link to="/shop/jackets" className="hover:text-bone transition-colors">Jackets & Outerwear</Link></li>
              <li><Link to="/shop/tshirts" className="hover:text-bone transition-colors">Shirts</Link></li>
              <li><Link to="/shop/headwear" className="hover:text-bone transition-colors">Headwear</Link></li>
              <li><Link to="/shop/accessories" className="hover:text-bone transition-colors">Accessories</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] tracking-[0.15em] uppercase text-white/40 mb-4">Help</h4>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li><Link to="/faq" className="hover:text-bone transition-colors">FAQ</Link></li>
              <li><Link to="/shipping" className="hover:text-bone transition-colors">Shipping Policy</Link></li>
              <li><Link to="/returns" className="hover:text-bone transition-colors">Returns & Exchanges</Link></li>
              <li><Link to="/contact" className="hover:text-bone transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] tracking-[0.15em] uppercase text-white/40 mb-4">Stay in the loop</h4>
            <p className="text-white/50 text-sm mb-4">Early access to drops, no noise.</p>
            {submitted ? (
              <p className="text-blaze-bright text-sm">You're on the list.</p>
            ) : (
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="bg-transparent border border-white/25 px-3 py-2.5 text-sm flex-1 min-w-0 focus:outline-none focus:border-blaze-bright placeholder:text-white/40"
                />
               <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blaze hover:bg-blaze-bright transition-colors px-4 text-sm font-medium tracking-wide shrink-0 disabled:opacity-60"
                >
                  {submitting ? 'Joining…' : 'Join'}
                </button>
                {message && (
  <p
    className={`text-xs mt-2 ${
      success ? 'text-blaze' : 'text-blaze'
    }`}
  >
    {success ? '✓ ' : ''}
    {message}
  </p>
)}
              </form>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 mt-14 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] tracking-wide text-white/40">
          <p>© {new Date().getFullYear()} Aura Blaze Creative. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/privacy" className="hover:text-bone transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-bone transition-colors">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
