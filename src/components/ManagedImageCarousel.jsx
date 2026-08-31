import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function ManagedImageCarousel({ items, fallbackItems = [] }) {
  const slides = items?.length ? items : fallbackItems
  const [currentIndex, setCurrentIndex] = useState(0)
  const [carouselWidth, setCarouselWidth] = useState(0)
  const carouselRef = useRef(null)

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, Math.max(slides.length - 1, 0)))
  }, [slides.length])

  useEffect(() => {
    if (!carouselRef.current) return

    const updateWidth = () => setCarouselWidth(carouselRef.current.offsetWidth)
    updateWidth()

    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(carouselRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  if (!slides.length) return null

  const nextSlide = () => setCurrentIndex((prev) => Math.min(prev + 1, slides.length - 1))
  const prevSlide = () => setCurrentIndex((prev) => Math.max(prev - 1, 0))
  const currentX = -(currentIndex * carouselWidth)

  return (
    <div className="relative max-w-[1000px] mx-auto px-5 md:px-8">
      <div
        ref={carouselRef}
        className="relative overflow-hidden rounded-[24px] h-[480px] sm:h-[540px] md:h-[690px] touch-pan-y select-none"
      >
        <motion.div
          className="flex h-full"
          drag="x"
          dragConstraints={{
            left: carouselWidth > 0 ? -(slides.length - 1) * carouselWidth : 0,
            right: 0,
          }}
          dragElastic={0.08}
          dragMomentum={false}
          animate={{ x: currentX }}
          transition={{ type: 'spring', stiffness: 320, damping: 35, mass: 0.8 }}
          onDragEnd={(event, info) => {
            const offset = info.offset.x
            const velocity = info.velocity.x
            const swipeDistance = carouselWidth * 0.18

            if ((offset < -swipeDistance || velocity < -500) && currentIndex < slides.length - 1) {
              setCurrentIndex((prev) => prev + 1)
            } else if ((offset > swipeDistance || velocity > 500) && currentIndex > 0) {
              setCurrentIndex((prev) => prev - 1)
            }
          }}
        >
          {slides.map((item, index) => {
            const image = item.image_url || item.img
            const title = item.title || item.caption || ''

            return (
              <div key={item.id || `${title}-${index}`} className="relative shrink-0 w-full h-full overflow-hidden">
                <img
                  src={image}
                  alt={item.image_alt || title || 'Aura Blaze Creative'}
                  draggable="false"
                  className="w-full h-full object-cover pointer-events-none"
                />
                <div className="absolute inset-0 bg-void/10 pointer-events-none" />
                {title && (
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 bg-gradient-to-t from-void/70 to-transparent pointer-events-none">
                    <p className="text-bone text-xl md:text-3xl font-display tracking-wide">{title}</p>
                  </div>
                )}
              </div>
            )
          })}
        </motion.div>

        <button type="button" onClick={prevSlide} disabled={currentIndex === 0} aria-label="Previous image" className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-void/80 text-bone flex items-center justify-center hover:bg-void transition-all duration-200 z-20 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft size={28} />
        </button>
        <button type="button" onClick={nextSlide} disabled={currentIndex === slides.length - 1} aria-label="Next image" className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-void/80 text-bone flex items-center justify-center hover:bg-void transition-all duration-200 z-20 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight size={28} />
        </button>
      </div>

      <div className="flex justify-center items-center gap-2 mt-6">
        {slides.map((item, index) => (
          <button
            key={item.id || index}
            type="button"
            onClick={() => setCurrentIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${index === currentIndex ? 'w-8 bg-void' : 'w-2 bg-void/20 hover:bg-void/40'}`}
          />
        ))}
      </div>
    </div>
  )
}
