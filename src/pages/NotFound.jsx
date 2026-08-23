import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function NotFound() {
  return (
    <div className="max-w-[1400px] mx-auto px-5 py-32 text-center">
      <SEO title="Page Not Found" noindex />
      <h1 className="font-display text-8xl md:text-9xl tracking-wide mb-4">404</h1>
      <p className="text-grey mb-8">This page doesn't exist — even a blaze burns out sometimes.</p>
      <Link to="/" className="bg-void text-bone px-8 py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors">
        Back to Home
      </Link>
    </div>
  )
}
