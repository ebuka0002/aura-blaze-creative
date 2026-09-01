import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'
import { fetchActiveDailyDrips } from '../lib/dailyDrips'

export default function DailyDrip() {
  const [drips, setDrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActiveDailyDrips()
      .then(setDrips)
      .catch((err) => console.error('Failed to load daily drip:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-10 md:py-14">
      <SEO title="Daily Drip" description="Daily Drip from Aura Blaze Creative — looks, styling and streetwear inspiration." path="/daily-drip" />
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-grey hover:text-blaze mb-8">
        <ArrowLeft size={15} /> Back Home
      </Link>
      <div className="mb-10 md:mb-14">
        <p className="text-xs tracking-[0.15em] uppercase text-grey mb-2">Style Journal</p>
        <h1 className="font-display text-4xl md:text-6xl tracking-wide">Daily Drip</h1>
        <p className="text-grey text-sm md:text-base mt-3 max-w-xl">Fresh Aura Blaze looks, fits and moments.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
          {[...Array(8)].map((_, i) => <div key={i} className="aspect-[3/4] bg-bone-dim animate-pulse" />)}
        </div>
      ) : drips.length === 0 ? (
        <div className="py-24 text-center text-grey">No daily drips posted yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
          {drips.map((drip) => (
            <article key={drip.id}>
              <div className="aspect-[3/4] overflow-hidden bg-bone-dim">
                <img src={drip.image_url} alt={drip.caption || 'Aura Blaze Daily Drip'} className="w-full h-full object-cover" loading="lazy" />
              </div>
              {drip.caption && <p className="text-sm mt-3">{drip.caption}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
