import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

const AUTO_ROTATE_MS = 12000

// Each slide declares its own `type`:
// - 'dark': full-bleed photo, dark gradient overlay, light text — our original style
// - 'light': light background, giant wordmark type overlapping the photo — GAZU-style
export default function HeroSlider({ slides }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const goTo = useCallback((i) => {
    setIndex((i + slides.length) % slides.length)
  }, [slides.length])

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length)
    }, AUTO_ROTATE_MS)
    return () => clearInterval(timer)
  }, [paused, slides.length])

  const slide = slides[index]

  return (
    <section
      className="relative h-[92vh] min-h-[560px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
        >
          {slide.type === 'light' ? (
            <LightSlide slide={slide} />
          ) : (
            <DarkSlide slide={slide} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dot controls */}
      {slides.length > 1 && (
        <div className="absolute bottom-5 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? slide.type === 'light'
                    ? 'w-8 bg-void'
                    : 'w-8 bg-bone'
                  : slide.type === 'light'
                  ? 'w-1.5 bg-void/30'
                  : 'w-1.5 bg-bone/40'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function DarkSlide({ slide }) {
  return (
    <div className="relative w-full h-full bg-void text-bone">
      {slide.mobileImage && (
        <img
          src={slide.mobileImage}
          alt={slide.imageAlt}
          className="md:hidden absolute inset-0 w-full h-full object-cover object-top opacity-80"
        />
      )}
      <img
        src={slide.image}
        alt={slide.imageAlt}
        className={`${slide.mobileImage ? 'hidden md:block' : ''} absolute inset-0 w-full h-full object-cover opacity-70`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-void via-void/10 to-transparent" />

      <div className="relative h-full max-w-[1400px] mx-auto px-5 md:px-8 flex flex-col justify-end pb-8 md:pb-24">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-[11px] md:text-xs tracking-[0.3em] uppercase text-bone/70 mb-4"
        >
          {slide.eyebrow}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-display text-[18vw] sm:text-[13vw] md:text-[9vw] leading-[0.85] tracking-tight"
        >
          {slide.heading}
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.7 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mt-6 md:mt-8"
        >
          <p className="text-bone/70 text-sm md:text-base max-w-sm">{slide.subtext}</p>
          <div className="flex gap-3 shrink-0">
            <Link
              to={slide.primaryCta.to}
              className="bg-bone text-void px-7 py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze hover:text-bone transition-colors"
            >
              {slide.primaryCta.label}
            </Link>
            <Link
              to={slide.secondaryCta.to}
              className="border border-bone/40 px-7 py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:border-bone transition-colors"
            >
              {slide.secondaryCta.label}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// GAZU-style: light background, oversized wordmark layered behind/through
// the subject photo, small label copy top-left, compact CTAs bottom-left,
// small collection label bottom-right.
function LightSlide({ slide }) {
  return (
    <div className="relative w-full h-full bg-bone-dim text-void">
      <div className="relative h-full max-w-[1400px] mx-auto px-5 md:px-8">
        {/* Eyebrow top-left */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="absolute top-8 md:top-12 left-5 md:left-8 text-[11px] md:text-xs tracking-[0.2em] uppercase leading-relaxed max-w-[140px]"
        >
          {slide.eyebrow}
        </motion.div>

        {/* Giant wordmark, centered, behind the photo.
            Mobile: two lines, larger size, nudged up slightly.
            Tablet (md): scaled single-line, sized for the 768–1024px range.
            Desktop (lg): original single-line scaling formula. */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.9 }}
          className="absolute inset-0 flex flex-col lg:flex-row items-center justify-center font-display leading-[0.95] lg:leading-none tracking-tight text-void/90 select-none pointer-events-none px-4 text-center -translate-y-[8vh] md:translate-y-0"
        >
          <span className="lg:hidden text-[26vw] md:text-[16vw]">
            {slide.heading.split(' ').map((word) => (
              <span key={word} className="block">{word}</span>
            ))}
          </span>
          <span
            className="hidden lg:inline whitespace-nowrap"
            style={{ fontSize: `min(${120 / Math.max(slide.heading.length, 1)}vw, 22vw)` }}
          >
            {slide.heading}
          </span>
        </motion.h1>

        {/* Photo, layered above the wordmark.
            Mobile: smaller, nudged up. Tablet: medium size. Desktop: full size. */}
        <motion.img
          src={slide.image}
          alt={slide.imageAlt}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[55%] md:h-[75%] lg:h-[95%] w-auto object-contain object-bottom z-10 -translate-y-[8vh] md:translate-y-0"
        />

        {/* Bottom-left CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="absolute bottom-8 md:bottom-12 left-5 md:left-8 z-20 flex gap-3"
        >
          <Link
            to={slide.primaryCta.to}
            className="bg-void text-bone px-6 py-3 text-xs md:text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors"
          >
            {slide.primaryCta.label}
          </Link>
          <Link
            to={slide.secondaryCta.to}
            className="text-xs md:text-sm tracking-[0.05em] uppercase font-medium underline underline-offset-4 self-center hover:text-blaze transition-colors"
          >
            {slide.secondaryCta.label}
          </Link>
        </motion.div>

        {/* Bottom-right label — hidden on mobile, shown from tablet up */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="hidden md:block absolute bottom-8 md:bottom-12 right-5 md:right-8 z-20 text-[11px] md:text-xs tracking-[0.15em] uppercase text-right leading-relaxed"
        >
          {slide.cornerLabel}
        </motion.div>
      </div>
    </div>
  )
}
