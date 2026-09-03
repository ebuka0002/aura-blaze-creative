import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

const AUTO_ROTATE_MS = 12000

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
  if (!slide) return null

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
          {slide.templateData?.template === 'magazine' ? (
            <EditorialMagazineSlide slide={slide} />
          ) : slide.type === 'light' ? (
            <LightSlide slide={slide} />
          ) : (
            <DarkSlide slide={slide} />
          )}
        </motion.div>
      </AnimatePresence>

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
        <img src={slide.mobileImage} alt={slide.imageAlt} className="md:hidden absolute inset-0 w-full h-full object-cover object-top opacity-80" />
      )}
      <img src={slide.image} alt={slide.imageAlt} className={`${slide.mobileImage ? 'hidden md:block' : ''} absolute inset-0 w-full h-full object-cover opacity-70`} />
      <div className="absolute inset-0 bg-gradient-to-t from-void via-void/10 to-transparent" />
      <div className="relative h-full max-w-[1400px] mx-auto px-5 md:px-8 flex flex-col justify-end pb-8 md:pb-24">
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="text-[11px] md:text-xs tracking-[0.3em] uppercase text-bone/70 mb-4">{slide.eyebrow}</motion.p>
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }} className="font-display text-[18vw] sm:text-[13vw] md:text-[9vw] leading-[0.85] tracking-tight">{slide.heading}</motion.h1>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.7 }} className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mt-6 md:mt-8">
          <p className="text-bone/70 text-sm md:text-base max-w-sm">{slide.subtext}</p>
          <div className="flex gap-3 shrink-0">
            <Link to={slide.primaryCta.to} className="bg-bone text-void px-7 py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze hover:text-bone transition-colors">{slide.primaryCta.label}</Link>
            <Link to={slide.secondaryCta.to} className="border border-bone/40 px-7 py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:border-bone transition-colors">{slide.secondaryCta.label}</Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function EditorialMagazineSlide({ slide }) {
  const d = slide.templateData || {}
  const title = d.magazineTitle || slide.heading || 'AURA BLAZE'
  const issueLabel = d.issueLabel || 'AUGUST 2026 / ISSUE 09'
  const topTagline = d.topTagline || 'TIMELESS. DISTINCT. ICONIC.'
  const leftHeadline = d.leftHeadline || 'URBAN LUXURY REDEFINED'
  const leftSubtext = d.leftSubtext || 'Elevated essentials for the modern visionary.'
  const rightHeadline = d.rightHeadline || 'THE STREETWEAR REVOLUTION'
  const rightSubtext = d.rightSubtext || 'Culture. Confidence. Creativity.'
  const storyHeading = d.storyHeading || 'AURA BLAZE CREATIVE: BEHIND THE BRAND'
  const storySubtext = d.storySubtext || 'The story. The people. The purpose.'
  const issueNumber = d.issueNumber || '09'
  const website = d.website || 'AURABLAZE.COM'
  const showBarcode = d.showBarcode !== false
  const textColor = d.textColor || '#111111'
  const issueNumberColor = d.issueNumberColor || '#ffffff'
  const websiteColor = d.websiteColor || '#ffffff'

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#e9e6de]">
      {/* Portrait magazine on phones/tablets; full-width editorial banner on desktop. */}
      <div className="absolute inset-0 flex items-center justify-center px-0 sm:px-4 md:px-8 lg:px-0">
        <div className="relative h-full w-full sm:h-[98%] sm:w-auto sm:aspect-[2/3] lg:h-full lg:w-full lg:aspect-auto overflow-hidden bg-[#e9e6de] shadow-[0_10px_40px_rgba(0,0,0,0.12)]">
          {slide.mobileImage ? (
            <picture>
              <source media="(max-width: 767px)" srcSet={slide.mobileImage} />
              <img src={slide.image} alt={slide.imageAlt} className="absolute inset-0 w-full h-full object-cover object-center" />
            </picture>
          ) : (
            <img src={slide.image} alt={slide.imageAlt} className="absolute inset-0 w-full h-full object-cover object-center" />
          )}

          {/* Desktop uses a slightly stronger wash so text remains readable over landscape photos. */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-black/15 lg:from-white/45 lg:via-transparent lg:to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10" />

          <div className="absolute inset-0 z-10 p-4 sm:p-6 md:p-8 lg:p-10" style={{ color: textColor }}>
            <div className="absolute top-4 sm:top-6 md:top-8 lg:top-8 left-4 sm:left-6 md:left-8 lg:left-10 text-[9px] sm:text-[10px] md:text-xs lg:text-[13px] font-medium tracking-[0.06em] uppercase max-w-[42%]">
              {issueLabel}
            </div>
            <div className="absolute top-4 sm:top-6 md:top-8 lg:top-8 right-4 sm:right-6 md:right-8 lg:right-10 text-[9px] sm:text-[10px] md:text-xs lg:text-[13px] tracking-[0.14em] uppercase text-right max-w-[42%]">
              {topTagline}
            </div>

            {/* Masthead: portrait sizing on mobile, controlled desktop sizing so it never overflows wide screens. */}
            <div className="absolute top-[6%] sm:top-[6%] lg:top-[5%] left-1/2 -translate-x-1/2 w-[96%] text-center pointer-events-none select-none">
              <div
                className="font-display font-bold leading-[0.78] tracking-[-0.04em] whitespace-nowrap"
                style={{
                  color: textColor,
                  fontSize: 'clamp(58px, 8.5vw, 170px)',
                }}
              >
                {title}
              </div>
            </div>

            {/* Desktop side stories spread farther apart; mobile stays close to the reference cover. */}
            <div className="absolute left-4 sm:left-6 md:left-8 lg:left-[4.5%] top-[34%] md:top-[37%] lg:top-[35%] w-[25%] lg:w-[20%] max-w-[320px]">
              <div className="font-display text-[clamp(18px,2.8vw,42px)] lg:text-[clamp(24px,2.2vw,44px)] leading-[0.9] uppercase">{leftHeadline}</div>
              <div className="mt-3 sm:mt-4 text-[10px] sm:text-xs md:text-sm lg:text-[14px] leading-snug max-w-[210px]">{leftSubtext}</div>
              <div className="mt-3 w-8 sm:w-10 lg:w-14 border-t" style={{ borderColor: textColor }} />
            </div>

            <div className="absolute right-4 sm:right-6 md:right-8 lg:right-[4.5%] top-[34%] md:top-[37%] lg:top-[35%] w-[25%] lg:w-[20%] max-w-[320px] text-right">
              <div className="font-display text-[clamp(18px,2.8vw,42px)] lg:text-[clamp(24px,2.2vw,44px)] leading-[0.9] uppercase">{rightHeadline}</div>
              <div className="mt-3 sm:mt-4 text-[10px] sm:text-xs md:text-sm lg:text-[14px] leading-snug ml-auto max-w-[210px]">{rightSubtext}</div>
              <div className="mt-3 ml-auto w-8 sm:w-10 lg:w-14 border-t" style={{ borderColor: textColor }} />
            </div>

            <div className="absolute left-4 sm:left-6 md:left-8 lg:left-[4.5%] bottom-[18%] md:bottom-[15%] lg:bottom-[14%] w-[27%] lg:w-[22%] max-w-[330px]">
              <div className="font-display text-[clamp(16px,2.2vw,32px)] lg:text-[clamp(20px,1.8vw,36px)] leading-[0.92] uppercase">{storyHeading}</div>
              <div className="mt-3 text-[10px] sm:text-xs md:text-sm lg:text-[14px] leading-snug max-w-[220px]">{storySubtext}</div>
              <div className="mt-3 w-8 sm:w-10 lg:w-14 border-t" style={{ borderColor: textColor }} />
            </div>

            <div className="absolute left-4 sm:left-6 md:left-8 lg:left-[4.5%] bottom-5 sm:bottom-7 md:bottom-9 lg:bottom-8">
              <div className="font-display text-[54px] sm:text-[72px] md:text-[92px] lg:text-[clamp(64px,6vw,120px)] leading-none" style={{ color: issueNumberColor, textShadow: '0 2px 4px rgba(0,0,0,0.45)' }}>
                {issueNumber}
              </div>
              <div className="mt-1 w-14 sm:w-16 md:w-20 lg:w-24 border-t-2" style={{ borderColor: issueNumberColor }} />
            </div>

            {showBarcode && (
              <div className="absolute left-[13%] lg:left-[13%] bottom-5 sm:bottom-7 md:bottom-9 lg:bottom-8 hidden sm:block bg-white/95 px-2 py-2 shadow-sm">
                <div className="flex items-end gap-[2px] h-9 md:h-12 lg:h-14">
                  {[3,1,2,4,1,5,2,1,4,2,6,1,3,2,5,1,2,4,1,5,3,1,4,2,6,1,3,2,5,1,2,4].map((w, i) => (
                    <span key={i} className="block bg-black" style={{ width: `${w}px`, height: `${i % 5 === 0 ? 100 : 78}%` }} />
                  ))}
                </div>
                <div className="text-[7px] md:text-[9px] lg:text-[10px] tracking-[0.08em] text-center mt-1 text-black">{issueNumber} &gt;</div>
              </div>
            )}

            <div className="absolute right-4 sm:right-6 md:right-8 lg:right-[4.5%] bottom-6 sm:bottom-8 md:bottom-10 lg:bottom-8 text-[9px] sm:text-[10px] md:text-xs lg:text-[13px] tracking-[0.12em] uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" style={{ color: websiteColor }}>
              {website}
            </div>
          </div>

          {(slide.primaryCta?.label || slide.secondaryCta?.label) && (
            <div className="absolute bottom-4 right-1/2 translate-x-1/2 z-30 hidden md:flex gap-2">
              {slide.primaryCta?.label && <Link to={slide.primaryCta.to} className="bg-black text-white px-5 py-2.5 text-[10px] tracking-[0.12em] uppercase">{slide.primaryCta.label}</Link>}
              {slide.secondaryCta?.label && <Link to={slide.secondaryCta.to} className="bg-white/90 text-black px-5 py-2.5 text-[10px] tracking-[0.12em] uppercase">{slide.secondaryCta.label}</Link>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LightSlide({ slide }) {
  return (
    <div className="relative w-full h-full bg-bone-dim text-void">
      <div className="relative h-full max-w-[1400px] mx-auto px-5 md:px-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="absolute top-8 md:top-12 left-5 md:left-8 text-[11px] md:text-xs tracking-[0.2em] uppercase leading-relaxed max-w-[140px]">{slide.eyebrow}</motion.div>
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.9 }} className="absolute inset-0 flex flex-col lg:flex-row items-center justify-center font-display leading-[0.95] lg:leading-none tracking-tight text-void/90 select-none pointer-events-none px-4 text-center -translate-y-[8vh] md:translate-y-0">
          <span className="lg:hidden text-[26vw] md:text-[16vw]">{slide.heading.split(' ').map((word) => <span key={word} className="block">{word}</span>)}</span>
          <span className="hidden lg:inline whitespace-nowrap" style={{ fontSize: `min(${120 / Math.max(slide.heading.length, 1)}vw, 22vw)` }}>{slide.heading}</span>
        </motion.h1>
        <motion.img src={slide.image} alt={slide.imageAlt} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }} className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[55%] md:h-[75%] lg:h-[95%] w-auto object-contain object-bottom z-10 -translate-y-[8vh] md:translate-y-0" />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7 }} className="absolute bottom-8 md:bottom-12 left-5 md:left-8 z-20 flex gap-3">
          <Link to={slide.primaryCta.to} className="bg-void text-bone px-6 py-3 text-xs md:text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors">{slide.primaryCta.label}</Link>
          <Link to={slide.secondaryCta.to} className="text-xs md:text-sm tracking-[0.05em] uppercase font-medium underline underline-offset-4 self-center hover:text-blaze transition-colors">{slide.secondaryCta.label}</Link>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }} className="hidden md:block absolute bottom-8 md:bottom-12 right-5 md:right-8 z-20 text-[11px] md:text-xs tracking-[0.15em] uppercase text-right leading-relaxed">{slide.cornerLabel}</motion.div>
      </div>
    </div>
  )
}
