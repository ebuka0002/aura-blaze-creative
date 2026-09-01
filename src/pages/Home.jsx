import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { categories } from '../data/products'
import { fetchAllProducts } from '../lib/products'
import ProductCard from '../components/ProductCard'
import HeroSlider from '../components/HeroSlider'
import SEO from '../components/SEO'
import logoMark from '../assets/logo-transparent.png'
import heroMobile from '../assets/hero/hero-mobile.jpeg'
import heroSlide2Placeholder from '../assets/hero/hero-slide-3-model-crop.png'
import hero from '../assets/hero/hero.jpg'
import model1 from '../assets/models/model1.jpg'
import model2 from '../assets/models/model2.jpg'
import model3 from '../assets/models/model3.jpg'
import model4 from '../assets/models/model4.jpg'
import model5 from '../assets/models/model5.jpg'
import model6 from '../assets/models/model6.jpg'
import ManagedImageCarousel from '../components/ManagedImageCarousel'
import { fetchActiveHomepageGallery } from '../lib/homepageGallery'
import { fetchActiveDailyDrips } from '../lib/dailyDrips'
import { subscribeToNewsletter } from '../lib/newsletter'
import { fetchActiveHeroSlides } from '../lib/heroSlides'
import { fetchTaxonomy } from '../lib/taxonomy'
// Slide 2 currently uses a reference/placeholder photo (not Aura Blaze's own
// photography) to demonstrate the GAZU-style layout Ebuka asked for. Swap
// `image` below for real Aura Blaze photography as soon as it's ready —
// do not ship the placeholder to a live/public deployment.
const defaultHeroSlides = [
  {
    id: 'slide-1-collection',
    type: 'dark',
    image: hero,
    mobileImage: heroMobile,
    imageAlt: 'Aura Blaze Creative — new collection',
    eyebrow: 'Timeless. Distinct. Iconic.',
    heading: 'AURA BLAZE',
    subtext: '…embrace luxury with ease. The new collection is here.',
    primaryCta: { to: '/shop', label: 'Shop Now' },
    secondaryCta: { to: '/shop/new-arrivals', label: 'New In' },
  },
  {
    id: 'slide-2-gazu-style',
    type: 'light',
    image: heroSlide2Placeholder,
    imageAlt: 'Aura Blaze Creative — collection',
    eyebrow: 'FASHION THAT MOVES WITH YOU.',
    heading: 'AURA BLAZE',
    primaryCta: { to: '/shop', label: 'Shop Now' },
    secondaryCta: { to: '/shop/new-arrivals', label: 'Explore New In' },
    cornerLabel: 'NEW COLLECTION 2026',
  },
]
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } },
}

export default function Home() {
  const [featured, setFeatured] = useState([])
  const [collectionProducts, setCollectionProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [heroSlides, setHeroSlides] = useState([])
  const [heroLoading, setHeroLoading] = useState(true)
  const [taxonomy, setTaxonomy] = useState(categories)
  const [homepageGallery, setHomepageGallery] = useState([])
  const [dailyDrips, setDailyDrips] = useState([])
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false)
  const [newsletterMessage, setNewsletterMessage] = useState('')
  const [newsletterSuccess, setNewsletterSuccess] = useState(false)

const handleNewsletterSubmit = async (e) => {
  e.preventDefault()

  setNewsletterMessage('')
  setNewsletterSuccess(false)

  if (!newsletterEmail.trim()) {
    setNewsletterMessage('Please enter your email address.')
    return
  }

  setNewsletterSubmitting(true)

  try {
    const result = await subscribeToNewsletter(newsletterEmail)

    setNewsletterSuccess(true)

    if (result.alreadySubscribed) {
      setNewsletterMessage("You're already subscribed.")
    } else {
      setNewsletterMessage("You're on the list.")
      setNewsletterEmail('')
    }
  } catch (err) {
    setNewsletterMessage(
      err.message || 'Something went wrong. Please try again.'
    )
  } finally {
    setNewsletterSubmitting(false)
  }
}

  useEffect(() => {
    fetchTaxonomy().then(setTaxonomy).catch((err) => console.error('Failed to load categories:', err))

    fetchAllProducts()
      .then((all) => { setCollectionProducts(all); setFeatured(all.slice(0, 4)) })
      .catch((err) => console.error('Failed to load featured products:', err))
      .finally(() => setLoading(false))

    fetchActiveHeroSlides()
      .then((slides) => setHeroSlides(slides))
      .catch((err) => console.error('Failed to load homepage banners:', err))
      .finally(() => setHeroLoading(false))

    fetchActiveHomepageGallery()
      .then(setHomepageGallery)
      .catch((err) => console.error('Failed to load homepage gallery:', err))

    fetchActiveDailyDrips()
      .then(setDailyDrips)
      .catch((err) => console.error('Failed to load daily drips:', err))
  }, [])

  return (
    <div>
      <SEO path="/" />
      {/* HERO */}
      {!heroLoading && <HeroSlider slides={heroSlides.length ? heroSlides : defaultHeroSlides} />}

      {/* BRAND INTRO */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-100px' }}
        className="max-w-[1400px] mx-auto px-5 md:px-8 py-24 md:py-32 text-center"
      >
        <div className="max-w-2xl mx-auto">
          <img src={logoMark} alt="Aura Blaze Creative mark" className="w-14 h-14 mx-auto mb-8 object-contain" />
          <h2 className="font-display text-4xl md:text-5xl tracking-wide mb-6">
            TIMELESS. DISTINCT. ICONIC.
          </h2>
          <p className="text-grey leading-relaxed text-[15px] md:text-base">
            Aura Blaze Creative was built on a simple idea: luxury doesn't need to be loud. With every piece designed in Eastern Nigeria  🇳🇬,Each piece blends refined simplicity, distinctive design,Made to outlast the trend cycle for those who move with confidence and stand apart effortlessly.
          </p>
        </div>
      </motion.section>

      {/* FEATURED PRODUCTS */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-100px' }}
        className="max-w-[1400px] mx-auto px-5 md:px-8 pb-24 md:pb-32"
      >
        <div className="flex items-end justify-between mb-10">
          <h2 className="font-display text-3xl md:text-4xl tracking-wide">New Arrivals</h2>
          <Link
            to="/shop"
            className="hidden sm:flex items-center gap-1.5 text-sm tracking-wide uppercase hover:text-blaze transition-colors"
          >
            View All <ArrowRight size={15} />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-bone-dim animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <p className="text-grey text-sm">New arrivals coming soon.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </motion.section>

      {/* SHOP BY CATEGORY / COLLECTIONS */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-100px' }}
        className="bg-void text-bone py-24 md:py-32"
      >
        <div className="max-w-[1400px] mx-auto px-5 md:px-8">
          <h2 className="font-display text-3xl md:text-4xl tracking-wide mb-14">Shop by Category</h2>
          <div className="space-y-20 md:space-y-28">
            {taxonomy.map((cat) => {
              const collections = cat.collections?.slice(0, 4) || []
              return (
                <div key={cat.id}>
                  <div className="flex items-end justify-between gap-4 mb-6 md:mb-8">
                    <div>
                      <h3 className="font-display text-2xl md:text-3xl tracking-wide">{cat.name}</h3>
                      {cat.tagline && <p className="text-bone/50 text-xs md:text-sm mt-1.5">{cat.tagline}</p>}
                    </div>
                    <Link
                      to={`/shop/${cat.slug}/collections`}
                      className="flex items-center gap-1.5 text-[11px] md:text-xs tracking-[0.1em] uppercase text-bone/70 hover:text-bone transition-colors whitespace-nowrap"
                    >
                      View All <ArrowRight size={14} />
                    </Link>
                  </div>

                  {collections.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
                      {collections.map((collection) => {
                        const productImage = collectionProducts.find((p) => p.collectionId === collection.id)?.colors?.[0]?.images?.[0]
                        const image = collection.image_url || productImage
                        return (
                          <Link
                            key={collection.id}
                            to={`/shop/${cat.slug}/${collection.slug}`}
                            className="group relative aspect-[3/4] overflow-hidden clip-corner bg-bone/10"
                          >
                            {image ? (
                              <img
                                src={image}
                                alt={collection.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-bone/30 text-xs uppercase tracking-widest px-4 text-center">Collection image coming soon</div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/10 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                              <h4 className="font-display text-lg md:text-xl tracking-wide">{collection.name}</h4>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="border border-white/10 py-10 text-center text-bone/40 text-sm">No collections yet.</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* HOMEPAGE IMAGE CAROUSEL */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-100px' }}
        className="py-20 md:py-28 overflow-hidden"
      >
        <ManagedImageCarousel
          items={homepageGallery}
          fallbackItems={[
            { title: 'Designed in Eastern Nigeria', img: model1 },
            { title: 'Cut for the oversized silhouette', img: model2 },
            { title: 'Made to outlast the trend', img: model3 },
            { title: 'Made to outlast the trend', img: model4 },
            { title: 'Made to outlast the trend', img: model5 },
            { title: 'Made to outlast the trend', img: model6 },
          ]}
        />
      </motion.section>

      {/* DAILY DRIP */}
      {dailyDrips.length > 0 && (
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="max-w-[1400px] mx-auto px-5 md:px-8 pb-24 md:pb-32"
        >
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs tracking-[0.15em] uppercase text-grey mb-2">Style Journal</p>
              <h2 className="font-display text-3xl md:text-4xl tracking-wide">Daily Drip</h2>
            </div>
            <Link to="/daily-drip" className="flex items-center gap-1.5 text-[11px] md:text-xs tracking-[0.1em] uppercase hover:text-blaze transition-colors whitespace-nowrap">
              View More <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {dailyDrips.slice(0, 2).map((drip) => (
              <Link key={drip.id} to="/daily-drip" className="group block overflow-hidden rounded-[4px]">
                <div className="aspect-[3/4] overflow-hidden bg-bone-dim">
                  <img src={drip.image_url} alt={drip.caption || 'Aura Blaze Daily Drip'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                </div>
                {drip.caption && <p className="text-sm mt-3">{drip.caption}</p>}
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {/* NEWSLETTER */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-100px' }}
        className="max-w-[1400px] mx-auto px-5 md:px-8 py-24 md:py-28 text-center"
      >
        <h2 className="font-display text-3xl md:text-4xl tracking-wide mb-3">Join the List</h2>
        <p className="text-grey mb-8 max-w-md mx-auto text-sm md:text-base">
          Early access to drops, restocks before they sell out, and the occasional word
          from us — nothing more.
        </p>
        <form
  onSubmit={handleNewsletterSubmit}
  className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
>
  <input
    type="email"
    required
    value={newsletterEmail}
    onChange={(e) => setNewsletterEmail(e.target.value)}
    placeholder="Email address"
    disabled={newsletterSubmitting}
    className="border border-hairline px-4 py-3.5 text-sm flex-1 bg-transparent focus:outline-none focus:border-blaze disabled:opacity-60"
  />

  <button
    type="submit"
    disabled={newsletterSubmitting}
    className="bg-void text-bone px-7 py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors shrink-0 disabled:opacity-60"
  >
    {newsletterSubmitting ? 'Joining…' : 'Subscribe'}
  </button>
</form>

{newsletterMessage && (
  <p
    className={`text-sm mt-4 ${
      newsletterSuccess ? 'text-blaze' : 'text-blaze'
    }`}
  >
    {newsletterMessage}
  </p>
)}
      </motion.section>

      {/* SOCIAL */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-100px' }}
        className="pb-24 md:pb-32 text-center"
      >
        <p className="text-xs tracking-[0.15em] uppercase text-grey mb-1.5">Follow Us on Instagram</p>
        <a
          href="https://instagram.com/aura__blaze_creative"
          target="_blank"
          rel="noopener noreferrer"
          className="font-display text-3xl md:text-4xl tracking-wide hover:text-blaze transition-colors inline-block"
        >
          @aura__blaze_creative
        </a>
        <p className="text-xs tracking-[0.15em] uppercase text-grey mt-8 mb-1.5">Follow Us on Snapchat</p>
        <a
          href="https://www.snapchat.com/add/aurablaze01"
          target="_blank"
          rel="noopener noreferrer"
          className="font-display text-2xl md:text-3xl tracking-wide hover:text-blaze transition-colors inline-block"
        >
          @aurablaze01
        </a>
      </motion.section>
    </div>
  )
}















